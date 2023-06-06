## Aether Online

A Javascript MMO using `PhaserJS` and `SocketIO`

## Env Values

```bash
# .env file example
DEBUG=false
MONGO_URL= # If blank will go into offline mode. (No saving)
SERVER_FPS=20
SERVER_URL=http://localhost:3000
PORT=3000
```

## Running

```bash
yarn server:watch
```

```bash
yarn dev
```

## Todo list

#### Items

- [ ] Suffix / Prefix system improvements
- [ ] Spawned item mods `min` needs to take `max` into account

#### Cosmetic

- [ ] Eyes on their own layer so we can tint them
- [ ] Eye-whites can maybe be their own layer?
- [ ] Facial hair can maybe be their own layer?

#### Systems

- [ ] Trade window
- [ ] Minimap

#### Professions

- [ ] Add mining / herbs / treasures to spawn on maps (object layer?)

#### Combat

- [ ] Spell Critical
- [ ] Back-stab damage
- [ ] Charge-up attacks
- [ ] Show warning before enemies attack

#### Completed

- [x] Helmets that can hide hair or face
- [x] Elemental Damage / Resistances
- [x] Inventory Bags system
- [x] Party system
- [x] Enemy spells
- [x] Buffs
