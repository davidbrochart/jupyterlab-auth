import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { AuthWidget } from './widget';

import { reactIcon } from '@jupyterlab/ui-components';

const auth: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-auth',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    const widget = new AuthWidget();
    widget.id = 'jupyterlab-auth';
    widget.title.icon = reactIcon;
    app.shell.add(widget, 'left', { rank: 300 });
  }
};

export default auth;
