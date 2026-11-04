import { useEffect, useState } from "react";
import type { LoginCharacter } from "@/network";

const LOOKUP_DELAY_MS = 400;
const LOOKUP_RETRY_MS = 2000;
const LOOKS_LIKE_EMAIL = /^\S+@\S+\.\S+$/;

/** The character of the typed email, once typing pauses. Null while there is none to show. */
export function useCharacterLookup(email: string, isActive: boolean) {
  const [found, setFound] = useState<{ email: string; character: LoginCharacter | null }>();

  /* An answer about an email that has since been edited says nothing about this one */
  const isAnswered = found?.email === email;
  const isLoading = isActive && !isAnswered && LOOKS_LIKE_EMAIL.test(email);

  useEffect(() => {
    if (!isLoading) return;
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout>;

    const ask = async () => {
      try {
        const query = new URLSearchParams({ email });
        const res = await fetch(`${process.env.SERVER_URL}/players/lookup?${query}`, {
          signal: abort.signal,
        });
        if (!res.ok) throw new Error(`Lookup failed: ${res.status}`);
        const { character } = await res.json();
        setFound({ email, character });
      } catch {
        /* Server restarting or too many lookups: keep trying until it answers */
        if (!abort.signal.aborted) timer = setTimeout(ask, LOOKUP_RETRY_MS);
      }
    };

    timer = setTimeout(ask, LOOKUP_DELAY_MS);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [email, isLoading]);

  return isAnswered ? found.character : null;
}
