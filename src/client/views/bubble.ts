import Phaser from "phaser";
import { buffIcon } from "@/content";
import { getTrimmedFrame } from "./trimmed-frame";
const Sprite = Phaser.GameObjects.Sprite;
type Sprite = Phaser.GameObjects.Sprite;
type Piece = Phaser.GameObjects.BitmapText | Sprite;

const FRAME_SIZE = 4;
/** Widest a line gets before it wraps, in bubble pixels (the bubble shows at half size). */
const MAX_WIDTH = 256;
/** Longest run of letters before a word is broken onto the next line. */
const MAX_WORD = 20;
/** A buff icon in a message, in bubble pixels: spell art is 32px. */
const ICON_SIZE = 24;
const LINE_GAP = 2;
/** `&poison` in a message draws the poison icon; anything else after `&` stays text. */
const ICON_CODE = /^&([A-Za-z0-9_-]+)$/;

let fontMetrics: { textHeight: number; space: number } | undefined;

/**
 * A speech bubble over a character's head. Its message is words and icon codes (`&poison`):
 * players type them after `!` in chat.
 */
export class Bubble extends Phaser.GameObjects.Container {
  declare headY: number;
  /** The message the bubble was last laid out for. */
  declare laidOutMessage: string | undefined;
  /** The frame: corners, edges, fill and tail. */
  declare frame: Record<
    "tl" | "top" | "tr" | "left" | "bg" | "right" | "bl" | "bot" | "br",
    Sprite
  >;
  declare tail: Sprite;
  /** The words and icons inside the frame. */
  declare content: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, headY: number, message: string | undefined) {
    super(scene, 0, 0);
    this.headY = headY;
    /* The 3×3 frame sheet, top-left to bottom-right */
    const names = ["tl", "top", "tr", "left", "bg", "right", "bl", "bot", "br"] as const;
    this.frame = Object.fromEntries(
      names.map((name, index) => [
        name,
        new Sprite(scene, 0, 0, "misc-bubble", index).setOrigin(0, 0),
      ]),
    ) as Bubble["frame"];
    this.tail = new Sprite(scene, 0, 0, "misc-bubble-tail", 0).setOrigin(0, 1);
    this.content = new Phaser.GameObjects.Container(scene, FRAME_SIZE * 2, FRAME_SIZE + 2);
    this.add([...Object.values(this.frame), this.tail, this.content]);
    this.setScale(0.5);
    this.setMessage(message);
  }

  setTint(tintColor: number) {
    for (const piece of Object.values(this.frame)) piece.setTint(tintColor);
    this.tail.setTint(tintColor);
  }

  setMessage(message: string | undefined) {
    if (!message?.trim()) {
      this.laidOutMessage = undefined;
      return this.setVisible(false);
    }
    /* Called every frame: only lay out again when the message changes, so offsets like recoil stick */
    if (message === this.laidOutMessage && this.visible) return;
    this.setVisible(true);
    this.laidOutMessage = message;
    const { width, height } = this.layOut(message);
    this.fitFrame(width + 10, height + 5);
    this.center(width + 10, height + 5);
  }

  /** Fills the content with the message's words and icons, wrapped; returns its size. */
  private layOut(message: string) {
    this.content.removeAll(true);
    const { textHeight, space } = this.measureFont();
    const lines: { pieces: Piece[]; width: number; height: number }[] = [];
    let line = { pieces: [] as Piece[], width: 0, height: textHeight };
    for (const piece of message
      .trim()
      .split(/\s+/)
      .flatMap((word) => this.pieces(word))) {
      const gap = line.pieces.length ? space : 0;
      if (line.pieces.length && line.width + gap + piece.displayWidth > MAX_WIDTH) {
        lines.push(line);
        line = { pieces: [], width: 0, height: textHeight };
      }
      piece.x = line.width + (line.pieces.length ? space : 0);
      line.width = piece.x + piece.displayWidth;
      line.height = Math.max(line.height, piece.displayHeight);
      line.pieces.push(piece);
    }
    lines.push(line);
    let top = 0;
    for (const { pieces, height } of lines) {
      for (const piece of pieces) {
        /* Words share a baseline; icons sit centred on the line */
        const pieceHeight = piece instanceof Sprite ? piece.displayHeight : textHeight;
        piece.y = Math.round(top + (height - pieceHeight) / 2);
        this.content.add(piece);
      }
      top += height + LINE_GAP;
    }
    return {
      width: Math.max(...lines.map((l) => l.width)),
      height: top - LINE_GAP,
    };
  }

  /** One word as what it draws: an icon for a known code, else text in runs short enough to wrap. */
  private pieces(word: string): Piece[] {
    const code = word.match(ICON_CODE)?.[1];
    const key = code && buffIcon(code);
    if (key && this.scene.textures.exists(key)) {
      const icon = new Sprite(this.scene, 0, 0, key, getTrimmedFrame(this.scene, key));
      return [icon.setOrigin(0, 0).setScale(ICON_SIZE / 32)];
    }
    const runs = word.match(new RegExp(`.{1,${MAX_WORD}}`, "gu")) ?? [];
    return runs.map((run) => this.text(run));
  }

  /** The font's line height and the width of a space, measured once. */
  private measureFont() {
    const measure = (text: string) => {
      const piece = this.text(text);
      const { width, height } = piece;
      piece.destroy();
      return { width, height };
    };
    fontMetrics ??= {
      textHeight: measure("Ag").height,
      space: measure("a a").width - measure("aa").width,
    };
    return fontMetrics;
  }

  private text(text: string) {
    return new Phaser.GameObjects.BitmapText(this.scene, 0, 0, "nin-dark", text);
  }

  /** Stretches the frame around a `width` × `height` inside. */
  private fitFrame(width: number, height: number) {
    const { tl, top, tr, left, bg, right, bl, bot, br } = this.frame;
    const [x, y] = [width + FRAME_SIZE, height + FRAME_SIZE];
    tl.setPosition(0, 0);
    top.setPosition(FRAME_SIZE, 0).setDisplaySize(width, FRAME_SIZE);
    tr.setPosition(x, 0);
    left.setPosition(0, FRAME_SIZE).setDisplaySize(FRAME_SIZE, height);
    bg.setPosition(FRAME_SIZE, FRAME_SIZE).setDisplaySize(width, height);
    right.setPosition(x, FRAME_SIZE).setDisplaySize(FRAME_SIZE, height);
    bl.setPosition(0, y);
    bot.setPosition(FRAME_SIZE, y).setDisplaySize(width, FRAME_SIZE);
    br.setPosition(x, y);
    this.tail.setPosition((width + FRAME_SIZE * 2) / 2 - 4, y + FRAME_SIZE + 3);
  }

  /** Sits the bubble centred over the head. */
  private center(width: number, height: number) {
    this.x = -Math.floor((width + FRAME_SIZE * 2) / 4);
    this.y = -Math.floor(height / 2 + FRAME_SIZE) + this.headY - 2;
  }
}
