// What each platform screen needs before it is shown (see prime.js).
import { ensure, prime } from './prime';
import { accountQuery, directoryQuery } from '../core/query/queries';

export const directoryLoader = prime(({ qc }) => ensure(qc, directoryQuery()));

// Signed out, the account answers 401 at once and the screen asks to sign in.
export const accountLoader = prime(({ qc }) => ensure(qc, accountQuery()));
