class HueRotatePostFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({
      game,
      name: "HueRotatePostFX",
      fragShader: `
      #define SHADER_NAME HUE_ROTATE_FS
      precision mediump float;
      uniform sampler2D uMainSampler;
      uniform float uTime;
      uniform float uSpeed;
      varying vec2 outTexCoord;
      void main()
      {
          float c = cos(uTime * uSpeed);
          float s = sin(uTime * uSpeed);
          mat4 r = mat4(0.299, 0.587, 0.114, 0.0, 0.299, 0.587, 0.114, 0.0, 0.299, 0.587, 0.114, 0.0, 0.0,  0.0, 0.0, 1.0);
          mat4 g = mat4(0.701, -0.587, -0.114, 0.0, -0.299, 0.413, -0.114, 0.0, -0.300, -0.588, 0.886, 0.0, 0.0, 0.0, 0.0, 0.0);
          mat4 b = mat4(0.168, 0.330, -0.497, 0.0, -0.328, 0.035, 0.292, 0.0, 1.250, -1.050, -0.203, 0.0, 0.0, 0.0, 0.0, 0.0);
          mat4 hueRotation = r + g * c + b * s;
          gl_FragColor = texture2D(uMainSampler, outTexCoord) * hueRotation;
      }
      `,
      uniforms: ["uMainSampler", "uTime", "uSpeed"],
    });

    this.speed = 1;
  }

  onPreRender() {
    this.setTime("uTime");
    this.set1f("uSpeed", this.speed);
  }
}

class TintPostFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({
      game,
      name: "TintPostFX",
      fragShader: `
      #define SHADER_NAME TINT_FS
      precision mediump float;
      uniform sampler2D uMainSampler;
      uniform vec4 uTint;
      varying vec2 outTexCoord;
      void main()
      {
          gl_FragColor = texture2D(uMainSampler, outTexCoord) * uTint;
      }
      `,
      uniforms: ["uMainSampler", "uTint"],
    });

    this.tint = new Phaser.Display.Color(255, 255, 255);
  }
  setTint(r, g, b) {
    this.tint = new Phaser.Display.Color(r, g, b);
    this.set4f("uTint", this.tint.r / 255, this.tint.g / 255, this.tint.b / 255, this.tint.a / 255);
  }
  onPreRender() {
    this.set4f("uTint", this.tint.r / 255, this.tint.g / 255, this.tint.b / 255, this.tint.a / 255);
  }
}

//this.hair.setPostPipeline("TintPostFX");
//this.hair.postPipelines?.[0].setTint(200, 50, 50);

export { TintPostFX, HueRotatePostFX };
