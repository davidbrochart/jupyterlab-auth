import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { PageConfig, URLExt } from '@jupyterlab/coreutils';
import {
  IDocumentProvider,
  IDocumentProviderFactory,
  ProviderMock,
  WebSocketProviderWithLocks
} from '@jupyterlab/docprovider';

import { ServerConnection } from '@jupyterlab/services';

import {
  getAnonymousUserName,
  getRandomColor
} from '@jupyterlab/docprovider/lib/awareness';

import { IStateDB } from '@jupyterlab/statedb';

import * as env from 'lib0/environment';

const PREFIX = '@jupyterlab/docprovider:yprovider';
const USER = `${PREFIX}:user`;

/**
 * The default document provider plugin
 */
const docProviderPlugin: JupyterFrontEndPlugin<IDocumentProviderFactory> = {
  id: 'jupyterlab-auth:docprovider',
  requires: [IStateDB],
  provides: IDocumentProviderFactory,
  activate: (
    app: JupyterFrontEnd,
    state: IStateDB | null
  ): IDocumentProviderFactory => {
    const server = ServerConnection.makeSettings();
    const url = URLExt.join(server.wsUrl, 'api/yjs');
    const collaborative =
      PageConfig.getOption('collaborative') === 'true' ? true : false;

    const factory = (
      options: IDocumentProviderFactory.IOptions
    ): IDocumentProvider => {
      let color = '#' + env.getParam('--usercolor', getRandomColor().slice(1));
      let name = env.getParam('--username', getAnonymousUserName());

      if (state) {
        const user = state.fetch(USER);
        user.then(param => {
          if (param !== undefined) {
            name = (param as string).split(',')[0];
            color = (param as string).split(',')[1];
          }
          options.ymodel.awareness.setLocalStateField('user', { name, color });
          console.debug(options.ymodel.awareness.getLocalState());
        });
      }

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
