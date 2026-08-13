import { App, Editor, FuzzySuggestModal, MarkdownView, Modal, Notice } from "obsidian";

import type { CairnType } from "./types";
import { TYPE_ICONS, TYPES } from "./types";
import type { CairnStrings } from "./i18n";
import { renderEntryCard } from "./render";
import type CairnPlugin from "./main";

/* -------------------------------------------------------------------------- */
/*  Modals                                                                    */
/* -------------------------------------------------------------------------- */

export class NamePickerModal extends FuzzySuggestModal<string> {
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

export class TypePickerModal extends FuzzySuggestModal<CairnType | "tools"> {
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

export class TextInputModal extends Modal {
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

export class EntryPreviewModal extends Modal {
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

export function getActiveEditor(app: App): Editor | null {
	const workspaceAny = app.workspace as unknown as { activeEditor?: { editor?: Editor } };
	if (workspaceAny.activeEditor?.editor) return workspaceAny.activeEditor.editor;
	const view = app.workspace.getActiveViewOfType(MarkdownView);
	return view?.editor ?? null;
}

export class RandomEntryResultModal extends Modal {
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

export class RandomEntryModal extends FuzzySuggestModal<CairnType> {
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
