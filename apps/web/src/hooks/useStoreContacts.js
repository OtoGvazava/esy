import { useQuery } from '@tanstack/react-query';
import { publicContactsQuery } from '../core/query/queries';

const NONE = [];

/**
 * The channels a shopper may reach this store on, in the store's order. One
 * cached read for the store bar, the side menu's social buttons, the contact
 * rows and the quick contact buttons, which used to ask for it four times on
 * one page. Empty until it arrives and when it cannot be read: a store that
 * cannot list its channels still sells. `enabled` false asks for nothing.
 */
export function usePublicContacts(enabled = true) {
  const { data, isFetched } = useQuery({ ...publicContactsQuery(), enabled });
  return { channels: (enabled && data) || NONE, loaded: enabled && isFetched };
}

export default usePublicContacts;
