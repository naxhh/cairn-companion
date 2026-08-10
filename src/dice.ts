import type { App } from "obsidian";

interface DiceRollerLike {
    getRoller: (
        formula: string,
        sourcePath?: string
    ) => Promise<{ roll: () => Promise<number | string>; containerEl?: HTMLElement }>;
}

export function hasRollerPlugin(app: App): boolean {
    const anyApp = app as unknown as { plugins?: { plugins?: Record<string, unknown> } };
    const plug = anyApp.plugins?.plugins?.["obsidian-dice-roller"] as DiceRollerLike | undefined;
    return (plug && typeof plug.getRoller === "function") ? true : false;
}

function getDiceRollerApi(app: App): DiceRollerLike {
    const anyApp = app as unknown as { plugins?: { plugins?: Record<string, unknown> } };
    const plug = anyApp.plugins?.plugins?.["obsidian-dice-roller"] as DiceRollerLike | undefined;
    if (plug && typeof plug.getRoller === "function") return plug;
    return fallbackRoller;
}

// A simple fallback in case the dice roller plugin is not installed.
class FallbackDiceRoller implements DiceRollerLike {
    async getRoller(formula: string): Promise<{ roll: () => Promise<number | string>; containerEl?: HTMLElement }> {
        return {
            roll: async () => this.fallbackRoll(formula),
            containerEl: undefined,
        };
    }

    public fallbackRoll(formula: string): number {
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


export function extractDiceFormula(text: string): string | null {
    const m = text.match(/\d+d\d+(?:\s*\+\s*\d+d\d+)*(?:\s*[+-]\s*\d+)?/i);
    return m ? m[0].replace(/\s+/g, "") : null;
}

export async function doRoll(activePath: string, app: App, outputEl: HTMLElement, formula: string, label?: string) {
    outputEl.empty();
    outputEl.addClass("cairn-roll-output-active");
    const diceApi = getDiceRollerApi(app);
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
        console.error("Error rolling dice:", e);
    }
}

export async function rollSave(activePath: string, app: App, outputEl: HTMLElement, statValue: number, label: string) {
    outputEl.empty();
    outputEl.addClass("cairn-roll-output-active");
    const diceApi = getDiceRollerApi(app);
    let total: number;
    let diceEl: HTMLElement | null = null;
    const roller = await diceApi.getRoller("1d20", activePath);
    total = Number(await roller.roll());
    diceEl = roller.containerEl ?? null;
    const success = total === 1 || (total !== 20 && total <= statValue);
    outputEl.createSpan({ text: `${label}: `, cls: "cairn-roll-label" });
    if (diceEl) outputEl.appendChild(diceEl);
    else outputEl.createSpan({ text: String(total) });
    outputEl.createSpan({
        text: ` vs ${statValue} → ${success ? "✅ Éxito" : "❌ Fallo"}`,
        cls: success ? "cairn-success" : "cairn-fail",
    });
}