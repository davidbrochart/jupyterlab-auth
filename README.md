# jupyterlab-auth

![Github Actions Status](https://github.com/davidbrochart/jupyterlab-auth/workflows/Build/badge.svg)

A JupyterLab extension for authentication.


This extension is composed of a Python package named `jupyterlab-auth`
for the server extension and a NPM package named `jupyterlab-auth`
for the frontend extension.


## Install

To install the extension, execute:

```bash
mamba create -n jupyterlab-auth-dev
conda activate jupyterlab-auth-dev
mamba install pip nodejs

wget -q https://github.com/davidbrochart/jupyterlab/archive/yjs_awareness.tar.gz -O jlab.tar.gz
tar zxf jlab.tar.gz
cd jupyterlab-yjs_awareness
pip install -e .
jlpm
jlpm build
cd ..

pip install -e .
jupyter labextension develop . --overwrite
jupyter server extension enable jupyterlab-auth
jlpm run build
jupyter server extension list
jupyter labextension list
jupyter lab build

jupyter lab --dev-mode --extensions-in-dev-mode --collaborative
```

## Authentication with GitHub

You will need to authorize JupyterLab to access your GitHub information. We only need the
`read:user` scope, which grants access to read a user's profile data (see the
[available scopes](https://docs.github.com/en/developers/apps/building-oauth-apps/scopes-for-oauth-apps#available-scopes)).

You can register a new OAuth application [here](https://github.com/settings/applications/new):
- Application name: JupyterLab
- Homepage URL: http://localhost:8888/login
- Authorization callback URL: http://localhost:8888/login

`localhost` and `8888` are the IP and port number, respectively. You might have to change them
according to your particular setup.

This will generate a client ID for you, and you must also generate a client secret.

When navigating to the Jupyter server (either because JupyterLab automatically opens a new tab in
your browser or by manually going to e.g. http://localhost:8888), you should land to the
login page, where you can enter your client ID and secret. After authentication, you should be
allowed access and redirected to JupyterLab.

Try opening e.g. http://localhost:8888 in another browser. Here again, you have to provide your
client ID and secret. It is fine if they are the same as before, you will just be authenticated as
the same user. You can see the connected users by opening the tab on the left. Also, when you see
the cursor of another user in a notebook cell, you can place your mouse over it and it should show
you the user name.

You can log out by navigating to e.g. http://localhost:8888/logout.
