import Phaser from "phaser";
import SceneMain from "../src/SceneMain";
const Sprite = Phaser.GameObjects.Sprite;

class Sign extends Phaser.GameObjects.Container implements Sign {
  public text: string;
  declare body: Phaser.Physics.Arcade.Body;
  private sign: Phaser.GameObjects.Sprite;
  private talkMenu: Phaser.GameObjects.Sprite;
  public kind: string;
  public id: string;

  constructor(scene: ServerScene | Phaser.Scene, args: Phaser.Types.Tilemaps.TiledObject) {
    const { x, y, name, properties, id } = args ?? {};

    super(scene, x, y);
    this.id = `${id}-${name}`;
    this.kind = "sign";
    this.name = name;
    this.text = properties?.find((p) => p?.name === "text")?.value;
    this.scene = scene;

    // Enable arcade physics on the sign object
    scene.physics.add.existing(this);
    this.body.setCircle(8, -8, -8); // Set the circle body using the sprite's width
    this.body.immovable = true;

    this.sign = new Phaser.GameObjects.Sprite(scene, 0, -this.body.height, "sign-1");
    this.talkMenu = scene.add
      .existing(new Sprite(scene, 3, -this.sign.height + 12, "icons", "chat"))
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
    /* @ts-ignore */
    const show = this.scene.hero.state.targetNpcId === this.id;
    return this.talkMenu.setVisible(show);
  }
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    if (this.scene) this.scene.physics.world.disable(this);
    super.destroy();
  }
}

export default Sign;
