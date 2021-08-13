import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
  IDocumentProvider,
  IDocumentProviderFactory,
  ProviderMock,
  WebSocketProviderWithLocks
} from '@jupyterlab/docprovider';

import { PageConfig, URLExt } from '@jupyterlab/coreutils';

import { ServerConnection } from '@jupyterlab/services';

import {
  getAnonymousUserName,
  getRandomColor
} from '@jupyterlab/docprovider/lib/awareness';

import * as env from 'lib0/environment';

import { User } from './user';

import { IUser } from './tokens';

/**
 * The default document provider plugin
 */
const docProviderPlugin: JupyterFrontEndPlugin<IDocumentProviderFactory> = {
  id: 'jupyterlab-auth:docprovider',
  requires: [IUser],
  provides: IDocumentProviderFactory,
  activate: (app: JupyterFrontEnd, user: User): IDocumentProviderFactory => {
    const server = ServerConnection.makeSettings();
    const url = URLExt.join(server.wsUrl, 'api/yjs');
    const collaborative =
      PageConfig.getOption('collaborative') === 'true' ? true : false;

    const factory = (
      options: IDocumentProviderFactory.IOptions
    ): IDocumentProvider => {
      const name = env.getParam('--username', getAnonymousUserName());
      const color =
        '#' + env.getParam('--usercolor', getRandomColor().slice(1));
      options.ymodel.awareness.setLocalStateField('user', {
        isAnonymous: user.isAnonymous,
        name: user.name || name,
        username: user.username,
        initials: user.initials,
        color: user.color || color,
        email: user.email,
        avatar: user.avatar
      });

      user.changed.connect(user => {
        options.ymodel.awareness.setLocalStateField('user', {
          isAnonymous: user.isAnonymous,
          name: user.name || name,
          username: user.username,
          initials: user.initials,
          color: user.color || color,
          email: user.email,
          avatar: user.avatar
        });
      });

      return collaborative
        ? new WebSocketProviderWithLocks({
            ...options,
            url
          })
        : new ProviderMock();
    };

    return factory;
  }
};

export default docProviderPlugin;
