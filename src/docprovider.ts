import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { PageConfig, URLExt } from '@jupyterlab/coreutils';
import {
  IDocumentProvider,
  IDocumentProviderFactory,
  ProviderMock,
  WebSocketProviderWithLocks,
	//@ts-ignore
	getRandomColor,
	//@ts-ignore
	getAnonymousUserName
} from '@jupyterlab/docprovider';
import { ServerConnection } from '@jupyterlab/services';

import { requestAPI } from './handler';

/**
 * The default document provider plugin
 */
const docProviderPlugin: JupyterFrontEndPlugin<IDocumentProviderFactory> = {
  id: 'jupyterlab-auth:docprovider',
  provides: IDocumentProviderFactory,
  activate: (app: JupyterFrontEnd): IDocumentProviderFactory => {
    const server = ServerConnection.makeSettings();
    const url = URLExt.join(server.wsUrl, 'api/yjs');
    const collaborative =
      PageConfig.getOption('collaborative') == 'true' ? true : false;
		const user = {
			name: getAnonymousUserName(),
			color: getRandomColor().slice(1)
		};
		
		requestAPI<any>('user').then( data => {
				user.name = data.name;
		});

    const factory = (
      options: IDocumentProviderFactory.IOptions
    ): IDocumentProvider => {
			options.ymodel.awareness.setLocalStateField('user', user);
			console.debug(options.ymodel.awareness.getLocalState());
			
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