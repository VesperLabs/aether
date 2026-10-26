import Phaser from "phaser";
import type { SceneMain } from "@/client/scenes/main-scene";
const Sprite = Phaser.GameObjects.Sprite;

interface SignProperty {
  name: string;
  value: string;
}

/** A sign object from the map's "Signs" layer, which always has a position. */
export type SignObject = Phaser.Types.Tilemaps.TiledObject & { x: number; y: number };

export class Sign extends Phaser.GameObjects.Container {
  public text: string;
  public icon: string;
  declare body: Phaser.Physics.Arcade.Body;
  private sign: Phaser.GameObjects.Sprite;
  private talkMenu: Phaser.GameObjects.Sprite;
  declare scene: SceneMain;
  public kind: string;
  public id: string;
  public subject: string;

  constructor(scene: SceneMain, args: SignObject) {
    const { x, y, name, properties, id } = args;

    super(scene, x, y);
    this.id = `${id}-${name}`;
    this.kind = "sign";
    this.name = name;
    this.text = properties?.find((p: SignProperty) => p?.name === "text")?.value;
    this.icon = properties?.find((p: SignProperty) => p?.name === "icon")?.value ?? "sign-blank";
    this.subject = properties?.find((p: SignProperty) => p?.name === "subject")?.value ?? "Sign";
    this.scene = scene;

    // Enable arcade physics on the sign object
    scene.physics.add.existing(this);
    this.body.setCircle(8, -8, -8); // Set the circle body using the sprite's width
    this.body.immovable = true;

    this.sign = new Phaser.GameObjects.Sprite(scene, 0, -this.body.height, this.icon);
    this.talkMenu = scene.add
      .existing(new Sprite(scene, 5, -this.sign.height + 6, "icons", "chat"))
      .setVisible(false);
    this.add(this.sign);
    this.add(this.talkMenu);
    this.setDepth(95 + this.y + this.body.height);

    // Add the Sign container to the scene
    scene.add.existing(this);
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
  }
  update() {
    this.setTalkMenu();
  }
  setTalkMenu() {
    const show = this.scene.hero.state.targetNpcId === this.id;
    return this.talkMenu.setVisible(show);
  }
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    if (this.scene) this.scene.physics.world.disable(this);
    super.destroy();
  }
}
