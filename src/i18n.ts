import type { CairnType } from "./types";
import type { Language } from "./settings";

export interface CairnStrings {
	types: Record<CairnType, string>;
	createLabels: Record<CairnType, string>;

	fields: {
		object: {
			damage: string;
			armor: string;
			cost: string;
			slot: string;
			quality: string;
			uses: string;
			recharge: string;
		};
		skill: { category: string };
		spell: { cost: string };
		npc: {
			role: string;
			location: string;
			fue: string;
			des: string;
			vol: string;
			pg: string;
			armor: string;
			attitude: string;
		};
		monster: {
			fue: string;
			des: string;
			vol: string;
			pg: string;
			armor: string;
			attacks: string;
			moral: string;
			abilities: string;
		};
		background: { gear: string };
		hireling: { cost: string; role: string };
	};

	templates: {
		descriptionPlaceholder: (name: string) => string;
		characterBodyPlaceholder: string;
	};

	card: {
		missingName: (type: string) => string;
		builtinBadge: string;
		notFound: (name: string, typeLabel: string) => string;
		createNoteBtn: string;
		createCopyBtn: string;
		sessionNotesLabel: string;
	};

	tooltip: {
		notFound: string;
		clickToOpen: string;
		clickToPreview: string;
	};

	errors: {
		invalidYaml: string;
		missingType: string;
		missingName: string;
		unknownType: (rawType: string, validList: string) => string;
		expectedFormatHint: string;
		unknownBlockError: string;
	};

	sheet: {
		hp: string;
		fue: string;
		des: string;
		vol: string;
		save: string;
		saveOf: (label: string) => string;
		applyDamage: string;
		damagePlaceholder: string;
		rest: string;
		armor: string;
		gold: string;
		age: string;
		inventoryTitle: string;
		insignificantTitle: string;
		addObject: string;
		searchToAdd: (title: string) => string;
		noItemsYet: string;
		rollDamageAria: string;
		slotsSuffix: (count: number) => string;
		noSlotSuffix: (count: number) => string;
		notesLabel: string;
		small: { hp: string; armor: string };
		scarsWarning: (pgLost: number) => string;
	};

	dice: {
		advantageAria: string;
		disadvantageAria: string;
		advantageSuffix: string;
		disadvantageSuffix: string;
		rollAria: (formula: string) => string;
		success: string;
		fail: string;
	};

	guardianTools: {
		panelTitle: string;
		fateDie: string;
		fateFavorable: string;
		fateUnfavorable: string;
		reaction: string;
		reactionLabels: {
			hostile: string;
			cautious: string;
			curious: string;
			friendly: string;
			helpful: string;
		};
		weatherLabel: string;
		seasons: { spring: string; summer: string; fall: string; winter: string };
		weatherStates: {
			pleasant: string;
			normal: string;
			unpleasant: string;
			harsh: string;
			extreme: string;
		};
		extremeNote: string;
		eventsLabel: string;
		dungeonEventsButton: string;
		wildernessEventsButton: string;
		utilityBadge: string;
	};

	modals: {
		insertReferenceTypePrompt: string;
		insertReferenceSearchPrompt: (typeLabel: string) => string;
		toolsOptionLabel: string;
		newCharacterPrompt: string;
		createButton: string;
		randomEntryTypePrompt: string;
		noEntriesOfType: (typeLabel: string) => string;
		rerollButton: string;
		insertIntoDocButton: string;
		noActiveEditor: string;
		insertedNotice: (name: string) => string;
	};

	settings: {
		heading: string;
		languageName: string;
		languageDesc: string;
		languageEs: string;
		languageEn: string;
		folderInfoParagraph: string;
		defaultFolderName: string;
		defaultFolderDesc: string;
		autoLinkName: string;
		autoLinkDesc: string;
		minLengthName: string;
		minLengthDesc: string;
		autoReindexName: string;
		autoReindexDesc: string;
		reindexNowName: string;
		reindexButton: string;
		reindexNotice: (n: number) => string;
		reloadDataName: string;
		reloadDataDesc: string;
		reloadButton: string;
		reloadNotice: (n: number) => string;
		createSamplesName: string;
		createSamplesDesc: string;
		createSamplesButton: string;
		createSamplesNotice: string;
		diceRollerName: string;
		diceRollerFound: string;
		diceRollerNotFound: string;
		usageHeading: string;
		usageIntro: string;
		usageExtraFields: string;
		usageCharacterCommand: string;
		usagePerTypeCommands: string;
		fallbackLanguageNotice: (lang: string) => string;
	};

	commands: {
		reindex: string;
		insertReference: string;
		randomEntry: string;
		guardianTools: string;
		newCharacter: string;
	};

	notices: {
		noteCreateFailed: (err: string) => string;
		copyExists: string;
		copyCreateFailed: (err: string) => string;
	};
}

export const es: CairnStrings = {
	types: {
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
	},

	createLabels: {
		object: "Nuevo objeto",
		skill: "Nuevo rasgo o habilidad",
		spell: "Nuevo hechizo",
		npc: "Nuevo PNJ",
		monster: "Nuevo monstruo",
		background: "Nuevo trasfondo",
		hireling: "Nuevo seguidor",
		bond: "Nuevo vínculo",
		omen: "Nuevo presagio",
		character: "Nueva ficha de personaje",
	},

	fields: {
		object: {
			damage: "Daño",
			armor: "Armadura",
			cost: "Coste",
			slot: "Espacio",
			quality: "Cualidad",
			uses: "Usos",
			recharge: "Recarga",
		},
		skill: { category: "Categoría" },
		spell: { cost: "Coste" },
		npc: {
			role: "Rol",
			location: "Ubicación",
			fue: "FUE",
			des: "DES",
			vol: "VOL",
			pg: "PG",
			armor: "Armadura",
			attitude: "Actitud",
		},
		monster: {
			fue: "FUE",
			des: "DES",
			vol: "VOL",
			pg: "PG",
			armor: "Armadura",
			attacks: "Ataques",
			moral: "Moral",
			abilities: "Habilidades",
		},
		background: { gear: "Equipo inicial" },
		hireling: { cost: "Coste por día", role: "Especialidad" },
	},

	templates: {
		descriptionPlaceholder: (name) => `Descripción de **${name}**.`,
		characterBodyPlaceholder: "Trasfondo, vínculos, presagios y notas de campaña...",
	},

	card: {
		missingName: (type) => `⚠️ Falta el nombre en el bloque cairn (${type})`,
		builtinBadge: "incorporado",
		notFound: (name, typeLabel) => `No se encontró «${name}» (${typeLabel}) en el catálogo.`,
		createNoteBtn: "Crear nota",
		createCopyBtn: "✎ Crear copia editable en mi carpeta",
		sessionNotesLabel: "Notas de la partida: ",
	},

	tooltip: {
		notFound: "No encontrado en el catálogo.",
		clickToOpen: "Clic para abrir la nota",
		clickToPreview: "Clic para ver todos los detalles",
	},

	errors: {
		invalidYaml: "El contenido del bloque no es YAML válido.",
		missingType: 'Falta el campo obligatorio "type".',
		missingName: 'Falta el campo obligatorio "name".',
		unknownType: (rawType, validList) => `Tipo "${rawType}" desconocido. Usa uno de: ${validList}, tools.`,
		expectedFormatHint: 'Formato esperado:\ntype: <tipo>\nname: "<nombre>"',
		unknownBlockError: "Error desconocido en el bloque.",
	},

	sheet: {
		hp: "PG",
		fue: "FUE",
		des: "DES",
		vol: "VOL",
		save: "🎲 Salvación",
		saveOf: (label) => `Salvación de ${label}`,
		applyDamage: "Aplicar daño",
		damagePlaceholder: "daño",
		rest: "Descansar (recuperar PG)",
		armor: "Armadura",
		gold: "Oro",
		age: "Edad",
		inventoryTitle: "Inventario",
		insignificantTitle: "Objetos insignificantes",
		addObject: "+ Añadir objeto",
		searchToAdd: (title) => `Buscar objeto para añadir a «${title}»…`,
		noItemsYet: "Sin objetos todavía.",
		rollDamageAria: "Tirar daño",
		slotsSuffix: (count) => ` — ${count}/10 espacios`,
		noSlotSuffix: (count) => (count > 0 ? ` — ${count} línea${count === 1 ? "" : "s"}, no ocupan espacio` : ""),
		notesLabel: "Notas rápidas",
		small: { hp: "PG", armor: "Armadura" },
		scarsWarning: (pgLost) => `PG a 0 (perdiste ${pgLost}) — `,
	},

	dice: {
		advantageAria: "Tirar con Ventaja (1d12)",
		disadvantageAria: "Tirar con Desventaja (1d4)",
		advantageSuffix: "(Ventaja)",
		disadvantageSuffix: "(Desventaja)",
		rollAria: (formula) => `Tirar ${formula}`,
		success: "✅ Éxito",
		fail: "❌ Fallo",
	},

	guardianTools: {
		panelTitle: "Herramientas del Guardián",
		fateDie: "🎲 Dado del Destino",
		fateFavorable: "Favorece a los PJ",
		fateUnfavorable: "Mala suerte para los PJ",
		reaction: "🎲 Reacción de PNJ",
		reactionLabels: {
			hostile: "Hostil",
			cautious: "Cauteloso",
			curious: "Curioso",
			friendly: "Amable",
			helpful: "Servicial",
		},
		weatherLabel: "Clima",
		seasons: { spring: "Primavera", summer: "Verano", fall: "Otoño", winter: "Invierno" },
		weatherStates: {
			pleasant: "Agradable",
			normal: "Normal",
			unpleasant: "Desagradable",
			harsh: "Inclemente",
			extreme: "Extremo",
		},
		extremeNote: " (si sale Extremo dos veces seguidas, se vuelve Catastrófico)",
		eventsLabel: "Eventos",
		dungeonEventsButton: "🎲 En la Mazmorra",
		wildernessEventsButton: "🎲 En Entornos Salvajes",
		utilityBadge: "Utilidad",
	},

	modals: {
		insertReferenceTypePrompt: "¿Qué tipo de entrada quieres insertar?",
		insertReferenceSearchPrompt: (typeLabel) => `Buscar ${typeLabel.toLowerCase()}…`,
		toolsOptionLabel: "🧰 Herramientas del Guardián",
		newCharacterPrompt: "Nombre del personaje",
		createButton: "Crear",
		randomEntryTypePrompt: "¿Entrada aleatoria de qué tipo?",
		noEntriesOfType: (typeLabel) => `No hay entradas de tipo "${typeLabel}" todavía.`,
		rerollButton: "🎲 Otra entrada de este tipo",
		insertIntoDocButton: "📋 Insertar en el documento",
		noActiveEditor: "Abre una nota en modo edición para poder insertar aquí.",
		insertedNotice: (name) => `Insertado: ${name}`,
	},

	settings: {
		heading: "Cairn Companion",
		languageName: "Idioma de los datos incorporados",
		languageDesc:
			"Objetos, hechizos, monstruos y trasfondos oficiales vienen empaquetados con el plugin. " +
			"Elige el idioma; si un idioma todavía no tiene datos, se usa Español como reserva.",
		languageEs: "Español",
		languageEn: "English",
		folderInfoParagraph:
			"La detección de tipo es siempre por la propiedad cairn_type del frontmatter — nunca por la " +
			"carpeta. Puedes guardar tus notas donde quieras: un catálogo reusable en, por ejemplo, «_db/», " +
			"y entradas propias de una campaña en «Campaña/Personajes/» o incluso " +
			"«Campaña/Facción 1/PNJ/Tesorero.md». La carpeta de abajo solo se usa como destino por defecto " +
			"cuando el propio plugin crea una nota nueva por ti (botón «Crear nota», los comandos «Nuevo " +
			"objeto» / «Nuevo PNJ» / etc., «Crear copia editable»...) — no restringe dónde puede vivir una " +
			"nota ya existente, ni hay una carpeta distinta por tipo.",
		defaultFolderName: "Carpeta por defecto",
		defaultFolderDesc: "Dónde se crean las notas nuevas cuando usas el plugin, sea cual sea su tipo.",
		autoLinkName: "Detectar menciones automáticamente",
		autoLinkDesc:
			"Cuando escribes el nombre de una entrada del catálogo en texto normal (fuera de un bloque " +
			"cairn), se convierte en un enlace: al pasar el ratón se ve una ficha resumida, y al hacer " +
			"clic se abre o previsualiza. Solo funciona en vista de lectura, no mientras editas.",
		minLengthName: "Longitud mínima para palabras sueltas",
		minLengthDesc:
			"Para evitar convertir palabras comunes en enlaces (p. ej. «Red» o «Vara»), los nombres de una " +
			"sola palabra solo se detectan a partir de esta longitud. Los nombres de varias palabras " +
			"(p. ej. «Espada larga») siempre se detectan enteros.",
		autoReindexName: "Reindexar automáticamente",
		autoReindexDesc: "Actualiza el índice cuando creas, editas o borras notas.",
		reindexNowName: "Reindexar ahora",
		reindexButton: "Reindexar",
		reindexNotice: (n) => `Reindexado: ${n} entradas.`,
		reloadDataName: "Recargar datos incorporados",
		reloadDataDesc: "Vuelve a leer los archivos JSON del plugin (útil si los editaste o añadiste un idioma nuevo).",
		reloadButton: "Recargar",
		reloadNotice: (n) => `Datos recargados: ${n} entradas.`,
		createSamplesName: "Crear ejemplos personalizados",
		createSamplesDesc:
			"Añade una nota de ejemplo por tipo en tus carpetas (incluida una ficha de personaje ya rellena) " +
			"y una nota «cairn-ejemplos/Ejemplos de uso» con todos los bloques.",
		createSamplesButton: "Crear ejemplos",
		createSamplesNotice: "Ejemplos creados.",
		diceRollerName: "Plugin de dados",
		diceRollerFound: "✅ «Dice Roller» detectado: los botones 🎲 lo usarán para tirar.",
		diceRollerNotFound: "No se detectó el plugin «Dice Roller». Los botones 🎲 usarán un generador interno propio.",
		usageHeading: "Cómo usarlo",
		usageIntro:
			"Un único tipo de bloque para todo, con dos campos obligatorios: type y name. Mientras escribes " +
			"dentro del bloque, ambos campos se autocompletan (type sugiere los tipos válidos; name sugiere " +
			"las entradas de ese tipo ya indexadas).",
		usageExtraFields:
			"Cualquier campo extra dentro del bloque, aparte de type y name, se muestra como «Notas de la " +
			"partida» sin modificar la ficha original.",
		usageCharacterCommand:
			"Comando «Nueva ficha de personaje»: crea una nota con una ficha interactiva (características, PG, " +
			"inventario, notas) que puedes editar directamente desde la vista de lectura — los cambios se ven " +
			"al instante, sin recargar.",
		usagePerTypeCommands:
			"También hay un comando «Nuevo <tipo>» por cada tipo (Nuevo objeto, Nuevo PNJ, Nuevo monstruo...): " +
			"pide un nombre y crea la nota con todas las propiedades vacías y, en el cuerpo, el bloque cairn " +
			"ya escrito y listo para copiar y pegar donde quieras referenciarlo.",
		fallbackLanguageNotice: (lang) => `No hay datos en "${lang}" todavía; se usó Español como reserva.`,
	},

	commands: {
		reindex: "Reindexar entradas de Cairn",
		insertReference: "Insertar referencia de Cairn",
		randomEntry: "Entrada aleatoria",
		guardianTools: "Herramientas del Guardián (Destino, Reacción, Clima, Eventos)",
		newCharacter: "Nueva ficha de personaje",
	},

	notices: {
		noteCreateFailed: (err) => `No se pudo crear la nota: ${err}`,
		copyExists: "Ya existe una copia en tu carpeta; abriéndola.",
		copyCreateFailed: (err) => `No se pudo crear la copia: ${err}`,
	},
};

export const en: CairnStrings = {
	types: {
		object: "Object",
		skill: "Trait / Skill",
		spell: "Spell",
		npc: "NPC",
		monster: "Monster",
		background: "Background",
		hireling: "Hireling",
		bond: "Bond",
		omen: "Omen",
		character: "Character",
	},

	createLabels: {
		object: "New object",
		skill: "New trait or skill",
		spell: "New spell",
		npc: "New NPC",
		monster: "New monster",
		background: "New background",
		hireling: "New hireling",
		bond: "New bond",
		omen: "New omen",
		character: "New character sheet",
	},

	fields: {
		object: {
			damage: "Damage",
			armor: "Armor",
			cost: "Cost",
			slot: "Slot",
			quality: "Quality",
			uses: "Uses",
			recharge: "Recharge",
		},
		skill: { category: "Category" },
		spell: { cost: "Cost" },
		npc: {
			role: "Role",
			location: "Location",
			fue: "STR",
			des: "DEX",
			vol: "WIL",
			pg: "HP",
			armor: "Armor",
			attitude: "Attitude",
		},
		monster: {
			fue: "STR",
			des: "DEX",
			vol: "WIL",
			pg: "HP",
			armor: "Armor",
			attacks: "Attacks",
			moral: "Morale",
			abilities: "Abilities",
		},
		background: { gear: "Starting gear" },
		hireling: { cost: "Cost per day", role: "Specialty" },
	},

	templates: {
		descriptionPlaceholder: (name) => `Description of **${name}**.`,
		characterBodyPlaceholder: "Background, bonds, omens, and campaign notes...",
	},

	card: {
		missingName: (type) => `⚠️ Missing name in the cairn block (${type})`,
		builtinBadge: "built-in",
		notFound: (name, typeLabel) => `Couldn't find "${name}" (${typeLabel}) in the catalog.`,
		createNoteBtn: "Create note",
		createCopyBtn: "✎ Create an editable copy in my folder",
		sessionNotesLabel: "Session notes: ",
	},

	tooltip: {
		notFound: "Not found in the catalog.",
		clickToOpen: "Click to open the note",
		clickToPreview: "Click to see full details",
	},

	errors: {
		invalidYaml: "The block's content isn't valid YAML.",
		missingType: 'Missing required field "type".',
		missingName: 'Missing required field "name".',
		unknownType: (rawType, validList) => `Unknown type "${rawType}". Use one of: ${validList}, tools.`,
		expectedFormatHint: 'Expected format:\ntype: <type>\nname: "<name>"',
		unknownBlockError: "Unknown error in the block.",
	},

	sheet: {
		hp: "HP",
		fue: "STR",
		des: "DEX",
		vol: "WIL",
		save: "🎲 Save",
		saveOf: (label) => `${label} Save`,
		applyDamage: "Apply damage",
		damagePlaceholder: "damage",
		rest: "Rest (restore HP)",
		armor: "Armor",
		gold: "Gold",
		age: "Age",
		inventoryTitle: "Inventory",
		insignificantTitle: "Trivial items",
		addObject: "+ Add object",
		searchToAdd: (title) => `Search for an object to add to "${title}"…`,
		noItemsYet: "No items yet.",
		rollDamageAria: "Roll damage",
		slotsSuffix: (count) => ` — ${count}/10 slots`,
		noSlotSuffix: (count) => (count > 0 ? ` — ${count} line${count === 1 ? "" : "s"}, take up no space` : ""),
		notesLabel: "Quick notes",
		small: { hp: "HP", armor: "Armor" },
		scarsWarning: (pgLost) => `HP hit 0 (lost ${pgLost}) — `,
	},

	dice: {
		advantageAria: "Roll with Advantage (1d12)",
		disadvantageAria: "Roll with Disadvantage (1d4)",
		advantageSuffix: "(Advantage)",
		disadvantageSuffix: "(Disadvantage)",
		rollAria: (formula) => `Roll ${formula}`,
		success: "✅ Success",
		fail: "❌ Failure",
	},

	guardianTools: {
		panelTitle: "Warden Tools",
		fateDie: "🎲 Fate Die",
		fateFavorable: "Favors the PCs",
		fateUnfavorable: "Bad luck for the PCs",
		reaction: "🎲 NPC Reaction",
		reactionLabels: {
			hostile: "Hostile",
			cautious: "Cautious",
			curious: "Curious",
			friendly: "Friendly",
			helpful: "Helpful",
		},
		weatherLabel: "Weather",
		seasons: { spring: "Spring", summer: "Summer", fall: "Fall", winter: "Winter" },
		weatherStates: {
			pleasant: "Pleasant",
			normal: "Normal",
			unpleasant: "Unpleasant",
			harsh: "Harsh",
			extreme: "Extreme",
		},
		extremeNote: " (two Extreme results in a row turns it Catastrophic)",
		eventsLabel: "Events",
		dungeonEventsButton: "🎲 In the Dungeon",
		wildernessEventsButton: "🎲 In the Wilderness",
		utilityBadge: "Utility",
	},

	modals: {
		insertReferenceTypePrompt: "Which type of entry do you want to insert?",
		insertReferenceSearchPrompt: (typeLabel) => `Search ${typeLabel.toLowerCase()}…`,
		toolsOptionLabel: "🧰 Warden Tools",
		newCharacterPrompt: "Character name",
		createButton: "Create",
		randomEntryTypePrompt: "Random entry of which type?",
		noEntriesOfType: (typeLabel) => `There are no "${typeLabel}" entries yet.`,
		rerollButton: "🎲 Another entry of this type",
		insertIntoDocButton: "📋 Insert into document",
		noActiveEditor: "Open a note in edit mode to insert here.",
		insertedNotice: (name) => `Inserted: ${name}`,
	},

	settings: {
		heading: "Cairn Companion",
		languageName: "Built-in data language",
		languageDesc:
			"Official objects, spells, monsters, and backgrounds ship bundled with the plugin. " +
			"Pick a language; if a language doesn't have data yet, Spanish is used as a fallback.",
		languageEs: "Español",
		languageEn: "English",
		folderInfoParagraph:
			"Type detection is always based on the note's cairn_type frontmatter property — never on " +
			"the folder. Save your notes wherever you like: a reusable catalog in, say, \"_db/\", and " +
			"campaign-specific entries in \"Campaign/Characters/\" or even " +
			"\"Campaign/Faction 1/NPCs/Treasurer.md\". The folder below is only used as the default " +
			"destination when the plugin itself creates a new note for you (the \"Create note\" button, the " +
			"\"New object\" / \"New NPC\" / etc. commands, \"Create editable copy\"...) — it doesn't restrict " +
			"where an existing note can live, and there's no separate folder per type.",
		defaultFolderName: "Default folder",
		defaultFolderDesc: "Where new notes are created when you use the plugin, regardless of type.",
		autoLinkName: "Detect mentions automatically",
		autoLinkDesc:
			"When you type the name of a catalog entry in normal text (outside a cairn block), it turns " +
			"into a link: hovering shows a summary card, and clicking opens or previews it. Only works in " +
			"reading view, not while editing.",
		minLengthName: "Minimum length for single words",
		minLengthDesc:
			"To avoid turning common words into links (e.g. \"Net\" or \"Rod\"), single-word names are only " +
			"detected once they reach this length. Multi-word names (e.g. \"Long sword\") are always " +
			"detected in full.",
		autoReindexName: "Reindex automatically",
		autoReindexDesc: "Updates the index whenever you create, edit, or delete notes.",
		reindexNowName: "Reindex now",
		reindexButton: "Reindex",
		reindexNotice: (n) => `Reindexed: ${n} entries.`,
		reloadDataName: "Reload built-in data",
		reloadDataDesc: "Re-reads the plugin's JSON files (useful if you edited them or added a new language).",
		reloadButton: "Reload",
		reloadNotice: (n) => `Data reloaded: ${n} entries.`,
		createSamplesName: "Create custom examples",
		createSamplesDesc:
			"Adds one sample note per type in your folders (including an already-filled-in character sheet) " +
			"and a \"cairn-examples/Usage examples\" note with every block.",
		createSamplesButton: "Create examples",
		createSamplesNotice: "Examples created.",
		diceRollerName: "Dice plugin",
		diceRollerFound: "✅ \"Dice Roller\" detected: the 🎲 buttons will use it to roll.",
		diceRollerNotFound: "The \"Dice Roller\" plugin wasn't detected. The 🎲 buttons will use a built-in generator instead.",
		usageHeading: "How to use it",
		usageIntro:
			"A single block type for everything, with two required fields: type and name. As you type " +
			"inside the block, both fields autocomplete (type suggests valid types; name suggests already-" +
			"indexed entries of that type).",
		usageExtraFields:
			"Any extra field inside the block, besides type and name, is shown as \"Session notes\" without " +
			"modifying the original entry.",
		usageCharacterCommand:
			"\"New character sheet\" command: creates a note with an interactive sheet (characteristics, HP, " +
			"inventory, notes) you can edit directly from reading view — changes show up instantly, no " +
			"reload needed.",
		usagePerTypeCommands:
			"There's also a \"New <type>\" command for each type (New object, New NPC, New monster...): it " +
			"asks for a name and creates the note with every property empty and, in the body, the cairn " +
			"block already written and ready to copy and paste wherever you want to reference it.",
		fallbackLanguageNotice: (lang) => `No data for "${lang}" yet; Spanish was used as a fallback.`,
	},

	commands: {
		reindex: "Reindex Cairn entries",
		insertReference: "Insert Cairn reference",
		randomEntry: "Random entry",
		guardianTools: "Warden tools (Fate, Reaction, Weather, Events)",
		newCharacter: "New character sheet",
	},

	notices: {
		noteCreateFailed: (err) => `Couldn't create the note: ${err}`,
		copyExists: "A copy already exists in your folder; opening it.",
		copyCreateFailed: (err) => `Couldn't create the copy: ${err}`,
	},
};

export function getStrings(lang: Language): CairnStrings {
	return lang === "en" ? en : es;
}