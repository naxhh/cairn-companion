# Developing Cairn Companion

A guide for continuing to develop the plugin on your own: how to set up the
environment, how the code is organized, how to add new things, and how to
publish it.

## Recommended dev environment

Create a test vault.

### Install "Hot Reload"

In that vault: Settings → Community plugins → search for **"Hot Reload"**
(by pjeby) → install and enable it.

For it to detect the plugin, create an empty `.hotreload` file in this plugin folder.

### Link plugin

Either clone the plugin inside the `.obsidian/plugins/` folder in the test vault.
Or, symlink it from wherever you cloned it.


### Build plugin in vault.

```bash
export CAIRN_DEV_VAULT_PLUGIN_DIR="/path/to/vault/.obsidian/plugins/cairn-companion"
npm install
npm run dev
```

### Tips

To debug: `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Opt+I` (Mac) inside Obsidian opens Chrome DevTools.

Things "Hot Reload" does **not** reload automatically:
- Changes to `manifest.json` that affect `minAppVersion` or `id` — for
  those, disable and re-enable the plugin by hand, or restart Obsidian.
- Changes to `data/es/*.json` (the built-in catalog) — use the "Reload built-in data" button in Settings → Cairn Companion, or the command.

### Build without vault

```bash
npm run build     # production build (minified) in the project root
npm run package   # build + packages dist/cairn-companion and cairn-companion.zip
```


## Adding or modifying entry data

The files in `data/$lang/*.json` source must always be official Carin 2e material.
For the momento we are not considering adding data from adeventures, hombrew etc.
But you can add them creating an entry in your vault and sharing said entries yourself.


Each data one needs at least `name`; the rest of the fields depend on the type (check `FIELD_DEFS` in `main.ts` for the exact list per type). `description` is free-form markdown.


### Adding a new language

Copy the structure of an existing folder. Add all the data from sources. Make sure the `LICENSE` files containt proper attribution.
The `field` names aren't translated, they're internal keys; what you translate are the values. The plugin already knows how to read `data/<language>/*.json`. If a file is missing for that language, it automatically falls back to Spanish for that type (with a warning).

## Publishing the plugin

```bash
npm version patch   # or minor / major. updates package.json, manifest.json and versions.json
git push
git push --tags
```

`.github/workflows/release.yml` is triggered on a tag published: it
builds, checks that the tag matches `manifest.json`, and creates a GitHub
Release with `main.js`, `manifest.json`, `styles.css`, and a
`cairn-companion.zip` attached. **The tag has to be exactly the version without the v prefix**.

### Obsidian flow

Plugin is not currently on the Obsidian repo but will eventually be. Notes for then:

Share the plugin via **BRAT** (Beta Reviewer's Auto-update Tool) without waiting for anything else.

For it to show up in Obsidian's community plugin browser:
1. Public repo, with `LICENSE`, `README.md`, and at least one Release with
   `main.js` + `manifest.json` (+ `styles.css`) as assets
2. Fork
   [`obsidianmd/obsidian-releases`](https://github.com/obsidianmd/obsidian-releases)
   and add an entry to `community-plugins.json`:
   ```json
   {
   	"id": "cairn-companion",
   	"name": "Cairn Companion",
   	"author": "nax_hh",
   	"description": "Fichas vinculadas para partidas de Cairn 2e...",
   	"repo": "nax_hh/cairn-companion"
   }
   ```
3. Open a Pull Request against that repo. A bot automatically checks
   `manifest.json`, the license, that there's no suspicious code, etc.;
   then it goes to human review. It can take weeks.
4. While you wait, fix whatever the bot or reviewers flag (they usually ask
   for things like: don't use `innerHTML`, use `normalizePath`, avoid `any`
   where you can, etc.).

### Things to check before publishing

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