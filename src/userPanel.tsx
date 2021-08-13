import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { LabIcon } from '@jupyterlab/ui-components';

import { ReactWidget } from '@jupyterlab/apputils';

import { URLExt } from '@jupyterlab/coreutils';

import { ServerConnection } from '@jupyterlab/services';

import { IEditorTracker } from '@jupyterlab/fileeditor';

import { INotebookTracker } from '@jupyterlab/notebook';

import { YFile, YNotebook } from '@jupyterlab/shared-models';

import { Message } from '@lumino/messaging';

import * as React from 'react';

import { IUser, IUserPanel } from './tokens';

import { User } from './user';

import { getUserIcon } from './components';

import * as userIcon from '../style/img/user.svg';

const userPanel: JupyterFrontEndPlugin<UserPanel> = {
  id: 'jupyterlab-auth:userPanel',
  requires: [IUser, IEditorTracker, INotebookTracker],
  autoStart: true,
  provides: IUserPanel,
  activate: (
    app: JupyterFrontEnd,
    user: User,
    editor: IEditorTracker,
    notebook: INotebookTracker
  ): UserPanel => {
    const userPanel = new UserPanel(user);
    app.shell.add(userPanel, 'left', { rank: 300 });

    const collaboratorsChanged = (
      tracker: IEditorTracker | INotebookTracker
    ) => {
      if (tracker.currentWidget === null || tracker.currentWidget.context.contentsModel === null) {
        userPanel.collaborators = [];
        return;
      }

      let model: YNotebook | YFile = null;
      if (tracker.currentWidget.context.contentsModel.type === 'notebook') {
        model = tracker.currentWidget.context.model.sharedModel as YNotebook;
      } else if (tracker.currentWidget.context.contentsModel.type === 'file') {
        model = tracker.currentWidget.context.model.sharedModel as YFile;
      } else {
        userPanel.collaborators = [];
        return;
      }

      const stateChanged = () => {
        const state = model.awareness.getStates();
        const collaborators: IUser[] = [];
        state.forEach((value, key) => {
          const collaborator: IUser = {
            isAnonymous: value.user.isAnonymous,
            name: value.user.name,
            username: value.user.username,
            initials: value.user.initials,
            color: value.user.color,
            email: value.user.email,
            avatar: value.user.avatar
          };

          collaborators.push(collaborator);
        });
        userPanel.collaborators = collaborators;
      };

      model.awareness.on('change', stateChanged);
      stateChanged();
    };

    notebook.currentChanged.connect(collaboratorsChanged);
    editor.currentChanged.connect(collaboratorsChanged);

    return userPanel;
  }
};

export default userPanel;

export class UserPanel extends ReactWidget {
  private _profile: User;
  private _users: IUser[];
  private _collaborators: IUser[];
  private _intervalID: number;

  constructor(user: User) {
    super();
    this.id = 'jp-user-panel';
    this.title.icon = new LabIcon({
      name: 'userIcon',
      svgstr: userIcon.default
    });
    this.addClass('jp-AuthWidget');

    this._profile = user;
    this._users = [];
    this._collaborators = [];

    this._intervalID = setInterval(this.requestUsers, 5000);
  }

  get collaborators(): IUser[] {
    return this._collaborators;
  }

  set collaborators(users: IUser[]) {
    this._collaborators = users;
    this.update();
  }

  dispose() {
    clearInterval(this._intervalID);
    super.dispose();
  }

  onBeforeShow(msg: Message): void {
    super.onBeforeShow(msg);
    this.requestUsers();
  }

  private requestUsers = (): void => {
    const settings = ServerConnection.makeSettings();
    const requestUrl = URLExt.join(settings.baseUrl, 'auth', 'users');
    ServerConnection.makeRequest(requestUrl, {}, settings).then(async resp => {
      if (!resp.ok) {
        return;
      }

      const data = await resp.json();
      this._users = [];
      data.forEach((user: any) => {
        const name = user.name.split(' ');
        let initials = '';
        if (name.length > 0) {
          initials += name[0].substring(0, 1).toLocaleUpperCase();
        }
        if (name.length > 1) {
          initials += name[1].substring(0, 1).toLocaleUpperCase();
        }

        const collaborator: IUser = {
          isAnonymous: true,
          name: user.name,
          username: user.username || user.name,
          initials,
          color: user.color || '#E0E0E0',
          email: null,
          avatar: user.avatar
        };
        this._users.push(collaborator);
      });
      console.debug("Users:", this._users);
      this.update();
    });
  }

  render(): JSX.Element {
    return (
      <div className="jp-UserPanel">
        <div className="panel-container">
          {getUserIcon(this._profile)}
          <span className="panel-username">{this._profile.name}</span>
        </div>

        <h5>Connected users</h5>
        <hr />
        <div className="panel-container">
          {this._users.map(user => {
            if (this._profile.username !== user.username) {
              return getUserIcon(user);
            }
          })}
        </div>
        <h5>Collaborators</h5>
        <hr />
        <div className="panel-container">
          {this._collaborators.map(user => {
            if (
              this._profile.username !== user.username
            ) {
              return getUserIcon(user);
            }
          })}
        </div>
      </div>
    );
  }
}
