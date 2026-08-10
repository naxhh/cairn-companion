
import { MarkdownPostProcessorContext, parseYaml } from "obsidian";
import { CairnType, TYPES } from "./types";
import { buildGuardianToolsUI } from "./guardian";

export function cairnMarkdownBlockProcessor(source: string, el: HTMLElement): ParsedCairnBlock | undefined {
			const parsed = parseCairnBlock(source);
			if (parsed.error || !parsed.type) {
				renderBlockError(el, parsed.error ?? "Error desconocido en el bloque.");
				return;
			}
			if (parsed.type === "tools") {
				buildGuardianToolsUI(el, true);
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
