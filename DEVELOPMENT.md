# Developing Cairn Companion

A guide for continuing to develop the plugin on your own: how to set up the
environment, how the code is organized, how to add new things, and how to
publish it.

## 1. Recommended dev environment

Obsidian is a desktop app (Electron): you need to see it in a local GUI. If
your usual workflow is a remote Linux VM over SSH, for *this* project it's
better to use **WSL2**, because:

- You can have Obsidian running on Windows while you edit code on Linux with
  your usual tools (VS Code → **Remote - WSL** extension instead of Remote -
  SSH to the VM).
- Obsidian's file watcher (a Windows `.exe`) works better watching files on
  the Windows filesystem than reaching into `\\wsl$\...`. The other way
  around (WSL writing to `/mnt/c/...`) works fine, and that's what we use
  here.

### 1.1. Test vault

Create a normal Obsidian vault on Windows, for example:

```
C:\Users\your_user\ObsidianVaults\CairnDev
```

Open it once in Obsidian so `.obsidian/` gets created.

### 1.2. Install "Hot Reload"

In that vault: Settings → Community plugins → search for **"Hot Reload"**
(by pjeby) → install and enable it. It watches `manifest.json`, `main.js`,
and `styles.css` for plugins in development (ones with an empty
`.hotreload` file in their folder, or simply all of them if they don't have
one — check the plugin's docs) and reloads them without you having to touch
anything in Obsidian.

For it to detect the plugin, create an empty `.hotreload` file inside
`.obsidian/plugins/cairn-companion/` once that folder exists (next step).

### 1.3. Build directly into the vault

From WSL, in the project folder:

```bash
export CAIRN_DEV_VAULT_PLUGIN_DIR="/mnt/c/Users/your_user/ObsidianVaults/CairnDev/.obsidian/plugins/cairn-companion"
npm install
npm run dev
```

`npm run dev` leaves **esbuild in watch mode**: every time you save a change
in `src/main.ts`, it recompiles and writes `main.js` (plus `manifest.json`
and `styles.css`, copied automatically) directly into that folder. No
symlinks, no manual steps — it's all normal `esbuild.config.mjs`, which
reads the environment variable.

Save that `export` in your `~/.bashrc` or `~/.zshrc` (or a `.env` you
source) so you don't have to type it every time. If the variable isn't set,
`npm run dev` builds in the project root instead (handy for when you don't
have a vault at hand).

### 1.4. The dev loop

1. Enable "Cairn Companion" in the test vault (Settings → Community plugins
   → enable it; the first time you'll have to do this by hand).
2. `npm run dev` running in a terminal.
3. Edit `src/main.ts` in VS Code (Remote - WSL), save.
4. esbuild recompiles (~200–500ms) → Hot Reload detects the change →
   Obsidian reloads the plugin on its own. No restart needed.
5. To debug: `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Opt+I` (Mac) inside
   Obsidian opens Chrome DevTools — `console.log`, breakpoints, DOM
   inspection, all normal.

Things Hot Reload does **not** reload automatically:
- Changes to `manifest.json` that affect `minAppVersion` or `id` — for
  those, disable and re-enable the plugin by hand, or restart Obsidian.
- Changes to `data/es/*.json` (the built-in catalog) — use the "Recargar
  datos incorporados" ("Reload built-in data") button in Settings → Cairn
  Companion, or the "Reindexar entradas de Cairn" command.

### 1.5. No vault at hand / just want to build

```bash
npm run build      # production build (minified) in the project root
npm run package     # build + packages dist/cairn-companion and cairn-companion.zip,
                     # same as what's distributed in releases
```

## 2. Project structure

```
src/main.ts             All of the plugin's code (a single file, see §3)
data/es/*.json           Built-in Spanish catalog (see §4)
manifest.json             Plugin metadata (id, version, minAppVersion...)
versions.json             Map of plugin version → compatible minAppVersion
styles.css                 Styles for cards, tooltips, character sheet...
esbuild.config.mjs        Build (see §1.3 for dev mode)
version-bump.mjs          Syncs manifest.json/versions.json on `npm version`
.github/workflows/release.yml   CI: build + GitHub release when a tag is pushed
```

There are no automated tests yet — everything is tested by hand in the dev
vault. If you add something with non-trivial logic (the `cairn` block
parser, the inventory-slot calculation...), consider extracting that
function into its own module and adding a test with `node --test`, but it's
not required for the current workflow.

## 3. How `src/main.ts` is organized

One large file, split into sections marked with `/* ---- */` comments. Top
to bottom:

1. **Entry types** (`CairnType`, `TYPE_LABELS`, `TYPE_ICONS`, `FIELD_DEFS`,
   `TEMPLATES`) — the "schema" for each type: which fields it has, how it's
   labeled, which template is used when creating a new note.
2. **Settings** (`CairnSettings`, `DEFAULT_SETTINGS`).
3. **Index** (`CairnIndex`) — merges the built-in JSON with vault notes that
   have `cairn_type` in their frontmatter. Rebuilt entirely on every
   `reindex()` (no incremental updates).
4. **Dice** (`getDiceRollerApi`, `fallbackRoll`, `doRoll`, `rollSave`) —
   integration with the Dice Roller community plugin + a built-in fallback
   generator.
5. **Parsing the `cairn` block** (`parseCairnBlock`) — YAML with `type` +
   `name` required (except `type: tools`, which has no `name`).
6. **Rendering the generic card** (`renderEntryCard`) — the central
   function: looks up the entry in the index, draws the header, the field
   table (via `FIELD_DEFS`), the description (the note's markdown body).
7. **Character sheet** (`renderCharacterSheet`, `renderCharacterSmallCard`,
   `buildInventorySection`) — the only part with live-editable state; it
   keeps a local copy of the data and updates the DOM instantly, saving to
   the frontmatter in the background (see §5 if you touch this).
8. **Modals** (`NamePickerModal`, `TypePickerModal`, `EntryPreviewModal`,
   `RandomEntryResultModal`...).
9. **Autocomplete** (`CairnFieldSuggest`) — suggests values for `type:` and
   `name:` inside a `cairn` block as you type.
10. **Automatic mentions** (`autoLinkElement`, `createAutoLinkSpan`,
    tooltip) — detects catalog names in normal text.
11. **Guardian tools** (`buildGuardianToolsUI`, Weather/Reaction/Events
    tables...).
12. **Plugin** (`class CairnPlugin extends Plugin`) — `onload()`, command
    registration, settings management, note/copy creation.
13. **Settings panel** (`CairnSettingTab`).

## 4. How to add or fix catalog data

The files in `data/es/*.json` are flat arrays of objects. Each one needs at
least `name`; the rest of the fields depend on the type (check `FIELD_DEFS`
in `main.ts` for the exact list per type, or the table in the README).
`description` is free-form markdown.

To add something:

1. Edit the corresponding JSON by hand (or with a Python script if it's a
   big batch — that's how most of it was generated, cross-referencing the
   manual's text against the schema).
2. `npm run dev` with `CAIRN_DEV_VAULT_PLUGIN_DIR` set, or `npm run build` +
   manual copy — either one reloads the `.json` files, but inside Obsidian
   you also need to click **"Recargar datos incorporados"** in Settings,
   because the plugin caches the catalog in memory and only re-reads it on
   startup or when you change the language.
3. Check that you haven't duplicated a `name` within the same file (the
   index uses the normalized name as its key; a duplicate silently
   overwrites itself). A quick script:

   ```bash
   python3 -c "
   import json, collections
   d = json.load(open('data/es/objects.json', encoding='utf-8'))
   names = [o['name'].strip().lower() for o in d]
   dupes = [n for n, c in collections.Counter(names).items() if c > 1]
   print('duplicates:', dupes or 'none')
   "
   ```

### Adding a new language

Create `data/en/objects.json`, `data/en/spells.json`, etc. with the same
field structure (the *field* names aren't translated, they're internal
keys; what you translate are the values). The plugin already knows how to
read `data/<language>/*.json` — they just need to exist. If a file is
missing for that language, it automatically falls back to Spanish for that
type (with a warning).

## 5. How to add a new entry type (e.g. "faction")

1. Add it to the `CairnType` union in `main.ts`.
2. If it has built-in data: add it to `DATA_TYPES`; if not (like
   `character`), don't.
3. `TYPE_LABELS` and `TYPE_ICONS`: label and icon.
4. `FIELD_DEFS`: which fields show up in the card's table, and in what
   order. Use `format: joinArr` for list-type fields.
5. `TEMPLATES`: the new note's template (frontmatter with every field empty
   + the example `cairn` block in the body — use the `simpleTemplate` helper
   if the type doesn't need anything special).
6. `CREATE_LABELS`: the text for the "New X" command.
7. If you want built-in data: create `data/es/factions.json` (the file name
   is `${type}s.json`, see `readDataFile`).
8. Does the type need its own settings folder? No, not anymore: since the
   move to a single "default folder", no type has its own folder anymore.
   Everything uses `settings.defaultFolder`.

That's it — `cairn` block with `type: faction`, "New faction" command,
autocomplete, automatic mentions, tooltip... it all reuses the same generic
machinery.

## 6. Publishing the plugin

### 6.1. Before publishing (one-time)

- [ ] Fill in `author` and `authorUrl` in **`manifest.json`** (right now
      they have the placeholder `TU_NOMBRE_AQUI` / `TU_USUARIO_AQUI`).
- [ ] Fill in `author` and `repository.url` in **`package.json`** (same
      placeholder).
- [ ] Fill in the name in **`LICENSE`** (also has `TU_NOMBRE_AQUI`).
- [ ] Decide on the final `id` in `manifest.json` (`cairn-companion`) —
      once published in the community directory, it **can't be changed**.
      It has to be unique across the whole directory.
- [ ] Create the GitHub repo with that same name (`cairn-companion`, or
      whatever you decide) and push the project: `git init`, `git add -A`,
      commit, `git remote add origin ...`, `git push`.
- [ ] In GitHub → Settings → Actions → General, check that "Workflow
      permissions" are set to "Read and write permissions" (needed by
      `.github/workflows/release.yml` to create the Release).

### 6.2. Publishing a version

```bash
npm version patch   # or minor / major — updates package.json AND,
                     # via the "version" hook (version-bump.mjs), also
                     # manifest.json and versions.json
git push
git push --tags
```

When you push the tag, `.github/workflows/release.yml` fires on its own: it
builds, checks that the tag matches `manifest.json`, and creates a GitHub
Release with `main.js`, `manifest.json`, `styles.css`, and a
`cairn-companion.zip` attached. **The tag has to be exactly the version**
(`1.0.1`, not `v1.0.1` — if you prefer the `v` prefix, adjust the workflow's
check).

### 6.3. Before it shows up in Obsidian's official directory

With the above, you can already share the plugin via **BRAT** (Beta
Reviewer's Auto-update Tool: anyone can install it by pasting your repo's
URL) without waiting for anything else. For it to show up in Obsidian's
community plugin browser:

1. Public repo, with `LICENSE`, `README.md`, and at least one Release with
   `main.js` + `manifest.json` (+ `styles.css`) as assets — you already
   have this.
2. Fork
   [`obsidianmd/obsidian-releases`](https://github.com/obsidianmd/obsidian-releases)
   and add an entry to `community-plugins.json`:
   ```json
   {
   	"id": "cairn-companion",
   	"name": "Cairn Companion",
   	"author": "TU_NOMBRE_AQUI",
   	"description": "Fichas vinculadas para partidas de Cairn 2e...",
   	"repo": "TU_USUARIO_AQUI/cairn-companion"
   }
   ```
3. Open a Pull Request against that repo. A bot automatically checks
   `manifest.json`, the license, that there's no suspicious code, etc.;
   then it goes to human review. It can take weeks — that's normal, there's
   a queue.
4. While you wait, fix whatever the bot or reviewers flag (they usually ask
   for things like: don't use `innerHTML`, use `normalizePath`, avoid `any`
   where you can, etc. — most of this has already been taken care of, but
   double-check if they ask for changes).

### 6.4. Things to check before publishing

- **Mobile**: `isDesktopOnly` is set to `false`, but the plugin hasn't been
  tested on Obsidian mobile. If something breaks there (for example,
  `document.body.createDiv` for the tooltip, which depends on mouse
  positioning — doesn't translate well to touch), the simplest fix is to
  set `isDesktopOnly: true` in `manifest.json` instead of fixing it, unless
  you want to invest time adapting it.
- **Data under a different license**: remember that `data/es/*.json` is
  Cairn 2e content under CC BY-SA 4.0, not MIT — it's noted at the end of
  `LICENSE`, but it's worth repeating in the PR description to
  `obsidian-releases` if asked.