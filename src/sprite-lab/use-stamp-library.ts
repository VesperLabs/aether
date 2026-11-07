import { useEffect, useState } from "react";
import type { Stamp } from "./map-stamps";

const LIBRARY_URL = "/api/map-stamps";

/** The shared stamp library, saved back to the repo on every change. */
export const useStampLibrary = () => {
  const [library, setLibrary] = useState<Stamp[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(LIBRARY_URL)
      .then((response) => response.json())
      .then(setLibrary)
      .catch(() => setError("Couldn't load the stamp library"));
  }, []);

  const save = async (next: Stamp[]) => {
    setError("");
    const response = await fetch(LIBRARY_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Couldn't save the stamp library");
      return false;
    }
    setLibrary(result);
    return true;
  };

  return { library, save, error };
};
