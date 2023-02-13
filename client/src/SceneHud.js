import Phaser from "phaser";
class SceneHud extends Phaser.Scene {
  constructor({ socket, isMobile }) {
    super({
      key: "SceneHud",
    });
    this.socket = socket;
    this.isMobile = isMobile;
  }
  preload() {}
  create() {
    this.addJoystick();
  }
  update() {}
  addJoystick() {
    this.joystick = this.add.joystick({
      sprites: {
        base: "",
        body: "",
        cap: "",
      },
      singleDirection: false,
      maxDistanceInPixels: 50,
      device: this.isMobile ? 1 : 0, // 0 for mouse pointer (computer), 1 for touch pointer (mobile)
    });
  }
}

export default SceneHud;
