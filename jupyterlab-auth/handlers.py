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
from tornado import escape
from tornado.auth import OAuth2Mixin
from tornado import httpclient


USERS = {}

AUTHORIZATION = {}
auth_fname = "auth.json"
if os.path.exists(auth_fname):
    with open(auth_fname) as f:
        AUTHORIZATION = json.load(f)


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
    user = self.get_secure_cookie("user")
    if user is None:
        return
    user = json.loads(user.decode())
    login = user["login"]
    if login not in USERS:
        USERS[login] = user
    return user

JupyterHandler.get_current_user = get_current_user

OAuth2Mixin._OAUTH_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
OAuth2Mixin._OAUTH_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token"

class MyLoginHandler(OAuth2Mixin, LoginHandler):
    async def get_access_token(self, code):
        client_id = self.get_secure_cookie("client_id")
        client_secret = self.get_secure_cookie("client_secret")
        if not (client_id and client_secret):
            return ""
        body = urllib.parse.urlencode(
            {
                "code": code,
                "client_id": client_id.decode(),
                "client_secret": client_secret.decode()
            }
        )
        http = self.get_auth_http_client()
        response = await http.fetch(
            self._OAUTH_ACCESS_TOKEN_URL,
            method="POST",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            body=body,
        )
        r = urllib.parse.parse_qs(response.body.decode())
        if "access_token" in r:
            return r["access_token"][0]
        return ""

    async def get(self):
        if self.current_user:
            self.redirect("/")
            return
        client_id = self.get_secure_cookie("client_id")
        client_secret = self.get_secure_cookie("client_secret")
        if not (client_id and client_secret):
            self.write('<html><body><form action="/login" method="post">' + self.xsrf_form_html() + \
                       '<p>Please enter below the client ID and secret that you got from GitHub.</p>'
                       '<p>Client ID: <input type="text" name="client_id"></p>'
                       '<p>Client secret: <input type="text" name="client_secret"></p>'
                       '<input type="submit" value="Sign in">'
                       '</form></body></html>')
            return
        if self.get_argument('code', False):
            access_token = await self.get_access_token(code=self.get_argument('code'))
            if not access_token:
                self.clear_cookie("client_id")
                self.clear_cookie("client_secret")
                self.redirect("/login")
                return
            response = await httpclient.AsyncHTTPClient().fetch(
                "https://api.github.com/user",
                method="GET",
                headers={"Authorization": "token " + access_token},
            )
            body = response.body.decode()
            user = json.loads(body)
            USERS[user["login"]] = user
            self.set_secure_cookie("user", body)
            self.redirect("/")
        else:
            self.authorize_redirect(
                client_id=client_id.decode(),
                scope=['read:user'],)

    def post(self):
        self.set_secure_cookie("client_id", self.get_argument("client_id"))
        self.set_secure_cookie("client_secret", self.get_argument("client_secret"))
        self.redirect("/login")

class MyLogoutHandler(LogoutHandler):
    def get(self):
        user = self.current_user
        if user is not None:
            login = user["login"]
            if login in USERS:
                del USERS[login]
        self.clear_cookie("user")
        self.clear_cookie("client_id")
        self.clear_cookie("client_secret")
        self.redirect("/login")

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
