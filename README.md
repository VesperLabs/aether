## Aether Online

A Javascript MMO using `PhaserJS` and `SocketIO`

## ⚡️ Install

```bash
# Run the install
npm install
```

```bash
# If NPM fails installing canvas pkg
# https://flaviocopes.com/fix-node-canvas-error-pre-gyp-macos/
brew install pkg-config cairo pango libpng jpeg giflib librsvg
```

## 🏔️ Environment

```bash
# .env file example
DEBUG=false
MONGO_URL= # If blank will go into offline mode. (No saving)
SERVER_FPS=20
SERVER_URL=http://localhost:3000
PORT=3000
ASSETS_URL= # Where to load images from (Leave blank for DEV)
PUBLIC_DIR=../public # Running server loads assets from here
WS_USE_EIOWS=true # Whether or not to use C++ websockets package
```

## 📟 Running

```bash
npm run server:watch # run the server locally
npm run client:dev # run the client locally
npm run web:dev # run the wiki locally
```

## 🛠️ Tooling

#### Tilesets

- Resample down from `NearestNeighbor` in Photoshop.
- Tiles need to be `32x32` and extruded to remove edge bleed.

```bash
npm install --global tile-extruder
```

```bash
tile-extruder --tileWidth 32 --tileHeight 32 --input ./public/assets/tilesets/clean/grassland.png --output ./public/assets/tilesets/grassland.png
```

## ✅ Todo list

#### Items

- [ ] Suffix / Prefix system improvements
- [ ] Spawned item mods `min` needs to take `max` into account

#### Cosmetic

- [ ] Animated weapons

#### Systems

- [ ] Trade window
- [ ] Minimap
- [ ] Doors that require a key or level to pass through
- [ ] Ability to choose from mage-type rogue-type or warrior-type rewards on some quests

#### Combat

- [ ] Serverside individual cooldowns for spells
- [ ] More spells that effect movement, (dives, dodges, pushback etc)
- [ ] Back-stab damage
- [ ] Show warning before enemies attack

#### Performance

- [ ] Predictive hero movement so we do not have to send `[x,y]` @ 60fps and so other players aren't able to hit you when you are not near them.
- [ ] Multiple `Realms` because 1000 people in a map will not scale.
- [ ] How to make servers smart about not loading map rooms until a person is actually in them.

#### Completed

- [x] Move spell cooldowns to serverside check (Separate cooldowns)
- [x] Gloves items
- [x] Map item drops (Mining, Herbs)
- [x] Negative buffs: (Frozen, Stunned, etc.)
- [x] Allow critical strikes on spells
- [x] Ranged weapons 🏹
- [x] Readable signs objects
- [x] Hold to aim spells
- [x] Helmets that can hide hair or face
- [x] Elemental Damage / Resistances
- [x] Inventory Bags system
- [x] Party system
- [x] Enemy spells
- [x] Buffs
- [x] Facial hair is now Whiskers on its own layer seperate from face.
- [x] Consumables and Food
- [x] Cooldowns show in UI
- [x] Attack stamina
- [x] Fix party system to update stats properly
