export type Language = "es" | "en";

export interface CairnSettings {
    language: Language;
    defaultFolder: string;
    autoReindex: boolean;
    autoLink: boolean;
    autoLinkMinLength: number;
    graphicalDice: boolean;
}

export const EXAMPLES_FOLDER = "cairn-examples";

export const DEFAULT_SETTINGS: CairnSettings = {
    language: "es", // TODO: set to EN once we have the data for it
    defaultFolder: "Cairn",
    autoReindex: true,
    autoLink: true,
    autoLinkMinLength: 6,
    graphicalDice: false,
};