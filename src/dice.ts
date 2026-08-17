import { App } from "obsidian";
import type { CairnStrings } from "./i18n";

/**
 * External dice roller API. Based on the TTRPG-Community dice-roller plugin
 */
interface DiceRollerProvider {
	getRoller(formula: string): DiceRollerApi;
}

interface DiceRollerApi {
	roll(render?: boolean): Promise<number | string>;
	rollSync(): number | string;
}

declare global {
	interface Window {
		DiceRoller?: DiceRollerProvider;
	}
}


export class DiceRoller {
	// TODO: listen to plugin enable/disable events
	private fallbackRoller: FallbackDiceRollerProvider = new FallbackDiceRollerProvider();
	private roller: DiceRollerProvider = this.hasRollerPlugin() ? window.DiceRoller!! : this.fallbackRoller;

	hasRollerPlugin(): boolean {
		return (typeof window.DiceRoller?.getRoller === 'function');
	}

	getCleanedFormula(formula: string): string {
		return cleanedFormula(formula);
	}

	rollAndGet(formula: string): number {
		const result = this.roller.getRoller(formula).rollSync();
		if (typeof result === 'string') {
			return parseInt(result);
		} else {
			return result;
		}
	}

	async roll(outputEl: HTMLElement, text: string, label?: string, graphical = false) {
		var formula = cleanedFormula(text);
		if (formula === "") {
			return;
		}

		outputEl.empty();
		outputEl.addClass("cairn-roll-output-active");
		
		try {
			const roller = this.roller.getRoller(formula);
			const total = await roller.roll(graphical);
			
			if (label) outputEl.createSpan({ text: `${label}: `, cls: "cairn-roll-label" });
			outputEl.createSpan({ text: `${formula} → ${total}` });
		} catch (e) {
			console.error("Error rolling dice:", e);
		}
	}

	async rollSave(outputEl: HTMLElement, statValue: number, label: string, strings: CairnStrings, graphical = false) {
		outputEl.empty();
		outputEl.addClass("cairn-roll-output-active");

		try {
			const roller = this.roller.getRoller("1d20");
			const total = Number(await roller.roll(graphical));
			const success = total === 1 || (total !== 20 && total <= statValue);
			
			outputEl.createSpan({ text: `${label}: `, cls: "cairn-roll-label" });
			outputEl.createSpan({ text: String(total) });
			outputEl.createSpan({
				text: ` vs ${statValue} → ${success ? strings.dice.success : strings.dice.fail}`,
				cls: success ? "cairn-success" : "cairn-fail",
			});
		} catch (e) {
			console.error("Error rolling save:", e);
		}
	}
}

// A simple fallback in case the dice roller plugin is not installed.
class FallbackDiceRollerProvider implements DiceRollerProvider {
	getRoller(formula: string): DiceRollerApi {
		return new FallbackDiceRoller(formula);
	}
}

class FallbackDiceRoller implements DiceRollerApi {
	// We assume the formula is always correct because the plugins also does so.
	constructor(private formula: string) {}

	rollSync(): number | string {
		const tokens = this.formula.match(/[+-]?[^+-]+/g) || [this.formula];
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

	roll(render?: boolean): Promise<number | string> {
		return Promise.resolve(this.rollSync());
	}
}

function cleanedFormula(formula: string): string {
	const m = formula.match(/\d+d\d+(?:\s*\+\s*\d+d\d+)*(?:\s*[+-]\s*\d+)?/i);
	return m ? m[0].replace(/\s+/g, "") : "";
}

