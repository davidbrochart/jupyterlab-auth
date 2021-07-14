import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { reactIcon } from '@jupyterlab/ui-components';

import { getRandomColor } from '@jupyterlab/docprovider/lib/awareness';

import { IStateDB } from '@jupyterlab/statedb';

import * as env from 'lib0/environment';

import { AuthWidget } from './widget';

import { requestAPI } from './handler';

const PREFIX = '@jupyterlab/docprovider:yprovider';
const USER = `${PREFIX}:user`;

const auth: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-auth:auth',
  requires: [IStateDB],
  autoStart: true,
  activate: (app: JupyterFrontEnd, state: IStateDB | null) => {
    requestAPI<any>('user').then(data => {
      if (state) {
        const color =
          '#' + env.getParam('--usercolor', getRandomColor().slice(1));
        state.save(USER, `${data.name},${color}`);
      }
    });

    const widget = new AuthWidget();
    widget.id = 'jupyterlab-auth';
    widget.title.icon = reactIcon;
    app.shell.add(widget, 'left', { rank: 300 });
  }
};

export default auth;
