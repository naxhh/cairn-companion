# Audit

Since the code was mostly vibe coded this is a central place for notes during my review and tweaks.

Consider this an immediate TODO list for the plugin

## Done
- Review License shenanigants
- Tweak DEVELOPMENT.md
- Tweak README.md
- Review build tooling
- Separate code in modules
- i18n for EN plugin
- i18n algunas entradas deberían ir a /data (scars, dungeonEventsTable, wildernessEventsTable)
- Add EN data

## TODO
- Improve dice roller implementation so we don't need to pass the plugin/app everywhere
- run dev is not really working.
- Review deps versions
- Review code
- Manual review ES data
- Manual review EN data
- Object has "uses" property but is not used in the card or character inventory.
- I'm unsure on the diff of hireling and npc... not sure what to do with it
- Move roll tables to the index not the plugin

## Future ideas
- Setting seeds helpers
- Forest/Dungeon seeds creation
- Maybe add adventures npcs/monsters?
- Quick NPC creation
- Name rolling (faction, realm, terrain, forest)