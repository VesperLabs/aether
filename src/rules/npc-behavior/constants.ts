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
/** An NPC with `fleeBelow` runs once per fight, for this long, then turns and fights to the end. */
export const NPC_RETREAT_MS = 3000;
/** Retreating NPCs limp away at this share of walk speed, so a chaser easily catches them. */
export const NPC_RETREAT_SPEED_RATIO = 0.5;
/** An NPC that keeps away backs off when its target gets this close. */
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
/**
 * Further than this from its leader, a follower paths around walls; closer, it walks straight.
 * Pathing steps between tile centres, which turns it sideways and back, so it is the last resort.
 */
export const NPC_FOLLOW_PATH_DISTANCE = 160;
/** The behavior an NPC is already doing gets this much added to its score, so it doesn't flicker. */
export const NPC_BEHAVIOR_STICKINESS = 0.04;
/** Close enough to spawn to count as home after a reset. */
export const NPC_HOME_RANGE = 4;
/** How long an NPC stands still after a lunge: the window to hit back. */
export const NPC_LUNGE_RECOVERY_MS = 450;
/** Extra windup on an NPC lunge, on top of the warning and its attack delay: the dash is fast, so the tell is long. */
export const NPC_LUNGE_EXTRA_WINDUP = 250;

/** NPCs take this much longer than players to cast a spell, so there is time to dodge it, in ms. */
export const NPC_EXTRA_CAST_TIME = 1000;

/** A pounce lands this far short of where it predicts the target will be, px. */
export const NPC_POUNCE_STOP_SHORT = 6;
/** Chasing a foe, an NPC speeds up to this share of its walk speed: still a little slower than a player. */
export const NPC_CHASE_SPEED_RATIO = 1.2;
/** A melee swing aims this far ahead of a moving target, ms. */
export const NPC_SWING_LEAD_MS = 150;
/** A chase leads its target by up to this long, ms... */
export const NPC_CHASE_LEAD_MAX_MS = 600;
/** ...times this share, so it closes in without overshooting a target that turns. */
export const NPC_CHASE_LEAD_RATIO = 0.5;
/** How close a player comes before a `skittish` NPC takes off, px. */
export const SKITTISH_RANGE = 72;
/** The longest a scared `skittish` NPC keeps getting away after it was last scared, ms. */
export const SKITTISH_CALM_MS = 4000;
/** How far a scared `skittish` NPC gets away from whoever scared it, px: between these. */
export const SKITTISH_ESCAPE_MIN = 220;
export const SKITTISH_ESCAPE_MAX = 320;
/** How far, in radians, its escape may veer either side of straight away. */
export const SKITTISH_ESCAPE_VEER = 0.7;
/** How much faster than its walk a scared `skittish` NPC gets away. */
export const SKITTISH_SPEED_RATIO = 1.8;
/** How close a `skittish` NPC gets to its escape spot to call the escape done, px. */
export const SKITTISH_ARRIVED = 12;
/** Share of its flight speed a bird keeps after landing, never above its walk speed. */
export const NPC_LAND_DRIFT_RATIO = 0.3;
/** How long an NPC drifts on after landing, the way it flew, before it wanders on, ms. */
export const NPC_LAND_SETTLE_MS = 900;
