import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  IRouter
} from '@jupyterlab/application';

import { AuthWidget } from './widget';

import { reactIcon } from '@jupyterlab/ui-components';

import { IMainMenu } from '@jupyterlab/mainmenu';

import { Menu } from '@lumino/widgets';

import { requestAPI } from './handler';

const auth: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-auth:auth',
  requires: [IMainMenu, IRouter],
  autoStart: true,
  activate: (app: JupyterFrontEnd, mainMenu: IMainMenu, router: IRouter) => {
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
