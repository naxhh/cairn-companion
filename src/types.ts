
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

export const TYPE_LABELS: Record<CairnType, string> = {
	object: "Objeto",
	skill: "Rasgo / Habilidad",
	spell: "Hechizo",
	npc: "PNJ",
	monster: "Monstruo",
	background: "Trasfondo",
	hireling: "Seguidor",
	bond: "Vínculo",
	omen: "Presagio",
	character: "Personaje",
};

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
