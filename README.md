# Cairn Companion (Obsidian)

An unofficial plugin for running **Cairn 2e** campaigns in Obsidian.

> **Note on language:** the plugin's UI, commands, and bundled data are in
> **Spanish** (it follows the Spanish translation of Cairn 2e). This README
> is in English for documentation purposes, but command names and button
> labels are quoted exactly as they appear in Obsidian, in Spanish, so you
> can find them. An English data pack is possible in the future — see
> [Built-in data vs. your own notes](#built-in-data-vs-your-own-notes).

Ships with the SRD catalog (text under CC BY-SA 4.0 by Yochai Gal,
es.cairnrpg.com): **300 objects** (weapons, armor, Market items, and ~220
unique objects hidden in each background's tables — including each
background's starting gear, not just the bonus tables — with Relics properly
tagged), **8 spells**, **85 monsters** (the complete bestiary from the
Guardian's Guide), **20 backgrounds**, **12 hirelings**, **20 Bonds**, and
**20 Omens**, all in Spanish. You can *extend* that catalog with your own
notes anywhere in the vault: any note with the `cairn_type` property gets
added, and if it uses the same name as a built-in entry, it overrides it.

It also includes an interactive character sheet (with instant updates),
automatic mentions with hover previews as you write prose, dice rolling
(with support for the "Dice Roller" community plugin if installed), and
quick tools for the Guardian.

## Table of contents

- [Requirements](#requirements)
- [Installation](#installation)
- [One block, two required fields](#one-block-two-required-fields)
- [Commands to create each type](#commands-to-create-each-type)
- [Where your notes live: anywhere](#where-your-notes-live-anywhere)
- [Built-in data vs. your own notes](#built-in-data-vs-your-own-notes)
- [Expected frontmatter per type](#expected-frontmatter-per-type)
- [Automatic mentions in text](#automatic-mentions-in-text)
- [Character sheet](#character-sheet)
- [Dice](#dice)
- [Scars table](#scars-table)
- [Guardian tools](#guardian-tools)
- [Random entry](#random-entry)
- [All commands, at a glance](#all-commands-at-a-glance)
- [Reindexing](#reindexing)
- [Troubleshooting](#troubleshooting)
- [Updating the plugin](#updating-the-plugin)
- [Development](#development)
- [License](#license)

## Requirements

- Obsidian **1.4.0** or later.
- Built and tested on **desktop** (Windows/Mac/Linux). Not tested on
  Obsidian mobile — something like the hover tooltip for automatic mentions
  (designed for a mouse) may not translate well to touch.
- Nothing else — it doesn't depend on any other plugin. If you have **Dice
  Roller** installed, it's used automatically for rolls; if not, it works
  the same with a built-in dice generator.

## Installation

Copy the `dist/cairn-companion` folder (inside this package) to
`YourVault/.obsidian/plugins/cairn-companion/`. It's already built and
includes the data — you don't need Node.

Then, in Obsidian: Settings → Community plugins → enable "Cairn Companion".

Want to modify the plugin or build it yourself? That's all in
**[DEVELOPMENT.md](DEVELOPMENT.md)** (dev environment, code structure, how
to add a new type, how to publish a release).

## One block, two required fields

Everything goes through the same code block type: `cairn`, with `type` and
`name` as required fields inside it:

````
```cairn
type: object
name: "Espada larga"
```
````

`type` accepts: `object`, `skill`, `spell`, `npc`, `monster`, `background`,
`hireling`, `bond`, `omen`, `character` (plus the special `tools`, see
[Guardian tools](#guardian-tools)).

While you type inside the block, **both fields autocomplete**: typing
`type:` shows the list of valid types; typing `name:` shows the list of
already-indexed entries of that type (built-in + yours).

Any extra field inside the block, besides `type` and `name`, is parsed as
YAML and shown as "Session notes" ("Notas de la partida") without modifying
the original entry:

```cairn
type: npc
name: "Aldric el Comerciante"
actitud: Hostil
notas: Perdió la caravana en la Emboscada del Vado
```

If the block can't find the entry, a button appears to create it in the
right folder. If `type` or `name` is missing, or the type doesn't exist, it
shows a warning with the expected format instead of failing silently.

Command **"Insertar referencia de Cairn"** ("Insert Cairn reference"): pick a
type, then search by name across everything indexed, and the full block is
inserted at the cursor.

## Commands to create each type

There's a command **"Nuevo objeto"**, **"Nuevo PNJ"**, **"Nuevo monstruo"**,
**"Nuevo hechizo"**, **"Nuevo trasfondo"**, **"Nuevo seguidor"**, **"Nuevo
vínculo"**, **"Nuevo presagio"**, **"Nuevo rasgo o habilidad"**, and **"Nueva
ficha de personaje"** (command palette, Ctrl/Cmd+P). Each one asks for a name
and creates the note in your default folder (Settings → "Carpeta por
defecto" / "Default folder"), with:

- The full frontmatter for that type, with **every property empty**
  (ready to fill in).
- A heading and, below it, the `cairn` block already written with the
  correct `type` and `name` — copy and paste it into any other note to
  reference this entry.

The "Crear ejemplos personalizados" ("Create custom examples") button
(Settings → Cairn Companion) generates one sample note per type, plus an
already-filled-in character sheet and a note showing every block in action.
These are always created in the fixed `cairn-ejemplos/` folder, regardless of
your "default folder" — so they're easy to delete all at once when you don't
need them anymore.

## Where your notes live: anywhere

Type detection is **always based on the `cairn_type` frontmatter property**,
never on the folder. Organize your vault however you like, for example:

```
_db/Objetos/Espada larga.md          (cairn_type: object)
_db/Monstruos/Lobo.md                (cairn_type: monster)
Campaña/Personajes/Aldric.md         (cairn_type: character)
Campaña/Facción 1/PNJ/Tesorero.md    (cairn_type: npc)
```

All of these get indexed the same way, wherever they are. Settings only has
**one** configurable folder ("Carpeta por defecto" / "default folder"), with
no per-type distinction: it's the destination when the plugin itself creates
a note for you (the "Crear nota" button, the "Nuevo objeto" / "Nuevo PNJ" /
etc. commands, "Crear copia editable"...). It doesn't restrict anything —
you can move those notes wherever you want afterward, or create them
directly wherever's convenient without going through the plugin; they'll
still be detected as long as they keep their `cairn_type`.

This is deliberate, to fit a "reusable catalog in `_db/` + campaign-specific
content in `Campaña/...`" pattern: both blend into the same index with no
friction. Built-in entries always lose to any of your own notes with the
same name, regardless of folder. One caveat: avoid having two of *your own*
notes with the same `cairn_type` and the same `name` — the order between
them isn't guaranteed, so which one "wins" would be unpredictable.

## Built-in data vs. your own notes

- Settings → Cairn Companion → pick the **language** (Spanish by default;
  English is wired up but has no data yet).
- Built-in data lives in `data/<language>/*.json` inside the plugin folder
  (not in your vault). You can edit it by hand or add your own `data/en/`
  with the same structure, then click "Recargar datos incorporados"
  ("Reload built-in data").
- **skills.json** and **npcs.json** ship empty on purpose: the SRD doesn't
  include NPC lists or "traits" as standalone, reusable entries.
- **Relics**: objects with limited uses and a recharge condition carry the
  `Reliquia` ("Relic") quality tag and a `recharge` field with that condition
  (e.g. "Anillo felino", "Dedo dorado"). They're not spellbooks (`spell`
  type) and don't cost Fatigue.
- **Scrolls**: the "Pergamino" entry in the catalog is the mundane item from
  the Market table (blank paper). The SRD doesn't define magic scrolls with
  a fixed effect — they're generative — so you should create those yourself
  as an `object` with the `Reliquia` quality whenever the Guardian decides
  their effect during play.
- Every built-in card shows a **"Crear copia editable en mi carpeta"**
  ("Create an editable copy in my folder") button: it generates a note of
  yours with the same data. Since it shares the name, it automatically
  overrides the built-in version.

## Expected frontmatter per type

| Type | Fields |
|---|---|
| `object` | `damage`, `armor`, `cost`, `slot`, `quality` (list), `uses`, `recharge` |
| `skill` | `category` |
| `spell` | `cost` |
| `npc` | `role`, `location`, `fue`, `des`, `vol`, `pg`, `armor`, `attitude` |
| `monster` | `fue`, `des`, `vol`, `pg`, `armor`, `attacks` (list), `moral`, `abilities` (list) |
| `background` | `gear` (list) |
| `hireling` | `cost` (per day), `role` |
| `bond` | (description only) |
| `omen` | (description only) |
| `character` | see [Character sheet](#character-sheet) below |

The body of your own note (everything after the frontmatter) is used as the
description and rendered as normal markdown inside the card.

## Automatic mentions in text

If you type the name of a catalog entry inside a normal sentence:

```
Debajo del árbol encuentran el hechizo "Luz fantasma".
```

Hovering over it shows a floating summary card; clicking it opens the note
if the entry has one, or a full preview with the same buttons as the block
if it's a built-in entry.

- Only works in **reading view**, not while editing (supporting editing too
  would require a separate CodeMirror extension).
- Single-word names are only linked once they reach a configurable minimum
  length (6 characters by default), so common Spanish words ("Red", "Vara",
  "Daga") don't turn into links everywhere. Multi-word names are always
  detected in full.
- Can be turned off in Settings → "Detectar menciones automáticamente"
  ("Automatically detect mentions").

## Character sheet

Command **"Nueva ficha de personaje"** ("New character sheet"): asks for a
name and creates a note with an interactive sheet already inserted. From
reading view you can:

- Edit FUE / DES / VOL ("STR/DEX/WIL", current and max) and PG ("HP",
  current and max).
- Roll a Saving Throw for each characteristic (d20 ≤ characteristic; 1 =
  automatic success, 20 = automatic failure).
- Apply damage (if PG hits 0, it shows the Scars table result right away) or
  rest (PG to max).
- Add objects to the **Inventario** ("Inventory") by searching the catalog,
  with +/− for quantity and a slot count: each line counts as one slot (2 if
  Voluminoso/"Bulky"), regardless of quantity — a "Lata de aceite (6 usos)"
  ("oil can, 6 uses") takes one slot, not six.
- A separate **Objetos insignificantes** ("Insignificant items") section,
  with the same add/remove/roll-damage mechanics, but that never counts
  toward the 10 slots — meant for amulets, letters, loose coins, and
  anything else the manual marks as Insignificante.
- Note armor, gold, age, and quick notes.

Every button updates the sheet **instantly** (without waiting for Obsidian
to re-read the file) and saves the change to the note's frontmatter in the
background, so you can keep rolling dice or adding objects without the
sheet "jumping" or staying stale until it refreshes.

### Compact version (`mode: small`)

For a quick-reference card instead of the full sheet (for example, to show
the whole party inside a session note), add `mode: small` to the block:

```cairn
type: character
name: "Ejemplo de personaje"
mode: small
```

Shows only name, background, FUE/DES/VOL (current value, not max), PG, and
Armor — no buttons or editable fields, meant to be read at a glance. You can
also set `mode: small` in the character note's own frontmatter if you want
that to be its default appearance everywhere you reference it (the block's
`mode`, if you set one, overrides the note's).

## Dice

Any value with dice notation has a 🎲 button next to it (an object's damage,
a monster's attacks, a background's "3d6 monedas de oro", a character
sheet's Saving Throws).

- If you have the community plugin **Dice Roller** (`obsidian-dice-roller`)
  installed and enabled, Cairn Companion uses it automatically.
- If not, it falls back to its own random number generator.

For object damage and monster attacks, next to the 🎲 there are two more
buttons: **▲** (Advantage: rolls 1d12 instead of the weapon's die) and **▼**
(Disadvantage: rolls 1d4), matching the Basic Combat Rules.

## Scars table

When you apply damage in the character sheet and PG hits exactly 0, the
Scars table result (based on how much PG you lost in that hit) appears
automatically below the sheet — no need to go look it up in the book.

## Guardian tools

Command **"Herramientas del Guardián (Destino, Reacción, Clima, Eventos)"**
("Guardian tools: Fate, Reaction, Weather, Events"): opens a panel with
buttons for quick table rolls that don't depend on any specific note:

- **Dado del Destino** ("Fate Die") (1d6)
- **Reacción de PNJ** ("NPC Reaction") (2d6 → Hostile / Cautious / Curious /
  Friendly / Helpful)
- **Clima** ("Weather"), by season (Spring / Summer / Fall / Winter)
- **Eventos en la Mazmorra** ("Dungeon Events") and **Eventos en Entornos
  Salvajes** ("Wilderness Events") (1d6)

The panel stays open so you can roll several times in a row without
reopening the command palette each time.

You can also leave the same panel embedded in a note (handy if you keep your
session log in Obsidian):

```cairn
type: tools
```

It's the only type that doesn't take a `name` — it's not a catalog entry,
it's a utility panel.

## Random entry

Command **"Entrada aleatoria"** ("Random entry"): pick a type and it shows
you a random entry from that catalog (built-in or yours) in a window with
two buttons:

- **🎲 Otra entrada de este tipo** ("Another entry of this type") — rerolls
  without closing the window.
- **📋 Insertar en el documento** ("Insert into the document") — inserts that
  entry's `cairn` block at the cursor of whichever note you have open in
  edit mode.

## All commands, at a glance

All from the command palette (Ctrl/Cmd+P), searching "Cairn" or the command
name:

| Command | What it does |
|---|---|
| Nuevo objeto / Nuevo rasgo o habilidad / Nuevo hechizo / Nuevo PNJ / Nuevo monstruo / Nuevo trasfondo / Nuevo seguidor / Nuevo vínculo / Nuevo presagio | Creates a note of that type with empty properties and the `cairn` block already written |
| Nueva ficha de personaje | Creates a character note with the interactive sheet already inserted |
| Insertar referencia de Cairn | Searches the whole catalog (or "tools") and inserts the block at the cursor |
| Entrada aleatoria | Pick a type → random entry, with buttons to insert it or reroll |
| Herramientas del Guardián | Panel for Fate Die / Reaction / Weather / Events |
| Reindexar entradas de Cairn | Manually rebuilds the index |

## Reindexing

The index rebuilds itself whenever it detects changes in the vault. You can
also force it with the **"Reindexar entradas de Cairn"** command or the
button in Settings.

## Troubleshooting

**I can't find my notes / it can't find an entry I know exists.**
Check that the note has `cairn_type: <type>` in its frontmatter — being in a
specific folder isn't enough, detection is only based on that property (see
[Where your notes live](#where-your-notes-live-anywhere)). If you just
created or edited the note, try the "Reindexar entradas de Cairn" command;
automatic reindexing has a small delay (~0.5s) after each change.

**I changed something in Settings → Language and don't see the new catalog.**
Click "Recargar datos incorporados" ("Reload built-in data") right below the
language dropdown — the catalog is cached in memory and only re-read on
Obsidian startup or when you change language from that dropdown itself (if
you changed it another way, use that button).

**A `cairn` block shows a warning instead of the card.**
It's missing `type` or `name`, or `type` isn't one of the valid ones — the
warning itself tells you what's wrong. Check [the block
format](#one-block-two-required-fields) again.

**Automatic mentions are linking a word that shouldn't be a link.**
Raise the minimum length in Settings → "Longitud mínima para palabras
sueltas" ("Minimum length for single words"), or turn off "Detectar
menciones automáticamente" entirely if it's more noise than help.

**Character sheet buttons don't do anything / take a while to show up.**
Make sure you're in **reading view**, not edit/Live Preview mode — the
buttons are interactive HTML that only renders when reading the note, not
while editing it as plain text.

## Updating the plugin

If you installed it by copying the folder by hand (not from Obsidian's
Community Plugins list, since it isn't published there yet): download the
new version, replace the contents of
`YourVault/.obsidian/plugins/cairn-companion/` with the new
`dist/cairn-companion` folder, and restart Obsidian or disable/re-enable the
plugin. Your notes aren't affected — the built-in catalog and the code are
independent of whatever you've written.

## Development

See **[DEVELOPMENT.md](DEVELOPMENT.md)**: dev environment (includes a guide
for WSL2 + Hot Reload), code structure, how to add a new entry type, and how
to publish a release (includes the already-configured GitHub Actions
workflow).

## License

MIT for the plugin's code — see [`LICENSE`](LICENSE). The text and stats
from Cairn 2e (SRD) belong to Yochai Gal, under CC BY-SA 4.0
(es.cairnrpg.com) — the files in `data/es/` are a structured transcription
of that text for use inside the plugin, and that different license applies
only to them (see the note at the end of `LICENSE`).