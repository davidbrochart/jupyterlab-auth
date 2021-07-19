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
if os.path.exists(config_file):
    with open(config_file) as f:
        conf = json.load(f)
        CLIENT_ID = conf["client_id"]
        CLIENT_SECRET = conf["client_secret"]
        REDIRECT_URI = conf["redirect_uri"]



class GetUsersHandler(APIHandler):
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


class GetUserHandler(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        user = self.current_user
        self.finish(user)


class PostAnonymousHandler(APIHandler):
    @tornado.web.authenticated
    async def post(self):
        name = json.loads(self.request.body.decode())["name"]


def setup_handlers(web_app):
    host_pattern = ".*$"

    base_url = web_app.settings["base_url"]
    users_route_pattern = url_path_join(base_url, "auth", "users")
    user_route_pattern = url_path_join(base_url, "auth", "user")
    anonymous_route_pattern = url_path_join(base_url, "auth", "anonymous")
    handlers = [
        (users_route_pattern, GetUsersHandler),
        (user_route_pattern, GetUserHandler),
        (anonymous_route_pattern, PostAnonymousHandler),
    ]
    web_app.add_handlers(host_pattern, handlers)


def get_current_user(self):
    user = self.get_secure_cookie("user")
    if user:
        return json.loads(user.decode())

    anonymous = self.get_secure_cookie("anonymous")
    if anonymous:
        return {"anonymous": True}

JupyterHandler.get_current_user = get_current_user

OAuth2Mixin._OAUTH_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
OAuth2Mixin._OAUTH_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token"

class MyLoginHandler(OAuth2Mixin, LoginHandler):
    async def get_access_token(self, redirect_uri, code):
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
            return

        access_token = self.get_secure_cookie("access_token")
        if not access_token :
            access_reply = await self.get_access_token(
                redirect_uri=REDIRECT_URI,
                code=self.get_argument('code')
            )
            # TODO: store access_token
            access_token = access_reply['access_token']
            self.set_secure_cookie("access_token", access_token)
        else:
            access_token = access_token.decode()

        response = await httpclient.AsyncHTTPClient().fetch(
            "https://api.github.com/user",
            headers={
                "Authorization": "token " + access_token,
            }
        )

        body = response.body.decode()
        self.set_secure_cookie("user", body)
        self.clear_cookie("anonymous")
        user = json.loads(body)
        USERS[user["login"]] = user
        self.redirect("/")

class MyLogoutHandler(LogoutHandler):
    def get(self):
        user = self.current_user
        if user is not None:
            login = user["login"]
            if login in USERS:
                del USERS[login]

        self.clear_cookie("access_token")
        self.clear_cookie("user")
        self.set_secure_cookie("anonymous", "true")
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
