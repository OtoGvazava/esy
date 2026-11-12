// What each platform screen needs before it is shown (see prime.js).
import { ensure, prime } from './prime';
import { directoryQuery } from '../core/query/queries';

export const directoryLoader = prime(({ qc }) => ensure(qc, directoryQuery()));
