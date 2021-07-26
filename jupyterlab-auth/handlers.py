import json
import hashlib
import os
import urllib
import uuid

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
        users = []
        for id in USERS :
            users.append(USERS[id])
        self.finish(json.dumps(users))


class GetUserHandler(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        user = self.current_user
        self.finish(user)

class GitHubLoginHandler(OAuth2Mixin, LoginHandler):
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
        github_user = json.loads(body)
        user = {
            "initialized": True,
            "anonymous": False,
            "id": github_user['id'],
            "name": github_user['name'],
            "username": github_user['login'],
            "color": None,
            "email": github_user['email'],
            "avatar": github_user['avatar_url']
        }
        self.set_secure_cookie("user", json.dumps(user))
        self.redirect("/")

def setup_handlers(web_app):
    host_pattern = ".*$"

    base_url = web_app.settings["base_url"]
    users_route_pattern = url_path_join(base_url, "auth", "users")
    user_route_pattern = url_path_join(base_url, "auth", "user")
    github_route_pattern = url_path_join(base_url, "auth", "github")
    handlers = [
        (users_route_pattern, GetUsersHandler),
        (user_route_pattern, GetUserHandler),
        (github_route_pattern, GitHubLoginHandler)
    ]
    web_app.add_handlers(host_pattern, handlers)


def get_current_user(self):
    user = self.get_secure_cookie("user")
    if user:
        user = json.loads(user.decode())
        USERS[user['id']] = user
        return user

JupyterHandler.get_current_user = get_current_user

OAuth2Mixin._OAUTH_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
OAuth2Mixin._OAUTH_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token"

class MyLoginHandler(LoginHandler):
    async def get(self):
        #TODO: Load anonymous user info from persistent storage?
        user = json.dumps({
            "initialized": False,
            "anonymous": True,
            "id": str(uuid.uuid4()),
            "name": None,
            "username": None,
            "color": None,
            "email": None,
            "avatar": None
        })
        self.set_secure_cookie("user", user)
        self.redirect("/")

    async def post(self):
        body = json.loads(self.request.body.decode())
        user = json.dumps({
            "initialized": True,
            "anonymous": True,
            "id": str(uuid.uuid4()),
            "name": body["name"],
            "username": body["name"],
            "color": body["color"],
            "email": None,
            "avatar": None
        })
        self.set_secure_cookie("user", user)

class MyLogoutHandler(LogoutHandler):
    @tornado.web.authenticated
    def get(self):
        user = self.current_user
        if user is not None:
            id = user["id"]
            if id in USERS:
                del USERS[id]

        self.clear_cookie("access_token")
        user = json.dumps({
            "initialized": False,
            "anonymous": True,
            "id": str(uuid.uuid4()),
            "name": None,
            "username": None,
            "color": None,
            "email": None,
            "avatar": None
        })
        self.set_secure_cookie("user", user)
        self.redirect("/")

ServerApp.login_handler_class = MyLoginHandler
ServerApp.logout_handler_class = MyLogoutHandler


# Authorization

def user_is_authorized(self, user, action, resource):
    login = user["id"]
    if login not in AUTHORIZATION:
        return False
    if resource not in AUTHORIZATION[login]:
        return False
    if action not in AUTHORIZATION[login][resource]:
        return False
    return AUTHORIZATION[login][resource][action]

JupyterHandler.user_is_authorized = user_is_authorized
