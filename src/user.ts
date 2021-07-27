import {
  JupyterFrontEndPlugin,
  JupyterFrontEnd,
  IRouter
} from '@jupyterlab/application';

import { URLExt } from '@jupyterlab/coreutils';

import { ServerConnection } from '@jupyterlab/services';

import { Dialog } from '@jupyterlab/apputils';

import {
  getRandomColor,
	getAnonymousUserName
} from '@jupyterlab/docprovider/lib/awareness';

import { ISignal, Signal } from '@lumino/signaling';

import { IUser } from './tokens';

import { UserNameInput } from './components';

/**
 * A namespace for command IDs.
 */
export namespace CommandIDs {
  export const login = 'jupyterlab-auth:login';
}

const user: JupyterFrontEndPlugin<User> = {
  id: 'jupyterlab-auth:user',
  autoStart: true,
  requires: [IRouter],
	provides: IUser,
  activate: (app: JupyterFrontEnd, router: IRouter): User => {
		const { commands } = app;
		const user = new User();
		
		commands.addCommand(CommandIDs.login, {
			execute: () => {
				if (!user.isReady) {
					const body = new UserNameInput(user, commands);
					const dialog = new Dialog({
						title: 'Anonymous username',
						body,
						hasClose: false,
						buttons: [Dialog.okButton({
							label: "Send"
						})]
					});
					dialog.node.onclick = (event: MouseEvent) => {
						event.preventDefault();
						event.stopImmediatePropagation();
					};
  				dialog.launch().then( data => {
						if (data.button.accept) {
							const settings = ServerConnection.makeSettings();
							const requestUrl = URLExt.join(settings.baseUrl, 'login');
							const init: RequestInit = {
								method: "POST",
								body: JSON.stringify({
									name: data.value,
									color: user.color
								})
							};
							ServerConnection.makeRequest(requestUrl, init, settings)
							.then( async resp => {
								user.update();
							});
						}
					});
				}
			}
		});

		router.register({
			pattern: /^\/lab/,
			command: CommandIDs.login
		});
		
		return user;
  }
};

export default user;

export class User implements IUser {
	private _id: string;
	private _name: string;
	private _username: string;
	private _initials: string;
	private _color: string;
	private _email?: string;
	private _avatar?: string;

	private _isAnonymous: boolean = true;
	private _isReady: boolean = false;
	private _ready = new Signal<IUser, boolean>(this);
	private _changed = new Signal<IUser, void>(this);

	private _logInMethods: string[] = [];

	constructor(){
		this._requestUser().then(() => {
			this._ready.emit(this._isReady);
		});
	}

	get id(): string {
		return this._id;
	}
	get name(): string {
		return this._name;
	}
	get username(): string {
		return this._username;
	}
	get initials(): string {
		return this._initials;
	}
	get color(): string {
		return this._color;
	}
	get email(): string | null {
		return this._email;
	}
	get avatar(): string | null {
		return this._avatar;
	}

	get isAnonymous(): boolean {
		return this._isAnonymous;
	}
	get isReady(): boolean {
		return this._isReady;
	}
	get ready(): ISignal<IUser, boolean> {
		return this._ready;
	}
	get changed(): ISignal<IUser, void> {
		return this._changed;
	}
	get logInMethods(): string[] {
		return this._logInMethods;
	}

	registerLogInMethod(command: string): void {
		this._logInMethods.push(command);
	}

	update() {
		this._requestUser().then(() => {
			this._changed.emit();
		});
	}

	private async _requestUser(): Promise<void> {
		const settings = ServerConnection.makeSettings();
    const requestUrl = URLExt.join(settings.baseUrl, 'auth', 'user');
    return ServerConnection.makeRequest(requestUrl, {}, settings)
    .then( async resp => {
      if (!resp.ok) {
        return Promise.resolve();
      }

      const data = await resp.json();
			this._isReady = data.initialized;
			this._isAnonymous = data.anonymous;
			
			this._id = data.id;
			this._name = data.name || getAnonymousUserName();
			this._username = data.username || this._name;

			const name = this._name.split(' ');
			if (name.length > 0) {
				this._initials = name[0].substring(0, 1).toLocaleUpperCase();
			}
			if (name.length > 1) {
				this._initials += name[1].substring(0, 1).toLocaleUpperCase();
			}

			this._color = data.color || getRandomColor();
			this._email = data.email;
			this._avatar = data.avatar;
      
			return Promise.resolve();
    }).catch( err => console.error(err) );	
	}
}