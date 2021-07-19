import {
  JupyterFrontEndPlugin,
  JupyterFrontEnd,
  ILabShell,
  IRouter
} from '@jupyterlab/application';

import { LabIcon } from '@jupyterlab/ui-components';

import { ReactWidget, InputDialog } from '@jupyterlab/apputils';

import {
  getRandomColor,
  getAnonymousUserName
} from '@jupyterlab/docprovider/lib/awareness';

import { Message } from '@lumino/messaging';

import { Widget } from '@lumino/widgets';

import { requestAPI } from './handler';

import * as github from '../style/img/github-logo.svg';

import * as React from 'react';

const userIcon: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-auth:logo',
  autoStart: true,
  requires: [ILabShell, IRouter],
  activate: (app: JupyterFrontEnd, shell: ILabShell, router: IRouter) => {
    const spacer = new Widget();
    spacer.id = 'jp-topbar-spacer';
    spacer.addClass('topbar-spacer');
    shell.add(spacer, 'top', { rank: 1000 });

    const logo = new LogInIcon(router);
    shell.add(logo, 'top', { rank: 10000 });
  }
};

export default userIcon;

class LogInIcon extends ReactWidget {
  constructor(router: IRouter) {
    super();
    this.id = 'jp-MainLogo';
    this.title.label = 'LogIn';
    this.title.caption = 'LogIn with GitHub';

    this._router = router;
    this._profile = {
      login: "Anonymous"
    };
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    window.addEventListener('click', this._onClickOutSide);

    requestAPI<any>('user').then(data => {
      console.debug("Data: ", data);
      if (data.anonymous) {
        InputDialog.getText({
          title: "User",
          label: "Who are you?",
          okLabel: "Save",
          text: getAnonymousUserName()
        }).then( value => {
          console.debug("Value:", value);
          const username = value.value.split(' ');
          let name = username[0].substring(0, 1).toLocaleUpperCase();
          if (username.length > 1) {
            name += username[1].substring(0, 1).toLocaleUpperCase();
          }
          
          this._profile = {
            login: value.value,
            avatar: name,
            color: getRandomColor()
          };
          this.update();
        });
      } else {
        this._profile = data;
        this.update();
      }
    });
  }

  private _onClickOutSide = (e: MouseEvent): void => {
    if (!this.node.contains(e.target as Node) && this._isActive) {
      this._isActive = false;
      this.update();
    }
  };

  private _onClick = (): void => {
    this._isActive = !this._isActive;
    this.update();
  };

  private _logIn = () => {
    this._router.navigate('/login', { hard: true });
  };

  private _logOut = () => {
    this._router.navigate('/logout', { hard: true });
  };

  render(): React.ReactElement {
    console.debug(this._profile);
    const getAvatar = () => {
      return (
        <div className="login-container">
          <div
            onClick={this._onClick}
            className="login-icon"
            style={{backgroundColor: this._profile.color}}
          >
            <span>{this._profile.avatar}</span>
          </div>
          <div
            className={`login-menu ${this._isActive ? 'active' : 'inactive'}`}
          >
            <ul>
              <li key="Anonymous">
                <div><span>Logged in as {this._profile.login}</span></div>
              </li>
              <hr />
              <li key="login" className="login-menu-clickable">
                <div onClick={() => this._logIn()}>
                  <span>Log in</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      );
    }

    const getUserImage = () => {
      return (
        <div className="login-container">
          <div
            onClick={this._onClick}
            className="login-icon"
          >
            <img
              className="user-img"
              src={this._profile.avatar_url}
              alt="avatar"
            />
          </div>
          <div
            className={`login-menu ${this._isActive ? 'active' : 'inactive'}`}
          >
            <ul>
              <li key={this._profile.name}>
                <div><span>Logged in as {this._profile.login}</span></div>
              </li>
              <hr />
              <li key="logout" className="login-menu-clickable">
                <div onClick={() => this._logOut()}>
                  <span>Log out</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      );
    }

    const getGitHubIcon = () => {
      const avatar = new LabIcon({
        name: 'github_icon',
        svgstr: github.default
      });
      
      return (
        <div className="login-container">
          <div
            onClick={this._onClick}
            className="login-icon"
          >
            <avatar.react
              className="user-img"
              tag="span"
              width="28px"
              height="28px"
            />
          </div>
          <div
            className={`login-menu ${this._isActive ? 'active' : 'inactive'}`}
          >
            <ul>
              <li key="Anonymous">
                <div><span>Logged in as {this._profile.login}</span></div>
              </li>
              <hr />
              <li key="login" className="login-menu-clickable">
                <div onClick={() => this._logIn()}>
                  <span>Log in</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      );
    }

    if (this._profile.avatar) {
      return getAvatar();
    } else if (this._profile.login) {
      return getUserImage();
    } else {
      return getGitHubIcon();
    }
  }

  private _isActive = false;
  private _router: IRouter;
  private _profile: { [key: string]: any };
}
