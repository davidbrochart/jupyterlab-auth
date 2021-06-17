import { JupyterFrontEndPlugin } from '@jupyterlab/application';

import auth from './auth';

import docProviderPlugin from './docprovider';

import '../style/index.css';

const plugins: JupyterFrontEndPlugin<any>[] = [
  auth,
	docProviderPlugin
];

export default plugins;