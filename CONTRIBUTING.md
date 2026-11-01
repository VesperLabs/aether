# Contributing

Read [ARCHITECTURE.md](ARCHITECTURE.md) before adding or moving code. `npm run check` must pass before committing, and commit messages are [conventional commits](https://www.conventionalcommits.org).

## ⚡️ Install

```bash
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
ENABLE_CHEATS=false
MONGO_URL= # If blank will go into offline mode. (No saving)
SERVER_FPS=20
SERVER_URL=http://localhost:3000
PORT=3000
ASSETS_URL= # Where to load images from (Leave blank for DEV)
PUBLIC_DIR=public # Running server loads assets from here (relative to the repo root)
PEER_SERVER_PORT=9000 # Where the server runs the peerjs instance
PEER_CLIENT_PORT=9000 # (Optional) Where the client listens for peerjs
```

## 📟 Running

```bash
npm run dev # run server, client and wiki together

# or individually
npm run server:watch # run the server locally
npm run client:dev # run the client locally
npm run web:dev # run the wiki locally
```

## 🚀 Deploying

Releases and deploys are manual: GitHub Actions → **Release & deploy** → Run workflow ([`.github/workflows/release-deploy.yml`](.github/workflows/release-deploy.yml)). release-please cuts the release from conventional commits (`fix:` → patch, `feat:` → minor, `feat!:` → major), then main deploys: Fly runs the game server, Render serves the wiki and static assets.

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
- [ ] Crafting system
- [ ] Doors that require a key or level to pass through
- [ ] Ability to choose from mage-type rogue-type or warrior-type rewards on some quests

#### Combat

- [ ] More spells that effect movement, (dives, dodges, pushback etc)
- [ ] Back-stab damage
- [ ] Second joystick casts last used attack (mobile)

#### Performance

- [ ] Predictive hero movement so we do not have to send `[x,y]` @ 60fps and so other players aren't able to hit you when you are not near them.
- [ ] Multiple `Realms` because 1000 people in a map will not scale.
- [ ] How to make servers smart about not loading map rooms until a person is actually in them.
