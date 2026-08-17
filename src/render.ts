import {
	App,
	Editor,
	EditorPosition,
	EditorSuggest,
	EditorSuggestContext,
	EditorSuggestTriggerInfo,
	MarkdownRenderer,
	Plugin,
	TFile,
} from "obsidian";

import type { CairnType, RollTableEntry } from "./types";
import { TYPE_ICONS, TYPES } from "./types";
import type { CairnEntry } from "./indexer";
import { normalize, asString } from "./utils";
import type { CairnStrings } from "./i18n";
import { NamePickerModal, EntryPreviewModal } from "./modals";
import type CairnPlugin from "./main";

/* -------------------------------------------------------------------------- */
/*  Field definitions & note templates                                       */
/* -------------------------------------------------------------------------- */

export interface FieldDef {
	key: string;
	label: string;
	format?: (v: unknown) => string;
}

function joinArr(v: unknown): string {
	return Array.isArray(v) ? v.join(", ") : String(v);
}

export function fieldDefsFor(s: CairnStrings): Record<CairnType, FieldDef[]> {
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

export function templatesFor(s: CairnStrings): Record<CairnType, (name: string) => string> {
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

export interface InventoryItem {
	name: string;
	qty: number;
}

export function inventoryOf(fm: Record<string, unknown>, field = "inventory"): InventoryItem[] {
	const raw = fm[field];
	if (!Array.isArray(raw)) return [];
	return raw.map((item) => {
		if (typeof item === "string") return { name: item, qty: 1 };
		if (item && typeof item === "object") {
			const o = item as Record<string, unknown>;
			return { name: typeof o.name === "string" ? o.name : "", qty: Number(o.qty ?? 1) || 1 };
		}
		return { name: String(item), qty: 1 };
	});
}

function computeSlots(plugin: CairnPlugin, inventory: InventoryItem[]): number {
	// Each inventory line takes up one slot (0 if Insignificant, 2 if
	// Bulky), regardless of quantity: "Oil can" with 6 uses is still a
	// single object, not 6.
	let total = 0;
	for (const item of inventory) {
		const objEntry = plugin.index.find("object", item.name);
		const quality = objEntry ? objEntry.frontmatter["quality"] : undefined;
		const qArr: string[] = Array.isArray(quality) ? quality.map((s) => String(s).toLowerCase()) : [];
		let perUnit = 1;
		if (qArr.some((q) => q.includes("insignificante") || q.includes("insignificant") || q.includes("petty"))) perUnit = 0;
		else if (qArr.some((q) => q.includes("voluminos") || q.includes("bulky"))) perUnit = 2;
		total += perUnit;
	}
	return total;
}

/* -------------------------------------------------------------------------- */
/*  Generic entry card rendering                                             */
/* -------------------------------------------------------------------------- */

function appendAdvantageButtons(
	el: HTMLElement,
	plugin: CairnPlugin,
	rollOutput: HTMLElement,
	label: string
) {
	const s = plugin.strings();
	const advBtn = el.createEl("button", {
		text: "▲",
		cls: "cairn-dice-btn cairn-dice-adv",
		attr: { "aria-label": s.dice.advantageAria },
	});
	advBtn.onclick = (ev: MouseEvent) => {
		ev.preventDefault();
		void plugin.diceRoller.roll(rollOutput, "1d12", `${label} ${s.dice.advantageSuffix}`, plugin.settings.graphicalDice)
	};
	const disBtn = el.createEl("button", {
		text: "▼",
		cls: "cairn-dice-btn cairn-dice-dis",
		attr: { "aria-label": s.dice.disadvantageAria },
	});
	disBtn.onclick = (ev: MouseEvent) => {
		ev.preventDefault();
		void plugin.diceRoller.roll(rollOutput, "1d4", `${label} ${s.dice.disadvantageSuffix}`, plugin.settings.graphicalDice);
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

	const formula = plugin.diceRoller.getCleanedFormula(text)
	if (formula === "") {
		return;
	}

	const label = text;
	const btn = el.createEl("button", {
		text: "🎲",
		cls: "cairn-dice-btn",
		attr: { "aria-label": s.dice.rollAria(formula) },
	});
	btn.onclick = (ev: MouseEvent) => {
		ev.preventDefault();
		void plugin.diceRoller.roll(rollOutput, text, label, plugin.settings.graphicalDice);
	};

	if (showAdvantage) appendAdvantageButtons(el, plugin, rollOutput, label);
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

export async function renderEntryCard(
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
		if (typeof background === "string" && background) {
			header.createEl("em", { text: background, cls: "cairn-character-background" });
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
			if (entry.file instanceof TFile) {
				void plugin.app.workspace.getLeaf(evt.ctrlKey || evt.metaKey).openFile(entry.file);
			}
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
		const mode = asString(overrides["mode"] ?? (freshFm as Record<string, unknown>)["mode"], "all").toLowerCase();
		if (mode === "small") {
			renderCharacterSmallCard(container, entry, freshFm, s);
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
		// Never re-render ```cairn blocks inside the description: this
		// prevents a card (e.g. a character sheet) from re-rendering itself
		// if its own body contains the block that generated it, which would
		// hang Obsidian in an infinite render loop.
		markdown = markdown.replace(/```cairn\b[\s\S]*?```/gi, "").trim();
		if (type === "character") {
			// The sheet has already been rendered above; the rest of the
			// note's body (background, long notes, etc.) can be read by
			// opening the note.
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
	} catch {
		/* if reading fails, the description is skipped */
	}
}

/* -------------------------------------------------------------------------- */
/*  Interactive character sheet (with instant updates)                       */
/* -------------------------------------------------------------------------- */

function statOrDash(v: unknown): string {
	return v === undefined || v === null || v === "" ? "—" : asString(v, "—");
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
				const dmg = objEntry.frontmatter["damage"];
				if (dmg) {
					const rollBtn = li.createEl("button", {
						text: "🎲",
						cls: "cairn-dice-btn",
						attr: { "aria-label": s.sheet.rollDamageAria },
					});
					rollBtn.onclick = () => plugin.diceRoller.roll(rollOutput, asString(dmg), item.name, plugin.settings.graphicalDice);
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
	pgCur.value = asString(fm.pg);
	pgCur.onchange = () => {
		const v = numOrEmpty(pgCur.value);
		fm.pg = v;
		void plugin.setCharField(file, "pg", v);
	};
	pgRow.createSpan({ text: "/" });
	const pgMax = pgRow.createEl("input", { type: "number", cls: "cairn-input-sm" });
	pgMax.value = asString(fm.pg_max);
	pgMax.onchange = () => {
		const v = numOrEmpty(pgMax.value);
		fm.pg_max = v;
		void plugin.setCharField(file, "pg_max", v);
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
		if (next === 0) renderScar(rollOutput, dmg, s, plugin.index.scars);
		await plugin.setCharField(file, "pg", next);
	};
	const restBtn = pgBox.createEl("button", { text: s.sheet.rest, cls: "cairn-rest-btn" });
	restBtn.onclick = async () => {
		const maxVal = fm.pg_max !== undefined && fm.pg_max !== "" ? fm.pg_max : fm.pg ?? "";
		fm.pg = maxVal;
		pgCur.value = asString(maxVal);
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
		cur.value = asString(fm[key]);
		cur.onchange = () => {
			const v = numOrEmpty(cur.value);
			fm[key] = v;
			void plugin.setCharField(file, key, v);
		};
		row.createSpan({ text: "/" });
		const max = row.createEl("input", { type: "number", cls: "cairn-input-sm" });
		const maxKey = `${key}_max`;
		max.value = asString(fm[maxKey]);
		max.onchange = () => {
			const v = numOrEmpty(max.value);
			fm[maxKey] = v;
			void plugin.setCharField(file, maxKey, v);
		};
		const rollBtn = box.createEl("button", { text: s.sheet.save, cls: "cairn-dice-btn" });
		rollBtn.onclick = () => plugin.diceRoller.rollSave(rollOutput, Number(fm[key] ?? 0) || 0, s.sheet.saveOf(label), s, plugin.settings.graphicalDice);
	}

	const miscRow = sheet.createDiv({ cls: "cairn-misc-row" });
	const armorWrap = miscRow.createDiv({ cls: "cairn-misc-field" });
	armorWrap.createEl("label", { text: s.sheet.armor });
	const armorInput = armorWrap.createEl("input", { type: "number", cls: "cairn-input-sm" });
	armorInput.value = asString(fm.armor);
	armorInput.onchange = () => {
		const v = numOrEmpty(armorInput.value);
		fm.armor = v;
		void plugin.setCharField(file, "armor", v);
	};

	const goldWrap = miscRow.createDiv({ cls: "cairn-misc-field" });
	goldWrap.createEl("label", { text: s.sheet.gold });
	const goldInput = goldWrap.createEl("input", { type: "number", cls: "cairn-input-sm" });
	goldInput.value = asString(fm.gold);
	goldInput.onchange = () => {
		const v = numOrEmpty(goldInput.value);
		fm.gold = v;
		void plugin.setCharField(file, "gold", v);
	};

	const ageWrap = miscRow.createDiv({ cls: "cairn-misc-field" });
	ageWrap.createEl("label", { text: s.sheet.age });
	const ageInput = ageWrap.createEl("input", { type: "text", cls: "cairn-input-sm" });
	ageInput.value = asString(fm.age);
	ageInput.onchange = () => {
		fm.age = ageInput.value;
		void plugin.setCharField(file, "age", ageInput.value);
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
	notesArea.value = asString(fm.notes);
	notesArea.onchange = () => {
		fm.notes = notesArea.value;
		void plugin.setCharField(file, "notes", notesArea.value);
	};
}

/* -------------------------------------------------------------------------- */
/*  Autocomplete for "type:" and "name:" inside a ```cairn block              */
/* -------------------------------------------------------------------------- */

interface CairnSuggestion {
	value: string;
	display: string;
}

export class CairnFieldSuggest extends EditorSuggest<CairnSuggestion> {
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
		const v = entry.frontmatter[f.key];
		if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) continue;
		const row = table.createEl("tr");
		row.createEl("th", { text: f.label });
		row.createEl("td", { text: f.format ? f.format(v) : asString(v) });
		shown++;
	}
	if (table.childElementCount === 0) table.remove();

	let desc = "";
	if (entry.file) {
		try {
			const raw = await plugin.app.vault.cachedRead(entry.file);
			desc = raw.replace(/^---\n[\s\S]*?\n---\n?/, "").trim();
		} catch {
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

export function createAutoLinkSpan(plugin: CairnPlugin, text: string, type: CairnType, canonicalName: string): HTMLElement {
	const span = createSpan({
		cls: "cairn-autolink",
		text,
		attr: { "data-cairn-type": type, "data-cairn-name": canonicalName },
	});

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
		showTimer = window.setTimeout(() => {
			void (async () => {
				removeTooltip();
				tooltipEl = document.body.createDiv({ cls: "cairn-tooltip" });
				await renderTooltipContent(plugin, tooltipEl, type, canonicalName);
				positionTooltip(tooltipEl, span);
			})();
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
			void plugin.app.workspace.getLeaf(ev.ctrlKey || ev.metaKey).openFile(entry.file);
		} else {
			new EntryPreviewModal(plugin.app, plugin, type, canonicalName).open();
		}
	});

	return span;
}
