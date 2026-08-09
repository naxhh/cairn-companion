# Cairn Companion (Obsidian)

An unofficial plugin for running **Cairn 2e** campaigns in Obsidian.

Ships with the SRD catalog (text under CC BY-SA 4.0 by Yochai Gal,
cairnrpg.com): **300 objects** (weapons, armor, market items, background items, relics, etc), **8 spells**, all **85 monsters** from the bestiary of the Guardian's Guide, **20 backgrounds**, **12 hirelings**, **20 Bonds**, and
**20 Omens**, all in Spanish. 
*Extend* that catalog with your own notes anywhere in the vault.

Interactive character sheet (with instant updates), automatic mentions with hover previews, dice rolling (with support for the [Dice Roller](https://community.obsidian.md/plugins/obsidian-dice-roller) community plugin if installed), and quick tools for the Guardian.

## Table of contents

- [Installation](#installation)
- [Notes Embed](#notes-embed)
- [Commands](#commands)
- [Create examples](#create-examples)
- [Notes location](#notes-location)
- [Expected frontmatter per type](#expected-frontmatter-per-type)
- [Automatic mentions in text](#automatic-mentions-in-text)
- [Character sheet](#character-sheet)
- [Dice](#dice)
- [Guardian tools](#guardian-tools)
- [Troubleshooting](#troubleshooting)
- [Updating the plugin](#updating-the-plugin)
- [Development](#development)
- [License](#license)


## Installation

Copy the `dist/cairn-companion` folder (inside this package) to
`YourVault/.obsidian/plugins/cairn-companion/`.

Then, in Obsidian: Settings → Community plugins → enable "Cairn Companion".

_Want to modify the plugin or build it yourself? Check **[DEVELOPMENT.md](DEVELOPMENT.md)**_


## Notes Embed

You can embed any content using the `cairn` code block.
All blocks require a `type` and `name` property:

````
```cairn
type: object
name: "Long sword"
```
````

`type` accepts: `object`, `skill`, `spell`, `npc`, `monster`, `background`,
`hireling`, `bond`, `omen` and `character`. Plus the special `tools` (see
[Guardian tools](#guardian-tools)).

While you type inside the block, **both fields autocomplete** to ease your experience.

Any extra field inside the block, besides `type` and `name`, is parsed as
YAML and shown as "Session notes" without modifying
the original entry:

````
```cairn
type: npc
name: "Aldric the Merchant"
behavior: Friendly
notes: Lost his caravan in the Vado ambush
```
````

If the block can't find the entry, a button appears to create it. If `type` or `name` is missing, or the type doesn't exist, it shows a warning with the expected format instead of failing silently.


## Commands

The plugin offers commands for extra ease of usage. Use the Ctrl/Cmd+P command palette.

- **"Insertar referencia de Cairn"** ("Insert Cairn reference"): pick a
type, then search by name across everything indexed, and the full block is
inserted at the cursor.

-  There's a command **"Nuevo objeto"**, **"Nuevo PNJ"**, **"Nuevo monstruo"**,
**"Nuevo hechizo"**, **"Nuevo trasfondo"**, **"Nuevo seguidor"**, **"Nuevo
vínculo"**, **"Nuevo presagio"**, **"Nuevo rasgo o habilidad"**, and **"Nueva
ficha de personaje"**. Each one asks for a name
and creates the note in your default folder (Settings → "Default folder"), with:


## Create examples

Sometimes is easier to see how it works that to read this guide. For that go to the plugin settings and click "Create custom examples".

It will generate one sample note per type, plus an
already-filled-in character sheet and a note showing every block in action.
These are always created in the fixed `cairn-examples/` folder, regardless of
your "default folder" — so they're easy to delete all at once when you don't
need them anymore.

## Notes location

Notes are loaded into the index regardless of where they are placed in the vault.
Type detection is **always based on the `cairn_type` frontmatter property**.

Organize your vault however you like.

Your custom entries override the default provided ones by the plugin. Duplicated entries may override each other without a guaranteed order.

The "default folder" is a location to place the plugin created entries but doesn't restrict anything else.


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
Under the three there was a  "Gosthly light".
```

Hovering over it in **reading view** mode shows a floating summary card; clicking it opens the note if the entry has one, or a full preview with the same buttons as the block if it's a built-in entry.

By default only words with 6+ characters are used but is configurable.
It can also be disabled with the option "Automatically detect mentions"


## Character sheet

Provides two views, the full one by default and a small using `mode:small`.
Interactable sheet that store it's state on the character sheet.

Allows to remove characteristings, PG, track money and make notes.
Roll weapon attacks, saving throws. Automatically provides a scar if PG hits 0.
Manage the inventory space and insignificant objects.

## Dice

Any value with dice notation has a 🎲 button next to it (an object's damage,
a monster's attacks, a background's "3d6 gold", a character
sheet's Saving Throws, etc...).
Objects show an advantage roll button (**▲**) or disadvantage (**▼**)

Uses **Dice Roller** (`obsidian-dice-roller`) if installed or a less sophisticated custom implementation if not.


## Guardian tools

These are GM tools to help during a session.

It can be invoked through a command using the **"Herramientas del Guardián (Destino, Reacción, Clima, Eventos)"**
("Guardian tools: Fate, Reaction, Weather, Events").

Or embeded in a note (this is the only type that doesn't require a name)
````
```cairn
type: tools
```
````

It provides the following helpers:

- **Dado del Destino** ("Fate Die") (1d6)
- **Reacción de PNJ** ("NPC Reaction") (2d6 → Hostile / Cautious / Curious /
  Friendly / Helpful)
- **Clima** ("Weather"), by season (Spring / Summer / Fall / Winter)
- **Eventos en la Mazmorra** ("Dungeon Events") and **Eventos en Entornos
  Salvajes** ("Wilderness Events") (1d6)


For inspirationm a  **"Entrada aleatoria"** ("Random entry") command is also provided.
Pick a type and it shows you a random entry from that catalog (built-in and customs).

The entry can be re-rolled (🎲) or inserted into the current note (📋)


## Troubleshooting

**I can't find my notes / it can't find an entry I know exists.**
Check that the note has `cairn_type: <type>` in its frontmatter — being in a
specific folder isn't enough, detection is only based on that property. If you just
created or edited the note, try the "Reindex" command; automatic reindexing has a small delay (~0.5s) after each change.

**I changed something in Settings → Language and don't see the new catalog.**
Click "Reload built-in data" right below the language dropdown — the catalog is cached in memory and only re-read on Obsidian startup or when you change language from that dropdown itself (if you changed it another way, use that button).

**A `cairn` block shows a warning instead of the card.**
It's missing `type` or `name`, or `type` isn't one of the valid ones — the
warning itself tells you what's wrong.

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

## License

MIT for the plugin's code see [`LICENSE`](LICENSE).
CC-BY-SA 4.0 for Cairn 2e data see [data/LICENSE](data/LICENSE) file.