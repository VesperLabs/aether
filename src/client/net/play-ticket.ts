const TICKET_PREFIX = "#ticket=";

/**
 * The login ticket the wiki sent us here with, if any. It rides in the URL fragment, which browsers
 * never send to a server, and is wiped from the address bar and history as soon as it is read.
 * Read once, at startup.
 */
export function takePlayTicket() {
  const { hash, pathname, search } = window.location;
  if (!hash.startsWith(TICKET_PREFIX)) return null;
  window.history.replaceState(null, "", pathname + search);
  return hash.slice(TICKET_PREFIX.length);
}
