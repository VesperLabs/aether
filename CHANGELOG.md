# Changelog

## [0.10.1](https://github.com/VesperLabs/aether/compare/v0.10.0...v0.10.1) (2026-11-04)


### Bug Fixes

* peerjs websocket connects again behind the proxy ([#218](https://github.com/VesperLabs/aether/issues/218)) ([967ded9](https://github.com/VesperLabs/aether/commit/967ded9a07f7bae10308c3c7c5d354d1efe97421))

## [0.10.0](https://github.com/VesperLabs/aether/compare/v0.9.1...v0.10.0) (2026-11-04)


### Features

* add resident agents that choose what to do with a planner ([#153](https://github.com/VesperLabs/aether/issues/153)) ([1e96f03](https://github.com/VesperLabs/aether/commit/1e96f031040f2e34091709437d74ec301e3b068c))
* add scripted test bots that play like real clients ([#151](https://github.com/VesperLabs/aether/issues/151)) ([fde7d02](https://github.com/VesperLabs/aether/commit/fde7d02f27da4bdd09f4db4d0485349d50a0359e))
* add travel, character and summon cheats for testing ([#150](https://github.com/VesperLabs/aether/issues/150)) ([f95e523](https://github.com/VesperLabs/aether/commit/f95e5231fcf077e4bff44045e3d224391dca250b))
* better chat commands, chat log and HUD polish ([#210](https://github.com/VesperLabs/aether/issues/210)) ([75c82e8](https://github.com/VesperLabs/aether/commit/75c82e8ab64a8cda5095249e3dacb3b764f2ab75))
* ease small hero position corrections instead of snapping ([#131](https://github.com/VesperLabs/aether/issues/131)) ([f3a3e5d](https://github.com/VesperLabs/aether/commit/f3a3e5da0af44745df4dcb59b3be6c25605e8048))
* fast-forward agent scenarios on a simulated server ([#154](https://github.com/VesperLabs/aether/issues/154)) ([4f4c0be](https://github.com/VesperLabs/aether/commit/4f4c0be2df8bb36885b0163595a706463cb5109b))
* give each wandering bot its own hair, face, skin and body ([#170](https://github.com/VesperLabs/aether/issues/170)) ([bbfc62e](https://github.com/VesperLabs/aether/commit/bbfc62ed2cfa46f9c3eb8ccbd95bf69092c4af66))
* give wanderers interests, temperaments and a fear of monsters ([#169](https://github.com/VesperLabs/aether/issues/169)) ([7ec1a22](https://github.com/VesperLabs/aether/commit/7ec1a221a4492928147c3f0395b5bd1ca5812d5f))
* lag-compensated hits ([#132](https://github.com/VesperLabs/aether/issues/132)) ([375701f](https://github.com/VesperLabs/aether/commit/375701f51ba876259b1b03268006968a0a75d050))
* let tests fast-forward the server clock and seed every roll ([#209](https://github.com/VesperLabs/aether/issues/209)) ([b52ca49](https://github.com/VesperLabs/aether/commit/b52ca4912a229d0e7f72df07abdb2511f2d9f7fc))
* scrollable menu stack with spring-loaded menu buttons ([#212](https://github.com/VesperLabs/aether/issues/212)) ([eb900b3](https://github.com/VesperLabs/aether/commit/eb900b3d758a8ac858bf780200f1a18169265bae))
* social menu becomes a modal with player search, and dividers match the wiki ([#215](https://github.com/VesperLabs/aether/issues/215)) ([dfcea05](https://github.com/VesperLabs/aether/commit/dfcea05c98172044b81745e280e79e0b12598413))
* soft collision between characters ([#167](https://github.com/VesperLabs/aether/issues/167)) ([9c1878c](https://github.com/VesperLabs/aether/commit/9c1878cc88e0e4e81a9af2eec1d912905d816909))
* spawn free resident bots with personalities on server start ([#160](https://github.com/VesperLabs/aether/issues/160)) ([8da6730](https://github.com/VesperLabs/aether/commit/8da6730b53cfd41c4a21d5f1a227a2a8816a3eed))
* wandering bots that roam between zones ([#168](https://github.com/VesperLabs/aether/issues/168)) ([e899ad9](https://github.com/VesperLabs/aether/commit/e899ad93fb470994e2a6d7eb6f5d273264d2597e))


### Bug Fixes

* enforce potion and food cooldowns on the server ([#157](https://github.com/VesperLabs/aether/issues/157)) ([1f8be3a](https://github.com/VesperLabs/aether/commit/1f8be3ac24bc1074059da88cff4085365496db89)), closes [#140](https://github.com/VesperLabs/aether/issues/140)
* hold npcs still while winding up, and call it off when they give up ([#211](https://github.com/VesperLabs/aether/issues/211)) ([e0e734b](https://github.com/VesperLabs/aether/commit/e0e734b043ff744b7566f0c39afe32c5c97de48b))
* hud no longer crashes when a party member changes maps ([#216](https://github.com/VesperLabs/aether/issues/216)) ([2fd24a8](https://github.com/VesperLabs/aether/commit/2fd24a82ae7e7c8c0bdf678cdad32518a5ff1741))
* keep the town-life soak within CI's time budget ([#158](https://github.com/VesperLabs/aether/issues/158)) ([50abd2a](https://github.com/VesperLabs/aether/commit/50abd2a12b9975d1994036ba809416fcd4f12ed9))
* let fighting agents pick a swing that spares keepers and players ([#166](https://github.com/VesperLabs/aether/issues/166)) ([b7aa783](https://github.com/VesperLabs/aether/commit/b7aa783d1a352608b0606e134359627fd0ed1be7))
* let respawning characters walk out of the spawn reveal ([#163](https://github.com/VesperLabs/aether/issues/163)) ([034ffa8](https://github.com/VesperLabs/aether/commit/034ffa8f23ec92a8a62eaa7a6b6e91f157a44554))
* make simulations deterministic by passing dice and ids everywhere ([#156](https://github.com/VesperLabs/aether/issues/156)) ([310442b](https://github.com/VesperLabs/aether/commit/310442be3bbf6f4f9aae9177c4336d6349e429c2))
* menus jump to the one you open and share one backdrop blur ([#214](https://github.com/VesperLabs/aether/issues/214)) ([034ffaf](https://github.com/VesperLabs/aether/commit/034ffaf27dac0f295e2dfb70c99fb2aee6797efb))
* name modal closes on Esc and matches the settings modal ([#213](https://github.com/VesperLabs/aether/issues/213)) ([9bfcd10](https://github.com/VesperLabs/aether/commit/9bfcd107ade46c50068e884c77a5a4075333599c))
* only broadcast attacks and casts that happen, and pace agent swings ([#155](https://github.com/VesperLabs/aether/issues/155)) ([07ebbac](https://github.com/VesperLabs/aether/commit/07ebbac2a3dd4c04276c59f754fa689b62f8315e))
* reload dev servers on .env changes and tidy dev output ([#139](https://github.com/VesperLabs/aether/issues/139)) ([9a79e9a](https://github.com/VesperLabs/aether/commit/9a79e9a71e4181552d7ac1c757129fb0b01bb9d8))
* skip saving demo accounts' spawn and death position ([#162](https://github.com/VesperLabs/aether/issues/162)) ([e4ed8f0](https://github.com/VesperLabs/aether/commit/e4ed8f07806c1eacafd6d1b0dfa8b81a56dea024))
* wanderers stuck at spawn among monsters, and same looks every start ([#171](https://github.com/VesperLabs/aether/issues/171)) ([8129a61](https://github.com/VesperLabs/aether/commit/8129a613fbf3ca89acd92c246777fb3e17485546))


### Performance Improvements

* pack room poses as binary with small net ids ([#130](https://github.com/VesperLabs/aether/issues/130)) ([80316b3](https://github.com/VesperLabs/aether/commit/80316b33512ccb82852c2a642b33650d24f50835))
* send whole poses every tick and statuses on change, adaptive interpolation delay ([#129](https://github.com/VesperLabs/aether/issues/129)) ([dff3515](https://github.com/VesperLabs/aether/commit/dff3515af165c89355dc7c860c4ecbd4e1bd5b5d))
* stop the server's per-tick lookups from scaling with the whole world ([#159](https://github.com/VesperLabs/aether/issues/159)) ([218ce36](https://github.com/VesperLabs/aether/commit/218ce36bf38a810718b98bbdc63a488748ca0598))

## [0.9.1](https://github.com/VesperLabs/aether/compare/v0.9.0...v0.9.1) (2026-11-02)


### Bug Fixes

* sideways melee swings come down, katars uppercut ([#126](https://github.com/VesperLabs/aether/issues/126)) ([271bdd7](https://github.com/VesperLabs/aether/commit/271bdd73a2a9ee198341a448a9901f347c64dbd8))
* stale art loads no longer overwrite inventory icons ([#127](https://github.com/VesperLabs/aether/issues/127)) ([c0f95ea](https://github.com/VesperLabs/aether/commit/c0f95ead97c54a14b8ad7905b4703fd0a99a9e9d))

## [0.9.0](https://github.com/VesperLabs/aether/compare/v0.8.0...v0.9.0) (2026-11-02)


### Features

* dual-wielded weapons swing as separate weapons, block needs a shield ([#117](https://github.com/VesperLabs/aether/issues/117)) ([3ad87e5](https://github.com/VesperLabs/aether/commit/3ad87e5f2f43e3caf892e9f0c5c7fd604cc77852))
* full gilded tooltip borders with corner flourishes by rarity, stronger magic blue ([#124](https://github.com/VesperLabs/aether/issues/124)) ([1d4dcd6](https://github.com/VesperLabs/aether/commit/1d4dcd6a152ff4f350b40816214cc422c0e19857))
* holy unique spear and shield, holy heals allies and burns enemies ([#121](https://github.com/VesperLabs/aether/issues/121)) ([197532e](https://github.com/VesperLabs/aether/commit/197532e7a9113719392a87143c90b31e19a11667))
* keep wiki item filters in the URL ([#120](https://github.com/VesperLabs/aether/issues/120)) ([7bbb69e](https://github.com/VesperLabs/aether/commit/7bbb69ed3745b9a91e7fd38a2357b36037b1ffe4))
* light screen shake on crits, with a setting to turn it off ([#113](https://github.com/VesperLabs/aether/issues/113)) ([c399460](https://github.com/VesperLabs/aether/commit/c39946019932f7a2045e26794a9c173a69cd0e8c))
* lunge dome and forward hitbox, longer roll and stealth invincibility, snappier roll ([#114](https://github.com/VesperLabs/aether/issues/114)) ([d12100d](https://github.com/VesperLabs/aether/commit/d12100d863b62de0aee54526c2662764bce4c10d))
* lunge draws a vortex in front and hits a wider area ([#111](https://github.com/VesperLabs/aether/issues/111)) ([49385ec](https://github.com/VesperLabs/aether/commit/49385ec2f06188a3f0561d32b35f0f9045601250))
* remember login via the browser password manager, subtler crit shake ([#115](https://github.com/VesperLabs/aether/issues/115)) ([a0030db](https://github.com/VesperLabs/aether/commit/a0030dbe13cebff014fe0eb649129b6212a9be34))
* remember me login, wooden toast for form errors, smaller switches ([#116](https://github.com/VesperLabs/aether/issues/116)) ([f6405f8](https://github.com/VesperLabs/aether/commit/f6405f8b3dd48ee14c61ab96bdfa877a97a46234))
* rename Second Wind to Sirocco and cut its SP steal to 1% ([#119](https://github.com/VesperLabs/aether/issues/119)) ([7994295](https://github.com/VesperLabs/aether/commit/79942950600e16f77d7a73b0a24688970e7c79d4))
* tackle knockback and gilded item tooltips ([#123](https://github.com/VesperLabs/aether/issues/123)) ([9412fed](https://github.com/VesperLabs/aether/commit/9412fed2a9a18eed2c14482ea6817b65f5d60f3c))
* weapon particles follow the blade through swings and turns ([#122](https://github.com/VesperLabs/aether/issues/122)) ([5555ea6](https://github.com/VesperLabs/aether/commit/5555ea615896da717217508eefeed412ac8e2ba4))


### Bug Fixes

* keep remembered logins across dev server restarts ([#118](https://github.com/VesperLabs/aether/issues/118)) ([a944319](https://github.com/VesperLabs/aether/commit/a9443191dc9513475324c738cb9575341962bb26))

## [0.8.0](https://github.com/VesperLabs/aether/compare/v0.7.0...v0.8.0) (2026-11-01)


### Features

* lunge kicks up rising dust clouds instead of afterimages ([#107](https://github.com/VesperLabs/aether/issues/107)) ([4fcaea4](https://github.com/VesperLabs/aether/commit/4fcaea418ef66570d23e2eab7616f24960b1df0d))
* lunge spell icon from the unsorted icon sheet ([#102](https://github.com/VesperLabs/aether/issues/102)) ([c04818e](https://github.com/VesperLabs/aether/commit/c04818e686ea99d70fe56d5ba79a538c141d4fe9))
* tap lunge to dash the way you're heading, and face the lunge the whole way ([#108](https://github.com/VesperLabs/aether/issues/108)) ([e54f71a](https://github.com/VesperLabs/aether/commit/e54f71aca4d6e249d7e2daa7ffab2f145fe0c8e8))


### Bug Fixes

* make lunge an exclusive spell ([#105](https://github.com/VesperLabs/aether/issues/105)) ([69458c7](https://github.com/VesperLabs/aether/commit/69458c78495a84474b7969ed83fc6f30afc0697b))
* spell buttons show one cooldown ring, the one that ends last ([#109](https://github.com/VesperLabs/aether/issues/109)) ([c0788ab](https://github.com/VesperLabs/aether/commit/c0788abc4ef90cd1371089f352a3d7fc404bf5f1))
* spiders no longer lunge ([#104](https://github.com/VesperLabs/aether/issues/104)) ([29e2f53](https://github.com/VesperLabs/aether/commit/29e2f53f2bec71493b75bfe7235432e89bccf2f8))

## [0.7.0](https://github.com/VesperLabs/aether/compare/v0.6.0...v0.7.0) (2026-11-01)


### Features

* add second wind, a unique shamshir that drains stamina ([#96](https://github.com/VesperLabs/aether/issues/96)) ([2670e5c](https://github.com/VesperLabs/aether/commit/2670e5c394f994578246d3329f886fc76630e516))
* drain droplets flow from the drained enemy to the attacker ([#92](https://github.com/VesperLabs/aether/issues/92)) ([98c23e9](https://github.com/VesperLabs/aether/commit/98c23e93f7df32748ec12dd8aec20493344bdd5f))
* drains pulse a colored ring and total across a swing ([#95](https://github.com/VesperLabs/aether/issues/95)) ([64042b4](https://github.com/VesperLabs/aether/commit/64042b443e537df76360fb76e50ff7f857c54105))
* elemental weapon effects shared by game, inventory, ground loot and wiki ([#100](https://github.com/VesperLabs/aether/issues/100)) ([90506fe](https://github.com/VesperLabs/aether/commit/90506fe4b9ba6dde3b4640e64441f44aa6b540ca))
* npc attack windups, a shared lunge skill, and fairer ranged shots ([#84](https://github.com/VesperLabs/aether/issues/84)) ([7046bc0](https://github.com/VesperLabs/aether/commit/7046bc04bf298612e9196548ba90999234ff1dea))
* smooth outlined windup ring above npc hp bars ([#87](https://github.com/VesperLabs/aether/issues/87)) ([d53e480](https://github.com/VesperLabs/aether/commit/d53e480b4d8928b2779e09f9f325f32a65106f4c))
* stamina bar and cost badges are yellow ([#94](https://github.com/VesperLabs/aether/issues/94)) ([6218e7d](https://github.com/VesperLabs/aether/commit/6218e7de0b19fc8c4cf3ffa05ea183b18841a7a2))
* stealth drops npc aggro and calls off windups at you ([#91](https://github.com/VesperLabs/aether/issues/91)) ([193f5ea](https://github.com/VesperLabs/aether/commit/193f5ea1afd056b906a45a1525e31f210b9f8c49))


### Bug Fixes

* brief invulnerability after casting stealth ([#90](https://github.com/VesperLabs/aether/issues/90)) ([1911a11](https://github.com/VesperLabs/aether/commit/1911a11528997e8c5f55e3583f8b366b1d271d98))
* drains play the green heal hit instead of droplets ([#93](https://github.com/VesperLabs/aether/issues/93)) ([4542b6a](https://github.com/VesperLabs/aether/commit/4542b6a0cb80c4a1fbe6cbbc998af865ceba3891))
* draw npc windup rings above every character ([#89](https://github.com/VesperLabs/aether/issues/89)) ([a5f0d09](https://github.com/VesperLabs/aether/commit/a5f0d092bb4eeb3951ddfefd71d5eee8926376ed))
* drop the npc windup lean; the countdown ring is the tell ([#86](https://github.com/VesperLabs/aether/issues/86)) ([f2b76d4](https://github.com/VesperLabs/aether/commit/f2b76d456e137fc2ebc5c72feba2b7ed41a76c12))
* hide minimap until it is placed after loading ([#81](https://github.com/VesperLabs/aether/issues/81)) ([a07d48c](https://github.com/VesperLabs/aether/commit/a07d48cb8f5a42cbff6a15d9ca981218715fe5ce))
* lighter stamina yellow, windup rings match the stamina and mana bars ([#97](https://github.com/VesperLabs/aether/issues/97)) ([a0bc12c](https://github.com/VesperLabs/aether/commit/a0bc12c44d14b9654f59fd4466df3ab0f685515a))
* make spell hits match what players see ([#88](https://github.com/VesperLabs/aether/issues/88)) ([c600aee](https://github.com/VesperLabs/aether/commit/c600aee22f09024177f0bb2a65d890be522827c2))
* npcs retreat once, briefly and slowly ([#85](https://github.com/VesperLabs/aether/issues/85)) ([f9b9822](https://github.com/VesperLabs/aether/commit/f9b98225ba19e1d4bfc9107ead426fae66659566))
* shields slow attacks far less (attack delay 150/200/250 → 30/40/50) ([#98](https://github.com/VesperLabs/aether/issues/98)) ([09a831b](https://github.com/VesperLabs/aether/commit/09a831b9f7b405222dd288f4d685417a700cd3e7))
* show a music note instead of dots when nothing plays ([#82](https://github.com/VesperLabs/aether/issues/82)) ([00e8565](https://github.com/VesperLabs/aether/commit/00e8565769b8c8f0762773d0b02d5c58ef0c75fb))
* swap hotkeys so c opens stats and i opens inventory ([#99](https://github.com/VesperLabs/aether/issues/99)) ([2bd1714](https://github.com/VesperLabs/aether/commit/2bd1714f4199218c4822650f46681d6c96dcb066))

## [0.6.0](https://github.com/VesperLabs/aether/compare/v0.5.0...v0.6.0) (2026-10-31)


### Features

* item fixes ([#65](https://github.com/VesperLabs/aether/issues/65)) ([e5c65f3](https://github.com/VesperLabs/aether/commit/e5c65f391dfbe5287b2055470bbf87c775db30d0))

## [0.5.0](https://github.com/VesperLabs/aether/compare/v0.4.0...v0.5.0) (2026-10-31)


### Features

* **wiki:** mobile layout with bottom tab bar and parchment menu ([#62](https://github.com/VesperLabs/aether/issues/62)) ([5bd9f3e](https://github.com/VesperLabs/aether/commit/5bd9f3ed1b2eaf6fa147274c622c8efcbf6738fa))
* **wiki:** player cards with a menu drawer, and faster player renders ([#63](https://github.com/VesperLabs/aether/issues/63)) ([abc7b4a](https://github.com/VesperLabs/aether/commit/abc7b4a20ef4e7164002ba29983f62f5bfba6c59))

## [0.4.0](https://github.com/VesperLabs/aether/compare/v0.3.0...v0.4.0) (2026-10-31)


### Features

* **wiki:** show item buffs and spell levels on item cards ([#58](https://github.com/VesperLabs/aether/issues/58)) ([6fbba82](https://github.com/VesperLabs/aether/commit/6fbba82edaabc781be6ac6097181a2a8397cc33d))

## [0.3.0](https://github.com/VesperLabs/aether/compare/v0.2.1...v0.3.0) (2026-10-31)


### Features

* **wiki:** parchment item cards, keepers page and item filters ([#56](https://github.com/VesperLabs/aether/issues/56)) ([e996fbb](https://github.com/VesperLabs/aether/commit/e996fbbd3125b4d6225d8a5c1cd56145c3b3142c))

## [0.2.1](https://github.com/VesperLabs/aether/compare/v0.2.0...v0.2.1) (2026-10-30)


### Bug Fixes

* lots of qol changes ([#54](https://github.com/VesperLabs/aether/issues/54)) ([044948c](https://github.com/VesperLabs/aether/commit/044948c0e63cb59def70a501a4256de143383ebc))

## [0.2.0](https://github.com/VesperLabs/aether/compare/v0.1.1...v0.2.0) (2026-10-29)


### Features

* combat feel, loot pickup flight and art-based weapon range ([#49](https://github.com/VesperLabs/aether/issues/49)) ([4614eee](https://github.com/VesperLabs/aether/commit/4614eee46af9c277e491621975044eef9e549820))
* combat feel: hit-stop, recoil, swing arcs and hp ghost bars ([#48](https://github.com/VesperLabs/aether/issues/48)) ([c74f36e](https://github.com/VesperLabs/aether/commit/c74f36e5385a219154ca23f92d3bf9e3c46becc0))
* death and respawn dissolves, party polish and HUD feel ([#52](https://github.com/VesperLabs/aether/issues/52)) ([fb8aabf](https://github.com/VesperLabs/aether/commit/fb8aabf09c32a5e1e4d274799353106d39b0d23c))
* smoother hero movement ([#47](https://github.com/VesperLabs/aether/issues/47)) ([2afdbdc](https://github.com/VesperLabs/aether/commit/2afdbdc751c416a76a48dad9d781ed6dd325152d))


### Bug Fixes

* known bugs from the migration, manual release and deploy ([#43](https://github.com/VesperLabs/aether/issues/43)) ([aaf79df](https://github.com/VesperLabs/aether/commit/aaf79dfcda67ae643ae99fa2ffbd11eb2bbc0a57))
* ready state attacking ([#51](https://github.com/VesperLabs/aether/issues/51)) ([2eb69ac](https://github.com/VesperLabs/aether/commit/2eb69acbdb8e894ec410af382fc55b2a8b9694d0))

## [0.1.1](https://github.com/VesperLabs/aether/compare/v0.1.0...v0.1.1) (2026-10-27)


### Bug Fixes

* known bugs from the migration TODO ([#40](https://github.com/VesperLabs/aether/issues/40)) ([84cceae](https://github.com/VesperLabs/aether/commit/84cceaeeb2cebaf020b30246bd8e37760e5ebbd4))

## 0.1.0 (2026-10-27)


### Bug Fixes

* **movement:** stop wall checks rejecting moves at corners ([#36](https://github.com/VesperLabs/aether/issues/36)) ([e636c8b](https://github.com/VesperLabs/aether/commit/e636c8bbb7b89649d77ec1d2034e3f3f68ff1334))
