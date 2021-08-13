import { ReactWidget, Dialog } from '@jupyterlab/apputils';

import { LabIcon } from '@jupyterlab/ui-components';

import { CommandRegistry } from '@lumino/commands';

import * as React from 'react';

import { User } from './user';

import { IUser } from './tokens';

import * as userIcon from '../style/img/user.svg';

export class UserNameInput
  extends ReactWidget
  implements Dialog.IBodyWidget<string>
{
  private _name: string;
  private _user: User;
  private _commands: CommandRegistry;

  constructor(user: User, commands: CommandRegistry) {
    super();
    this._user = user;
    this._name = user.name;
    this._commands = commands;
  }

  getValue(): string {
    return this._name;
  }

  private _handleName = (event: React.ChangeEvent<HTMLInputElement>): void => {
    this._name = event.target.value;
    this.update();
  };

  render(): JSX.Element {
    const getButtons = () => {
      return this._user.logInMethods.map(id => {
        return (
          <button
            id="jp-Dialog-button"
            className="jp-mod-reject jp-mod-styled"
            onClick={() => this._commands.execute(id)}
          >
            {this._commands.label(id)}
          </button>
        );
      });
    };

    return (
      <div className="lm-Widget p-Widget jp-Dialog-body jp-Dialog-container">
        <label>Who are you?</label>
        <input
          id="jp-dialog-input-id"
          type="text"
          className="jp-Input-Dialog jp-mod-styled"
          value={this._name}
          onChange={this._handleName}
        />
        <hr />
        {getButtons()}
      </div>
    );
  }
}

export class UserIcon extends ReactWidget {
  private _profile: User;

  constructor(user: User) {
    super();
    this._profile = user;

    this._profile.ready.connect(() => this.update());
    this._profile.changed.connect(() => this.update());
  }

  render(): React.ReactElement {
    if (this._profile.isReady) {
      return (
        <div className="login-container">
          {getUserIcon(this._profile)}
          <span className="login-username">{this._profile.username}</span>
        </div>
      );
    }

    const avatar = new LabIcon({
      name: 'userIcon',
      svgstr: userIcon.default
    });

    return (
      <div className="login-container">
        <div className="login-icon">
          <avatar.react
            className="user-img"
            tag="span"
            width="28px"
            height="28px"
          />
        </div>
      </div>
    );
  }
}

export const getUserIcon = (user: IUser) => {
  if (user.avatar) {
    return (
      <div key={user.id} className="login-icon">
        <img className="user-img" src={user.avatar} />
      </div>
    );
  }

  if (!user.avatar) {
    return (
      <div
        key={user.id}
        className="login-icon"
        style={{ backgroundColor: user.color }}
      >
        <span>{user.initials}</span>
      </div>
    );
  }
};
