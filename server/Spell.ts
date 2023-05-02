import Phaser from "phaser";
const Sprite = Phaser.GameObjects.Sprite;
class Spell extends Phaser.GameObjects.Container {
  public id: string;
  public room: Room;
  public caster: Character;
  public target: Character;
  public spellName: string;
  declare state: any;
  private velocityX: number;
  private velocityY: number;
  private canHitSelf: boolean;
  private maxVisibleTime: integer;
  private maxActiveTime: integer;
  private hits: Array<Hit>;
  private spell: Phaser.GameObjects.Sprite;
  declare body: Phaser.Physics.Arcade.Body;
  declare scene: ServerScene;
  constructor(scene: ServerScene, { id, room, caster, target, spellName, castAngle, ilvl }) {
    super(scene, caster.x, caster.y);
    this.id = id;
    this.scene = scene;
    this.room = room;
    this.caster = caster;
    this.target = target;
    this.spellName = spellName;
    this.state = {
      spawnTime: Date.now(),
      isExpired: false,
    };
    this.canHitSelf = false;
    this.maxVisibleTime = 200;
    this.maxActiveTime = 100;
    this.velocityX = 0;
    this.velocityY = 0;

    const spellSize = 32; // todo make universal

    scene.physics.add.existing(this);
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);

    this.hits = [];
    this.spell = scene.add.existing(new Sprite(scene, 0, 0, "blank", 0));

    if (["attack_left", "attack_right"]?.includes(spellName)) {
      this.body.setCircle(spellSize, -spellSize, -spellSize);
      this.caster.add(this.spell);
    }
    if (spellName == "fireball") {
      this.maxVisibleTime = 1000;
      this.maxActiveTime = 1000;

      this.body.setCircle(spellSize, -spellSize, -spellSize);
      this.velocityX = Math.cos(castAngle) * 300;
      this.velocityY = Math.sin(castAngle) * 300;
      this.spell.setRotation(castAngle);
      this.spell.setScale(0.25 + ilvl * 0.05);
      this.add(this.spell);
    }
  }
  update() {
    const now = Date.now();
    const aliveMs = now - this.state.spawnTime;
    this.body.setVelocity(this.velocityX, this.velocityY);
    this.checkCollisions();
    this.state.isExpired = aliveMs > this.maxActiveTime;
  }
  checkCollisions() {
    if (this.state.isExpired) return;
    const { target, caster, scene, canHitSelf, room } = this;
    const players = this.room.playerManager.players?.getChildren() || [];
    const npcs = this.room.npcManager.npcs?.getChildren() || [];

    [...npcs, ...players]?.forEach((victim) => {
      /* If the victim is already in the hitList */
      if (!victim || this.hits.some((h) => h?.to == victim?.id)) return;

      /* If its not a self-hitting spell */
      if (!canHitSelf && victim?.id === caster?.id) return;

      /* If its a single target skip all other targets */
      if (target?.id && victim?.id !== target?.id) return;

      if (scene?.physics?.overlap?.(victim, this)) {
        const newHit = caster.calculateDamage(victim);
        if (newHit) this.hits.push(newHit);
        scene.io.to(room?.name).emit("assignDamage", this.hits);
      }
    });
  }
  getTrimmed() {
    return {
      id: this?.id,
      maxVisibleTime: this?.maxVisibleTime,
      maxActiveTime: this?.maxActiveTime,
      roomName: this?.room?.name,
      spellName: this?.spellName,
      caster: { id: this?.caster?.id },
      state: this?.state,
      x: this?.x,
      y: this?.y,
    };
  }
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    if (this.scene) this.scene.physics.world.disable(this);
    super.destroy(true);
  }
}

export default Spell;
