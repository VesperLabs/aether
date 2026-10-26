# shared/content

Items, mobs, spells, quests and maps as typed TypeScript data. See the layout and "Import rules" in `/ARCHITECTURE.md`.

- Strict TypeScript. Imports nothing else from the repo.
- Let the compiler check references (a quest pointing at an item, a mob at its loot). Ids should be typed so editors autocomplete them.
- Content types come from the content definitions.
