import React from 'react';

import { ReactWidget } from '@jupyterlab/apputils';

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

  render(): JSX.Element {
    return <AuthComponent users={this.users} />;
  }

  setUsers(users: []): void {
    this.users = users;
    this.update();
  }
}
