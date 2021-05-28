import { Message } from '@lumino/messaging';
import React from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { requestAPI } from './handler';

/**
 * React auth component.
 *
 * @returns The React component
 */
const AuthComponent = (data: any): JSX.Element => {
  const users = data.users.users;
  return (
    <div>
      {users.map((user: any) => (
        <div key={user.login}>
          <a href={`https://github.com/${user.login}`} target="_blank">
            <img src={user.avatar_url} style={{ width: '100px' }} />
            <div>{user.login}</div>
            <div>{user.name}</div>
          </a>
          <hr />
        </div>
      ))}
    </div>
  );
};

/**
 * A Auth Lumino Widget that wraps a AuthComponent.
 */
export class AuthWidget extends ReactWidget {
  private users: [] = [];

  /**
   * Constructs a new CounterWidget.
   */
  constructor() {
    super();
    this.addClass('jp-AuthWidget');
  }

  request(path: string) {
    return requestAPI<any>(path)
      .then(data => {
        console.log('Got a response from the jupyterlab-auth server API', data);
        this.setUsers(data);
      })
      .catch(reason => {
        console.error(
          `The jupyterlab-auth server API appears to be missing.\n${reason}`
        );
      });
  }

  /**
   * A message handler invoked on a `'before-show'` message.
   *
   * #### Notes
   * The default implementation of this handler is a no-op.
   */
  onBeforeShow(msg: Message): void {
    // Trigger request when the widget is displayed
    this.request('users');
    super.onBeforeShow(msg);
  }

  render(): JSX.Element {
    return <AuthComponent users={this.users} />;
  }

  setUsers(users: []): void {
    this.users = users;
    this.update();
  }
}
