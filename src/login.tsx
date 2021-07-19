import {
  JupyterFrontEndPlugin,
  JupyterFrontEnd,
  ILabShell,
  IRouter
} from '@jupyterlab/application';

import { LabIcon } from '@jupyterlab/ui-components';

import { ReactWidget } from '@jupyterlab/apputils';

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
      if (data.login) {
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
    if (this._profile.login !== "Anonymous") {
      return (
        <div>
          <a onClick={this._onClick}>
            <img
              className="user-img"
              src={this._profile.avatar_url}
              alt="avatar"
            />
          </a>
          <div
            className={`login-menu ${this._isActive ? 'active' : 'inactive'}`}
          >
            <ul>
              <li key={this._profile.name}>
                <a>
                <span>Logged in as {this._profile.login}</span>
                  
                </a>
              </li>
              <hr />
              <li key="logout">
                <a onClick={() => this._logOut()}>
                  <span>Log out</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      );
    } else {
      const avatar = new LabIcon({
        name: 'github_icon',
        svgstr: github.default
      });

      return (
        <div>
          <a onClick={this._onClick}>
            <avatar.react
              className="user-img"
              tag="span"
              width="28px"
              height="28px"
            />
          </a>
          <div
            className={`login-menu ${this._isActive ? 'active' : 'inactive'}`}
          >
            <ul>
              <li key="Anonymous">
                <a>
                <span>Logged in as {this._profile.login}</span>
                </a>
              </li>
              <hr />
              <li key="login">
                <a onClick={() => this._logIn()}>
                  <span>Log in</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      );
    }
  }

  private _isActive = false;
  private _router: IRouter;
  private _profile: { [key: string]: any };
}
