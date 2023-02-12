import Phaser from "phaser";

class MainScene extends Phaser.Scene {
  constructor(socket) {
    super({ key: "MainScene" });
    this.socket = socket;
  }

  playerInput = {
    left: false,
    right: false,
    up: false,
    down: false,
  };

  changeMap(mapKey) {
    let slugs = mapKey.split("-"); //get only maptype of mapKey

    if (this.tilemap) {
      this.tilemap.destroy();
    }

    this.tilemap = this.make.tilemap({
      key: mapKey,
    });

    this.tileset = this.tilemap.addTilesetImage(
      "tileset-" + slugs[1],
      "tileset-" + slugs[1]
    );
    this.tilesetShadows = this.tilemap.addTilesetImage(
      "tileset-" + slugs[1] + "-shadows",
      "tileset-" + slugs[1] + "-shadows"
    );
    this.tilesetCollide = this.tilemap.addTilesetImage(
      "tileset-collide",
      "tileset-collide"
    );
    this.tilesetExtras = this.tilemap.addTilesetImage(
      "tileset-extras",
      "tileset-extras"
    );
    this.collideLayer = this.tilemap.createStaticLayer(
      "Collide",
      this.tilesetCollide,
      0,
      0
    );
    this.groundLayer = this.tilemap.createDynamicLayer(
      "Ground",
      this.tileset,
      0,
      0
    );
    this.shadowsLayer = this.tilemap.createStaticLayer(
      "Shadows",
      this.tilesetShadows,
      0,
      0
    );
    this.overlayLayer = this.tilemap.createStaticLayer(
      "Overlay",
      this.tileset,
      0,
      0
    );
    this.extrasLayer = this.tilemap.createDynamicLayer(
      "Extras",
      this.tilesetExtras,
      0,
      0
    );
    this.aboveLayer = this.tilemap.createDynamicLayer(
      "Above",
      this.tileset,
      0,
      0
    );

    //this.createDoors(this.tilemap);

    this.aboveLayer.setDepth(9999);
    this.collideLayer.setCollisionByProperty({
      collides: true,
    });
    if (this.animatedTiles) this.animatedTiles.init(this.tilemap);
  }

  preload() {
    this.cursorKeys = this.input.keyboard.createCursorKeys();
  }

  create() {
    this.socket.on("playerUpdates", (p) => {
      // console.log(p);
    });
    this.changeMap("map-grassland");
    this.cameras.main.startFollow({ x: 600, y: 10 }, true);
    this.cameras.main.setBounds(
      0,
      0,
      this.tilemap.widthInPixels,
      this.tilemap.heightInPixels
    );
    this.cameras.main.setZoom(2);
  }

  update() {
    if (!this.socket) return;
    /* TODO: Stop sending when player is standing still */
    this.playerInput.left = this.cursorKeys.left.isDown;
    this.playerInput.right = this.cursorKeys.right.isDown;
    this.playerInput.up = this.cursorKeys.up.isDown;
    this.playerInput.down = this.cursorKeys.down.isDown;
    this.socket.emit("playerInput", this.playerInput);
  }
}

export default MainScene;
