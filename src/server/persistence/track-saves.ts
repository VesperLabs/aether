import type { Database } from "./database";

/** A database that remembers its writes still in flight, so shutdown can wait for them. */
export interface TrackedDatabase extends Database {
  /** Resolves once every write started so far (and any started while waiting) has finished. */
  settled(): Promise<void>;
}

export function trackSaves(db: Database): TrackedDatabase {
  const pending = new Set<Promise<unknown>>();
  const track =
    <A extends unknown[]>(write: (...args: A) => Promise<void>) =>
    (...args: A): Promise<void> => {
      const run = write(...args);
      pending.add(run);
      const done = () => pending.delete(run);
      run.then(done, done);
      return run;
    };
  return {
    ...db,
    updateUser: track(db.updateUser),
    updateUserMapDetails: track(db.updateUserMapDetails),
    updateUserSetting: track(db.updateUserSetting),
    async settled() {
      while (pending.size > 0) await Promise.allSettled([...pending]);
    },
  };
}
