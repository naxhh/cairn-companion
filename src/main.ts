import {
	App,
	Editor,
	MarkdownPostProcessorContext,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	SettingDefinitionItem,
	TFile,
	normalizePath,
	stringifyYaml,
	getLanguage,
} from "obsidian";

import type { CairnType, RollTableEntry } from "./types";
import { DATA_TYPES, TYPES } from "./types";

import type { CairnSettings, Language } from "./settings";
import { DEFAULT_SETTINGS } from "./settings";

import { CairnIndex, CairnEntry, BuiltinRaw } from "./indexer";
import { hasRollerPlugin } from "./dice";
import { cairnMarkdownBlockProcessor, ParsedCairnBlock } from "./block";
import { GuardianToolsModal, GuardianEventTables } from "./guardian";
import { normalize } from "./utils";
import type { CairnStrings } from "./i18n";
import { getStrings } from "./i18n";
import { renderEntryCard, templatesFor, CairnFieldSuggest, inventoryOf } from "./render";
import { TypePickerModal, TextInputModal, RandomEntryModal } from "./modals";
import { createSamples as createExampleNotes } from "./examples";
import { CairnAutoLinker } from "./autolink";

function pluginDir(plugin: CairnPlugin): string {
	return plugin.manifest.dir ?? `${plugin.app.vault.configDir}/plugins/${plugin.manifest.id}`;
}

export default class CairnPlugin extends Plugin {
	settings: CairnSettings;
	index: CairnIndex;
	private reindexTimer: number | null = null;
	private autoLinker: CairnAutoLinker = new CairnAutoLinker(this);
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

			void renderEntryCard(this, el, parsed.type, parsed.name, parsed.overrides);
		});

		// Detects mentions of known names in plain text (reading view) and
		// turns them into links with a hover preview.
		this.registerMarkdownPostProcessor((el) => {
			if (!this.settings.autoLink) return;
			this.autoLinker.linkElement(el);
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
		this.autoLinker.rebuild();
	}

	async readDataFile(lang: string, type: Exclude<CairnType, "character">): Promise<BuiltinRaw[] | null> {
		const path = normalizePath(`${pluginDir(this)}/data/${lang}/${type}s.json`);
		try {
			const exists = await this.app.vault.adapter.exists(path);
			if (!exists) return null;
			const raw = await this.app.vault.adapter.read(path);
			const parsed: unknown = JSON.parse(raw);
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
			const parsed: unknown = JSON.parse(raw);
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
			if (!data && lang !== "en") {
				// Default to EN data if the language is not supported.
				data = await this.readRollTable("en", filename);
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
		await this.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
			fm[key] = value;
		});
	}

	async addToList(file: TFile, field: "inventory" | "insignificant", itemName: string) {
		await this.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
			const list = inventoryOf(fm, field);
			const existing = list.find((i) => normalize(i.name) === normalize(itemName));
			if (existing) existing.qty += 1;
			else list.push({ name: itemName, qty: 1 });
			fm[field] = list;
		});
	}

	async changeListQty(file: TFile, field: "inventory" | "insignificant", itemName: string, delta: number) {
		await this.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
			let list = inventoryOf(fm, field);
			const idx = list.findIndex((i) => normalize(i.name) === normalize(itemName));
			if (idx >= 0) {
				list[idx].qty += delta;
				if (list[idx].qty <= 0) list = list.filter((_, i) => i !== idx);
			}
			fm[field] = list;
		});
	}

	async createSamples(): Promise<void> {
		return createExampleNotes(this);
	}

	async loadSettings() {
		const loaded = ((await this.loadData()) ?? {}) as Partial<CairnSettings>;
		// No language saved yet (first run): default to the Obsidian UI
		// language when supported, otherwise English.
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

	// Declarative settings API (Obsidian 1.13.0+): lets the in-app settings
	// search find these controls. display() below stays as-is — it's the
	// required fallback for the 1.10.0–1.12.x range this plugin still
	// supports, since getSettingDefinitions() only exists from 1.13.0 on.
	getSettingDefinitions(): SettingDefinitionItem[] {
		const s = this.plugin.strings();
		const dice = hasRollerPlugin(this.app);

		return [
			{
				name: s.settings.languageName,
				desc: s.settings.languageDesc,
				control: {
					type: "dropdown",
					key: "language",
					options: { es: s.settings.languageEs, en: s.settings.languageEn },
				},
			},
			{
				name: s.settings.defaultFolderName,
				desc: s.settings.defaultFolderDesc,
				control: {
					type: "text",
					key: "defaultFolder",
					placeholder: DEFAULT_SETTINGS.defaultFolder,
					validate: (value) => (value.trim() ? undefined : s.settings.defaultFolderName),
				},
			},
			{
				name: s.settings.autoLinkName,
				desc: s.settings.autoLinkDesc,
				control: { type: "toggle", key: "autoLink" },
			},
			{
				name: s.settings.minLengthName,
				desc: s.settings.minLengthDesc,
				control: {
					type: "number",
					key: "autoLinkMinLength",
					min: 1,
					step: 1,
					validate: (value) => (Number.isFinite(value) && value > 0 ? undefined : s.settings.minLengthName),
				},
			},
			{
				name: s.settings.autoReindexName,
				desc: s.settings.autoReindexDesc,
				control: { type: "toggle", key: "autoReindex" },
			},
			{
				name: s.settings.reindexNowName,
				render: (setting) => {
					setting.addButton((b) =>
						b.setButtonText(s.settings.reindexButton).onClick(() => {
							this.plugin.reindex();
							new Notice(s.settings.reindexNotice(this.plugin.countEntries()));
						})
					);
				},
			},
			{
				name: s.settings.reloadDataName,
				desc: s.settings.reloadDataDesc,
				render: (setting) => {
					setting.addButton((b) =>
						b.setButtonText(s.settings.reloadButton).onClick(async () => {
							await this.plugin.loadBuiltinData();
							this.plugin.reindex();
							new Notice(s.settings.reloadNotice(this.plugin.countEntries()));
						})
					);
				},
			},
			{
				name: s.settings.createSamplesName,
				desc: s.settings.createSamplesDesc,
				render: (setting) => {
					setting.addButton((b) =>
						b.setButtonText(s.settings.createSamplesButton).onClick(async () => {
							await this.plugin.createSamples();
							new Notice(s.settings.createSamplesNotice);
						})
					);
				},
			},
			{
				name: s.settings.diceRollerName,
				desc: dice ? s.settings.diceRollerFound : s.settings.diceRollerNotFound,
			},
			{
				name: s.settings.usageHeading,
				desc:
					s.settings.usageIntro + "\n\n" +
					USAGE_EXAMPLE[this.plugin.settings.language] + "\n\n" +
					s.settings.usageExtraFields + "\n\n" +
					s.settings.usageCommands,
			},
		];
	}

	setControlValue(key: string, value: unknown): void | Promise<void> {
		return (async () => {
			await super.setControlValue(key, value);
			await this.plugin.saveSettings();
			if (key === "language") {
				await this.plugin.loadBuiltinData();
				this.plugin.reindex();
				this.update();
			}
		})();
	}

	display(): void {
		const { containerEl } = this;
		const s = this.plugin.strings();

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

	
		new Setting(containerEl)
			.setName(s.settings.usageHeading)
			.setDesc(
				s.settings.usageIntro + "\n\n" +
				USAGE_EXAMPLE[this.plugin.settings.language] + "\n\n" +
				s.settings.usageExtraFields + "\n\n" +
				s.settings.usageCommands
			);
	}
}
