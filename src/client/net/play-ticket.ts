const TICKET_PREFIX = "#ticket=";

/** Whether this page was opened with a ticket still to redeem: the login form can stay away. */
export const hasPlayTicket = () => window.location.hash.startsWith(TICKET_PREFIX);

/**
 * The login ticket the wiki sent us here with, if any. It rides in the URL fragment, which browsers
 * never send to a server, and is wiped from the address bar and history as soon as it is read.
 */
export function takePlayTicket() {
  const { hash, pathname, search } = window.location;
  if (!hash.startsWith(TICKET_PREFIX)) return null;
  window.history.replaceState(null, "", pathname + search);
  return hash.slice(TICKET_PREFIX.length);
}
