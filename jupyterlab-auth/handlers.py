import json
from base64 import encodebytes
import hmac
import hashlib
import os

from jupyter_server.base.handlers import APIHandler
from jupyter_server.base.handlers import JupyterHandler
from jupyter_server.utils import url_path_join
from jupyter_server.serverapp import ServerApp
from jupyter_server.auth.login import LoginHandler
from jupyter_server.auth.logout import LogoutHandler

import tornado

USERS = []

class RouteHandler(APIHandler):
    # The following decorator should be present on all verb methods (head, get, post,
    # patch, put, delete, options) to ensure only authorized user can request the
    # Jupyter server
    @tornado.web.authenticated
    def get(self):
        user = self.current_user.decode()
        response = {
            "users": [
                {
                    "login": user,
                    "avatar_url": f"https://github.com/{user}.png"
                } for user in USERS
            ],
        }
        self.finish(json.dumps(response));


def setup_handlers(web_app):
    host_pattern = ".*$"

    base_url = web_app.settings["base_url"]
    route_pattern = url_path_join(base_url, "auth", "users")
    handlers = [(route_pattern, RouteHandler)]
    web_app.add_handlers(host_pattern, handlers)


# authentication with a simple form

def get_current_user(self):
    user = self.get_secure_cookie("user")
    return user

JupyterHandler.get_current_user = get_current_user

class MyLoginHandler(LoginHandler):
    def get(self):
        if self.current_user:
            self.redirect("/")
            return
        self.write('<html><body><form action="/login" method="post">' + self.xsrf_form_html() + \
                   'Name: <input type="text" name="name">'
                   '<input type="submit" value="Sign in">'
                   '</form></body></html>')

    def post(self):
        user = self.get_argument("name")
        self.set_secure_cookie("user", user)
        USERS.append(user)
        self.redirect("/")

class MyLogoutHandler(LogoutHandler):
    def get(self):
        USERS.remove(self.current_user.decode())
        self.clear_cookie("user")
        self.redirect("/login")

ServerApp.login_handler_class = MyLoginHandler
ServerApp.logout_handler_class = MyLogoutHandler

# set a cookie secret so that the user gets invalidated outside of this browser

key = encodebytes(os.urandom(32))
h = hmac.new(key, digestmod=hashlib.sha256)
ServerApp.cookie_secret = h.digest()
