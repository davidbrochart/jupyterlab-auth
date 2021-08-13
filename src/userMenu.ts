import {
  JupyterFrontEndPlugin,
  JupyterFrontEnd,
  IRouter
} from '@jupyterlab/application';

import { caretDownIcon } from '@jupyterlab/ui-components';

import { Widget, MenuBar, Menu } from '@lumino/widgets';

import { User } from './user';

import { UserIcon } from './components';

import { IUser, IUserMenu } from './tokens';

/**
 * A namespace for command IDs.
 */
export namespace CommandIDs {
  export const loggedInAs = 'jupyterlab-auth:loggedInAs';
  export const logout = 'jupyterlab-auth:logout';
}

const menu: JupyterFrontEndPlugin<Menu> = {
  id: 'jupyterlab-auth:userMenu',
  autoStart: true,
  requires: [IRouter, IUser],
  provides: IUserMenu,
  activate: (app: JupyterFrontEnd, router: IRouter, user: User): Menu => {
    const { shell, commands } = app;

    const spacer = new Widget();
    spacer.id = 'jp-topbar-spacer';
    spacer.addClass('topbar-spacer');
    shell.add(spacer, 'top', { rank: 1000 });

    const icon = new UserIcon(user);
    icon.id = 'jp-UserIcon';
    // TODO: remove with next lumino release
    icon.node.onclick = (event: MouseEvent) => {
      menu.open(window.innerWidth, 30);
    };

    const menu = new Menu({ commands });
    menu.id = 'jp-UserMenu-dropdown';
    menu.title.icon = caretDownIcon;
    menu.title.className = 'jp-UserMenu-dropdown';

    menu.addItem({ type: 'separator' });

    commands.addCommand(CommandIDs.logout, {
      label: 'Sign Out',
      isEnabled: () => !user.isAnonymous,
      //isVisible: () => !user.isAnonymous,
      execute: () => {
        router.navigate('/logout', { hard: true });
      }
    });
    menu.addItem({ command: CommandIDs.logout });

    const menuBar = new MenuBar();
    menuBar.id = 'jp-UserMenu';
    menuBar.node.insertBefore(icon.node, menuBar.node.firstChild);
    menuBar.addMenu(menu);
    // TODO: remove with next lumino release
    menuBar.node.onmousedown = (event: MouseEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      menu.open(window.innerWidth, 30);
    };
    shell.add(menuBar, 'top', { rank: 1002 });

    return menu;
  }
};

export default menu;
