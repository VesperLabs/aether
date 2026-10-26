/**
 * The `state` bag on a character: flags and timers (`isDead`, `lastCombat`, `activeSets`, ...)
 * that many rules read and write. Legacy shape: the keys aren't typed yet.
 */
// oxlint-disable-next-line typescript/no-explicit-any
export type CharacterState = Record<string, any>;
