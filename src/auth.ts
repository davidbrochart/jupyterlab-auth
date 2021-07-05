import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  IRouter
} from '@jupyterlab/application';

import { reactIcon } from '@jupyterlab/ui-components';

import { getRandomColor } from '@jupyterlab/docprovider/lib/awareness';

import { IMainMenu } from '@jupyterlab/mainmenu';

import { IStateDB } from '@jupyterlab/statedb';

import { Menu } from '@lumino/widgets';

import * as env from 'lib0/environment';

import { AuthWidget } from './widget';

import { requestAPI } from './handler';

const PREFIX = '@jupyterlab/docprovider:yprovider';
const USER = `${PREFIX}:user`;

const auth: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-auth:auth',
  requires: [IMainMenu, IRouter, IStateDB],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    mainMenu: IMainMenu,
    router: IRouter,
    state: IStateDB | null
  ) => {
    app.commands.addCommand('user:logout', {
      label: 'Sign out',
      isEnabled: () => true,
      isVisible: () => true,
      execute: () => {
        router.navigate('/logout', { hard: true });
      }
    });

    requestAPI<any>('user').then(data => {
      const menu = new Menu({ commands: app.commands });
      menu.title.label = data.login;
      menu.addItem({
        command: 'user:logout',
        args: {}
      });
      mainMenu.addMenu(menu, { rank: 2000 });

      if (state) {
        const color =
          '#' + env.getParam('--usercolor', getRandomColor().slice(1));
        state.save(USER, `${data.name},${color}`);
      }

      //...awareness.setLocalStateField('user', {
      //  name: data.name,
      //});
    });

    const widget = new AuthWidget();
    widget.id = 'jupyterlab-auth';
    widget.title.icon = reactIcon;
    app.shell.add(widget, 'left', { rank: 300 });
  }
};

export default auth;
