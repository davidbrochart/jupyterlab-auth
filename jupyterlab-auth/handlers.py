import json
import hashlib
import os
import urllib

from jupyter_server.base.handlers import APIHandler
from jupyter_server.base.handlers import JupyterHandler
from jupyter_server.utils import url_path_join
from jupyter_server.serverapp import ServerApp
from jupyter_server.auth.login import LoginHandler
from jupyter_server.auth.logout import LogoutHandler

import tornado
from tornado import escape, httpclient
from tornado.auth import OAuth2Mixin
from tornado.httputil import url_concat

# Create 'jupyterlab-auth/config.json' file with the following secrets:
# "client_id": ""
# "client_secret": ""
# "redirect_uri": ""

CLIENT_ID = ""
CLIENT_SECRET = ""
REDIRECT_URI = ""

USERS = {}

AUTHORIZATION = {}
auth_fname = "auth.json"
if os.path.exists(auth_fname):
    with open(auth_fname) as f:
        AUTHORIZATION = json.load(f)

config_file = os.path.join(os.path.dirname(__file__), "config.json")
print(config_file)
if os.path.exists(config_file):
    print("config:", config_file)
    with open(config_file) as f:
        conf = json.load(f)
        print("config:", conf)
        CLIENT_ID = conf["client_id"]
        CLIENT_SECRET = conf["client_secret"]
        REDIRECT_URI = conf["redirect_uri"]



class UsersRouteHandler(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        users = {"users": []}
        for login in USERS:
            users["users"].append(
                {
                    "login": login,
                    "name": USERS[login]["name"],
                    "avatar_url": USERS[login]["avatar_url"]
                }
            )
        self.finish(json.dumps(users))


class UserRouteHandler(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        user = self.current_user
        print("*"*100)
        print("user", user)
        self.finish(user)


def setup_handlers(web_app):
    host_pattern = ".*$"

    base_url = web_app.settings["base_url"]
    users_route_pattern = url_path_join(base_url, "auth", "users")
    user_route_pattern = url_path_join(base_url, "auth", "user")
    handlers = [
        (users_route_pattern, UsersRouteHandler),
        (user_route_pattern, UserRouteHandler),
    ]
    web_app.add_handlers(host_pattern, handlers)


def get_current_user(self):
    # Use access_token to get the user
    user = self.get_secure_cookie("user")
    if user is None:
        return None
    else :
        return json.loads(user.decode())

JupyterHandler.get_current_user = get_current_user

OAuth2Mixin._OAUTH_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
OAuth2Mixin._OAUTH_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token"

class MyLoginHandler(OAuth2Mixin, LoginHandler):
    async def get_access_token(self, redirect_uri, code):
        #handler = cast(RequestHandler, self)
        http = self.get_auth_http_client()
        body = urllib.parse.urlencode({})

        response = await http.fetch(
            url_concat(
                self._OAUTH_ACCESS_TOKEN_URL,
                {
                    "redirect_uri": redirect_uri,
                    "code": code,
                    "client_id": CLIENT_ID,
                    "client_secret": CLIENT_SECRET,
                    "grant_type": "authorization_code"
                }
            ),
            method="POST",
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"
            },
            body=body
        )
        print("*"*100)
        print("response", response.body)
        return escape.json_decode(response.body)

    async def get(self):
        if not self.get_argument('code', False):
            self.authorize_redirect(
                redirect_uri=REDIRECT_URI,
                client_id=CLIENT_ID,
                client_secret=CLIENT_SECRET,
                response_type='code',
                scope=['read:user']
            )
            print("*"*100)
            print("auth")
            return

        access_token = self.get_secure_cookie("access_token").decode()
        print("access_token", access_token)
        if not access_token or access_token == "Anonymous" :
            access_reply = await self.get_access_token(
                redirect_uri=REDIRECT_URI,
                code=self.get_argument('code')
            )
            print("*"*100)
            print("access_token", access_reply)
            # TODO: store access_token
            access_token = access_reply['access_token']
            self.set_secure_cookie("access_token", access_token)
            
        
        else:
            access_token = access_token.decode()
        
        if access_token or access_token != "Anonymous" :
            response = await httpclient.AsyncHTTPClient().fetch(
                "https://api.github.com/user",
                headers={
                    "Authorization": "token " + access_token,
                }
            )
            print("*"*100)
            print("user_req", response.body)

            body = response.body.decode()
            self.set_secure_cookie("user", body)
            user = json.loads(body)
            USERS[user["login"]] = user
            self.redirect("/")
        
        self.redirect("/login")

class MyLogoutHandler(LogoutHandler):
    def get(self):
        print("logout")
        user = self.current_user
        if user is not None:
            login = user["login"]
            if login in USERS:
                del USERS[login]
        
        self.clear_cookie("access_token")
        self.clear_cookie("user")

        # TODO: get random names for users
        user = json.dumps({ "login": "Anonymous" })
        USERS["Anonymous"] = user
        self.set_secure_cookie("access_token", "Anonymous")
        self.set_secure_cookie("user", user)
        self.redirect("/")

ServerApp.login_handler_class = MyLoginHandler
ServerApp.logout_handler_class = MyLogoutHandler


# Authorization

def user_is_authorized(self, user, action, resource):
    login = user["login"]
    if login not in AUTHORIZATION:
        return False
    if resource not in AUTHORIZATION[login]:
        return False
    if action not in AUTHORIZATION[login][resource]:
        return False
    return AUTHORIZATION[login][resource][action]

JupyterHandler.user_is_authorized = user_is_authorized
