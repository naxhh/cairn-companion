// Static imports so esbuild bundles the catalog/roll-table JSON straight into
// main.js. Obsidian's Community Plugins installer only ever downloads
// main.js/manifest.json/styles.css — a `data/` folder shipped alongside them
// in the repo or a GitHub release never reaches a real user's vault, so the
// content has to live inside the bundle itself. The files here stay the
// source of truth for editing; this module is the only thing that reads them.
import type { CairnType, RollTableEntry } from "./types";
import type { BuiltinRaw } from "./indexer";
import type { Language } from "./settings";

import esObjects from "../data/es/objects.json";
import esSkills from "../data/es/skills.json";
import esSpells from "../data/es/spells.json";
import esNpcs from "../data/es/npcs.json";
import esMonsters from "../data/es/monsters.json";
import esBackgrounds from "../data/es/backgrounds.json";
import esHirelings from "../data/es/hirelings.json";
import esBonds from "../data/es/bonds.json";
import esOmens from "../data/es/omens.json";
import esScars from "../data/es/scars.json";
import esDungeonEvents from "../data/es/dungeon-events.json";
import esWildernessEvents from "../data/es/wilderness-events.json";

import enObjects from "../data/en/objects.json";
import enSkills from "../data/en/skills.json";
import enSpells from "../data/en/spells.json";
import enNpcs from "../data/en/npcs.json";
import enMonsters from "../data/en/monsters.json";
import enBackgrounds from "../data/en/backgrounds.json";
import enHirelings from "../data/en/hirelings.json";
import enBonds from "../data/en/bonds.json";
import enOmens from "../data/en/omens.json";
import enScars from "../data/en/scars.json";
import enDungeonEvents from "../data/en/dungeon-events.json";
import enWildernessEvents from "../data/en/wilderness-events.json";

export const BUILTIN_CATALOGS: Record<Language, Record<Exclude<CairnType, "character">, BuiltinRaw[]>> = {
	es: {
		object: esObjects,
		skill: esSkills,
		spell: esSpells,
		npc: esNpcs,
		monster: esMonsters,
		background: esBackgrounds,
		hireling: esHirelings,
		bond: esBonds,
		omen: esOmens,
	},
	en: {
		object: enObjects,
		skill: enSkills,
		spell: enSpells,
		npc: enNpcs,
		monster: enMonsters,
		background: enBackgrounds,
		hireling: enHirelings,
		bond: enBonds,
		omen: enOmens,
	},
};

export interface BuiltinRollTables {
	scars: RollTableEntry[];
	dungeonEvents: RollTableEntry[];
	wildernessEvents: RollTableEntry[];
}

export const BUILTIN_ROLL_TABLES: Record<Language, BuiltinRollTables> = {
	es: {
		scars: esScars,
		dungeonEvents: esDungeonEvents,
		wildernessEvents: esWildernessEvents,
	},
	en: {
		scars: enScars,
		dungeonEvents: enDungeonEvents,
		wildernessEvents: enWildernessEvents,
	},
};
