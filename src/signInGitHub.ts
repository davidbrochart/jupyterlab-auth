import {
  JupyterFrontEndPlugin,
  JupyterFrontEnd,
  IRouter
} from '@jupyterlab/application';

import { LabIcon } from '@jupyterlab/ui-components';

import { Menu } from '@lumino/widgets';

import { User } from './user';

import { IUser, IUserMenu } from './tokens';

import * as github from '../style/img/github-logo.svg';

/**
 * A namespace for command IDs.
 */
export namespace CommandIDs {
  export const github = 'jupyterlab-auth:github';
}

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-auth:github',
  autoStart: true,
  requires: [IRouter, IUser, IUserMenu],
  activate: (
    app: JupyterFrontEnd,
    router: IRouter,
    user: User,
    menu: Menu
  ): void => {
    const { commands } = app;

    const icon = new LabIcon({
      name: 'githubIcon',
      svgstr: github.default
    });

    commands.addCommand(CommandIDs.github, {
      label: 'Sign In with GitHub',
      icon: icon,
      isEnabled: () => user.isAnonymous,
      //isVisible: () => user.isAnonymous,
      execute: () => {
        router.navigate('/auth/github', { hard: true });
      }
    });
    menu.insertItem(0, { command: CommandIDs.github });

    user.registerLogInMethod(CommandIDs.github);
  }
};

export default plugin;
