import { JupyterFrontEndPlugin } from '@jupyterlab/application';

import auth from './auth';
import userIcon from './login';
import docProviderPlugin from './docprovider';

import '../style/index.css';

const plugins: JupyterFrontEndPlugin<any>[] = [
  auth,
  userIcon,
  docProviderPlugin
];

export default plugins;
