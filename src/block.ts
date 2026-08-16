
import { parseYaml } from "obsidian";
import { CairnType, TYPES } from "./types";
import { buildGuardianToolsUI, GuardianEventTables } from "./guardian";
import type { CairnStrings } from "./i18n";

export function cairnMarkdownBlockProcessor(
	source: string,
	el: HTMLElement,
	strings: CairnStrings,
	tables: GuardianEventTables
): ParsedCairnBlock | undefined {
			const parsed = parseCairnBlock(source, strings);
			if (parsed.error || !parsed.type) {
				renderBlockError(el, parsed.error ?? strings.errors.unknownBlockError, strings);
				return;
			}
			if (parsed.type === "tools") {
				buildGuardianToolsUI(el, true, strings, tables);
				return;
			}

            return parsed;
}

export interface ParsedCairnBlock {
	type: CairnType | "tools" | null;
	name: string;
	overrides: Record<string, unknown>;
	error?: string;
}

function parseCairnBlock(source: string, strings: CairnStrings): ParsedCairnBlock {
	let parsed: Record<string, unknown> = {};
	try {
		const y: unknown = parseYaml(source);
		if (y && typeof y === "object") parsed = y as Record<string, unknown>;
	} catch {
		return { type: null, name: "", overrides: {}, error: strings.errors.invalidYaml };
	}

	const rawType = parsed["type"];
	if (typeof rawType !== "string" || !rawType.trim()) {
		return { type: null, name: "", overrides: {}, error: strings.errors.missingType };
	}
	const type = rawType.trim().toLowerCase();

	// "tools" is a utility panel, not a catalog entry: it has no "name".
	if (type === "tools") {
		const { type: _t, ...overrides } = parsed;
		return { type: "tools", name: "", overrides };
	}

	const rawName = parsed["name"];
	if (typeof rawName !== "string" || !rawName.trim()) {
		return { type: null, name: "", overrides: {}, error: strings.errors.missingName };
	}
	if (!(TYPES as string[]).includes(type)) {
		return {
			type: null,
			name: "",
			overrides: {},
			error: strings.errors.unknownType(rawType, TYPES.join(", ")),
		};
	}

	const { type: _t, name: _n, ...overrides } = parsed;
	return { type: type as CairnType, name: rawName.trim(), overrides };
}

function renderBlockError(el: HTMLElement, message: string, strings: CairnStrings) {
	el.empty();
	el.addClass("cairn-card", "cairn-error-card");
	el.createDiv({ cls: "cairn-error", text: `⚠️ ${message}` });
	el.createDiv({
		cls: "cairn-error-hint",
		text: strings.errors.expectedFormatHint,
	});
}
