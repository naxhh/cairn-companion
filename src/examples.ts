import type { CairnType } from "./types";
import { DATA_TYPES } from "./types";
import type { Language } from "./settings";
import { EXAMPLES_FOLDER } from "./settings";
import type CairnPlugin from "./main";

/* -------------------------------------------------------------------------- */
/*  Sample notes created by the "Create custom examples" settings button.    */
/*  This is generated game content (like the bundled catalog data), not      */
/*  plugin UI chrome — but unlike the catalog (Spanish-only for now), these   */
/*  are authored directly here, so they're kept in both languages and picked */
/*  by the current language setting.                                        */
/* -------------------------------------------------------------------------- */

interface SampleNote {
	name: string;
	content: string;
}

const SAMPLES: Record<Language, Record<Exclude<CairnType, "character">, SampleNote>> = {
	es: {
		object: {
			name: "Cuchillo de la abuela",
			content:
				'---\ncairn_type: object\nname: "Cuchillo de la abuela"\ndamage: "1d6"\narmor: ""\ncost: "0 mo"\nslot: ""\nquality: ["Insignificante"]\nuses: ""\n---\n\nUn cuchillo de cocina desgastado, heredado. No vale nada y lo significa todo. Ejemplo de objeto personalizado: esta nota vive en tu carpeta y se suma al catálogo incorporado.\n',
		},
		skill: {
			name: "Sigiloso",
			content:
				'---\ncairn_type: skill\nname: "Sigiloso"\ncategory: "Rasgo de virtud"\n---\n\nSe mueve casi sin hacer ruido; obtiene Ventaja para pasar desapercibido si avanza despacio.\n',
		},
		spell: {
			name: "Luz fantasma",
			content:
				'---\ncairn_type: spell\nname: "Luz fantasma"\ncost: "1 Fatiga"\n---\n\nUna luz fría y azulada envuelve un objeto, iluminando 6 metros a su alrededor.\n',
		},
		npc: {
			name: "Aldric el Comerciante",
			content:
				'---\ncairn_type: npc\nname: "Aldric el Comerciante"\nrole: "Mercader ambulante"\nlocation: "Molino Viejo"\nfue: 8\ndes: 10\nvol: 12\npg: 3\narmor: 0\nattitude: "Cauteloso"\n---\n\nUn hombre nervioso que vende de todo un poco desde su carreta. Debe dinero a alguien peligroso.\n',
		},
		monster: {
			name: "Lobo hambriento",
			content:
				'---\ncairn_type: monster\nname: "Lobo hambriento"\nfue: 12\ndes: 14\nvol: 8\npg: 5\narmor: 0\nattacks: ["Mordisco (1d6)"]\nmoral: "Huye si queda solo"\nabilities: ["Caza en jauría: Ventaja si atacan 2 o más lobos al mismo objetivo"]\n---\n\nDelgado y desesperado, ataca solo cuando tiene ventaja numérica. Este es un ejemplo personalizado; el bestiario incorporado ya trae un "Lobo" normal.\n',
		},
		background: {
			name: "Aprendiz de Molinero",
			content:
				'---\ncairn_type: background\nname: "Aprendiz de Molinero"\ngear: ["3d6 monedas de oro", "Raciones (3 usos)", "Pala (1d6)", "Saco de harina (Voluminoso)"]\n---\n\nCreció entre el polvo de la harina y el crujir del molino.\n',
		},
		hireling: {
			name: "Perro rastreador de confianza",
			content:
				'---\ncairn_type: hireling\nname: "Perro rastreador de confianza"\ncost: "3 mo"\nrole: "Rastreo"\n---\n\nSigue cualquier rastro que haya olfateado antes. Ejemplo de seguidor personalizado; el catálogo incorporado ya trae un "Rastreador" genérico.\n',
		},
		bond: {
			name: "La promesa rota",
			content:
				'---\ncairn_type: bond\nname: "La promesa rota"\n---\n\nJuraste proteger a alguien y fallaste. Llevas un objeto suyo (Insignificante) que te recuerda esa deuda pendiente. Ejemplo de vínculo personalizado.\n',
		},
		omen: {
			name: "El pozo que canta",
			content:
				'---\ncairn_type: omen\nname: "El pozo que canta"\n---\n\nUn pozo del pueblo emite una melodía al anochecer que nadie más parece oír. Ejemplo de presagio personalizado.\n',
		},
	},
	en: {
		object: {
			name: "Grandma's knife",
			content:
				'---\ncairn_type: object\nname: "Grandma\'s knife"\ndamage: "1d6"\narmor: ""\ncost: "0gp"\nslot: ""\nquality: ["Insignificant"]\nuses: ""\n---\n\nA worn, inherited kitchen knife. Worth nothing and means everything. Custom object example: this note lives in your folder and gets added to the built-in catalog.\n',
		},
		skill: {
			name: "Stealthy",
			content:
				'---\ncairn_type: skill\nname: "Stealthy"\ncategory: "Virtue trait"\n---\n\nMoves almost silently; gains Advantage to go unnoticed while moving slowly.\n',
		},
		spell: {
			name: "Ghost light",
			content:
				'---\ncairn_type: spell\nname: "Ghost light"\ncost: "1 Fatigue"\n---\n\nA cold, bluish light envelops an object, lighting up a 20-foot radius.\n',
		},
		npc: {
			name: "Aldric the Merchant",
			content:
				'---\ncairn_type: npc\nname: "Aldric the Merchant"\nrole: "Traveling merchant"\nlocation: "Old Mill"\nfue: 8\ndes: 10\nvol: 12\npg: 3\narmor: 0\nattitude: "Cautious"\n---\n\nA nervous man who sells a bit of everything from his cart. He owes money to someone dangerous.\n',
		},
		monster: {
			name: "Hungry wolf",
			content:
				'---\ncairn_type: monster\nname: "Hungry wolf"\nfue: 12\ndes: 14\nvol: 8\npg: 5\narmor: 0\nattacks: ["Bite (1d6)"]\nmoral: "Flees if left alone"\nabilities: ["Pack hunter: Advantage if 2 or more wolves attack the same target"]\n---\n\nThin and desperate, it only attacks when it has the numbers. This is a custom example; the built-in bestiary already includes a normal "Wolf".\n',
		},
		background: {
			name: "Miller's Apprentice",
			content:
				'---\ncairn_type: background\nname: "Miller\'s Apprentice"\ngear: ["3d6 gold pieces", "Rations (3 uses)", "Shovel (1d6)", "Sack of flour (Bulky)"]\n---\n\nGrew up amid the flour dust and the creak of the mill.\n',
		},
		hireling: {
			name: "Trusty tracking dog",
			content:
				'---\ncairn_type: hireling\nname: "Trusty tracking dog"\ncost: "3gp"\nrole: "Tracking"\n---\n\nFollows any scent it has picked up before. Custom hireling example; the built-in catalog already includes a generic "Tracker".\n',
		},
		bond: {
			name: "The broken promise",
			content:
				'---\ncairn_type: bond\nname: "The broken promise"\n---\n\nYou swore to protect someone and failed. You carry an item of theirs (Insignificant) that reminds you of that unpaid debt. Custom bond example.\n',
		},
		omen: {
			name: "The singing well",
			content:
				'---\ncairn_type: omen\nname: "The singing well"\n---\n\nA well in town hums a tune at dusk that no one else seems to hear. Custom omen example.\n',
		},
	},
};

const CHARACTER_SAMPLE: Record<Language, SampleNote> = {
	es: {
		name: "Ejemplo de personaje",
		content: [
			"---",
			"cairn_type: character",
			'name: "Ejemplo de personaje"',
			'player: "Tú"',
			'background: "Guardahuesos"',
			"fue: 12",
			"fue_max: 14",
			"des: 10",
			"des_max: 10",
			"vol: 13",
			"vol_max: 13",
			"pg: 4",
			"pg_max: 6",
			"armor: 1",
			"gold: 18",
			'age: "27"',
			"inventory:",
			'  - {name: "Cuchillo de la abuela", qty: 1}',
			'  - {name: "Antorcha", qty: 3}',
			"insignificant:",
			'  - {name: "Amuleto, reliquia familiar", qty: 1}',
			'  - {name: "Tiza", qty: 2}',
			'notes: "Debe un favor a la Brigada del Amanecer."',
			"---",
			"",
			"# Ejemplo de personaje",
			"",
			"```cairn",
			"type: character",
			'name: "Ejemplo de personaje"',
			"```",
			"",
			"Usa los botones de la ficha para anotar daño, descansar, tirar salvaciones y añadir objetos.",
			"",
		].join("\n"),
	},
	en: {
		name: "Example character",
		content: [
			"---",
			"cairn_type: character",
			'name: "Example character"',
			'player: "You"',
			'background: "Bonekeeper"',
			"fue: 12",
			"fue_max: 14",
			"des: 10",
			"des_max: 10",
			"vol: 13",
			"vol_max: 13",
			"pg: 4",
			"pg_max: 6",
			"armor: 1",
			"gold: 18",
			'age: "27"',
			"inventory:",
			'  - {name: "Grandma\'s knife", qty: 1}',
			'  - {name: "Torch", qty: 3}',
			"insignificant:",
			'  - {name: "Amulet, family heirloom", qty: 1}',
			'  - {name: "Chalk", qty: 2}',
			'notes: "Owes a favor to the Dawn Brigade."',
			"---",
			"",
			"# Example character",
			"",
			"```cairn",
			"type: character",
			'name: "Example character"',
			"```",
			"",
			"Use the sheet's buttons to log damage, rest, roll saves, and add items.",
			"",
		].join("\n"),
	},
};

const USAGE_EXAMPLES: Record<Language, SampleNote> = {
	es: {
		name: "Ejemplos de uso",
		content: [
			"# Ejemplos de uso de Cairn Companion",
			"",
			"## Objeto incorporado",
			"```cairn",
			"type: object",
			'name: "Espada larga"',
			"```",
			"",
			"## Objeto personalizado (tu carpeta)",
			"```cairn",
			"type: object",
			'name: "Cuchillo de la abuela"',
			"```",
			"",
			"## Rasgo",
			"```cairn",
			"type: skill",
			'name: "Sigiloso"',
			"```",
			"",
			"## Hechizo incorporado",
			"```cairn",
			"type: spell",
			'name: "Detectar magia"',
			"```",
			"",
			"## PNJ (con notas de la partida)",
			"```cairn",
			"type: npc",
			'name: "Aldric el Comerciante"',
			"notas: Debe 40 mo al grupo",
			"```",
			"",
			"## Monstruo incorporado",
			"```cairn",
			"type: monster",
			'name: "Lobo"',
			"```",
			"",
			"## Trasfondo incorporado",
			"```cairn",
			"type: background",
			'name: "Naturalista"',
			"```",
			"",
			"## Seguidor incorporado",
			"```cairn",
			"type: hireling",
			'name: "Escolta veterano"',
			"```",
			"",
			"## Vínculo incorporado (inspiración inicial)",
			"```cairn",
			"type: bond",
			'name: "La gema heredada"',
			"```",
			"",
			"## Presagio incorporado (inspiración inicial)",
			"```cairn",
			"type: omen",
			'name: "El río pútrido"',
			"```",
			"",
			"## Ficha de personaje interactiva",
			"```cairn",
			"type: character",
			'name: "Ejemplo de personaje"',
			"```",
			"",
			"## Ficha de personaje, versión compacta (mode: small)",
			"```cairn",
			"type: character",
			'name: "Ejemplo de personaje"',
			"mode: small",
			"```",
			"",
			"## Herramientas del Guardián (embebido en la nota)",
			"```cairn",
			"type: tools",
			"```",
			"",
			"## Referencia todavía inexistente",
			"```cairn",
			"type: object",
			'name: "Objeto que no existe"',
			"```",
			"",
			"## Mención automática en una frase normal",
			"",
			'Debajo del árbol encuentran el hechizo "Luz fantasma" garabateado en un pergamino.',
			"",
		].join("\n"),
	},
	en: {
		name: "Usage examples",
		content: [
			"# Cairn Companion usage examples",
			"",
			"Note: the built-in catalog is currently only available in Spanish, so the",
			"\"built-in\" examples below reference their Spanish catalog names — that's",
			"expected, not a mistake.",
			"",
			"## Built-in object",
			"```cairn",
			"type: object",
			'name: "Espada larga"',
			"```",
			"",
			"## Custom object (your folder)",
			"```cairn",
			"type: object",
			'name: "Grandma\'s knife"',
			"```",
			"",
			"## Trait",
			"```cairn",
			"type: skill",
			'name: "Stealthy"',
			"```",
			"",
			"## Built-in spell",
			"```cairn",
			"type: spell",
			'name: "Detectar magia"',
			"```",
			"",
			"## NPC (with session notes)",
			"```cairn",
			"type: npc",
			'name: "Aldric the Merchant"',
			"notes: Owes the party 40gp",
			"```",
			"",
			"## Built-in monster",
			"```cairn",
			"type: monster",
			'name: "Lobo"',
			"```",
			"",
			"## Built-in background",
			"```cairn",
			"type: background",
			'name: "Naturalista"',
			"```",
			"",
			"## Built-in hireling",
			"```cairn",
			"type: hireling",
			'name: "Escolta veterano"',
			"```",
			"",
			"## Built-in bond (starting inspiration)",
			"```cairn",
			"type: bond",
			'name: "La gema heredada"',
			"```",
			"",
			"## Built-in omen (starting inspiration)",
			"```cairn",
			"type: omen",
			'name: "El río pútrido"',
			"```",
			"",
			"## Interactive character sheet",
			"```cairn",
			"type: character",
			'name: "Example character"',
			"```",
			"",
			"## Character sheet, compact version (mode: small)",
			"```cairn",
			"type: character",
			'name: "Example character"',
			"mode: small",
			"```",
			"",
			"## Warden tools (embedded in the note)",
			"```cairn",
			"type: tools",
			"```",
			"",
			"## Reference to something that doesn't exist yet",
			"```cairn",
			"type: object",
			'name: "An object that doesn\'t exist"',
			"```",
			"",
			"## Automatic mention in a normal sentence",
			"",
			'Under the tree they find the spell "Ghost light" scrawled on a scrap of parchment.',
			"",
		].join("\n"),
	},
};

export async function createSamples(plugin: CairnPlugin): Promise<void> {
	const lang = plugin.settings.language;
	const samples = SAMPLES[lang];

	await plugin.ensureFolder(EXAMPLES_FOLDER);
	for (const type of DATA_TYPES) {
		const s = samples[type];
		const path = `${EXAMPLES_FOLDER}/${s.name}.md`;
		if (!plugin.app.vault.getAbstractFileByPath(path)) {
			await plugin.app.vault.create(path, s.content);
		}
	}

	const char = CHARACTER_SAMPLE[lang];
	const charPath = `${EXAMPLES_FOLDER}/${char.name}.md`;
	if (!plugin.app.vault.getAbstractFileByPath(charPath)) {
		await plugin.app.vault.create(charPath, char.content);
	}

	const demo = USAGE_EXAMPLES[lang];
	const demoPath = `${EXAMPLES_FOLDER}/${demo.name}.md`;
	if (!plugin.app.vault.getAbstractFileByPath(demoPath)) {
		await plugin.app.vault.create(demoPath, demo.content);
	}

	plugin.reindex();
}
