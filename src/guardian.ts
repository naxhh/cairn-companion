import { Modal } from "obsidian";
import { fallbackRoller } from "./dice";

interface QuickRollResult {
    text: string;
}

function rollDadoDelDestino(): QuickRollResult {
    const total = fallbackRoller.fallbackRoll("1d6");
    const favorable = total >= 4;
    return { text: `🎲 Dado del Destino: ${total} → ${favorable ? "Favorece a los PJ" : "Mala suerte para los PJ"}` };
}

function rollReaccion(): QuickRollResult {
    const total = fallbackRoller.fallbackRoll("2d6");
    let label: string;
    if (total === 2) label = "Hostil";
    else if (total <= 5) label = "Cauteloso";
    else if (total <= 8) label = "Curioso";
    else if (total <= 11) label = "Amable";
    else label = "Servicial";
    return { text: `🎲 Reacción: ${total} → ${label}` };
}

const EVENTOS_MAZMORRA: [string, string][] = [
    ["Encuentro", "Tira en una Tabla de Encuentros. Amenaza posiblemente hostil."],
    ["Señal", "Se descubre una pista, rastro, huella, guarida abandonada, olor, víctima, etc."],
    [
        "Ambiental",
        "El entorno cambia o algo que ya ocurre se intensifica (el agua sube, el techo se derrumba, un ritual se acerca a su fin...).",
    ],
    ["Pérdida", "Las antorchas se apagan, un hechizo activo se desvanece, etc. Hay que lidiar con ello antes de continuar."],
    [
        "Agotamiento",
        "El grupo se ve obligado a tomar un descanso corto (vuelve a tirar en esta tabla). Consume una ración o marca Fatiga.",
    ],
    ["Calma", "El grupo está solo (y a salvo) por ahora en la estancia o lugar donde se encuentran."],
];

const EVENTOS_SALVAJES: [string, string][] = [
    ["Encuentro", "Tira en una Tabla de Encuentros según el terreno y lugar (y la reacción del PNJ, si aplica)."],
    [
        "Señal",
        "El grupo descubre una pista, rastro o indicación de un encuentro cercano, localidad, característica oculta o información sobre un área cercana.",
    ],
    ["Ambiental", "Hay un cambio en el clima o el terreno."],
    [
        "Pérdida",
        "El grupo tiene que tomar una decisión que le costará un recurso (raciones, herramientas, etc.), tiempo o esfuerzo.",
    ],
    [
        "Agotamiento",
        "El grupo encuentra un gran obstáculo: más esfuerzo, atender heridas o sufrir un retraso. Pasa más tiempo (y otra Acción de Supervivencia) o añade Fatiga.",
    ],
    ["Descubrimiento", "El grupo encuentra comida, tesoro u otro recurso útil, o se revela la característica principal del área."],
];

function rollFromTable(table: [string, string][]): QuickRollResult {
    const total = fallbackRoller.fallbackRoll("1d6");
    const [title, desc] = table[total - 1];
    return { text: `🎲 ${total} → ${title}: ${desc}` };
}


const CLIMA_TABLE: Record<string, string[]> = {
	Primavera: ["Agradable", "Normal", "Normal", "Desagradable", "Inclemente", "Extremo"],
	Verano: ["Agradable", "Agradable", "Normal", "Desagradable", "Inclemente", "Extremo"],
	Otoño: ["Normal", "Normal", "Desagradable", "Inclemente", "Inclemente", "Extremo"],
	Invierno: ["Normal", "Desagradable", "Inclemente", "Inclemente", "Extremo", "Extremo"],
};

function rollClima(season: string): QuickRollResult {
	const total = fallbackRoller.fallbackRoll("1d6");
	const table = CLIMA_TABLE[season] ?? CLIMA_TABLE["Verano"];
	const result = table[total - 1];
	const note = result === "Extremo" ? " (si sale Extremo dos veces seguidas, se vuelve Catastrófico)" : "";
	return { text: `🎲 Clima de ${season}: ${total} → ${result}${note}` };
}

function addToolButton(container: HTMLElement, resultEl: HTMLElement, label: string, rollFn: () => QuickRollResult) {
    const btn = container.createEl("button", { text: label });
    btn.onclick = () => {
        resultEl.setText(rollFn().text);
    };
}


export class GuardianToolsModal extends Modal {
	onOpen() {
		buildGuardianToolsUI(this.contentEl, false);
	}
	onClose() {
		this.contentEl.empty();
	}
}

export function buildGuardianToolsUI(container: HTMLElement, asCard: boolean) {
    container.empty();
    if (asCard) {
        container.addClass("cairn-card", "cairn-tools-card");
        const header = container.createDiv({ cls: "cairn-card-header" });
        header.createSpan({ text: "🧰", cls: "cairn-icon" });
        header.createSpan({ text: "Herramientas del Guardián", cls: "cairn-title" });
        header.createSpan({ text: "Utilidad", cls: "cairn-type-badge" });
    } else {
        container.addClass("cairn-utility-modal");
        container.createEl("h3", { text: "Herramientas del Guardián" });
    }

    const resultEl = container.createDiv({ cls: "cairn-utility-result" });

    const row1 = container.createDiv({ cls: "cairn-utility-row" });
    addToolButton(row1, resultEl, "🎲 Dado del Destino", rollDadoDelDestino);
    addToolButton(row1, resultEl, "🎲 Reacción de PNJ", rollReaccion);

    container.createEl("div", { cls: "cairn-utility-label", text: "Clima" });
    const row2 = container.createDiv({ cls: "cairn-utility-row" });
    for (const season of Object.keys(CLIMA_TABLE)) {
        addToolButton(row2, resultEl, season, () => rollClima(season));
    }

    container.createEl("div", { cls: "cairn-utility-label", text: "Eventos" });
    const row3 = container.createDiv({ cls: "cairn-utility-row" });
    addToolButton(row3, resultEl, "🎲 En la Mazmorra", () => rollFromTable(EVENTOS_MAZMORRA));
    addToolButton(row3, resultEl, "🎲 En Entornos Salvajes", () => rollFromTable(EVENTOS_SALVAJES));
}