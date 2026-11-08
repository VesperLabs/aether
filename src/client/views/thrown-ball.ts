import Phaser from "phaser";
import type { BallEffectWire, EffectOutcome } from "@/network";
import { characterHitBox } from "@/rules/spells";
import type { Point } from "@/rules/world";
import { FLASH_PEAK_MS, playCaptureBeam } from "./capture-beam";
import { playObjectDissolve } from "./dissolve";
import { playCaptureStruggle } from "./capture-struggle";
import type { Player } from "./player";

/*
 * A thrown ball effect (`sync/effects`), drawn from what the server says: it flies spinning at its
 * creature, rides on it while the creature struggles, then the server's ending plays on it: the
 * creature goes into it in a burst of light, or the ball pops and it is free. Someone walking in
 * mid-throw sees it from where it has got to.
 */

/** How far in front of its creature the ball sorts: past the white body a catch flashes. */
const BALL_DEPTH_AHEAD = 2;
/** How fast the ball spins in flight, in degrees per second. */
const SPIN_SPEED = 900;
/** How much faster or slower than `SPIN_SPEED` a throw may spin, as a share of it. */
const SPIN_SPREAD = 0.4;
/** How long a ball that missed or broke open takes to pixelate away, in ms. */
const PIXELATE_MS = 300;
/** How long a missed ball lies on the ground before it goes, in ms. */
const LIE_MS = 450;
/** How far a missed ball rolls on after it lands, in pixels, before `ROLL_SPREAD`. */
const ROLL_DISTANCE = 7;
/** How much farther or shorter than `ROLL_DISTANCE` a miss may roll, as a share of it. */
const ROLL_SPREAD = 0.4;
/** How long a missed ball rolls before it stops, in ms; it lies still for the rest of `LIE_MS`. */
const ROLL_MS = 300;
/** A ball whose ending never arrives (a lost message) pops this long after it was due, in ms. */
const END_WAIT_MS = 1500;

/** What ends each ball on screen, by effect id. */
const endings = new Map<string, (outcome: EffectOutcome) => void>();
/** Every ball on screen, so a room change can take them all off. */
const balls = new Set<Phaser.GameObjects.Image>();
/** Creatures a ball just caught: their catch death already played, on the ball. */
const caughtByBall = new Set<string>();

/** The server ended ball `id`. */
export function endThrownBall(id: string, outcome: EffectOutcome) {
  endings.get(id)?.(outcome);
}

/** Whether creature `id` just went into a ball, so its death needs nothing more. */
export function takeCaughtByBall(id: string) {
  return caughtByBall.delete(id);
}

/** Takes every ball off screen, e.g. when the hero changes room and its creatures go. */
export function clearThrownBalls() {
  for (const ball of [...balls]) ball.destroy();
}

/** Draws a thrown ball, `effect.ageMs` along. `target` is its creature, if it is on screen. */
export function playThrownBall(scene: Phaser.Scene, effect: BallEffectWire, target?: Player) {
  const { from, to, flightMs, struggleMs, ageMs } = effect;
  const ball = scene.add.image(from.x, from.y, effect.texture, "preview").setScale(0.6);
  const spin = from.x <= to.x ? 1 : -1;

  /* The middle of its creature's hit box while it is there; where it was last, after */
  let aim = target ? hitCenter(target) : to;
  const track = () => {
    if (target?.active && !target.state?.isDead) aim = hitCenter(target);
    return aim;
  };
  /* Sorts with its creature, as a buff does, or by its own feet with none */
  const place = (at: Point) => {
    ball.setPosition(at.x, at.y);
    ball.setDepth(target?.active ? target.depth + BALL_DEPTH_AHEAD : 100 + ball.y);
  };

  let stopStruggle = () => {};
  const follow = () => place(track());
  /* Every way a ball goes, it pixelates away, as a creature does when it dies */
  const pixelateAway = (delay = 0) =>
    scene.time.delayedCall(delay, () => {
      /* On a creature, it goes on riding it as it pixelates */
      if (ball.active) playObjectDissolve(ball, PIXELATE_MS, effect.targetId ? track : undefined);
    });

  let flight: Phaser.Tweens.Tween | undefined;
  let isEnded = false;
  const end = (outcome: EffectOutcome) => {
    if (isEnded) return;
    isEnded = true;
    endings.delete(effect.id);
    flight?.stop();
    stopStruggle();
    /* A ball on the ground finishes going on its own */
    if (outcome === "done") return;
    if (outcome === "caught" && target?.active) {
      /* Held here, in front of the flash: the creature's depth may change as it dies */
      scene.events.off("update", follow);
      place(track());
      ball.setDepth(target.depth + BALL_DEPTH_AHEAD + 1);
      caughtByBall.add(target.id);
      playCaptureBeam(target, { x: ball.x, y: ball.y });
      return void dissolveWithFlash(ball, track);
    }
    /* It breaks free, or there is nobody left to catch: the ball pops off */
    pixelateAway();
  };
  endings.set(effect.id, end);
  balls.add(ball);

  /* Gone however it goes: pixelated away, its creature removed, or a room change */
  const onTargetGone = () => ball.destroy();
  target?.once(Phaser.GameObjects.Events.DESTROY, onTargetGone);
  ball.once(Phaser.GameObjects.Events.DESTROY, () => {
    isEnded = true;
    endings.delete(effect.id);
    balls.delete(ball);
    scene.events.off("update", follow);
    flight?.stop();
    stopStruggle();
    scene.tweens.killTweensOf(ball);
    target?.off(Phaser.GameObjects.Events.DESTROY, onTargetGone);
  });

  /* Each throw spins a little differently, from a start angle at its own speed. Seeded by the
   * effect's id, so everyone watching sees it land at the same angle */
  const seed = hashId(effect.id);
  const startAngle = (seed % 360) - 180;
  const spinSpeed =
    SPIN_SPEED * (1 - SPIN_SPREAD + (2 * SPIN_SPREAD * ((seed >>> 9) % 1000)) / 1000);
  /* Its spin `t` of the way through the flight */
  const flightAngle = (t: number) => startAngle + (spin * spinSpeed * t * flightMs) / 1000;

  /* Along the throw, as far as this throw's seed says, turning as a ball does when it rolls */
  const throwLength = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const rollDistance =
    ROLL_DISTANCE * (1 - ROLL_SPREAD + (2 * ROLL_SPREAD * ((seed >>> 19) % 1000)) / 1000);
  const rollTo = {
    x: to.x + ((to.x - from.x) / throwLength) * rollDistance,
    y: to.y + ((to.y - from.y) / throwLength) * rollDistance,
  };
  const rollDegrees = Phaser.Math.RadToDeg(rollDistance / Math.max(1, ball.displayWidth / 2));
  const rollAt = (t: number) => {
    place({ x: to.x + (rollTo.x - to.x) * t, y: to.y + (rollTo.y - to.y) * t });
    ball.setAngle(flightAngle(1) + spin * rollDegrees * t);
  };
  const rollOn = (sinceLanding: number) => {
    const startShare = Math.min(1, sinceLanding / ROLL_MS);
    rollAt(Phaser.Math.Easing.Quadratic.Out(startShare));
    if (startShare >= 1) return;
    flight = scene.tweens.addCounter({
      from: startShare,
      to: 1,
      duration: ROLL_MS - sinceLanding,
      onUpdate: (tween) => rollAt(Phaser.Math.Easing.Quadratic.Out(tween.getValue() ?? 0)),
    });
  };

  const land = () => {
    const sinceLanding = Math.max(0, ageMs - flightMs);
    if (!effect.targetId) {
      /* A miss rolls on a little along the throw, slowing to a stop, then lies there */
      rollOn(sinceLanding);
      return void pixelateAway(Math.max(0, LIE_MS - sinceLanding));
    }
    /* Rides upright on its creature while it struggles, until the server ends it */
    ball.setAngle(0);
    follow();
    scene.events.on("update", follow);
    stopStruggle = playCaptureStruggle(ball, struggleMs, sinceLanding);
    scene.time.delayedCall(Math.max(0, struggleMs - sinceLanding) + END_WAIT_MS, () =>
      end("broke"),
    );
  };

  /* Flies the rest of the way from where it has got to */
  const startShare = Math.min(1, ageMs / Math.max(1, flightMs));
  if (startShare >= 1) return land();
  flight = scene.tweens.addCounter({
    from: startShare,
    to: 1,
    duration: Math.max(1, flightMs - ageMs),
    onUpdate: (tween) => {
      const t = tween.getValue() ?? 0;
      const at = track();
      place({ x: from.x + (at.x - from.x) * t, y: from.y + (at.y - from.y) * t });
      ball.setAngle(flightAngle(t));
    },
    onComplete: land,
  });
}

/**
 * A full ball over the capture flash: it pixelates away as a creature does when it dies, starting
 * with the flash and gone by the time the light is at its biggest.
 */
function dissolveWithFlash(ball: Phaser.GameObjects.Image, follow: () => Point) {
  playObjectDissolve(ball, FLASH_PEAK_MS, follow);
}

function hitCenter(player: Player): Point {
  const box = characterHitBox(player);
  return { x: box.x, y: box.y };
}

/** A steady number from an effect id (FNV-1a). */
function hashId(id: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
