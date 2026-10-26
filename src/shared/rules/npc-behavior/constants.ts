/** How far an NPC chases a player it has already locked on to. */
export const AGGRO_KITE_RANGE = 220;
/** Default distance at which an NPC attacks (melee). */
export const NPC_SHOULD_ATTACK_RANGE = 8;
/** Both combined is time between attacks. Game designed to have ~700 total (400 here + stats.attackDelay). */
export const NPC_ATTACK_ADDED_DELAY = 400;
/** The wind-up before an NPC attack or spell lands, on top of the attack or cast delay. */
export const NPC_WARNING_DELAY = 100;
/** How far a player can walk from an NPC they are talking to before the conversation ends. */
export const NPC_TALK_RANGE = 80;
/** Extra distance allowed on top of the talk range, for latency and for the NPC wandering. */
export const NPC_TALK_LATENCY_TOLERANCE = 40;
/** Frames between random wander direction changes. */
export const NPC_WANDER_CHANGE_DELAY = 9;
/** Wandering is slower than walking. */
export const NPC_WANDER_SPEED_DIVISOR = 2.5;
/** Chance per tick that an idle NPC decides to cast a buff on itself. */
export const NPC_BUFF_CAST_PROBABILITY = 0.01;
/** Time without combat after which a locked NPC is considered to have lost aggro. */
export const NPC_LOSE_AGGRO_MS = 5000;
