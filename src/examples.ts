import type { CairnType } from "./types";
import { DATA_TYPES } from "./types";
import { EXAMPLES_FOLDER } from "./settings";
import type CairnPlugin from "./main";

/* -------------------------------------------------------------------------- */
/*  Sample notes created by the "Create custom examples" settings button.    */
/*  This is generated game content (like the bundled catalog data), not      */
/*  plugin UI chrome, so it stays in Spanish regardless of the UI language.  */
/* -------------------------------------------------------------------------- */

const SAMPLES: Record<Exclude<CairnType, "character">, { name: string; content: string }> = {
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
};

const CHARACTER_SAMPLE = [
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
].join("\n");

const USAGE_EXAMPLES = [
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
].join("\n");

export async function createSamples(plugin: CairnPlugin): Promise<void> {
	await plugin.ensureFolder(EXAMPLES_FOLDER);
	for (const type of DATA_TYPES) {
		const s = SAMPLES[type];
		const path = `${EXAMPLES_FOLDER}/${s.name}.md`;
		if (!plugin.app.vault.getAbstractFileByPath(path)) {
			await plugin.app.vault.create(path, s.content);
		}
	}

	const charPath = `${EXAMPLES_FOLDER}/Ejemplo de personaje.md`;
	if (!plugin.app.vault.getAbstractFileByPath(charPath)) {
		await plugin.app.vault.create(charPath, CHARACTER_SAMPLE);
	}

	const demoPath = `${EXAMPLES_FOLDER}/Ejemplos de uso.md`;
	if (!plugin.app.vault.getAbstractFileByPath(demoPath)) {
		await plugin.app.vault.create(demoPath, USAGE_EXAMPLES);
	}

	plugin.reindex();
}
