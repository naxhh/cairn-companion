import type { CairnStrings } from "./i18n";

interface DiceRollerRoller {
	// `render` triggers Dice Roller's animated 3D dice overlay for this roll.
	roll: (render?: boolean) => Promise<number | string>;
	containerEl?: HTMLElement;
}

interface DiceRollerApi {
	getRoller: (formula: string, source?: string) => DiceRollerRoller | null;
}

declare global {
	interface Window {
		DiceRoller?: DiceRollerApi;
	}
}

export function hasRollerPlugin(): boolean {
	return typeof window.DiceRoller?.getRoller === "function";
}

// A simple fallback in case the dice roller plugin is not installed.
class FallbackDiceRoller {
	roll(formula: string): number {
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
}
export const fallbackRoller: FallbackDiceRoller = new FallbackDiceRoller();

function getRoller(formula: string): DiceRollerRoller {
	const roller = window.DiceRoller?.getRoller(formula);
	if (roller) return roller;
	return { roll: () => Promise.resolve(fallbackRoller.roll(formula)) };
}

export function extractDiceFormula(text: string): string | null {
	const m = text.match(/\d+d\d+(?:\s*\+\s*\d+d\d+)*(?:\s*[+-]\s*\d+)?/i);
	return m ? m[0].replace(/\s+/g, "") : null;
}

export async function doRoll(outputEl: HTMLElement, formula: string, label?: string, graphical = false) {
	outputEl.empty();
	outputEl.addClass("cairn-roll-output-active");
	try {
		const roller = getRoller(formula);
		const total = await roller.roll(graphical);
		if (label) outputEl.createSpan({ text: `${label}: `, cls: "cairn-roll-label" });
		if (roller.containerEl) {
			outputEl.appendChild(roller.containerEl);
		} else {
			outputEl.createSpan({ text: `${formula} → ${total}` });
		}
	} catch (e) {
		console.error("Error rolling dice:", e);
	}
}

export async function rollSave(outputEl: HTMLElement, statValue: number, label: string, strings: CairnStrings, graphical = false) {
	outputEl.empty();
	outputEl.addClass("cairn-roll-output-active");
	const roller = getRoller("1d20");
	const total = Number(await roller.roll(graphical));
	const diceEl = roller.containerEl ?? null;
	const success = total === 1 || (total !== 20 && total <= statValue);
	outputEl.createSpan({ text: `${label}: `, cls: "cairn-roll-label" });
	if (diceEl) outputEl.appendChild(diceEl);
	else outputEl.createSpan({ text: String(total) });
	outputEl.createSpan({
		text: ` vs ${statValue} → ${success ? strings.dice.success : strings.dice.fail}`,
		cls: success ? "cairn-success" : "cairn-fail",
	});
}
