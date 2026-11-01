/** How far an NPC chases a player it has already locked on to. */
export const AGGRO_KITE_RANGE = 220;
/** Default distance at which an NPC attacks (melee). */
export const NPC_SHOULD_ATTACK_RANGE = 8;
/** Both combined is time between attacks. Game designed to have ~700 total (400 here + stats.attackDelay). */
export const NPC_ATTACK_ADDED_DELAY = 400;
/** The wind-up before an NPC attack or spell lands, on top of the attack or cast delay. */
export const NPC_WARNING_DELAY = 200;
/** How far a player can walk from an NPC they are talking to before the conversation ends. */
export const NPC_TALK_RANGE = 80;
/** Extra distance allowed on top of the talk range, for latency and for the NPC wandering. */
export const NPC_TALK_LATENCY_TOLERANCE = 40;
/** Average milliseconds between random wander direction changes (each wait is 50% to 150% of it). */
export const NPC_WANDER_CHANGE_MS = 250;
/** Wandering is slower than walking. */
export const NPC_WANDER_SPEED_DIVISOR = 2.5;
/** Chance per tick that an idle NPC decides to cast a buff on itself. */
export const NPC_BUFF_CAST_PROBABILITY = 0.01;
/** Time without combat after which a locked NPC is considered to have lost aggro. */
export const NPC_LOSE_AGGRO_MS = 5000;
/** Share of its threat an NPC forgets each second. */
export const NPC_THREAT_DECAY_PER_SEC = 0.05;
/** Someone needs this many times the current target's threat to pull the NPC off it. */
export const NPC_THREAT_SWITCH_RATIO = 1.1;
/** How far an NPC follows a fight from its spawn before it gives up, walks home and heals. */
export const NPC_LEASH_RANGE = 450;
/** Below this share of max hp, an NPC with `retreat` runs from its target. */
export const NPC_RETREAT_HP_RATIO = 0.25;
/** An NPC with `retreat` runs once per fight, for this long, then turns and fights to the end. */
export const NPC_RETREAT_MS = 3000;
/** Retreating NPCs limp away at this share of walk speed, so a chaser easily catches them. */
export const NPC_RETREAT_SPEED_RATIO = 0.5;
/** An NPC with `kite` and a ranged weapon backs off when its target gets this close. */
export const NPC_KITE_MIN_RANGE = 48;
/** NPCs only shoot from this share of a projectile's flight distance, so a target on the move is still hit. */
export const NPC_SHOT_MARGIN = 0.85;
/** How much NPC shots lead a moving target: a little, so running in a straight line still gets hit but juking dodges. */
export const NPC_AIM_LEAD_RATIO = 0.3;
/** Ranged NPCs sidestep at this share of walk speed between shots. */
export const NPC_STRAFE_SPEED_RATIO = 0.5;
/** Average milliseconds before a sidestepping NPC switches sides (each wait is 50% to 150% of it). */
export const NPC_STRAFE_SWITCH_MS = 1500;
/** Kiters back off at this share of walk speed, so a player chasing them can catch up. */
export const NPC_KITE_SPEED_RATIO = 0.6;
/** A follower walks to its leader once it is further than this, and waits when closer. */
export const NPC_FOLLOW_DISTANCE = 40;
/** The behavior an NPC is already doing gets this much added to its score, so it doesn't flicker. */
export const NPC_BEHAVIOR_STICKINESS = 0.04;
/** Close enough to spawn to count as home after a reset. */
export const NPC_HOME_RANGE = 4;
/** How long an NPC stands still after a lunge: the window to hit back. */
export const NPC_LUNGE_RECOVERY_MS = 450;
/** Bubble over an NPC fighting someone. Clients draw it as a ring that fills while it winds up. */
export const NPC_ENGAGED_BUBBLE = "!";
/** Extra windup on an NPC lunge, on top of the warning and its attack delay: the dash is fast, so the tell is long. */
export const NPC_LUNGE_EXTRA_WINDUP = 250;
