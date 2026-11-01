/**
 * Remembers the login through the browser's password manager (Credential
 * Management API). The password never touches localStorage. Browsers without
 * the API (Safari, Firefox) still offer to save via the form's autocomplete.
 */
import { useEffect, useEffectEvent, useRef } from "react";

type SavedLogin = { email: string; password: string };

type PasswordCredentialLike = Credential & { password?: string };
type PasswordCredentialCtor = new (data: { id: string; password: string }) => Credential;

const getPasswordCredential = () =>
  (globalThis as { PasswordCredential?: PasswordCredentialCtor }).PasswordCredential;

const loadSavedLogin = async (): Promise<SavedLogin | null> => {
  if (!getPasswordCredential() || !navigator.credentials) return null;
  try {
    const cred = (await navigator.credentials.get({
      password: true,
      mediation: "optional",
    } as CredentialRequestOptions)) as PasswordCredentialLike | null;
    if (!cred?.password) return null;
    return { email: cred.id, password: cred.password };
  } catch {
    return null;
  }
};

const storeSavedLogin = ({ email, password }: SavedLogin) => {
  const PasswordCredential = getPasswordCredential();
  if (!PasswordCredential || !navigator.credentials) return;
  navigator.credentials.store(new PasswordCredential({ id: email, password })).catch(() => {});
};

/**
 * Fills the form from a saved login on mount. The form reports the login in
 * flight with `attempt` and clears it with `fail`; the login modal unmounts
 * only after a successful login, so whatever is pending then gets saved.
 */
export const useSavedLogin = (onLoad: (saved: SavedLogin) => void) => {
  const pendingLogin = useRef<SavedLogin | null>(null);
  const onLoadEvent = useEffectEvent(onLoad);

  useEffect(() => {
    let cancelled = false;
    loadSavedLogin().then((saved) => {
      if (!cancelled && saved) onLoadEvent(saved);
    });
    return () => {
      cancelled = true;
      if (pendingLogin.current) storeSavedLogin(pendingLogin.current);
    };
  }, []);

  return {
    attempt: (login: SavedLogin) => {
      pendingLogin.current = login;
    },
    fail: () => {
      pendingLogin.current = null;
    },
  };
};
