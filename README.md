## Aether Online

A Javascript MMO using `PhaserJS` and `SocketIO`

## 🏔️ Environment

```bash
# .env file example
DEBUG=false
MONGO_URL= # If blank will go into offline mode. (No saving)
SERVER_FPS=20
SERVER_URL=http://localhost:3000
PORT=3000
```

## 📟 Running

```bash
yarn server:watch # run the server locally
yarn client:dev # run the client locally
yarn web:dev # run the wiki locally
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
- [ ] Gloves items

#### Cosmetic

- [ ] Fix it so attack logic is not based on the player frame
- [ ] Animated weapons

#### Systems

- [ ] Fix party system to update stats properly
- [ ] Trade window
- [ ] Minimap
- [ ] Doors that require a key or level to pass through
- [ ] Map item drops (Mining, Herbs) Professions?

#### Combat

- [ ] Negative buffs: (Frozen, Stunned, etc.)
- [ ] Allow critical strikes on spells
- [ ] Ranged weapons
- [ ] Serverside individual cooldowns for spells
- [ ] More spells that affect movement, (dives, dodges, pushback etc)
- [ ] Back-stab damage
- [ ] Attack stamina
- [ ] Show warning before enemies attack

#### Performance

- [ ] Predictive hero movement so we do not have to send `[x,y]` @ 60fps and so other players aren't able to hit you when you are not near them.
- [ ] Multiple `Realms` because 1000 people in a map will not scale.
- [ ] How to make servers smart about not loading map rooms until a person is actually in them.
- [ ] Move spell cooldowns to serverside check

#### Completed

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
