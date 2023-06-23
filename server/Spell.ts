import Phaser from "phaser";
const Sprite = Phaser.GameObjects.Sprite;
import spellDetails from "../shared/data/spellDetails.json";
class Spell extends Phaser.GameObjects.Container {
  public id: string;
  public room: Room;
  public caster: Character;
  public target: Character;
  public spellName: string;
  declare state: any;
  private velocityX: number;
  private velocityY: number;
  private allowedTargets: Array<string>;
  private maxVisibleTime: integer;
  private maxActiveTime: integer;
  private warningDelay: integer;
  private bodySize: integer;
  private scaleBase: number;
  private scaleMultiplier: number;
  private spellSpeed: integer;
  private hits: Array<Hit>;
  private isAttack: boolean;
  private abilitySlot: number;
  private spell: Phaser.GameObjects.Sprite;
  declare body: Phaser.Physics.Arcade.Body;
  declare scene: ServerScene;
  constructor(
    scene: ServerScene,
    { id, room, caster, target, abilitySlot, spellName, castAngle, ilvl }
  ) {
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
    this.velocityX = 0;
    this.velocityY = 0;
    this.hits = [];
    this.spell = scene.add.existing(new Sprite(scene, 0, 0, "blank", 0));
    this.isAttack = ["attack_left", "attack_right"]?.includes(spellName);
    this.abilitySlot = abilitySlot;

    const details = spellDetails?.[spellName];
    this.allowedTargets = details?.allowedTargets;
    this.maxVisibleTime = details?.maxVisibleTime;
    this.maxActiveTime = details?.maxActiveTime;
    this.bodySize = details?.bodySize;
    this.spellSpeed = details?.spellSpeed;
    this.scaleBase = details?.scaleBase;
    this.scaleMultiplier = details?.scaleMultiplier;
    this.warningDelay = details?.warningDelay || 0;

    scene.physics.add.existing(this);
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);

    if (this.isAttack) {
      /* Take body size of NPC caster in to account. or they wont get close enough to attack */
      const fullBodySize = this.bodySize + (caster?.body?.radius ?? 8) / 2;
      this.body.setCircle(fullBodySize, -fullBodySize, -fullBodySize);
    } else {
      /* Make the spell come from the players center */
      this.y = caster.y + caster.bodyOffsetY;
      this.setScale(this.scaleBase + ilvl * this.scaleMultiplier);
      this.body.setCircle(this?.bodySize, -this?.bodySize, -this?.bodySize);
    }
    if (spellName == "fireball") {
      this.velocityX = Math.cos(castAngle) * this?.spellSpeed;
      this.velocityY = Math.sin(castAngle) * this?.spellSpeed;
      this.spell.setRotation(castAngle);
    }

    this.add(this.spell);

    /* TODO: When we add buffs, make sure they do the same as adjustSpellPosition on clientside */
  }
  update() {
    const now = Date.now();
    //start after warning time
    if (now - this.state.spawnTime > this.warningDelay) {
      const aliveMs = now - this.state.spawnTime;
      this.checkCollisions();
      this.body.setVelocity(this.velocityX, this.velocityY);
      this.state.isExpired = aliveMs > this.maxActiveTime;
    }
  }
  checkCollisions() {
    if (this.state.isExpired) return;
    const { target, caster, scene, allowedTargets, room, abilitySlot } = this;
    const players = this.room.playerManager.players?.getChildren() || [];
    const npcs = this.room.npcManager.npcs?.getChildren() || [];

    [...npcs, ...players]?.forEach((victim) => {
      /* For attacks, we look at the body to make them easier to dodge. */
      const hitBox = this.isAttack ? victim : victim?.hitBox;
      /* If the victim is already in the hitList */
      if (!victim || this.hits.some((h) => h?.to == victim?.id)) return;

      /* If its not a self-hitting spell */
      if (!allowedTargets?.includes("self") && victim?.id === caster?.id) return;

      /* If its a single target skip all other targets */
      if (target?.id && victim?.id !== target?.id) return;

      if (scene?.physics?.overlap?.(hitBox, this)) {
        /* If spell, or attack, calculate damage accordingly */
        const newHits = this?.isAttack
          ? caster.calculateDamage(victim)
          : caster.calculateSpellDamage(victim, abilitySlot);
        if (newHits?.length > 0) this.hits = [...this.hits, ...newHits];
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
