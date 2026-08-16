import { App, Modal } from "obsidian";
import { fallbackRoller } from "./dice";
import type { CairnStrings } from "./i18n";
import type { RollTableEntry } from "./types";

export interface GuardianEventTables {
    dungeonEvents: RollTableEntry[];
    wildernessEvents: RollTableEntry[];
}

interface QuickRollResult {
    text: string;
}

function rollFateDie(strings: CairnStrings): QuickRollResult {
    const total = fallbackRoller.roll("1d6");
    const favorable = total >= 4;
    return {
        text: `${strings.guardianTools.fateDie}: ${total} → ${
            favorable ? strings.guardianTools.fateFavorable : strings.guardianTools.fateUnfavorable
        }`,
    };
}

function rollReaction(strings: CairnStrings): QuickRollResult {
    const total = fallbackRoller.roll("2d6");
    const labels = strings.guardianTools.reactionLabels;
    let label: string;
    if (total === 2) label = labels.hostile;
    else if (total <= 5) label = labels.cautious;
    else if (total <= 8) label = labels.curious;
    else if (total <= 11) label = labels.friendly;
    else label = labels.helpful;
    return { text: `${strings.guardianTools.reaction}: ${total} → ${label}` };
}

function rollFromTable(table: RollTableEntry[]): QuickRollResult {
    const total = fallbackRoller.roll("1d6");
    const { title, effect } = table[total - 1];
    return { text: `🎲 ${total} → ${title}: ${effect}` };
}

function rollWeather(season: string, strings: CairnStrings): QuickRollResult {
    const seasons = strings.guardianTools.seasons;
    const states = strings.guardianTools.weatherStates;
    const table: Record<string, string[]> = {
        [seasons.spring]: [states.pleasant, states.normal, states.normal, states.unpleasant, states.harsh, states.extreme],
        [seasons.summer]: [states.pleasant, states.pleasant, states.normal, states.unpleasant, states.harsh, states.extreme],
        [seasons.fall]: [states.normal, states.normal, states.unpleasant, states.harsh, states.harsh, states.extreme],
        [seasons.winter]: [states.normal, states.unpleasant, states.harsh, states.harsh, states.extreme, states.extreme],
    };
    const total = fallbackRoller.roll("1d6");
    const result = (table[season] ?? table[seasons.summer])[total - 1];
    const note = result === states.extreme ? strings.guardianTools.extremeNote : "";
    return { text: `${strings.guardianTools.weatherLabel} (${season}): ${total} → ${result}${note}` };
}

function addToolButton(container: HTMLElement, resultEl: HTMLElement, label: string, rollFn: () => QuickRollResult) {
    const btn = container.createEl("button", { text: label });
    btn.onclick = () => {
        resultEl.setText(rollFn().text);
    };
}


export class GuardianToolsModal extends Modal {
	constructor(app: App, private strings: CairnStrings, private tables: GuardianEventTables) {
		super(app);
	}
	onOpen() {
		buildGuardianToolsUI(this.contentEl, false, this.strings, this.tables);
	}
	onClose() {
		this.contentEl.empty();
	}
}

export function buildGuardianToolsUI(
    container: HTMLElement,
    asCard: boolean,
    strings: CairnStrings,
    tables: GuardianEventTables
) {
    container.empty();
    const gt = strings.guardianTools;
    if (asCard) {
        container.addClass("cairn-card", "cairn-tools-card");
        const header = container.createDiv({ cls: "cairn-card-header" });
        header.createSpan({ text: "🧰", cls: "cairn-icon" });
        header.createSpan({ text: gt.panelTitle, cls: "cairn-title" });
        header.createSpan({ text: gt.utilityBadge, cls: "cairn-type-badge" });
    } else {
        container.addClass("cairn-utility-modal");
        container.createEl("h3", { text: gt.panelTitle });
    }

    const resultEl = container.createDiv({ cls: "cairn-utility-result" });

    const row1 = container.createDiv({ cls: "cairn-utility-row" });
    addToolButton(row1, resultEl, gt.fateDie, () => rollFateDie(strings));
    addToolButton(row1, resultEl, gt.reaction, () => rollReaction(strings));

    container.createDiv({ cls: "cairn-utility-label", text: gt.weatherLabel });
    const row2 = container.createDiv({ cls: "cairn-utility-row" });
    for (const season of Object.values(gt.seasons)) {
        addToolButton(row2, resultEl, season, () => rollWeather(season, strings));
    }

    container.createDiv({ cls: "cairn-utility-label", text: gt.eventsLabel });
    const row3 = container.createDiv({ cls: "cairn-utility-row" });
    addToolButton(row3, resultEl, gt.dungeonEventsButton, () => rollFromTable(tables.dungeonEvents));
    addToolButton(row3, resultEl, gt.wildernessEventsButton, () => rollFromTable(tables.wildernessEvents));
}
