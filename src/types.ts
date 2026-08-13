
export type CairnType =
	| "object"
	| "skill"
	| "spell"
	| "npc"
	| "monster"
	| "background"
	| "hireling"
	| "bond"
	| "omen"
	| "character";

// All data types, excluding "character" which is always custom made.
export const DATA_TYPES: Exclude<CairnType, "character">[] = [
	"object",
	"skill",
	"spell",
	"npc",
	"monster",
	"background",
	"hireling",
	"bond",
	"omen",
];
export const TYPES: CairnType[] = [...DATA_TYPES, "character"];

// Display labels for each type live in src/i18n.ts (CairnStrings.types),
// selected at runtime based on the user's language setting.

export const TYPE_ICONS: Record<CairnType, string> = {
	object: "🎒",
	skill: "✨",
	spell: "📖",
	npc: "🧑",
	monster: "🐺",
	background: "📜",
	hireling: "🧭",
	bond: "🔗",
	omen: "🌩️",
	character: "🛡️",
};

// A generic { title, effect } roll-table row, used for the scars table and
// the guardian tools' event tables. Content lives in data/<lang>/*.json,
// not in code — these are game content, not plugin UI strings.
export interface RollTableEntry {
	title: string;
	effect: string;
}
