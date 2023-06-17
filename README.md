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
- [ ] Doors that require a key or level to pass through
- [ ] Map item drops (Mining, Herbs) Professions?

#### Combat

- [ ] Allow critical strikes on spells
- [ ] Ranged weapons
- [ ] Serverside individual cooldowns for spells
- [ ] More spells that affect movement, (dives, dodges, pushback etc)
- [ ] Back-stab damage
- [ ] Holding down buttons to charge up attacks
- [ ] Show warning before enemies attack

#### Performance

- [ ] Predictive hero movement so we do not have to send `[x,y]` @ 60fps and so other players aren't able to hit you when you are not near them.
- [ ] Multiple `Realms` because 1000 people in a map will not scale.
- [ ] How to make servers smart about not loading map rooms until a person is actually in them.

#### Completed

- [x] Hold to aim spells
- [x] Helmets that can hide hair or face
- [x] Elemental Damage / Resistances
- [x] Inventory Bags system
- [x] Party system
- [x] Enemy spells
- [x] Buffs
