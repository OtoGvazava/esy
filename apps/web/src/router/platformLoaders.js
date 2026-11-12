// What each platform screen needs before it is shown (see prime.js).
import { ensure, prime } from './prime';
import { accountQuery, addressesQuery, directoryQuery } from '../core/query/queries';

export const directoryLoader = prime(({ qc }) => ensure(qc, directoryQuery()));

// Signed out, the account answers 401 at once and the screen asks to sign in.
export const accountLoader = prime(({ qc }) => ensure(qc, accountQuery()));

// The address book, for its own screen; signed out it answers 401 and the
// account's frame asks to sign in before the screen is ever drawn.
export const addressesLoader = prime(({ qc }) => ensure(qc, addressesQuery()));
