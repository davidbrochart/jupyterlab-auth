import { JupyterFrontEndPlugin } from '@jupyterlab/application';

import user from './user';
import userMenu from './userMenu';
import userPanel from './userPanel';
import github from './signInGitHub';
import docProviderPlugin from './docprovider';

import '../style/index.css';

const plugins: JupyterFrontEndPlugin<any>[] = [
  user,
  userMenu,
  userPanel,
  github,
  docProviderPlugin
];

export default plugins;
