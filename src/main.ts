import {
	App,
	Editor,
	EditorPosition,
	EditorSuggest,
	EditorSuggestContext,
	EditorSuggestTriggerInfo,
	FuzzySuggestModal,
	MarkdownPostProcessorContext,
	MarkdownRenderer,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	normalizePath,
	parseYaml,
	stringifyYaml,
} from "obsidian";

/* -------------------------------------------------------------------------- */
/*  Tipos de entrada                                                          */
/* -------------------------------------------------------------------------- */

type CairnType =
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

// Tipos con datos incorporados (todo menos "character", que siempre es tuyo).
const DATA_TYPES: Exclude<CairnType, "character">[] = [
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
const TYPES: CairnType[] = [...DATA_TYPES, "character"];

const TYPE_LABELS: Record<CairnType, string> = {
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

const TYPE_ICONS: Record<CairnType, string> = {
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

interface FieldDef {
	key: string;
	label: string;
	format?: (v: unknown) => string;
}

function joinArr(v: unknown): string {
	return Array.isArray(v) ? v.join(", ") : String(v);
}

const FIELD_DEFS: Record<CairnType, FieldDef[]> = {
	object: [
		{ key: "damage", label: "Daño" },
		{ key: "armor", label: "Armadura" },
		{ key: "cost", label: "Coste" },
		{ key: "slot", label: "Espacio" },
		{ key: "quality", label: "Cualidad", format: joinArr },
		{ key: "uses", label: "Usos" },
		{ key: "recharge", label: "Recarga" },
	],
	skill: [{ key: "category", label: "Categoría" }],
	spell: [{ key: "cost", label: "Coste" }],
	npc: [
		{ key: "role", label: "Rol" },
		{ key: "location", label: "Ubicación" },
		{ key: "fue", label: "FUE" },
		{ key: "des", label: "DES" },
		{ key: "vol", label: "VOL" },
		{ key: "pg", label: "PG" },
		{ key: "armor", label: "Armadura" },
		{ key: "attitude", label: "Actitud" },
	],
	monster: [
		{ key: "fue", label: "FUE" },
		{ key: "des", label: "DES" },
		{ key: "vol", label: "VOL" },
		{ key: "pg", label: "PG" },
		{ key: "armor", label: "Armadura" },
		{ key: "attacks", label: "Ataques", format: joinArr },
		{ key: "moral", label: "Moral" },
		{ key: "abilities", label: "Habilidades", format: joinArr },
	],
	background: [{ key: "gear", label: "Equipo inicial", format: joinArr }],
	hireling: [
		{ key: "cost", label: "Coste por día" },
		{ key: "role", label: "Especialidad" },
	],
	bond: [],
	omen: [],
	character: [],
};

function cairnBodyBlock(type: CairnType, name: string): string {
	return ["```cairn", `type: ${type}`, `name: "${name}"`, "```"].join("\n");
}

function simpleTemplate(type: CairnType, extraFields: string): (name: string) => string {
	return (n: string) =>
		`---\ncairn_type: ${type}\nname: "${n}"\n${extraFields}---\n\n# ${n}\n\n${cairnBodyBlock(
			type,
			n
		)}\n\nDescripción de **${n}**.\n`;
}

const TEMPLATES: Record<CairnType, (name: string) => string> = {
	object: simpleTemplate(
		"object",
		'damage: ""\narmor: ""\ncost: ""\nslot: ""\nquality: []\nuses: ""\nrecharge: ""\n'
	),
	skill: simpleTemplate("skill", 'category: ""\n'),
	spell: simpleTemplate("spell", 'cost: ""\n'),
	npc: simpleTemplate(
		"npc",
		'role: ""\nlocation: ""\nfue: ""\ndes: ""\nvol: ""\npg: ""\narmor: ""\nattitude: ""\n'
	),
	monster: simpleTemplate(
		"monster",
		'fue: ""\ndes: ""\nvol: ""\npg: ""\narmor: ""\nattacks: []\nmoral: ""\nabilities: []\n'
	),
	background: simpleTemplate("background", "gear: []\n"),
	hireling: simpleTemplate("hireling", 'cost: ""\nrole: ""\n'),
	bond: simpleTemplate("bond", ""),
	omen: simpleTemplate("omen", ""),
	character: (n) =>
		[
			"---",
			"cairn_type: character",
			`name: "${n}"`,
			'player: ""',
			'background: ""',
			'fue: ""',
			'fue_max: ""',
			'des: ""',
			'des_max: ""',
			'vol: ""',
			'vol_max: ""',
			'pg: ""',
			'pg_max: ""',
			'armor: ""',
			'gold: ""',
			'age: ""',
			"inventory: []",
			"insignificant: []",
			'notes: ""',
			'mode: "all"',
			"---",
			"",
			`# ${n}`,
			"",
			cairnBodyBlock("character", n),
			"",
			"Trasfondo, vínculos, presagios y notas de campaña...",
			"",
		].join("\n"),
};

const CREATE_LABELS: Record<CairnType, string> = {
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
};

/* -------------------------------------------------------------------------- */
/*  Ajustes                                                                    */
/* -------------------------------------------------------------------------- */

type Language = "es" | "en";

interface CairnSettings {
	language: Language;
	defaultFolder: string;
	autoReindex: boolean;
	autoLink: boolean;
	autoLinkMinLength: number;
}

const EXAMPLES_FOLDER = "cairn-ejemplos";

const DEFAULT_SETTINGS: CairnSettings = {
	language: "es",
	defaultFolder: "Cairn",
	autoReindex: true,
	autoLink: true,
	autoLinkMinLength: 6,
};

/* -------------------------------------------------------------------------- */
/*  Índice: combina datos incorporados (JSON) + notas del vault               */
/* -------------------------------------------------------------------------- */

interface CairnEntry {
	type: CairnType;
	name: string;
	file: TFile | null; // null = entrada incorporada, sin nota propia
	frontmatter: Record<string, unknown>;
	description: string; // solo se usa para entradas incorporadas (sin archivo)
	aliases: string[];
	source: "builtin" | "vault";
}

interface BuiltinRaw {
	name: string;
	description?: string;
	aliases?: string[];
	[key: string]: unknown;
}

function normalize(s: string): string {
	return s.trim().toLowerCase();
}

class CairnIndex {
	entries: Record<CairnType, Map<string, CairnEntry>> = {
		object: new Map(),
		skill: new Map(),
		spell: new Map(),
		npc: new Map(),
		monster: new Map(),
		background: new Map(),
		hireling: new Map(),
		bond: new Map(),
		omen: new Map(),
		character: new Map(),
	};

	builtin: Record<Exclude<CairnType, "character">, BuiltinRaw[]> = {
		object: [],
		skill: [],
		spell: [],
		npc: [],
		monster: [],
		background: [],
		hireling: [],
		bond: [],
		omen: [],
	};

	constructor(private app: App, private settings: CairnSettings) {}

	clear() {
		for (const t of TYPES) this.entries[t].clear();
	}

	rebuild() {
		this.clear();

		// 1) Datos incorporados primero (JSON del plugin)
		for (const t of DATA_TYPES) {
			for (const raw of this.builtin[t]) {
				if (!raw || typeof raw.name !== "string" || !raw.name.trim()) continue;
				const { name, description, aliases, ...rest } = raw;
				const entry: CairnEntry = {
					type: t,
					name,
					file: null,
					frontmatter: rest,
					description: typeof description === "string" ? description : "",
					aliases: Array.isArray(aliases) ? aliases.map(String) : [],
					source: "builtin",
				};
				this.entries[t].set(normalize(name), entry);
				for (const a of entry.aliases) this.entries[t].set(normalize(a), entry);
			}
		}

		// 2) Notas del vault: añaden o sobrescriben por nombre.
		// La detección es siempre por la propiedad "cairn_type" del frontmatter,
		// sin importar en qué carpeta viva la nota (puedes tener un catálogo
		// reusable en "_db/" y entradas propias de una campaña en
		// "Campaña/Faccion1/PNJ/Tesorero.md", por ejemplo).
		const files = this.app.vault.getMarkdownFiles();
		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			const fm = (cache?.frontmatter ?? {}) as Record<string, unknown>;

			const fmType = fm["cairn_type"];
			if (typeof fmType !== "string" || !(TYPES as string[]).includes(fmType)) continue;
			const type = fmType as CairnType;

			const name = (typeof fm["name"] === "string" && (fm["name"] as string).trim()) || file.basename;
			const rawAliases = fm["aliases"];
			const aliases: string[] = Array.isArray(rawAliases)
				? rawAliases.map(String)
				: typeof rawAliases === "string"
				? [rawAliases]
				: [];

			const entry: CairnEntry = { type, name, file, frontmatter: fm, description: "", aliases, source: "vault" };
			this.entries[type].set(normalize(name), entry);
			for (const a of aliases) this.entries[type].set(normalize(a), entry);
		}
	}

	find(type: CairnType, name: string): CairnEntry | undefined {
		return this.entries[type].get(normalize(name));
	}

	list(type: CairnType): CairnEntry[] {
		const seen = new Set<CairnEntry>();
		const out: CairnEntry[] = [];
		for (const e of this.entries[type].values()) {
			if (!seen.has(e)) {
				seen.add(e);
				out.push(e);
			}
		}
		return out.sort((a, b) => a.name.localeCompare(b.name));
	}
}

/* -------------------------------------------------------------------------- */
/*  Dados: usa el plugin "Dice Roller" si está disponible, si no cae a un     */
/*  generador interno.                                                        */
/* -------------------------------------------------------------------------- */

interface DiceRollerLike {
	getRoller: (
		formula: string,
		sourcePath?: string
	) => Promise<{ roll: () => Promise<number | string>; containerEl?: HTMLElement }>;
}

function getDiceRollerApi(app: App): DiceRollerLike | null {
	const anyApp = app as unknown as { plugins?: { plugins?: Record<string, unknown> } };
	const plug = anyApp.plugins?.plugins?.["obsidian-dice-roller"] as DiceRollerLike | undefined;
	if (plug && typeof plug.getRoller === "function") return plug;
	return null;
}

function fallbackRoll(formula: string): number {
	const clean = formula.replace(/\s+/g, "");
	const tokens = clean.match(/[+-]?[^+-]+/g) || [clean];
	let total = 0;
	for (const tok of tokens) {
		const sign = tok.startsWith("-") ? -1 : 1;
		const body = tok.replace(/^[+-]/, "");
		const diceMatch = body.match(/^(\d*)d(\d+)$/i);
		if (diceMatch) {
			const num = parseInt(diceMatch[1] || "1", 10);
			const sides = parseInt(diceMatch[2], 10);
			for (let i = 0; i < num; i++) total += sign * (1 + Math.floor(Math.random() * sides));
		} else if (/^\d+$/.test(body)) {
			total += sign * parseInt(body, 10);
		}
	}
	return total;
}

function extractDiceFormula(text: string): string | null {
	const m = text.match(/\d+d\d+(?:\s*\+\s*\d+d\d+)*(?:\s*[+-]\s*\d+)?/i);
	return m ? m[0].replace(/\s+/g, "") : null;
}

async function doRoll(plugin: CairnPlugin, outputEl: HTMLElement, formula: string, label?: string) {
	outputEl.empty();
	outputEl.addClass("cairn-roll-output-active");
	const activePath = plugin.app.workspace.getActiveFile()?.path ?? "";
	const diceApi = getDiceRollerApi(plugin.app);
	if (diceApi) {
		try {
			const roller = await diceApi.getRoller(formula, activePath);
			const total = await roller.roll();
			if (label) outputEl.createSpan({ text: `${label}: `, cls: "cairn-roll-label" });
			if (roller.containerEl) {
				outputEl.appendChild(roller.containerEl);
			} else {
				outputEl.createSpan({ text: `${formula} → ${total}` });
			}
			return;
		} catch (e) {
			/* si el plugin de dados falla, usamos el generador interno */
		}
	}
	const total = fallbackRoll(formula);
	if (label) outputEl.createSpan({ text: `${label}: `, cls: "cairn-roll-label" });
	outputEl.createSpan({ text: `🎲 ${formula} → ${total}` });
}

async function rollSave(plugin: CairnPlugin, outputEl: HTMLElement, statValue: number, label: string) {
	outputEl.empty();
	outputEl.addClass("cairn-roll-output-active");
	const activePath = plugin.app.workspace.getActiveFile()?.path ?? "";
	const diceApi = getDiceRollerApi(plugin.app);
	let total: number;
	let diceEl: HTMLElement | null = null;
	if (diceApi) {
		try {
			const roller = await diceApi.getRoller("1d20", activePath);
			total = Number(await roller.roll());
			diceEl = roller.containerEl ?? null;
		} catch (e) {
			total = fallbackRoll("1d20");
		}
	} else {
		total = fallbackRoll("1d20");
	}
	const success = total === 1 || (total !== 20 && total <= statValue);
	outputEl.createSpan({ text: `${label}: `, cls: "cairn-roll-label" });
	if (diceEl) outputEl.appendChild(diceEl);
	else outputEl.createSpan({ text: String(total) });
	outputEl.createSpan({
		text: ` vs ${statValue} → ${success ? "✅ Éxito" : "❌ Fallo"}`,
		cls: success ? "cairn-success" : "cairn-fail",
	});
}

/* -------------------------------------------------------------------------- */
/*  Tabla de Cicatrices (Reglas Básicas)                                      */
/* -------------------------------------------------------------------------- */

const CICATRICES: { title: string; effect: string }[] = [
	{
		title: "Cicatriz permanente",
		effect:
			"Tira 1d6 | 1: Cuello, 2: Manos, 3: Ojo, 4: Pecho, 5: Piernas, 6: Oídos. Tira 1d6; si el resultado es mayor que tu PG máxima, quédate con esta nueva cifra.",
	},
	{
		title: "Oír pajaritos",
		effect:
			"Estás desorientado y conmocionado. Describe cómo recuperas la concentración. Tira 1d6; si el resultado es mayor que tu PG máxima, quédate con esta nueva cifra.",
	},
	{
		title: "Golpetazo",
		effect:
			"Te lanzaron por los aires y caíste de bruces, sin aliento. Estarás Exhausto hasta que descanses unas horas. Luego, tira 1d6 y suma el resultado a tu PG máxima.",
	},
	{
		title: "Fractura",
		effect:
			"Tira 1d6 | 1-2: Pierna, 3-4: Brazo, 5: Costilla, 6: Cráneo. Una vez recuperado, tira 2d6; si el resultado es mayor que tu PG máxima, quédate con esta nueva cifra.",
	},
	{
		title: "Enfermedad",
		effect:
			"Estás afectado por una infección asquerosa e incómoda. Cuando la superes, tira 2d6; si el resultado es mayor que tu PG máxima, quédate con esta nueva cifra.",
	},
	{
		title: "Herida en la cabeza que cambiará tu vida",
		effect:
			"Tira 1d6 | 1-2: FUE, 3-4: DES, 5-6: VOL. Tira 3d6; si el resultado es mayor que la puntuación de esa Característica, usa este valor (el máximo no se modifica).",
	},
	{
		title: "Parálisis",
		effect:
			"Apenas puedes moverte hasta que descanses y recibas cuidados profesionales. Tras recuperarte, tira 3d6; si el resultado es mayor que tu DES máxima, quédate con esa nueva cifra.",
	},
	{
		title: "Sordera",
		effect:
			"No podrás oír nada hasta que encuentres un remedio extraordinario. Realiza una Salvación de VOL; si tienes éxito, aumenta tu VOL máxima en 1d4.",
	},
	{
		title: "Cerebro reestructurado",
		effect:
			"El daño ha arrancado una parte oculta de tu psique. Tira 3d6; si el resultado es mayor que tu VOL máxima, quédate con esa nueva cifra.",
	},
	{
		title: "Desgarro",
		effect:
			"El daño arranca o deja inútil una extremidad (la Guardiana decide cuál). Haz una Salvación de VOL; si la superas, aumenta tu VOL máxima en 1d6.",
	},
	{
		title: "Herida mortal",
		effect:
			"Estás Exhausto y fuera de combate. Morirás en una hora a menos que te curen. Tras recuperarte, tira 2d6; si el resultado es mayor que tu PG máxima, quédate con esta nueva cifra.",
	},
	{
		title: "Condenado",
		effect:
			"La muerte parecía estar muy cerca, pero de alguna manera has sobrevivido. Si fallas la próxima tirada de Salvación contra Daño Crítico, morirás horriblemente. Si tienes éxito, tira 3d6; si el resultado es mayor que tu PG máxima, quédate con esta nueva cifra.",
	},
];

function renderCicatriz(outputEl: HTMLElement, pgLost: number) {
	const idx = Math.min(12, Math.max(1, Math.round(pgLost))) - 1;
	const c = CICATRICES[idx];
	outputEl.empty();
	outputEl.addClass("cairn-roll-output-active", "cairn-cicatriz");
	outputEl.createSpan({ text: `⚠️ PG a 0 (perdiste ${pgLost}) — `, cls: "cairn-roll-label" });
	outputEl.createEl("strong", { text: c.title + ": " });
	outputEl.createSpan({ text: c.effect });
}

/* -------------------------------------------------------------------------- */
/*  Parseo del bloque único ```cairn (type + name obligatorios)               */
/* -------------------------------------------------------------------------- */

interface ParsedCairnBlock {
	type: CairnType | "tools" | null;
	name: string;
	overrides: Record<string, unknown>;
	error?: string;
}

function parseCairnBlock(source: string): ParsedCairnBlock {
	let parsed: Record<string, unknown> = {};
	try {
		const y = parseYaml(source);
		if (y && typeof y === "object") parsed = y as Record<string, unknown>;
	} catch (e) {
		return { type: null, name: "", overrides: {}, error: "El contenido del bloque no es YAML válido." };
	}

	const rawType = parsed["type"];
	if (typeof rawType !== "string" || !rawType.trim()) {
		return { type: null, name: "", overrides: {}, error: 'Falta el campo obligatorio "type".' };
	}
	const type = rawType.trim().toLowerCase();

	// "tools" es un panel de utilidades, no una entrada del catálogo: no lleva "name".
	if (type === "tools") {
		const { type: _t, ...overrides } = parsed;
		return { type: "tools", name: "", overrides };
	}

	const rawName = parsed["name"];
	if (typeof rawName !== "string" || !rawName.trim()) {
		return { type: null, name: "", overrides: {}, error: 'Falta el campo obligatorio "name".' };
	}
	if (!(TYPES as string[]).includes(type)) {
		return {
			type: null,
			name: "",
			overrides: {},
			error: `Tipo "${rawType}" desconocido. Usa uno de: ${TYPES.join(", ")}, tools.`,
		};
	}

	const { type: _t, name: _n, ...overrides } = parsed;
	return { type: type as CairnType, name: rawName.trim(), overrides };
}

function renderBlockError(el: HTMLElement, message: string) {
	el.empty();
	el.addClass("cairn-card", "cairn-error-card");
	el.createDiv({ cls: "cairn-error", text: `⚠️ ${message}` });
	el.createDiv({
		cls: "cairn-error-hint",
		text: 'Formato esperado:\ntype: <tipo>\nname: "<nombre>"',
	});
}

/* -------------------------------------------------------------------------- */
/*  Utilidades varias                                                         */
/* -------------------------------------------------------------------------- */

function numOrEmpty(v: string): number | "" {
	if (v.trim() === "") return "";
	const n = Number(v);
	return Number.isNaN(n) ? "" : n;
}

interface InventoryItem {
	name: string;
	qty: number;
}

function inventoryOf(fm: Record<string, unknown>, field = "inventory"): InventoryItem[] {
	const raw = fm[field];
	if (!Array.isArray(raw)) return [];
	return raw.map((item) => {
		if (typeof item === "string") return { name: item, qty: 1 };
		if (item && typeof item === "object") {
			const o = item as Record<string, unknown>;
			return { name: String(o.name ?? ""), qty: Number(o.qty ?? 1) || 1 };
		}
		return { name: String(item), qty: 1 };
	});
}

function computeSlots(plugin: CairnPlugin, inventory: InventoryItem[]): number {
	// Cada línea del inventario ocupa un espacio (0 si es Insignificante, 2 si
	// es Voluminoso), sin importar la cantidad: "Lata de aceite" con 6 usos
	// sigue siendo un único objeto, no 6.
	let total = 0;
	for (const item of inventory) {
		const objEntry = plugin.index.find("object", item.name);
		const quality = objEntry ? (objEntry.frontmatter as Record<string, unknown>)["quality"] : undefined;
		const qArr: string[] = Array.isArray(quality) ? quality.map((s) => String(s).toLowerCase()) : [];
		let perUnit = 1;
		if (qArr.some((q) => q.includes("insignificante"))) perUnit = 0;
		else if (qArr.some((q) => q.includes("voluminos"))) perUnit = 2;
		total += perUnit;
	}
	return total;
}

/* -------------------------------------------------------------------------- */
/*  Render de la ficha genérica                                              */
/* -------------------------------------------------------------------------- */

function appendAdvantageButtons(el: HTMLElement, plugin: CairnPlugin, rollOutput: HTMLElement, label: string) {
	const advBtn = el.createEl("button", {
		text: "▲",
		cls: "cairn-dice-btn cairn-dice-adv",
		attr: { "aria-label": "Tirar con Ventaja (1d12)" },
	});
	advBtn.onclick = (ev: MouseEvent) => {
		ev.preventDefault();
		doRoll(plugin, rollOutput, "1d12", `${label} (Ventaja)`);
	};
	const disBtn = el.createEl("button", {
		text: "▼",
		cls: "cairn-dice-btn cairn-dice-dis",
		attr: { "aria-label": "Tirar con Desventaja (1d4)" },
	});
	disBtn.onclick = (ev: MouseEvent) => {
		ev.preventDefault();
		doRoll(plugin, rollOutput, "1d4", `${label} (Desventaja)`);
	};
}

function appendTextWithDiceButton(
	el: HTMLElement,
	plugin: CairnPlugin,
	rollOutput: HTMLElement,
	text: string,
	showAdvantage = false
) {
	el.createSpan({ text });
	const formula = extractDiceFormula(text);
	if (formula) {
		const label = text.length > 28 ? formula : text;
		const btn = el.createEl("button", {
			text: "🎲",
			cls: "cairn-dice-btn",
			attr: { "aria-label": `Tirar ${formula}` },
		});
		btn.onclick = (ev: MouseEvent) => {
			ev.preventDefault();
			doRoll(plugin, rollOutput, formula, label);
		};
		// Ventaja/Desventaja sustituyen el dado del arma por 1d12/1d4 (Reglas
		// Básicas: Combate → Modificadores de ataque). Solo se ofrece en
		// campos de daño/ataque, no en cosas como "3d6 monedas de oro".
		if (showAdvantage) appendAdvantageButtons(el, plugin, rollOutput, label);
	}
}

function renderFieldCell(td: HTMLElement, plugin: CairnPlugin, rollOutput: HTMLElement, f: FieldDef, v: unknown) {
	const showAdvantage = f.key === "attacks" || f.key === "damage";
	if (Array.isArray(v) && (f.key === "attacks" || f.key === "gear")) {
		const ul = td.createEl("ul", { cls: "cairn-field-list" });
		for (const raw of v as unknown[]) {
			const li = ul.createEl("li");
			appendTextWithDiceButton(li, plugin, rollOutput, String(raw), showAdvantage);
		}
		return;
	}
	const text = f.format ? f.format(v) : String(v);
	appendTextWithDiceButton(td, plugin, rollOutput, text, showAdvantage);
}

async function renderEntryCard(
	plugin: CairnPlugin,
	container: HTMLElement,
	type: CairnType,
	name: string,
	overrides: Record<string, unknown>
) {
	container.empty();
	container.addClass("cairn-card", `cairn-${type}`);

	if (!name) {
		container.createDiv({ text: `⚠️ Falta el nombre en el bloque cairn (${type})`, cls: "cairn-error" });
		return;
	}

	const entry = plugin.index.find(type, name);

	const header = container.createDiv({ cls: "cairn-card-header" });
	header.createSpan({ text: TYPE_ICONS[type], cls: "cairn-icon" });
	const titleEl = header.createEl(entry && entry.file ? "a" : "span", { text: name, cls: "cairn-title" });
	if (type === "character" && entry) {
		const freshBgFm =
			(entry.file ? plugin.app.metadataCache.getFileCache(entry.file)?.frontmatter : undefined) ??
			entry.frontmatter;
		const background = (freshBgFm as Record<string, unknown>)["background"];
		if (background) {
			header.createEl("em", { text: String(background), cls: "cairn-character-background" });
		}
	}
	if (entry && entry.source === "builtin") {
		header.createSpan({ text: "incorporado", cls: "cairn-source-badge" });
	}
	header.createSpan({ text: TYPE_LABELS[type], cls: "cairn-type-badge" });

	if (!entry) {
		container.createDiv({
			cls: "cairn-missing",
			text: `No se encontró «${name}» (${TYPE_LABELS[type]}) en el catálogo.`,
		});
		const btn = container.createEl("button", { text: "Crear nota", cls: "cairn-create-btn" });
		btn.onclick = async () => {
			const file = await plugin.createEntryNote(type, name);
			if (file) {
				plugin.reindex();
				await plugin.app.workspace.getLeaf(false).openFile(file);
			}
		};
		return;
	}

	if (entry.file) {
		titleEl.onclick = (evt: MouseEvent) => {
			evt.preventDefault();
			plugin.app.workspace.getLeaf(evt.ctrlKey || evt.metaKey).openFile(entry.file as TFile);
		};
	}

	if (entry.source === "builtin") {
		const copyBtn = container.createEl("button", {
			text: "✎ Crear copia editable en mi carpeta",
			cls: "cairn-create-btn",
		});
		copyBtn.onclick = async () => {
			const file = await plugin.materializeBuiltin(entry);
			if (file) {
				plugin.reindex();
				await plugin.app.workspace.getLeaf(false).openFile(file);
			}
		};
	}

	const rollOutput = container.createDiv({ cls: "cairn-roll-output" });

	if (type === "character") {
		const freshFm =
			(entry.file ? plugin.app.metadataCache.getFileCache(entry.file)?.frontmatter : undefined) ??
			entry.frontmatter;
		const mode = String(overrides["mode"] ?? (freshFm as Record<string, unknown>)["mode"] ?? "all").toLowerCase();
		if (mode === "small") {
			renderCharacterSmallCard(container, entry, freshFm as Record<string, unknown>);
		} else {
			await renderCharacterSheet(plugin, container, entry, rollOutput);
		}
	} else {
		const data: Record<string, unknown> = Object.assign({}, entry.frontmatter, overrides);
		const table = container.createEl("table", { cls: "cairn-stats" });
		for (const f of FIELD_DEFS[type]) {
			const v = data[f.key];
			if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) continue;
			const row = table.createEl("tr");
			row.createEl("th", { text: f.label });
			const td = row.createEl("td");
			renderFieldCell(td, plugin, rollOutput, f, v);
		}
		if (table.childElementCount === 0) table.remove();
		else container.insertBefore(table, rollOutput);

		const knownKeys = new Set(FIELD_DEFS[type].map((f) => f.key));
		const extraKeys = Object.keys(overrides).filter((k) => !knownKeys.has(k));
		if (extraKeys.length > 0) {
			const notes = container.createDiv({ cls: "cairn-notes" });
			notes.createEl("strong", { text: "Notas de la partida: " });
			notes.createSpan({ text: extraKeys.map((k) => `${k}: ${String(overrides[k])}`).join(" · ") });
		}
	}

	const body = container.createDiv({ cls: "cairn-description" });
	try {
		let markdown = "";
		let sourcePath = "";
		if (entry.file) {
			const raw = await plugin.app.vault.cachedRead(entry.file);
			markdown = raw.replace(/^---\n[\s\S]*?\n---\n?/, "").trim();
			sourcePath = entry.file.path;
		} else {
			markdown = entry.description.trim();
		}
		// Nunca vuelvas a renderizar bloques ```cairn dentro de la descripción:
		// evita que una ficha (p. ej. de personaje) se re-renderice a sí misma
		// si su propio cuerpo contiene el bloque que la generó, lo que colgaría
		// Obsidian en un bucle de renderizado infinito.
		markdown = markdown.replace(/```cairn\b[\s\S]*?```/gi, "").trim();
		if (type === "character") {
			// La ficha ya se ha mostrado arriba; el resto del cuerpo de la nota
			// (trasfondo, notas largas, etc.) se puede consultar abriendo la nota.
			markdown = "";
		}
		if (markdown) {
			const renderer = MarkdownRenderer as unknown as {
				render?: (app: App, md: string, el: HTMLElement, path: string, comp: Plugin) => Promise<void>;
				renderMarkdown?: (md: string, el: HTMLElement, path: string, comp: Plugin) => Promise<void>;
			};
			if (renderer.render) {
				await renderer.render(plugin.app, markdown, body, sourcePath, plugin);
			} else if (renderer.renderMarkdown) {
				await renderer.renderMarkdown(markdown, body, sourcePath, plugin);
			}
		} else {
			body.remove();
		}
	} catch (e) {
		/* si falla la lectura, se omite la descripción */
	}
}

/* -------------------------------------------------------------------------- */
/*  Ficha de personaje interactiva (con actualización instantánea)            */
/* -------------------------------------------------------------------------- */

function statOrDash(v: unknown): string {
	return v === undefined || v === null || v === "" ? "—" : String(v);
}

function renderCharacterSmallCard(container: HTMLElement, entry: CairnEntry, fm: Record<string, unknown>) {
	const small = container.createDiv({ cls: "cairn-sheet-small" });

	const stats = small.createDiv({ cls: "cairn-small-stats" });
	for (const [key, label] of [
		["fue", "FUE"],
		["des", "DES"],
		["vol", "VOL"],
	] as const) {
		const box = stats.createDiv({ cls: "cairn-small-stat" });
		box.createDiv({ cls: "cairn-small-stat-value", text: statOrDash(fm[key]) });
		box.createDiv({ cls: "cairn-small-stat-label", text: label });
	}

	const bottom = small.createDiv({ cls: "cairn-small-stats cairn-small-bottom" });
	const hpBox = bottom.createDiv({ cls: "cairn-small-stat" });
	hpBox.createDiv({ cls: "cairn-small-stat-value", text: statOrDash(fm["pg"]) });
	hpBox.createDiv({ cls: "cairn-small-stat-label", text: "PG" });

	const armorBox = bottom.createDiv({ cls: "cairn-small-stat" });
	armorBox.createDiv({ cls: "cairn-small-stat-value", text: statOrDash(fm["armor"]) });
	armorBox.createDiv({ cls: "cairn-small-stat-label", text: "Armadura" });
}

interface InventorySectionOptions {
	field: "inventory" | "insignificant";
	title: string;
	countSlots: boolean;
}

function buildInventorySection(
	sheet: HTMLElement,
	plugin: CairnPlugin,
	file: TFile,
	fm: Record<string, unknown>,
	rollOutput: HTMLElement,
	opts: InventorySectionOptions
) {
	let items: InventoryItem[] = inventoryOf(fm, opts.field);
	const syncToFm = () => {
		fm[opts.field] = items.map((i) => ({ name: i.name, qty: i.qty }));
	};

	const section = sheet.createDiv({ cls: "cairn-inventory" });
	const header = section.createDiv({ cls: "cairn-inventory-header" });
	header.createEl("strong", { text: opts.title });
	const infoSpan = header.createSpan({ cls: "cairn-slots" });
	const addBtn = header.createEl("button", { text: "+ Añadir objeto" });
	const list = section.createEl("ul", { cls: "cairn-inventory-list" });

	function draw() {
		if (opts.countSlots) {
			infoSpan.setText(` — ${computeSlots(plugin, items)}/10 espacios`);
		} else {
			infoSpan.setText(
				items.length > 0 ? ` — ${items.length} línea${items.length === 1 ? "" : "s"}, no ocupan espacio` : ""
			);
		}
		list.empty();
		if (items.length === 0) {
			list.createEl("li", { text: "Sin objetos todavía.", cls: "cairn-empty" });
			return;
		}
		for (const item of items) {
			const li = list.createEl("li");
			li.createSpan({ text: item.name, cls: "cairn-inv-name" });
			li.createSpan({ text: ` ×${item.qty}`, cls: "cairn-inv-qty" });

			const objEntry = plugin.index.find("object", item.name);
			if (objEntry) {
				const dmg = (objEntry.frontmatter as Record<string, unknown>)["damage"];
				if (dmg) {
					const rollBtn = li.createEl("button", {
						text: "🎲",
						cls: "cairn-dice-btn",
						attr: { "aria-label": "Tirar daño" },
					});
					rollBtn.onclick = () => doRoll(plugin, rollOutput, String(dmg), item.name);
					appendAdvantageButtons(li, plugin, rollOutput, item.name);
				}
			}

			const minus = li.createEl("button", { text: "−", cls: "cairn-inv-btn" });
			minus.onclick = async () => {
				const idx = items.findIndex((i) => normalize(i.name) === normalize(item.name));
				if (idx >= 0) {
					items[idx].qty -= 1;
					if (items[idx].qty <= 0) items.splice(idx, 1);
				}
				syncToFm();
				draw();
				await plugin.changeListQty(file, opts.field, item.name, -1);
			};
			const plus = li.createEl("button", { text: "+", cls: "cairn-inv-btn" });
			plus.onclick = async () => {
				const idx = items.findIndex((i) => normalize(i.name) === normalize(item.name));
				if (idx >= 0) items[idx].qty += 1;
				syncToFm();
				draw();
				await plugin.changeListQty(file, opts.field, item.name, 1);
			};
			const remove = li.createEl("button", { text: "🗑", cls: "cairn-inv-btn" });
			remove.onclick = async () => {
				const removedQty = item.qty;
				items = items.filter((i) => normalize(i.name) !== normalize(item.name));
				syncToFm();
				draw();
				await plugin.changeListQty(file, opts.field, item.name, -removedQty);
			};
		}
	}
	draw();

	addBtn.onclick = () => {
		const names = plugin.index.list("object").map((e) => e.name);
		new NamePickerModal(plugin.app, names, `Buscar objeto para añadir a «${opts.title}»…`, async (chosen) => {
			const idx = items.findIndex((i) => normalize(i.name) === normalize(chosen));
			if (idx >= 0) items[idx].qty += 1;
			else items.push({ name: chosen, qty: 1 });
			syncToFm();
			draw();
			await plugin.addToList(file, opts.field, chosen);
		}).open();
	};
}

async function renderCharacterSheet(
	plugin: CairnPlugin,
	container: HTMLElement,
	entry: CairnEntry,
	rollOutput: HTMLElement
) {
	const file = entry.file;
	if (!file) return; // los personajes siempre viven en una nota propia
	const charFile: TFile = file; // alias con tipo no-nulo, estable dentro de los closures anidados

	// Copia local mutable: la UI se actualiza al instante desde aquí,
	// sin esperar a que Obsidian relea el archivo o el plugin reindexe.
	const fm: Record<string, unknown> = {
		...(plugin.app.metadataCache.getFileCache(file)?.frontmatter ?? entry.frontmatter),
	};

	const sheet = container.createDiv({ cls: "cairn-sheet" });
	container.insertBefore(sheet, rollOutput);

	const pgBox = sheet.createDiv({ cls: "cairn-stat-box cairn-pg-box" });
	pgBox.createDiv({ cls: "cairn-stat-label", text: "PG" });
	const pgRow = pgBox.createDiv({ cls: "cairn-stat-inputs" });
	const pgCur = pgRow.createEl("input", { type: "number", cls: "cairn-input-sm" });
	pgCur.value = fm.pg === undefined || fm.pg === "" ? "" : String(fm.pg);
	pgCur.onchange = () => {
		const v = numOrEmpty(pgCur.value);
		fm.pg = v;
		plugin.setCharField(file, "pg", v);
	};
	pgRow.createSpan({ text: "/" });
	const pgMax = pgRow.createEl("input", { type: "number", cls: "cairn-input-sm" });
	pgMax.value = fm.pg_max === undefined || fm.pg_max === "" ? "" : String(fm.pg_max);
	pgMax.onchange = () => {
		const v = numOrEmpty(pgMax.value);
		fm.pg_max = v;
		plugin.setCharField(file, "pg_max", v);
	};

	const dmgRow = pgBox.createDiv({ cls: "cairn-dmg-row" });
	const dmgInput = dmgRow.createEl("input", {
		type: "number",
		cls: "cairn-input-sm",
		attr: { placeholder: "daño" },
	});
	const dmgBtn = dmgRow.createEl("button", { text: "Aplicar daño" });
	dmgBtn.onclick = async () => {
		const dmg = Number(dmgInput.value) || 0;
		if (dmg <= 0) return;
		const current = Number(fm.pg ?? 0) || 0;
		const next = Math.max(0, current - dmg);
		fm.pg = next;
		pgCur.value = String(next);
		dmgInput.value = "";
		if (next === 0) renderCicatriz(rollOutput, dmg);
		await plugin.setCharField(file, "pg", next);
	};
	const restBtn = pgBox.createEl("button", { text: "Descansar (recuperar PG)", cls: "cairn-rest-btn" });
	restBtn.onclick = async () => {
		const maxVal = fm.pg_max !== undefined && fm.pg_max !== "" ? fm.pg_max : fm.pg ?? "";
		fm.pg = maxVal;
		pgCur.value = maxVal === "" ? "" : String(maxVal);
		await plugin.setCharField(file, "pg", maxVal);
	};

	const statsRow = sheet.createDiv({ cls: "cairn-sheet-stats" });
	for (const [key, label] of [
		["fue", "FUE"],
		["des", "DES"],
		["vol", "VOL"],
	] as const) {
		const box = statsRow.createDiv({ cls: "cairn-stat-box" });
		box.createDiv({ cls: "cairn-stat-label", text: label });
		const row = box.createDiv({ cls: "cairn-stat-inputs" });
		const cur = row.createEl("input", { type: "number", cls: "cairn-input-sm" });
		cur.value = fm[key] === undefined || fm[key] === "" ? "" : String(fm[key]);
		cur.onchange = () => {
			const v = numOrEmpty(cur.value);
			fm[key] = v;
			plugin.setCharField(file, key, v);
		};
		row.createSpan({ text: "/" });
		const max = row.createEl("input", { type: "number", cls: "cairn-input-sm" });
		const maxKey = `${key}_max`;
		max.value = fm[maxKey] === undefined || fm[maxKey] === "" ? "" : String(fm[maxKey]);
		max.onchange = () => {
			const v = numOrEmpty(max.value);
			fm[maxKey] = v;
			plugin.setCharField(file, maxKey, v);
		};
		const rollBtn = box.createEl("button", { text: "🎲 Salvación", cls: "cairn-dice-btn" });
		rollBtn.onclick = () => rollSave(plugin, rollOutput, Number(fm[key] ?? 0) || 0, `Salvación de ${label}`);
	}

	const miscRow = sheet.createDiv({ cls: "cairn-misc-row" });
	const armorWrap = miscRow.createDiv({ cls: "cairn-misc-field" });
	armorWrap.createEl("label", { text: "Armadura" });
	const armorInput = armorWrap.createEl("input", { type: "number", cls: "cairn-input-sm" });
	armorInput.value = fm.armor === undefined || fm.armor === "" ? "" : String(fm.armor);
	armorInput.onchange = () => {
		const v = numOrEmpty(armorInput.value);
		fm.armor = v;
		plugin.setCharField(file, "armor", v);
	};

	const goldWrap = miscRow.createDiv({ cls: "cairn-misc-field" });
	goldWrap.createEl("label", { text: "Oro" });
	const goldInput = goldWrap.createEl("input", { type: "number", cls: "cairn-input-sm" });
	goldInput.value = fm.gold === undefined || fm.gold === "" ? "" : String(fm.gold);
	goldInput.onchange = () => {
		const v = numOrEmpty(goldInput.value);
		fm.gold = v;
		plugin.setCharField(file, "gold", v);
	};

	const ageWrap = miscRow.createDiv({ cls: "cairn-misc-field" });
	ageWrap.createEl("label", { text: "Edad" });
	const ageInput = ageWrap.createEl("input", { type: "text", cls: "cairn-input-sm" });
	ageInput.value = fm.age === undefined ? "" : String(fm.age);
	ageInput.onchange = () => {
		fm.age = ageInput.value;
		plugin.setCharField(file, "age", ageInput.value);
	};

	buildInventorySection(sheet, plugin, charFile, fm, rollOutput, {
		field: "inventory",
		title: "Inventario",
		countSlots: true,
	});
	buildInventorySection(sheet, plugin, charFile, fm, rollOutput, {
		field: "insignificant",
		title: "Objetos insignificantes",
		countSlots: false,
	});

	const notesBox = sheet.createDiv({ cls: "cairn-notes-box" });
	notesBox.createEl("label", { text: "Notas rápidas" });
	const notesArea = notesBox.createEl("textarea");
	notesArea.value = fm.notes === undefined ? "" : String(fm.notes);
	notesArea.onchange = () => {
		fm.notes = notesArea.value;
		plugin.setCharField(file, "notes", notesArea.value);
	};
}

/* -------------------------------------------------------------------------- */
/*  Modales                                                                    */
/* -------------------------------------------------------------------------- */

class NamePickerModal extends FuzzySuggestModal<string> {
	constructor(app: App, private names: string[], placeholder: string, private onPick: (name: string) => void) {
		super(app);
		this.setPlaceholder(placeholder);
	}
	getItems(): string[] {
		return this.names;
	}
	getItemText(item: string): string {
		return item;
	}
	onChooseItem(item: string) {
		this.onPick(item);
	}
}

class TypePickerModal extends FuzzySuggestModal<CairnType | "tools"> {
	constructor(app: App, private plugin: CairnPlugin, private editor: Editor) {
		super(app);
		this.setPlaceholder("¿Qué tipo de entrada quieres insertar?");
	}
	getItems(): (CairnType | "tools")[] {
		return [...TYPES, "tools"];
	}
	getItemText(item: CairnType | "tools"): string {
		if (item === "tools") return "🧰 Herramientas del Guardián";
		return `${TYPE_ICONS[item]} ${TYPE_LABELS[item]}`;
	}
	onChooseItem(item: CairnType | "tools") {
		if (item === "tools") {
			this.editor.replaceSelection("```cairn\ntype: tools\n```\n");
			return;
		}
		const names = this.plugin.index.list(item).map((e) => e.name);
		new NamePickerModal(this.app, names, `Buscar ${TYPE_LABELS[item].toLowerCase()}…`, (name) => {
			const block = `\`\`\`cairn\ntype: ${item}\nname: "${name}"\n\`\`\`\n`;
			this.editor.replaceSelection(block);
		}).open();
	}
}

class TextInputModal extends Modal {
	constructor(app: App, private title: string, private onSubmit: (value: string) => void) {
		super(app);
	}
	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h3", { text: this.title });
		const input = contentEl.createEl("input", { type: "text", cls: "cairn-modal-input" });
		input.focus();
		input.addEventListener("keydown", (e: KeyboardEvent) => {
			if (e.key === "Enter") {
				this.close();
				this.onSubmit(input.value.trim());
			}
		});
		const btnRow = contentEl.createDiv({ cls: "cairn-modal-buttons" });
		const okBtn = btnRow.createEl("button", { text: "Crear", cls: "mod-cta" });
		okBtn.onclick = () => {
			this.close();
			this.onSubmit(input.value.trim());
		};
	}
	onClose() {
		this.contentEl.empty();
	}
}

class EntryPreviewModal extends Modal {
	constructor(app: App, private plugin: CairnPlugin, private type: CairnType, private name: string) {
		super(app);
	}
	async onOpen() {
		this.contentEl.addClass("cairn-preview-modal");
		await renderEntryCard(this.plugin, this.contentEl, this.type, this.name, {});
	}
	onClose() {
		this.contentEl.empty();
	}
}

function getActiveEditor(app: App): Editor | null {
	const workspaceAny = app.workspace as unknown as { activeEditor?: { editor?: Editor } };
	if (workspaceAny.activeEditor?.editor) return workspaceAny.activeEditor.editor;
	const view = app.workspace.getActiveViewOfType(MarkdownView);
	return view?.editor ?? null;
}

class RandomEntryResultModal extends Modal {
	private cardEl: HTMLElement;
	private currentName: string | null = null;

	constructor(app: App, private plugin: CairnPlugin, private type: CairnType) {
		super(app);
	}

	onOpen() {
		this.contentEl.addClass("cairn-preview-modal", "cairn-random-modal");
		this.cardEl = this.contentEl.createDiv();

		const btnRow = this.contentEl.createDiv({ cls: "cairn-modal-buttons cairn-random-buttons" });
		const rerollBtn = btnRow.createEl("button", { text: "🎲 Otra entrada de este tipo" });
		rerollBtn.onclick = () => this.renderRandom();
		const insertBtn = btnRow.createEl("button", { text: "📋 Insertar en el documento", cls: "mod-cta" });
		insertBtn.onclick = () => this.insertIntoActiveEditor();

		this.renderRandom();
	}

	private async renderRandom() {
		const list = this.plugin.index.list(this.type);
		if (list.length === 0) {
			this.currentName = null;
			this.cardEl.empty();
			this.cardEl.createDiv({ text: `No hay entradas de tipo "${TYPE_LABELS[this.type]}" todavía.` });
			return;
		}
		const pick = list[Math.floor(Math.random() * list.length)];
		this.currentName = pick.name;
		await renderEntryCard(this.plugin, this.cardEl, this.type, pick.name, {});
	}

	private insertIntoActiveEditor() {
		if (!this.currentName) return;
		const editor = getActiveEditor(this.app);
		if (!editor) {
			new Notice("Abre una nota en modo edición para poder insertar aquí.");
			return;
		}
		const block = `\`\`\`cairn\ntype: ${this.type}\nname: "${this.currentName}"\n\`\`\`\n`;
		editor.replaceSelection(block);
		new Notice(`Insertado: ${this.currentName}`);
		this.close();
	}

	onClose() {
		this.contentEl.empty();
	}
}

class RandomEntryModal extends FuzzySuggestModal<CairnType> {
	constructor(app: App, private plugin: CairnPlugin) {
		super(app);
		this.setPlaceholder("¿Entrada aleatoria de qué tipo?");
	}
	getItems(): CairnType[] {
		return TYPES;
	}
	getItemText(item: CairnType): string {
		return `${TYPE_ICONS[item]} ${TYPE_LABELS[item]}`;
	}
	onChooseItem(item: CairnType) {
		if (this.plugin.index.list(item).length === 0) {
			new Notice(`No hay entradas de tipo "${TYPE_LABELS[item]}" todavía.`);
			return;
		}
		new RandomEntryResultModal(this.app, this.plugin, item).open();
	}
}

/* -------------------------------------------------------------------------- */
/*  Herramientas rápidas del Guardián (Dado del Destino, Reacciones, Clima,   */
/*  Eventos en la Mazmorra / en Entornos Salvajes)                            */
/* -------------------------------------------------------------------------- */

interface QuickRollResult {
	text: string;
}

function rollDadoDelDestino(): QuickRollResult {
	const total = fallbackRoll("1d6");
	const favorable = total >= 4;
	return { text: `🎲 Dado del Destino: ${total} → ${favorable ? "Favorece a los PJ" : "Mala suerte para los PJ"}` };
}

function rollReaccion(): QuickRollResult {
	const total = fallbackRoll("2d6");
	let label: string;
	if (total === 2) label = "Hostil";
	else if (total <= 5) label = "Cauteloso";
	else if (total <= 8) label = "Curioso";
	else if (total <= 11) label = "Amable";
	else label = "Servicial";
	return { text: `🎲 Reacción: ${total} → ${label}` };
}

const CLIMA_TABLE: Record<string, string[]> = {
	Primavera: ["Agradable", "Normal", "Normal", "Desagradable", "Inclemente", "Extremo"],
	Verano: ["Agradable", "Agradable", "Normal", "Desagradable", "Inclemente", "Extremo"],
	Otoño: ["Normal", "Normal", "Desagradable", "Inclemente", "Inclemente", "Extremo"],
	Invierno: ["Normal", "Desagradable", "Inclemente", "Inclemente", "Extremo", "Extremo"],
};

function rollClima(season: string): QuickRollResult {
	const total = fallbackRoll("1d6");
	const table = CLIMA_TABLE[season] ?? CLIMA_TABLE["Verano"];
	const result = table[total - 1];
	const note = result === "Extremo" ? " (si sale Extremo dos veces seguidas, se vuelve Catastrófico)" : "";
	return { text: `🎲 Clima de ${season}: ${total} → ${result}${note}` };
}

const EVENTOS_MAZMORRA: [string, string][] = [
	["Encuentro", "Tira en una Tabla de Encuentros. Amenaza posiblemente hostil."],
	["Señal", "Se descubre una pista, rastro, huella, guarida abandonada, olor, víctima, etc."],
	[
		"Ambiental",
		"El entorno cambia o algo que ya ocurre se intensifica (el agua sube, el techo se derrumba, un ritual se acerca a su fin...).",
	],
	["Pérdida", "Las antorchas se apagan, un hechizo activo se desvanece, etc. Hay que lidiar con ello antes de continuar."],
	[
		"Agotamiento",
		"El grupo se ve obligado a tomar un descanso corto (vuelve a tirar en esta tabla). Consume una ración o marca Fatiga.",
	],
	["Calma", "El grupo está solo (y a salvo) por ahora en la estancia o lugar donde se encuentran."],
];

const EVENTOS_SALVAJES: [string, string][] = [
	["Encuentro", "Tira en una Tabla de Encuentros según el terreno y lugar (y la reacción del PNJ, si aplica)."],
	[
		"Señal",
		"El grupo descubre una pista, rastro o indicación de un encuentro cercano, localidad, característica oculta o información sobre un área cercana.",
	],
	["Ambiental", "Hay un cambio en el clima o el terreno."],
	[
		"Pérdida",
		"El grupo tiene que tomar una decisión que le costará un recurso (raciones, herramientas, etc.), tiempo o esfuerzo.",
	],
	[
		"Agotamiento",
		"El grupo encuentra un gran obstáculo: más esfuerzo, atender heridas o sufrir un retraso. Pasa más tiempo (y otra Acción de Supervivencia) o añade Fatiga.",
	],
	["Descubrimiento", "El grupo encuentra comida, tesoro u otro recurso útil, o se revela la característica principal del área."],
];

function rollFromTable(table: [string, string][]): QuickRollResult {
	const total = fallbackRoll("1d6");
	const [title, desc] = table[total - 1];
	return { text: `🎲 ${total} → ${title}: ${desc}` };
}

function addToolButton(container: HTMLElement, resultEl: HTMLElement, label: string, rollFn: () => QuickRollResult) {
	const btn = container.createEl("button", { text: label });
	btn.onclick = () => {
		resultEl.setText(rollFn().text);
	};
}

function buildGuardianToolsUI(container: HTMLElement, asCard: boolean) {
	container.empty();
	if (asCard) {
		container.addClass("cairn-card", "cairn-tools-card");
		const header = container.createDiv({ cls: "cairn-card-header" });
		header.createSpan({ text: "🧰", cls: "cairn-icon" });
		header.createSpan({ text: "Herramientas del Guardián", cls: "cairn-title" });
		header.createSpan({ text: "Utilidad", cls: "cairn-type-badge" });
	} else {
		container.addClass("cairn-utility-modal");
		container.createEl("h3", { text: "Herramientas del Guardián" });
	}

	const resultEl = container.createDiv({ cls: "cairn-utility-result" });

	const row1 = container.createDiv({ cls: "cairn-utility-row" });
	addToolButton(row1, resultEl, "🎲 Dado del Destino", rollDadoDelDestino);
	addToolButton(row1, resultEl, "🎲 Reacción de PNJ", rollReaccion);

	container.createEl("div", { cls: "cairn-utility-label", text: "Clima" });
	const row2 = container.createDiv({ cls: "cairn-utility-row" });
	for (const season of Object.keys(CLIMA_TABLE)) {
		addToolButton(row2, resultEl, season, () => rollClima(season));
	}

	container.createEl("div", { cls: "cairn-utility-label", text: "Eventos" });
	const row3 = container.createDiv({ cls: "cairn-utility-row" });
	addToolButton(row3, resultEl, "🎲 En la Mazmorra", () => rollFromTable(EVENTOS_MAZMORRA));
	addToolButton(row3, resultEl, "🎲 En Entornos Salvajes", () => rollFromTable(EVENTOS_SALVAJES));
}

class GuardianToolsModal extends Modal {
	onOpen() {
		buildGuardianToolsUI(this.contentEl, false);
	}
	onClose() {
		this.contentEl.empty();
	}
}

/* -------------------------------------------------------------------------- */
/*  Autocompletado de "type:" y "name:" dentro de un bloque ```cairn          */
/* -------------------------------------------------------------------------- */

interface CairnSuggestion {
	value: string;
	display: string;
}

class CairnFieldSuggest extends EditorSuggest<CairnSuggestion> {
	private field: "type" | "name" | null = null;

	constructor(app: App, private plugin: CairnPlugin) {
		super(app);
	}

	private isInsideCairnBlock(editor: Editor, cursorLine: number): boolean {
		for (let i = cursorLine - 1; i >= 0; i--) {
			const trimmed = editor.getLine(i).trim();
			if (/^`{3,}\s*cairn\s*$/i.test(trimmed)) return true;
			if (/^`{3,}/.test(trimmed)) return false;
		}
		return false;
	}

	private currentTypeInBlock(editor: Editor, cursorLine: number): CairnType | null {
		let start = 0;
		for (let i = cursorLine; i >= 0; i--) {
			const trimmed = editor.getLine(i).trim();
			if (/^`{3,}\s*cairn\s*$/i.test(trimmed)) {
				start = i + 1;
				break;
			}
			if (/^`{3,}/.test(trimmed) && i !== cursorLine) return null;
		}
		const lastLine = editor.lastLine();
		for (let i = start; i <= lastLine; i++) {
			const line = editor.getLine(i);
			if (/^`{3,}/.test(line.trim())) break;
			const m = line.match(/^\s*type\s*:\s*(.+?)\s*$/i);
			if (m) {
				const val = m[1].trim().replace(/^["']|["']$/g, "");
				if ((TYPES as string[]).includes(val)) return val as CairnType;
			}
		}
		return null;
	}

	onTrigger(cursor: EditorPosition, editor: Editor): EditorSuggestTriggerInfo | null {
		if (!this.isInsideCairnBlock(editor, cursor.line)) return null;
		const line = editor.getLine(cursor.line);
		const m = line.match(/^(\s*)(type|name)\s*:\s*/i);
		if (!m) return null;
		const field = m[2].toLowerCase() as "type" | "name";
		const startCh = m[0].length;
		if (cursor.ch < startCh) return null;
		this.field = field;
		return {
			start: { line: cursor.line, ch: startCh },
			end: { line: cursor.line, ch: line.length },
			query: line.slice(startCh, cursor.ch),
		};
	}

	getSuggestions(context: EditorSuggestContext): CairnSuggestion[] {
		const query = context.query.trim().toLowerCase();
		if (this.field === "type") {
			return TYPES.filter(
				(t) => t.includes(query) || TYPE_LABELS[t].toLowerCase().includes(query)
			).map((t) => ({ value: t, display: `${TYPE_ICONS[t]} ${t} — ${TYPE_LABELS[t]}` }));
		}
		const type = this.currentTypeInBlock(context.editor, context.start.line);
		const pool: CairnEntry[] = type
			? this.plugin.index.list(type)
			: TYPES.flatMap((t) => this.plugin.index.list(t));
		return pool
			.filter((e) => e.name.toLowerCase().includes(query))
			.slice(0, 50)
			.map((e) => ({ value: e.name, display: type ? e.name : `${TYPE_ICONS[e.type]} ${e.name}` }));
	}

	renderSuggestion(suggestion: CairnSuggestion, el: HTMLElement): void {
		el.setText(suggestion.display);
	}

	selectSuggestion(suggestion: CairnSuggestion): void {
		if (!this.context) return;
		const { editor, start, end } = this.context;
		const value = this.field === "name" ? `"${suggestion.value}"` : suggestion.value;
		editor.replaceRange(value, start, end);
		editor.setCursor({ line: start.line, ch: start.ch + value.length });
	}
}

/* -------------------------------------------------------------------------- */
/*  Detección automática de menciones en el texto (enlaces + previsualización) */
/* -------------------------------------------------------------------------- */

function positionTooltip(tooltipEl: HTMLElement, anchor: HTMLElement) {
	const rect = anchor.getBoundingClientRect();
	const ttRect = tooltipEl.getBoundingClientRect();
	let top = rect.bottom + 6;
	let left = rect.left;
	if (left + ttRect.width > window.innerWidth - 8) left = window.innerWidth - ttRect.width - 8;
	if (top + ttRect.height > window.innerHeight - 8) top = rect.top - ttRect.height - 6;
	tooltipEl.style.top = `${Math.max(8, top)}px`;
	tooltipEl.style.left = `${Math.max(8, left)}px`;
}

async function renderTooltipContent(plugin: CairnPlugin, container: HTMLElement, type: CairnType, name: string) {
	container.empty();
	container.addClass("cairn-tooltip-inner");
	const entry = plugin.index.find(type, name);

	const header = container.createDiv({ cls: "cairn-tooltip-header" });
	header.createSpan({ text: TYPE_ICONS[type] + " " });
	header.createEl("strong", { text: name });
	header.createSpan({ text: TYPE_LABELS[type], cls: "cairn-type-badge" });

	if (!entry) {
		container.createDiv({ text: "No encontrado en el catálogo.", cls: "cairn-missing" });
		return;
	}

	const table = container.createEl("table", { cls: "cairn-stats" });
	let shown = 0;
	for (const f of FIELD_DEFS[type]) {
		if (shown >= 6) break;
		const v = (entry.frontmatter as Record<string, unknown>)[f.key];
		if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) continue;
		const row = table.createEl("tr");
		row.createEl("th", { text: f.label });
		row.createEl("td", { text: f.format ? f.format(v) : String(v) });
		shown++;
	}
	if (table.childElementCount === 0) table.remove();

	let desc = "";
	if (entry.file) {
		try {
			const raw = await plugin.app.vault.cachedRead(entry.file);
			desc = raw.replace(/^---\n[\s\S]*?\n---\n?/, "").trim();
		} catch (e) {
			/* ignorar */
		}
	} else {
		desc = entry.description.trim();
	}
	if (desc) {
		const plain = desc.replace(/^- /gm, "").replace(/\n+/g, " ").trim();
		const excerpt = plain.length > 220 ? plain.slice(0, 217) + "…" : plain;
		container.createDiv({ text: excerpt, cls: "cairn-tooltip-desc" });
	}
	container.createDiv({
		text: entry.file ? "Clic para abrir la nota" : "Clic para ver todos los detalles",
		cls: "cairn-tooltip-hint",
	});
}

function createAutoLinkSpan(plugin: CairnPlugin, text: string, type: CairnType, canonicalName: string): HTMLElement {
	const span = document.createElement("span");
	span.className = "cairn-autolink";
	span.textContent = text;
	span.dataset.cairnType = type;
	span.dataset.cairnName = canonicalName;

	let tooltipEl: HTMLElement | null = null;
	let showTimer: number | null = null;
	let hideTimer: number | null = null;

	const clearTimers = () => {
		if (showTimer !== null) {
			window.clearTimeout(showTimer);
			showTimer = null;
		}
		if (hideTimer !== null) {
			window.clearTimeout(hideTimer);
			hideTimer = null;
		}
	};
	const removeTooltip = () => {
		tooltipEl?.remove();
		tooltipEl = null;
	};

	span.addEventListener("mouseenter", () => {
		clearTimers();
		showTimer = window.setTimeout(async () => {
			removeTooltip();
			tooltipEl = document.body.createDiv({ cls: "cairn-tooltip" });
			await renderTooltipContent(plugin, tooltipEl, type, canonicalName);
			positionTooltip(tooltipEl, span);
		}, 250);
	});
	span.addEventListener("mouseleave", () => {
		clearTimers();
		hideTimer = window.setTimeout(removeTooltip, 150);
	});
	span.addEventListener("click", (ev: MouseEvent) => {
		ev.preventDefault();
		clearTimers();
		removeTooltip();
		const entry = plugin.index.find(type, canonicalName);
		if (entry?.file) {
			plugin.app.workspace.getLeaf(ev.ctrlKey || ev.metaKey).openFile(entry.file);
		} else {
			new EntryPreviewModal(plugin.app, plugin, type, canonicalName).open();
		}
	});

	return span;
}

/* -------------------------------------------------------------------------- */
/*  Plugin                                                                     */
/* -------------------------------------------------------------------------- */

function pluginDir(plugin: CairnPlugin): string {
	return plugin.manifest.dir ?? `${plugin.app.vault.configDir}/plugins/${plugin.manifest.id}`;
}

export default class CairnPlugin extends Plugin {
	settings: CairnSettings;
	index: CairnIndex;
	private reindexTimer: number | null = null;
	autoLinkRegex: RegExp | null = null;
	autoLinkMap: Map<string, { type: CairnType; canonicalName: string }> = new Map();

	async onload() {
		await this.loadSettings();
		this.index = new CairnIndex(this.app, this.settings);

		this.app.workspace.onLayoutReady(async () => {
			await this.loadBuiltinData();
			this.reindex();
		});

		this.registerMarkdownCodeBlockProcessor("cairn", (source, el, ctx: MarkdownPostProcessorContext) => {
			const parsed = parseCairnBlock(source);
			if (parsed.error || !parsed.type) {
				renderBlockError(el, parsed.error ?? "Error desconocido en el bloque.");
				return;
			}
			if (parsed.type === "tools") {
				buildGuardianToolsUI(el, true);
				return;
			}
			renderEntryCard(this, el, parsed.type, parsed.name, parsed.overrides);
		});

		// Detecta menciones de nombres conocidos en texto normal (vista de lectura)
		// y las convierte en enlaces con previsualización al pasar el ratón.
		this.registerMarkdownPostProcessor((el) => {
			if (!this.settings.autoLink) return;
			this.autoLinkElement(el);
		});

		this.registerEditorSuggest(new CairnFieldSuggest(this.app, this));

		this.addCommand({
			id: "cairn-reindex",
			name: "Reindexar entradas de Cairn",
			callback: () => {
				this.reindex();
				new Notice(`Índice de Cairn actualizado (${this.countEntries()} entradas).`);
			},
		});

		this.addCommand({
			id: "cairn-insert-reference",
			name: "Insertar referencia de Cairn",
			editorCallback: (editor: Editor) => {
				new TypePickerModal(this.app, this, editor).open();
			},
		});

		this.addCommand({
			id: "cairn-random-entry",
			name: "Entrada aleatoria",
			callback: () => {
				new RandomEntryModal(this.app, this).open();
			},
		});

		this.addCommand({
			id: "cairn-guardian-tools",
			name: "Herramientas del Guardián (Destino, Reacción, Clima, Eventos)",
			callback: () => {
				new GuardianToolsModal(this.app).open();
			},
		});

		this.addCommand({
			id: "cairn-new-character",
			name: "Nueva ficha de personaje",
			callback: () => {
				new TextInputModal(this.app, "Nombre del personaje", async (rawName) => {
					if (!rawName) return;
					const file = await this.createEntryNote("character", rawName);
					if (file) {
						this.reindex();
						await this.app.workspace.getLeaf(false).openFile(file);
					}
				}).open();
			},
		});

		// Un comando "Nuevo <tipo>" por cada tipo (además del de personaje de
		// arriba, que se mantiene con su propio id por si ya tienes un atajo
		// asignado). Cada uno crea el archivo con el frontmatter completo
		// (propiedades vacías) y, en el cuerpo, el bloque ```cairn ya listo
		// para copiar y pegar donde haga falta.
		for (const type of DATA_TYPES) {
			this.addCommand({
				id: `cairn-new-${type}`,
				name: CREATE_LABELS[type],
				callback: () => {
					new TextInputModal(this.app, CREATE_LABELS[type], async (rawName) => {
						if (!rawName) return;
						const file = await this.createEntryNote(type, rawName);
						if (file) {
							this.reindex();
							await this.app.workspace.getLeaf(false).openFile(file);
						}
					}).open();
				},
			});
		}

		this.addSettingTab(new CairnSettingTab(this.app, this));

		this.registerEvent(this.app.metadataCache.on("changed", () => this.scheduleReindex()));
		this.registerEvent(this.app.vault.on("delete", () => this.scheduleReindex()));
		this.registerEvent(this.app.vault.on("rename", () => this.scheduleReindex()));
	}

	countEntries(): number {
		return TYPES.reduce((n, t) => n + this.index.list(t).length, 0);
	}

	scheduleReindex() {
		if (!this.settings.autoReindex) return;
		if (this.reindexTimer) window.clearTimeout(this.reindexTimer);
		this.reindexTimer = window.setTimeout(() => this.reindex(), 500);
	}

	reindex() {
		this.index.rebuild();
		this.rebuildAutoLinkIndex();
	}

	rebuildAutoLinkIndex() {
		const minLen = Math.max(1, this.settings.autoLinkMinLength || 1);
		const map = new Map<string, { type: CairnType; canonicalName: string }>();
		const names: string[] = [];
		for (const t of TYPES) {
			for (const entry of this.index.list(t)) {
				const candidates = [entry.name, ...entry.aliases];
				for (const c of candidates) {
					const trimmed = c.trim();
					if (!trimmed) continue;
					const isMultiWord = /\s/.test(trimmed);
					if (!isMultiWord && trimmed.length < minLen) continue;
					const key = normalize(trimmed);
					if (!map.has(key)) {
						map.set(key, { type: t, canonicalName: entry.name });
						names.push(trimmed);
					}
				}
			}
		}
		names.sort((a, b) => b.length - a.length);
		this.autoLinkMap = map;
		if (names.length === 0) {
			this.autoLinkRegex = null;
			return;
		}
		const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
		this.autoLinkRegex = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
	}

	autoLinkElement(root: HTMLElement) {
		if (!this.autoLinkRegex || this.autoLinkMap.size === 0) return;
		if (root.classList.contains("cairn-card") || root.querySelector(".cairn-card")) return;
		if (root.closest(".cairn-card")) return;

		const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
			acceptNode: (node) => {
				const parent = (node as Text).parentElement;
				if (!parent) return NodeFilter.FILTER_REJECT;
				const tag = parent.tagName;
				if (tag === "CODE" || tag === "PRE" || tag === "A" || tag === "SCRIPT" || tag === "STYLE") {
					return NodeFilter.FILTER_REJECT;
				}
				if (parent.classList.contains("cairn-autolink")) return NodeFilter.FILTER_REJECT;
				if (parent.closest(".cairn-card")) return NodeFilter.FILTER_REJECT;
				if (!node.textContent || !node.textContent.trim()) return NodeFilter.FILTER_REJECT;
				return NodeFilter.FILTER_ACCEPT;
			},
		});

		const targets: Text[] = [];
		let n: Node | null;
		while ((n = walker.nextNode())) targets.push(n as Text);

		for (const textNode of targets) {
			const text = textNode.textContent ?? "";
			const regex = this.autoLinkRegex;
			regex.lastIndex = 0;
			if (!regex.test(text)) continue;
			regex.lastIndex = 0;

			const frag = document.createDocumentFragment();
			let lastIndex = 0;
			let match: RegExpExecArray | null;
			while ((match = regex.exec(text))) {
				const matched = match[0];
				const start = match.index;
				if (start > lastIndex) frag.appendChild(document.createTextNode(text.slice(lastIndex, start)));
				const info = this.autoLinkMap.get(normalize(matched));
				if (info) {
					frag.appendChild(createAutoLinkSpan(this, matched, info.type, info.canonicalName));
				} else {
					frag.appendChild(document.createTextNode(matched));
				}
				lastIndex = start + matched.length;
				if (regex.lastIndex === match.index) regex.lastIndex++;
			}
			if (lastIndex < text.length) frag.appendChild(document.createTextNode(text.slice(lastIndex)));
			textNode.parentNode?.replaceChild(frag, textNode);
		}
	}

	async readDataFile(lang: Language, type: Exclude<CairnType, "character">): Promise<BuiltinRaw[] | null> {
		const path = normalizePath(`${pluginDir(this)}/data/${lang}/${type}s.json`);
		try {
			const exists = await this.app.vault.adapter.exists(path);
			if (!exists) return null;
			const raw = await this.app.vault.adapter.read(path);
			const parsed = JSON.parse(raw);
			return Array.isArray(parsed) ? (parsed as BuiltinRaw[]) : null;
		} catch (e) {
			return null;
		}
	}

	async loadBuiltinData() {
		const lang = this.settings.language;
		let usedFallback = false;
		for (const t of DATA_TYPES) {
			let data = await this.readDataFile(lang, t);
			if (!data && lang !== "es") {
				data = await this.readDataFile("es", t);
				if (data) usedFallback = true;
			}
			this.index.builtin[t] = data ?? [];
		}
		if (usedFallback) {
			new Notice(`No hay datos en "${lang}" todavía; se usó Español como reserva.`);
		}
	}

	async ensureFolder(path: string) {
		const parts = path.split("/").filter(Boolean);
		let cur = "";
		for (const p of parts) {
			cur = cur ? cur + "/" + p : p;
			if (!this.app.vault.getAbstractFileByPath(cur)) {
				try {
					await this.app.vault.createFolder(cur);
				} catch (e) {
					/* ya existe, seguir */
				}
			}
		}
	}

	async createEntryNote(type: CairnType, name: string): Promise<TFile | null> {
		const folderPath = this.settings.defaultFolder;
		await this.ensureFolder(folderPath);
		const safeName = name.replace(/[\\/:*?"<>|]/g, "-");
		const path = `${folderPath}/${safeName}.md`;
		const existing = this.app.vault.getAbstractFileByPath(path);
		if (existing instanceof TFile) return existing;
		try {
			return await this.app.vault.create(path, TEMPLATES[type](name));
		} catch (e) {
			new Notice("No se pudo crear la nota: " + e);
			return null;
		}
	}

	async materializeBuiltin(entry: CairnEntry): Promise<TFile | null> {
		const folderPath = this.settings.defaultFolder;
		await this.ensureFolder(folderPath);
		const safeName = entry.name.replace(/[\\/:*?"<>|]/g, "-");
		const path = `${folderPath}/${safeName}.md`;
		const existing = this.app.vault.getAbstractFileByPath(path);
		if (existing instanceof TFile) {
			new Notice("Ya existe una copia en tu carpeta; abriéndola.");
			return existing;
		}
		const fmObj: Record<string, unknown> = Object.assign(
			{ cairn_type: entry.type, name: entry.name },
			entry.frontmatter
		);
		try {
			const yamlStr = stringifyYaml(fmObj);
			const content = `---\n${yamlStr}---\n\n${entry.description || ""}\n`;
			return await this.app.vault.create(path, content);
		} catch (e) {
			new Notice("No se pudo crear la copia: " + e);
			return null;
		}
	}

	async setCharField(file: TFile, key: string, value: unknown) {
		await this.app.fileManager.processFrontMatter(file, (fm) => {
			fm[key] = value;
		});
	}

	async addToList(file: TFile, field: "inventory" | "insignificant", itemName: string) {
		await this.app.fileManager.processFrontMatter(file, (fm) => {
			const list: Array<{ name: string; qty: number }> = Array.isArray(fm[field]) ? fm[field] : [];
			const existing = list.find((i) => i && normalize(String(i.name)) === normalize(itemName));
			if (existing) existing.qty = (Number(existing.qty) || 1) + 1;
			else list.push({ name: itemName, qty: 1 });
			fm[field] = list;
		});
	}

	async changeListQty(file: TFile, field: "inventory" | "insignificant", itemName: string, delta: number) {
		await this.app.fileManager.processFrontMatter(file, (fm) => {
			const list: Array<{ name: string; qty: number }> = Array.isArray(fm[field]) ? fm[field] : [];
			const idx = list.findIndex((i) => i && normalize(String(i.name)) === normalize(itemName));
			if (idx >= 0) {
				const nextQty = (Number(list[idx].qty) || 1) + delta;
				if (nextQty <= 0) list.splice(idx, 1);
				else list[idx].qty = nextQty;
			}
			fm[field] = list;
		});
	}

	async createSamples() {
		const samples: Record<Exclude<CairnType, "character">, { name: string; content: string }> = {
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

		await this.ensureFolder(EXAMPLES_FOLDER);
		for (const type of DATA_TYPES) {
			const s = samples[type];
			const path = `${EXAMPLES_FOLDER}/${s.name}.md`;
			if (!this.app.vault.getAbstractFileByPath(path)) {
				await this.app.vault.create(path, s.content);
			}
		}

		const charPath = `${EXAMPLES_FOLDER}/Ejemplo de personaje.md`;
		if (!this.app.vault.getAbstractFileByPath(charPath)) {
			await this.app.vault.create(
				charPath,
				[
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
				].join("\n")
			);
		}

		const demoPath = `${EXAMPLES_FOLDER}/Ejemplos de uso.md`;
		if (!this.app.vault.getAbstractFileByPath(demoPath)) {
			const demo = [
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
			await this.app.vault.create(demoPath, demo);
		}

		this.reindex();
	}

	async loadSettings() {
		const loaded = ((await this.loadData()) ?? {}) as Partial<CairnSettings>;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.reindex();
	}
}

/* -------------------------------------------------------------------------- */
/*  Panel de ajustes                                                          */
/* -------------------------------------------------------------------------- */

class CairnSettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: CairnPlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: "Cairn Companion" });

		new Setting(containerEl)
			.setName("Idioma de los datos incorporados")
			.setDesc(
				"Objetos, hechizos, monstruos y trasfondos oficiales vienen empaquetados con el plugin. " +
					"Elige el idioma; si un idioma todavía no tiene datos, se usa Español como reserva."
			)
			.addDropdown((d) =>
				d
					.addOption("es", "Español")
					.addOption("en", "English")
					.setValue(this.plugin.settings.language)
					.onChange(async (value) => {
						this.plugin.settings.language = value as Language;
						await this.plugin.saveSettings();
						await this.plugin.loadBuiltinData();
						this.plugin.reindex();
						this.display();
					})
			);

		containerEl.createEl("p", {
			text:
				"La detección de tipo es siempre por la propiedad cairn_type del frontmatter — nunca por la " +
				"carpeta. Puedes guardar tus notas donde quieras: un catálogo reusable en, por ejemplo, «_db/», " +
				"y entradas propias de una campaña en «Campaña/Personajes/» o incluso " +
				"«Campaña/Facción 1/PNJ/Tesorero.md». La carpeta de abajo solo se usa como destino por defecto " +
				"cuando el propio plugin crea una nota nueva por ti (botón «Crear nota», los comandos «Nuevo " +
				"objeto» / «Nuevo PNJ» / etc., «Crear copia editable»...) — no restringe dónde puede vivir una " +
				"nota ya existente, ni hay una carpeta distinta por tipo.",
		});

		new Setting(containerEl)
			.setName("Carpeta por defecto")
			.setDesc("Dónde se crean las notas nuevas cuando usas el plugin, sea cual sea su tipo.")
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.defaultFolder)
					.setValue(this.plugin.settings.defaultFolder)
					.onChange(async (value) => {
						this.plugin.settings.defaultFolder = value.trim() || DEFAULT_SETTINGS.defaultFolder;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Detectar menciones automáticamente")
			.setDesc(
				"Cuando escribes el nombre de una entrada del catálogo en texto normal (fuera de un bloque " +
					"cairn), se convierte en un enlace: al pasar el ratón se ve una ficha resumida, y al hacer " +
					"clic se abre o previsualiza. Solo funciona en vista de lectura, no mientras editas."
			)
			.addToggle((t) =>
				t.setValue(this.plugin.settings.autoLink).onChange(async (v) => {
					this.plugin.settings.autoLink = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Longitud mínima para palabras sueltas")
			.setDesc(
				"Para evitar convertir palabras comunes en enlaces (p. ej. «Red» o «Vara»), los nombres de una " +
					"sola palabra solo se detectan a partir de esta longitud. Los nombres de varias palabras " +
					"(p. ej. «Espada larga») siempre se detectan enteros."
			)
			.addText((t) =>
				t.setValue(String(this.plugin.settings.autoLinkMinLength)).onChange(async (v) => {
					const n = parseInt(v, 10);
					this.plugin.settings.autoLinkMinLength =
						Number.isFinite(n) && n > 0 ? n : DEFAULT_SETTINGS.autoLinkMinLength;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Reindexar automáticamente")
			.setDesc("Actualiza el índice cuando creas, editas o borras notas.")
			.addToggle((t) =>
				t.setValue(this.plugin.settings.autoReindex).onChange(async (v) => {
					this.plugin.settings.autoReindex = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Reindexar ahora")
			.addButton((b) =>
				b.setButtonText("Reindexar").onClick(() => {
					this.plugin.reindex();
					new Notice(`Reindexado: ${this.plugin.countEntries()} entradas.`);
				})
			);

		new Setting(containerEl)
			.setName("Recargar datos incorporados")
			.setDesc("Vuelve a leer los archivos JSON del plugin (útil si los editaste o añadiste un idioma nuevo).")
			.addButton((b) =>
				b.setButtonText("Recargar").onClick(async () => {
					await this.plugin.loadBuiltinData();
					this.plugin.reindex();
					new Notice(`Datos recargados: ${this.plugin.countEntries()} entradas.`);
				})
			);

		new Setting(containerEl)
			.setName("Crear ejemplos personalizados")
			.setDesc(
				"Añade una nota de ejemplo por tipo en tus carpetas (incluida una ficha de personaje ya rellena) " +
					"y una nota «cairn-ejemplos/Ejemplos de uso» con todos los bloques."
			)
			.addButton((b) =>
				b.setButtonText("Crear ejemplos").onClick(async () => {
					await this.plugin.createSamples();
					new Notice("Ejemplos creados.");
				})
			);

		const dice = getDiceRollerApi(this.app);
		new Setting(containerEl)
			.setName("Plugin de dados")
			.setDesc(
				dice
					? "✅ «Dice Roller» detectado: los botones 🎲 lo usarán para tirar."
					: "No se detectó el plugin «Dice Roller». Los botones 🎲 usarán un generador interno propio."
			);

		containerEl.createEl("h3", { text: "Cómo usarlo" });
		containerEl.createEl("p", {
			text:
				"Un único tipo de bloque para todo, con dos campos obligatorios: type y name. Mientras escribes " +
				"dentro del bloque, ambos campos se autocompletan (type sugiere los tipos válidos; name sugiere " +
				"las entradas de ese tipo ya indexadas).",
		});
		const usage = containerEl.createEl("pre");
		usage.createEl("code", {
			text:
				'```cairn\ntype: object\nname: "Espada larga"\n```\n\n' +
				'```cairn\ntype: npc\nname: "Aldric el Comerciante"\nactitud: Amable\nnotas: Debe 40 mo al grupo\n```',
		});
		containerEl.createEl("p", {
			text:
				"Cualquier campo extra dentro del bloque, aparte de type y name, se muestra como «Notas de la " +
				"partida» sin modificar la ficha original.",
		});
		containerEl.createEl("p", {
			text:
				"Comando «Nueva ficha de personaje»: crea una nota con una ficha interactiva (características, PG, " +
				"inventario, notas) que puedes editar directamente desde la vista de lectura — los cambios se ven " +
				"al instante, sin recargar.",
		});
		containerEl.createEl("p", {
			text:
				"También hay un comando «Nuevo <tipo>» por cada tipo (Nuevo objeto, Nuevo PNJ, Nuevo monstruo...): " +
				"pide un nombre y crea la nota con todas las propiedades vacías y, en el cuerpo, el bloque cairn " +
				"ya escrito y listo para copiar y pegar donde quieras referenciarlo.",
		});
	}
}
