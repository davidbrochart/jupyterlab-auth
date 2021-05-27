import json
from base64 import encodebytes
import hmac
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

ACCESS_TOKENS = []

class UsersRouteHandler(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        users = {"users": []}
        for access_token in ACCESS_TOKENS:
            response = await httpclient.AsyncHTTPClient().fetch(
                "https://api.github.com/user",
                method="GET",
                headers={"Authorization": "token " + access_token},
            )
            body = json.loads(response.body.decode())
            users["users"].append(
                {
                    "login": body["login"],
                    "name": body["name"],
                    "avatar_url": f"https://github.com/{body['login']}.png"
                }
            )
            if self.current_user == access_token:
                users["me"] = body["login"]
        self.finish(json.dumps(users));


def setup_handlers(web_app):
    host_pattern = ".*$"

    base_url = web_app.settings["base_url"]
    users_route_pattern = url_path_join(base_url, "auth", "users")
    handlers = [(users_route_pattern, UsersRouteHandler)]
    web_app.add_handlers(host_pattern, handlers)


def get_current_user(self):
    access_token = self.get_secure_cookie("access_token")
    if access_token is not None:
        access_token = access_token.decode()
        if access_token in ACCESS_TOKENS:
            return access_token
    return None

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
                       'Client ID: <input type="text" name="client_id">'
                       'Client secret: <input type="text" name="client_secret">'
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
            self.set_secure_cookie("access_token", access_token)
            ACCESS_TOKENS.append(access_token)
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
        if self.current_user:
            ACCESS_TOKENS.remove(self.current_user)
        self.clear_cookie("access_token")
        self.clear_cookie("client_id")
        self.clear_cookie("client_secret")
        self.redirect("/login")

ServerApp.login_handler_class = MyLoginHandler
ServerApp.logout_handler_class = MyLogoutHandler

# set a cookie secret so that the user gets invalidated outside of this browser

key = encodebytes(os.urandom(32))
h = hmac.new(key, digestmod=hashlib.sha256)
ServerApp.cookie_secret = h.digest()
