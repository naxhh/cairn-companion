import type { CairnType } from "./types";
import { TYPES } from "./types";
import { normalize } from "./utils";
import { createAutoLinkSpan } from "./render";
import type CairnPlugin from "./main";

/* -------------------------------------------------------------------------- */
/*  Automatic detection of mentions in text (links + preview)                */
/* -------------------------------------------------------------------------- */

interface AutoLinkTarget {
	type: CairnType;
	canonicalName: string;
}

/**
 * Builds a lookup of known entry names/aliases and turns matching mentions
 * in reading-view text into hover-preview links. All state (the match
 * regex and the name → entry map) is private to this class; the plugin
 * just calls rebuild() after reindexing and linkElement() from its
 * markdown post processor.
 */
export class CairnAutoLinker {
	private regex: RegExp | null = null;
	private map: Map<string, AutoLinkTarget> = new Map();

	constructor(private plugin: CairnPlugin) {}

	rebuild(): void {
		const minLen = Math.max(1, this.plugin.settings.autoLinkMinLength || 1);
		const map = new Map<string, AutoLinkTarget>();
		const names: string[] = [];
		for (const t of TYPES) {
			for (const entry of this.plugin.index.list(t)) {
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
		this.map = map;
		if (names.length === 0) {
			this.regex = null;
			return;
		}
		const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
		this.regex = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
	}

	linkElement(root: HTMLElement): void {
		if (!this.regex || this.map.size === 0) return;
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
			const regex = this.regex;
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
				const info = this.map.get(normalize(matched));
				if (info) {
					frag.appendChild(createAutoLinkSpan(this.plugin, matched, info.type, info.canonicalName));
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
}
