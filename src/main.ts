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
	stringifyYaml,
	getLanguage,
} from "obsidian";

import type { CairnType, RollTableEntry } from "./types";
import { DATA_TYPES, TYPES, TYPE_ICONS } from "./types";

import type { CairnSettings, Language } from "./settings";
import { DEFAULT_SETTINGS, EXAMPLES_FOLDER } from "./settings";

import { CairnIndex, CairnEntry, BuiltinRaw } from "./indexer";
import { doRoll, rollSave, extractDiceFormula, hasRollerPlugin } from "./dice";
import { cairnMarkdownBlockProcessor, ParsedCairnBlock } from "./block";
import { GuardianToolsModal, GuardianEventTables } from "./guardian";
import { normalize } from "./utils";
import type { CairnStrings } from "./i18n";
import { getStrings } from "./i18n";


interface FieldDef {
	key: string;
	label: string;
	format?: (v: unknown) => string;
}

function joinArr(v: unknown): string {
	return Array.isArray(v) ? v.join(", ") : String(v);
}

function fieldDefsFor(s: CairnStrings): Record<CairnType, FieldDef[]> {
	return {
		object: [
			{ key: "damage", label: s.fields.object.damage },
			{ key: "armor", label: s.fields.object.armor },
			{ key: "cost", label: s.fields.object.cost },
			{ key: "slot", label: s.fields.object.slot },
			{ key: "quality", label: s.fields.object.quality, format: joinArr },
			{ key: "uses", label: s.fields.object.uses },
			{ key: "recharge", label: s.fields.object.recharge },
		],
		skill: [{ key: "category", label: s.fields.skill.category }],
		spell: [{ key: "cost", label: s.fields.spell.cost }],
		npc: [
			{ key: "role", label: s.fields.npc.role },
			{ key: "location", label: s.fields.npc.location },
			{ key: "fue", label: s.fields.npc.fue },
			{ key: "des", label: s.fields.npc.des },
			{ key: "vol", label: s.fields.npc.vol },
			{ key: "pg", label: s.fields.npc.pg },
			{ key: "armor", label: s.fields.npc.armor },
			{ key: "attitude", label: s.fields.npc.attitude },
		],
		monster: [
			{ key: "fue", label: s.fields.monster.fue },
			{ key: "des", label: s.fields.monster.des },
			{ key: "vol", label: s.fields.monster.vol },
			{ key: "pg", label: s.fields.monster.pg },
			{ key: "armor", label: s.fields.monster.armor },
			{ key: "attacks", label: s.fields.monster.attacks, format: joinArr },
			{ key: "moral", label: s.fields.monster.moral },
			{ key: "abilities", label: s.fields.monster.abilities, format: joinArr },
		],
		background: [{ key: "gear", label: s.fields.background.gear, format: joinArr }],
		hireling: [
			{ key: "cost", label: s.fields.hireling.cost },
			{ key: "role", label: s.fields.hireling.role },
		],
		bond: [],
		omen: [],
		character: [],
	};
}

function cairnBodyBlock(type: CairnType, name: string): string {
	return ["```cairn", `type: ${type}`, `name: "${name}"`, "```"].join("\n");
}

function simpleTemplate(type: CairnType, extraFields: string, s: CairnStrings): (name: string) => string {
	return (n: string) =>
		`---\ncairn_type: ${type}\nname: "${n}"\n${extraFields}---\n\n# ${n}\n\n${cairnBodyBlock(
			type,
			n
		)}\n\n${s.templates.descriptionPlaceholder(n)}\n`;
}

function templatesFor(s: CairnStrings): Record<CairnType, (name: string) => string> {
	return {
		object: simpleTemplate(
			"object",
			'damage: ""\narmor: ""\ncost: ""\nslot: ""\nquality: []\nuses: ""\nrecharge: ""\n',
			s
		),
		skill: simpleTemplate("skill", 'category: ""\n', s),
		spell: simpleTemplate("spell", 'cost: ""\n', s),
		npc: simpleTemplate(
			"npc",
			'role: ""\nlocation: ""\nfue: ""\ndes: ""\nvol: ""\npg: ""\narmor: ""\nattitude: ""\n',
			s
		),
		monster: simpleTemplate(
			"monster",
			'fue: ""\ndes: ""\nvol: ""\npg: ""\narmor: ""\nattacks: []\nmoral: ""\nabilities: []\n',
			s
		),
		background: simpleTemplate("background", "gear: []\n", s),
		hireling: simpleTemplate("hireling", 'cost: ""\nrole: ""\n', s),
		bond: simpleTemplate("bond", "", s),
		omen: simpleTemplate("omen", "", s),
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
				s.templates.characterBodyPlaceholder,
				"",
			].join("\n"),
	};
}

/* -------------------------------------------------------------------------- */
/*  Scars table (Basic Rules)                                                 */
/* -------------------------------------------------------------------------- */

function renderScar(outputEl: HTMLElement, pgLost: number, s: CairnStrings, scars: RollTableEntry[]) {
	const idx = Math.min(scars.length, Math.max(1, Math.round(pgLost))) - 1;
	const c = scars[idx];
	outputEl.empty();
	outputEl.addClass("cairn-roll-output-active", "cairn-cicatriz");
	outputEl.createSpan({ text: `⚠️ ${s.sheet.scarsWarning(pgLost)}`, cls: "cairn-roll-label" });
	outputEl.createEl("strong", { text: c.title + ": " });
	outputEl.createSpan({ text: c.effect });
}

/* -------------------------------------------------------------------------- */
/*  Misc utilities                                                            */
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
/*  Generic entry card rendering                                             */
/* -------------------------------------------------------------------------- */

function appendAdvantageButtons(el: HTMLElement, plugin: CairnPlugin, rollOutput: HTMLElement, label: string) {
	const s = plugin.strings();
	const advBtn = el.createEl("button", {
		text: "▲",
		cls: "cairn-dice-btn cairn-dice-adv",
		attr: { "aria-label": s.dice.advantageAria },
	});
	advBtn.onclick = (ev: MouseEvent) => {
		ev.preventDefault();
		doRoll(plugin.app.workspace.getActiveFile()?.path ?? "", plugin.app, rollOutput, "1d12", `${label} ${s.dice.advantageSuffix}`);
	};
	const disBtn = el.createEl("button", {
		text: "▼",
		cls: "cairn-dice-btn cairn-dice-dis",
		attr: { "aria-label": s.dice.disadvantageAria },
	});
	disBtn.onclick = (ev: MouseEvent) => {
		ev.preventDefault();
		doRoll(plugin.app.workspace.getActiveFile()?.path ?? "", plugin.app, rollOutput, "1d4", `${label} ${s.dice.disadvantageSuffix}`);
	};
}

function appendTextWithDiceButton(
	el: HTMLElement,
	plugin: CairnPlugin,
	rollOutput: HTMLElement,
	text: string,
	showAdvantage = false
) {
	const s = plugin.strings();
	el.createSpan({ text });
	const formula = extractDiceFormula(text);
	if (formula) {
		const label = text.length > 28 ? formula : text;
		const btn = el.createEl("button", {
			text: "🎲",
			cls: "cairn-dice-btn",
			attr: { "aria-label": s.dice.rollAria(formula) },
		});
		btn.onclick = (ev: MouseEvent) => {
			ev.preventDefault();
			doRoll(plugin.app.workspace.getActiveFile()?.path ?? "", plugin.app, rollOutput, formula, label);
		};
		// Advantage/Disadvantage replace the weapon's die with 1d12/1d4 (Basic
		// Rules: Combat → Attack modifiers). Only offered on damage/attack
		// fields, not things like "3d6 gold coins".
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
	const s = plugin.strings();
	container.empty();
	container.addClass("cairn-card", `cairn-${type}`);

	if (!name) {
		container.createDiv({ text: s.card.missingName(type), cls: "cairn-error" });
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
		header.createSpan({ text: s.card.builtinBadge, cls: "cairn-source-badge" });
	}
	header.createSpan({ text: s.types[type], cls: "cairn-type-badge" });

	if (!entry) {
		container.createDiv({
			cls: "cairn-missing",
			text: s.card.notFound(name, s.types[type]),
		});
		const btn = container.createEl("button", { text: s.card.createNoteBtn, cls: "cairn-create-btn" });
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
			text: s.card.createCopyBtn,
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
			renderCharacterSmallCard(container, entry, freshFm as Record<string, unknown>, s);
		} else {
			await renderCharacterSheet(plugin, container, entry, rollOutput);
		}
	} else {
		const fieldDefs = fieldDefsFor(s);
		const data: Record<string, unknown> = Object.assign({}, entry.frontmatter, overrides);
		const table = container.createEl("table", { cls: "cairn-stats" });
		for (const f of fieldDefs[type]) {
			const v = data[f.key];
			if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) continue;
			const row = table.createEl("tr");
			row.createEl("th", { text: f.label });
			const td = row.createEl("td");
			renderFieldCell(td, plugin, rollOutput, f, v);
		}
		if (table.childElementCount === 0) table.remove();
		else container.insertBefore(table, rollOutput);

		const knownKeys = new Set(fieldDefs[type].map((f) => f.key));
		const extraKeys = Object.keys(overrides).filter((k) => !knownKeys.has(k));
		if (extraKeys.length > 0) {
			const notes = container.createDiv({ cls: "cairn-notes" });
			notes.createEl("strong", { text: s.card.sessionNotesLabel });
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
		/* if reading fails, the description is skipped */
	}
}

/* -------------------------------------------------------------------------- */
/*  Interactive character sheet (with instant updates)                       */
/* -------------------------------------------------------------------------- */

function statOrDash(v: unknown): string {
	return v === undefined || v === null || v === "" ? "—" : String(v);
}

function renderCharacterSmallCard(container: HTMLElement, entry: CairnEntry, fm: Record<string, unknown>, s: CairnStrings) {
	const small = container.createDiv({ cls: "cairn-sheet-small" });

	const stats = small.createDiv({ cls: "cairn-small-stats" });
	for (const [key, label] of [
		["fue", s.sheet.fue],
		["des", s.sheet.des],
		["vol", s.sheet.vol],
	] as const) {
		const box = stats.createDiv({ cls: "cairn-small-stat" });
		box.createDiv({ cls: "cairn-small-stat-value", text: statOrDash(fm[key]) });
		box.createDiv({ cls: "cairn-small-stat-label", text: label });
	}

	const bottom = small.createDiv({ cls: "cairn-small-stats cairn-small-bottom" });
	const hpBox = bottom.createDiv({ cls: "cairn-small-stat" });
	hpBox.createDiv({ cls: "cairn-small-stat-value", text: statOrDash(fm["pg"]) });
	hpBox.createDiv({ cls: "cairn-small-stat-label", text: s.sheet.small.hp });

	const armorBox = bottom.createDiv({ cls: "cairn-small-stat" });
	armorBox.createDiv({ cls: "cairn-small-stat-value", text: statOrDash(fm["armor"]) });
	armorBox.createDiv({ cls: "cairn-small-stat-label", text: s.sheet.small.armor });
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
	const s = plugin.strings();
	let items: InventoryItem[] = inventoryOf(fm, opts.field);
	const syncToFm = () => {
		fm[opts.field] = items.map((i) => ({ name: i.name, qty: i.qty }));
	};

	const section = sheet.createDiv({ cls: "cairn-inventory" });
	const header = section.createDiv({ cls: "cairn-inventory-header" });
	header.createEl("strong", { text: opts.title });
	const infoSpan = header.createSpan({ cls: "cairn-slots" });
	const addBtn = header.createEl("button", { text: s.sheet.addObject });
	const list = section.createEl("ul", { cls: "cairn-inventory-list" });

	function draw() {
		if (opts.countSlots) {
			infoSpan.setText(s.sheet.slotsSuffix(computeSlots(plugin, items)));
		} else {
			infoSpan.setText(s.sheet.noSlotSuffix(items.length));
		}
		list.empty();
		if (items.length === 0) {
			list.createEl("li", { text: s.sheet.noItemsYet, cls: "cairn-empty" });
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
						attr: { "aria-label": s.sheet.rollDamageAria },
					});
					rollBtn.onclick = () => doRoll(plugin.app.workspace.getActiveFile()?.path ?? "", plugin.app, rollOutput, String(dmg), item.name);
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
		new NamePickerModal(plugin.app, names, s.sheet.searchToAdd(opts.title), async (chosen) => {
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
	const s = plugin.strings();
	const file = entry.file;
	if (!file) return; // characters always live in their own note
	const charFile: TFile = file; // non-null alias, stable inside nested closures

	// Local mutable copy: the UI updates instantly from here, without
	// waiting for Obsidian to re-read the file or the plugin to reindex.
	const fm: Record<string, unknown> = {
		...(plugin.app.metadataCache.getFileCache(file)?.frontmatter ?? entry.frontmatter),
	};

	const sheet = container.createDiv({ cls: "cairn-sheet" });
	container.insertBefore(sheet, rollOutput);

	const pgBox = sheet.createDiv({ cls: "cairn-stat-box cairn-pg-box" });
	pgBox.createDiv({ cls: "cairn-stat-label", text: s.sheet.hp });
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
		attr: { placeholder: s.sheet.damagePlaceholder },
	});
	const dmgBtn = dmgRow.createEl("button", { text: s.sheet.applyDamage });
	dmgBtn.onclick = async () => {
		const dmg = Number(dmgInput.value) || 0;
		if (dmg <= 0) return;
		const current = Number(fm.pg ?? 0) || 0;
		const next = Math.max(0, current - dmg);
		fm.pg = next;
		pgCur.value = String(next);
		dmgInput.value = "";
		if (next === 0) renderScar(rollOutput, dmg, s, plugin.scars);
		await plugin.setCharField(file, "pg", next);
	};
	const restBtn = pgBox.createEl("button", { text: s.sheet.rest, cls: "cairn-rest-btn" });
	restBtn.onclick = async () => {
		const maxVal = fm.pg_max !== undefined && fm.pg_max !== "" ? fm.pg_max : fm.pg ?? "";
		fm.pg = maxVal;
		pgCur.value = maxVal === "" ? "" : String(maxVal);
		await plugin.setCharField(file, "pg", maxVal);
	};

	const statsRow = sheet.createDiv({ cls: "cairn-sheet-stats" });
	for (const [key, label] of [
		["fue", s.sheet.fue],
		["des", s.sheet.des],
		["vol", s.sheet.vol],
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
		const rollBtn = box.createEl("button", { text: s.sheet.save, cls: "cairn-dice-btn" });
		rollBtn.onclick = () => rollSave(plugin.app.workspace.getActiveFile()?.path ?? "", plugin.app, rollOutput, Number(fm[key] ?? 0) || 0, s.sheet.saveOf(label), s);
	}

	const miscRow = sheet.createDiv({ cls: "cairn-misc-row" });
	const armorWrap = miscRow.createDiv({ cls: "cairn-misc-field" });
	armorWrap.createEl("label", { text: s.sheet.armor });
	const armorInput = armorWrap.createEl("input", { type: "number", cls: "cairn-input-sm" });
	armorInput.value = fm.armor === undefined || fm.armor === "" ? "" : String(fm.armor);
	armorInput.onchange = () => {
		const v = numOrEmpty(armorInput.value);
		fm.armor = v;
		plugin.setCharField(file, "armor", v);
	};

	const goldWrap = miscRow.createDiv({ cls: "cairn-misc-field" });
	goldWrap.createEl("label", { text: s.sheet.gold });
	const goldInput = goldWrap.createEl("input", { type: "number", cls: "cairn-input-sm" });
	goldInput.value = fm.gold === undefined || fm.gold === "" ? "" : String(fm.gold);
	goldInput.onchange = () => {
		const v = numOrEmpty(goldInput.value);
		fm.gold = v;
		plugin.setCharField(file, "gold", v);
	};

	const ageWrap = miscRow.createDiv({ cls: "cairn-misc-field" });
	ageWrap.createEl("label", { text: s.sheet.age });
	const ageInput = ageWrap.createEl("input", { type: "text", cls: "cairn-input-sm" });
	ageInput.value = fm.age === undefined ? "" : String(fm.age);
	ageInput.onchange = () => {
		fm.age = ageInput.value;
		plugin.setCharField(file, "age", ageInput.value);
	};

	buildInventorySection(sheet, plugin, charFile, fm, rollOutput, {
		field: "inventory",
		title: s.sheet.inventoryTitle,
		countSlots: true,
	});
	buildInventorySection(sheet, plugin, charFile, fm, rollOutput, {
		field: "insignificant",
		title: s.sheet.insignificantTitle,
		countSlots: false,
	});

	const notesBox = sheet.createDiv({ cls: "cairn-notes-box" });
	notesBox.createEl("label", { text: s.sheet.notesLabel });
	const notesArea = notesBox.createEl("textarea");
	notesArea.value = fm.notes === undefined ? "" : String(fm.notes);
	notesArea.onchange = () => {
		fm.notes = notesArea.value;
		plugin.setCharField(file, "notes", notesArea.value);
	};
}

/* -------------------------------------------------------------------------- */
/*  Modals                                                                    */
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
	private s: CairnStrings;
	constructor(app: App, private plugin: CairnPlugin, private editor: Editor) {
		super(app);
		this.s = plugin.strings();
		this.setPlaceholder(this.s.modals.insertReferenceTypePrompt);
	}
	getItems(): (CairnType | "tools")[] {
		return [...TYPES, "tools"];
	}
	getItemText(item: CairnType | "tools"): string {
		if (item === "tools") return this.s.modals.toolsOptionLabel;
		return `${TYPE_ICONS[item]} ${this.s.types[item]}`;
	}
	onChooseItem(item: CairnType | "tools") {
		if (item === "tools") {
			this.editor.replaceSelection("```cairn\ntype: tools\n```\n");
			return;
		}
		const names = this.plugin.index.list(item).map((e) => e.name);
		new NamePickerModal(this.app, names, this.s.modals.insertReferenceSearchPrompt(this.s.types[item]), (name) => {
			const block = `\`\`\`cairn\ntype: ${item}\nname: "${name}"\n\`\`\`\n`;
			this.editor.replaceSelection(block);
		}).open();
	}
}

class TextInputModal extends Modal {
	constructor(
		app: App,
		private title: string,
		private strings: CairnStrings,
		private onSubmit: (value: string) => void
	) {
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
		const okBtn = btnRow.createEl("button", { text: this.strings.modals.createButton, cls: "mod-cta" });
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
	private s: CairnStrings;

	constructor(app: App, private plugin: CairnPlugin, private type: CairnType) {
		super(app);
		this.s = plugin.strings();
	}

	onOpen() {
		this.contentEl.addClass("cairn-preview-modal", "cairn-random-modal");
		this.cardEl = this.contentEl.createDiv();

		const btnRow = this.contentEl.createDiv({ cls: "cairn-modal-buttons cairn-random-buttons" });
		const rerollBtn = btnRow.createEl("button", { text: this.s.modals.rerollButton });
		rerollBtn.onclick = () => this.renderRandom();
		const insertBtn = btnRow.createEl("button", { text: this.s.modals.insertIntoDocButton, cls: "mod-cta" });
		insertBtn.onclick = () => this.insertIntoActiveEditor();

		this.renderRandom();
	}

	private async renderRandom() {
		const list = this.plugin.index.list(this.type);
		if (list.length === 0) {
			this.currentName = null;
			this.cardEl.empty();
			this.cardEl.createDiv({ text: this.s.modals.noEntriesOfType(this.s.types[this.type]) });
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
			new Notice(this.s.modals.noActiveEditor);
			return;
		}
		const block = `\`\`\`cairn\ntype: ${this.type}\nname: "${this.currentName}"\n\`\`\`\n`;
		editor.replaceSelection(block);
		new Notice(this.s.modals.insertedNotice(this.currentName));
		this.close();
	}

	onClose() {
		this.contentEl.empty();
	}
}

class RandomEntryModal extends FuzzySuggestModal<CairnType> {
	private s: CairnStrings;
	constructor(app: App, private plugin: CairnPlugin) {
		super(app);
		this.s = plugin.strings();
		this.setPlaceholder(this.s.modals.randomEntryTypePrompt);
	}
	getItems(): CairnType[] {
		return TYPES;
	}
	getItemText(item: CairnType): string {
		return `${TYPE_ICONS[item]} ${this.s.types[item]}`;
	}
	onChooseItem(item: CairnType) {
		if (this.plugin.index.list(item).length === 0) {
			new Notice(this.s.modals.noEntriesOfType(this.s.types[item]));
			return;
		}
		new RandomEntryResultModal(this.app, this.plugin, item).open();
	}
}


/* -------------------------------------------------------------------------- */
/*  Autocomplete for "type:" and "name:" inside a ```cairn block              */
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
			const s = this.plugin.strings();
			return TYPES.filter(
				(t) => t.includes(query) || s.types[t].toLowerCase().includes(query)
			).map((t) => ({ value: t, display: `${TYPE_ICONS[t]} ${t} — ${s.types[t]}` }));
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
/*  Automatic detection of mentions in text (links + preview)                */
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
	const s = plugin.strings();
	container.empty();
	container.addClass("cairn-tooltip-inner");
	const entry = plugin.index.find(type, name);

	const header = container.createDiv({ cls: "cairn-tooltip-header" });
	header.createSpan({ text: TYPE_ICONS[type] + " " });
	header.createEl("strong", { text: name });
	header.createSpan({ text: s.types[type], cls: "cairn-type-badge" });

	if (!entry) {
		container.createDiv({ text: s.tooltip.notFound, cls: "cairn-missing" });
		return;
	}

	const table = container.createEl("table", { cls: "cairn-stats" });
	let shown = 0;
	for (const f of fieldDefsFor(s)[type]) {
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
			/* ignore */
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
		text: entry.file ? s.tooltip.clickToOpen : s.tooltip.clickToPreview,
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
	scars: RollTableEntry[] = [];
	dungeonEvents: RollTableEntry[] = [];
	wildernessEvents: RollTableEntry[] = [];

	strings(): CairnStrings {
		return getStrings(this.settings.language);
	}

	eventTables(): GuardianEventTables {
		return { dungeonEvents: this.dungeonEvents, wildernessEvents: this.wildernessEvents };
	}

	async onload() {
		await this.loadSettings();
		this.index = new CairnIndex(this.app, this.settings);

		this.app.workspace.onLayoutReady(async () => {
			await this.loadBuiltinData();
			this.reindex();
		});

		this.registerMarkdownCodeBlockProcessor("cairn", (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
			const parsed: ParsedCairnBlock | undefined = cairnMarkdownBlockProcessor(source, el, this.strings(), this.eventTables());
			if (!parsed || !(parsed.type && parsed.type !== "tools" && TYPES.includes(parsed.type))) return;

			renderEntryCard(this, el, parsed.type, parsed.name, parsed.overrides);
		});

		// Detects mentions of known names in plain text (reading view) and
		// turns them into links with a hover preview.
		this.registerMarkdownPostProcessor((el) => {
			if (!this.settings.autoLink) return;
			this.autoLinkElement(el);
		});

		this.registerEditorSuggest(new CairnFieldSuggest(this.app, this));

		this.addCommand({
			id: "cairn-reindex",
			name: this.strings().commands.reindex,
			callback: () => {
				this.reindex();
				new Notice(this.strings().settings.reindexNotice(this.countEntries()));
			},
		});

		this.addCommand({
			id: "cairn-insert-reference",
			name: this.strings().commands.insertReference,
			editorCallback: (editor: Editor) => {
				new TypePickerModal(this.app, this, editor).open();
			},
		});

		this.addCommand({
			id: "cairn-random-entry",
			name: this.strings().commands.randomEntry,
			callback: () => {
				new RandomEntryModal(this.app, this).open();
			},
		});

		this.addCommand({
			id: "cairn-guardian-tools",
			name: this.strings().commands.guardianTools,
			callback: () => {
				new GuardianToolsModal(this.app, this.strings(), this.eventTables()).open();
			},
		});

		this.addCommand({
			id: "cairn-new-character",
			name: this.strings().commands.newCharacter,
			callback: () => {
				const s = this.strings();
				new TextInputModal(this.app, s.modals.newCharacterPrompt, s, async (rawName) => {
					if (!rawName) return;
					const file = await this.createEntryNote("character", rawName);
					if (file) {
						this.reindex();
						await this.app.workspace.getLeaf(false).openFile(file);
					}
				}).open();
			},
		});

		// A "New <type>" command for each type (besides the character one
		// above, which keeps its own id in case a hotkey is already bound to
		// it). Each one creates the file with the full frontmatter (empty
		// properties) and, in the body, the ```cairn block already written
		// and ready to copy and paste wherever it's needed.
		for (const type of DATA_TYPES) {
			this.addCommand({
				id: `cairn-new-${type}`,
				name: this.strings().createLabels[type],
				callback: () => {
					const s = this.strings();
					new TextInputModal(this.app, s.createLabels[type], s, async (rawName) => {
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

	async readDataFile(lang: string, type: Exclude<CairnType, "character">): Promise<BuiltinRaw[] | null> {
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

	async readRollTable(lang: string, filename: string): Promise<RollTableEntry[] | null> {
		const path = normalizePath(`${pluginDir(this)}/data/${lang}/${filename}.json`);
		try {
			const exists = await this.app.vault.adapter.exists(path);
			if (!exists) return null;
			const raw = await this.app.vault.adapter.read(path);
			const parsed = JSON.parse(raw);
			return Array.isArray(parsed) ? (parsed as RollTableEntry[]) : null;
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

		const rollTables: [string, "scars" | "dungeonEvents" | "wildernessEvents"][] = [
			["scars", "scars"],
			["dungeon-events", "dungeonEvents"],
			["wilderness-events", "wildernessEvents"],
		];
		for (const [filename, key] of rollTables) {
			let data = await this.readRollTable(lang, filename);
			if (!data && lang !== "es") {
				data = await this.readRollTable("es", filename);
				if (data) usedFallback = true;
			}
			this[key] = data ?? [];
		}

		if (usedFallback) {
			new Notice(this.strings().settings.fallbackLanguageNotice(lang));
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
					/* already exists, continue */
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
			return await this.app.vault.create(path, templatesFor(this.strings())[type](name));
		} catch (e) {
			new Notice(this.strings().notices.noteCreateFailed(String(e)));
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
			new Notice(this.strings().notices.copyExists);
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
			new Notice(this.strings().notices.copyCreateFailed(String(e)));
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
		// No language saved yet (first run): default to the Obsidian UI
		// language when supported, otherwise English. Only en & es are
		// supported for now. Once saved, the user's own choice (from the
		// settings dropdown) always wins over the app language.
		if (loaded.language !== "es" && loaded.language !== "en") {
			loaded.language = getLanguage() === "es" ? "es" : "en";
		}

		this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.reindex();
	}
}

/* -------------------------------------------------------------------------- */
/*  Settings panel                                                           */
/* -------------------------------------------------------------------------- */

const USAGE_EXAMPLE: Record<Language, string> = {
	es:
		'```cairn\ntype: object\nname: "Espada larga"\n```\n\n' +
		'```cairn\ntype: npc\nname: "Aldric el Comerciante"\nactitud: Amable\nnotas: Debe 40 mo al grupo\n```',
	en:
		'```cairn\ntype: object\nname: "Long sword"\n```\n\n' +
		'```cairn\ntype: npc\nname: "Aldric the Merchant"\nattitude: Friendly\nnotes: Owes the party 40gp\n```',
};

class CairnSettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: CairnPlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		const s = this.plugin.strings();
		containerEl.empty();
		containerEl.createEl("h2", { text: s.settings.heading });

		new Setting(containerEl)
			.setName(s.settings.languageName)
			.setDesc(s.settings.languageDesc)
			.addDropdown((d) =>
				d
					.addOption("es", s.settings.languageEs)
					.addOption("en", s.settings.languageEn)
					.setValue(this.plugin.settings.language)
					.onChange(async (value) => {
						this.plugin.settings.language = value as Language;
						await this.plugin.saveSettings();
						await this.plugin.loadBuiltinData();
						this.plugin.reindex();
						this.display();
					})
			);

		containerEl.createEl("p", { text: s.settings.folderInfoParagraph });

		new Setting(containerEl)
			.setName(s.settings.defaultFolderName)
			.setDesc(s.settings.defaultFolderDesc)
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
			.setName(s.settings.autoLinkName)
			.setDesc(s.settings.autoLinkDesc)
			.addToggle((t) =>
				t.setValue(this.plugin.settings.autoLink).onChange(async (v) => {
					this.plugin.settings.autoLink = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName(s.settings.minLengthName)
			.setDesc(s.settings.minLengthDesc)
			.addText((t) =>
				t.setValue(String(this.plugin.settings.autoLinkMinLength)).onChange(async (v) => {
					const n = parseInt(v, 10);
					this.plugin.settings.autoLinkMinLength =
						Number.isFinite(n) && n > 0 ? n : DEFAULT_SETTINGS.autoLinkMinLength;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName(s.settings.autoReindexName)
			.setDesc(s.settings.autoReindexDesc)
			.addToggle((t) =>
				t.setValue(this.plugin.settings.autoReindex).onChange(async (v) => {
					this.plugin.settings.autoReindex = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName(s.settings.reindexNowName)
			.addButton((b) =>
				b.setButtonText(s.settings.reindexButton).onClick(() => {
					this.plugin.reindex();
					new Notice(s.settings.reindexNotice(this.plugin.countEntries()));
				})
			);

		new Setting(containerEl)
			.setName(s.settings.reloadDataName)
			.setDesc(s.settings.reloadDataDesc)
			.addButton((b) =>
				b.setButtonText(s.settings.reloadButton).onClick(async () => {
					await this.plugin.loadBuiltinData();
					this.plugin.reindex();
					new Notice(s.settings.reloadNotice(this.plugin.countEntries()));
				})
			);

		new Setting(containerEl)
			.setName(s.settings.createSamplesName)
			.setDesc(s.settings.createSamplesDesc)
			.addButton((b) =>
				b.setButtonText(s.settings.createSamplesButton).onClick(async () => {
					await this.plugin.createSamples();
					new Notice(s.settings.createSamplesNotice);
				})
			);

		const dice = hasRollerPlugin(this.app);
		new Setting(containerEl)
			.setName(s.settings.diceRollerName)
			.setDesc(dice ? s.settings.diceRollerFound : s.settings.diceRollerNotFound);

		containerEl.createEl("h3", { text: s.settings.usageHeading });
		containerEl.createEl("p", { text: s.settings.usageIntro });
		const usage = containerEl.createEl("pre");
		usage.createEl("code", { text: USAGE_EXAMPLE[this.plugin.settings.language] });
		containerEl.createEl("p", { text: s.settings.usageExtraFields });
		containerEl.createEl("p", { text: s.settings.usageCharacterCommand });
		containerEl.createEl("p", { text: s.settings.usagePerTypeCommands });
	}
}
