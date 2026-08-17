import {
	App,
	TFile,
} from "obsidian";
import { CairnType, DATA_TYPES, TYPES, RollTableEntry } from "./types";
import type { CairnSettings } from "./settings";
import { normalize } from "./utils";
import { BUILTIN_CATALOGS, BUILTIN_ROLL_TABLES } from "./data";


export interface CairnEntry {
	type: CairnType;
	name: string;
	file: TFile | null; // null = entrada incorporada, sin nota propia
	frontmatter: Record<string, unknown>;
	description: string; // solo se usa para entradas incorporadas (sin archivo)
	aliases: string[];
	source: "builtin" | "vault";
}

export interface BuiltinRaw {
	name: string;
	description?: string;
	aliases?: string[];
	[key: string]: unknown;
}

export class CairnIndex {
    entries: Record<CairnType, Map<string, CairnEntry>> = {
        object: new Map(),
        skill: new Map(),
        spell: new Map(),
        npc: new Map(),
        monster: new Map(),
        background: new Map(),
        hireling: new Map(),
        bond: new Map(),
        omen: new Map(),
        character: new Map(),
    };

    builtin: Record<Exclude<CairnType, "character">, BuiltinRaw[]> = {
        object: [],
        skill: [],
        spell: [],
        npc: [],
        monster: [],
        background: [],
        hireling: [],
        bond: [],
        omen: [],
    };

    scars: RollTableEntry[] = [];
    dungeonEvents: RollTableEntry[] = [];
    wildernessEvents: RollTableEntry[] = [];

    constructor(private app: App, private settings: CairnSettings) {}

    clear() {
        for (const t of TYPES) this.entries[t].clear();
    }

    private loadBuiltinData() {
        const lang = this.settings.language;
        const catalogs = BUILTIN_CATALOGS[lang] ?? BUILTIN_CATALOGS.en;
        for (const t of DATA_TYPES) this.builtin[t] = catalogs[t];

        const rollTables = BUILTIN_ROLL_TABLES[lang] ?? BUILTIN_ROLL_TABLES.en;
        this.scars = rollTables.scars;
        this.dungeonEvents = rollTables.dungeonEvents;
        this.wildernessEvents = rollTables.wildernessEvents;
    }

    rebuild() {
        this.loadBuiltinData();
        this.clear();

        for (const t of DATA_TYPES) {
            for (const raw of this.builtin[t]) {
                if (!raw || typeof raw.name !== "string" || !raw.name.trim()) continue;
                const { name, description, aliases, ...rest } = raw;
                const entry: CairnEntry = {
                    type: t,
                    name,
                    file: null,
                    frontmatter: rest,
                    description: typeof description === "string" ? description : "",
                    aliases: Array.isArray(aliases) ? aliases.map(String) : [],
                    source: "builtin",
                };
                this.entries[t].set(normalize(name), entry);
                for (const a of entry.aliases) this.entries[t].set(normalize(a), entry);
            }
        }

        const files = this.app.vault.getMarkdownFiles();
        for (const file of files) {
            const cache = this.app.metadataCache.getFileCache(file);
            const fm = (cache?.frontmatter ?? {}) as Record<string, unknown>;

            const fmType = fm["cairn_type"];
            if (typeof fmType !== "string" || !(TYPES as string[]).includes(fmType)) continue;
            const type = fmType as CairnType;

            const name = (typeof fm["name"] === "string" && fm["name"].trim()) || file.basename;
            const rawAliases = fm["aliases"];
            const aliases: string[] = Array.isArray(rawAliases)
                ? rawAliases.map(String)
                : typeof rawAliases === "string"
                ? [rawAliases]
                : [];

            const entry: CairnEntry = { type, name, file, frontmatter: fm, description: "", aliases, source: "vault" };
            this.entries[type].set(normalize(name), entry);
            for (const a of aliases) this.entries[type].set(normalize(a), entry);
        }
    }

    find(type: CairnType, name: string): CairnEntry | undefined {
        return this.entries[type].get(normalize(name));
    }

    list(type: CairnType): CairnEntry[] {
        const seen = new Set<CairnEntry>();
        const out: CairnEntry[] = [];
        for (const e of this.entries[type].values()) {
            if (!seen.has(e)) {
                seen.add(e);
                out.push(e);
            }
        }
        return out.sort((a, b) => a.name.localeCompare(b.name));
    }
}