import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";
import { existsSync, mkdirSync, copyFileSync } from "fs";

const banner = `/*
Cairn Companion - Obsidian plugin
Compilado automáticamente, no editar directamente. Edita src/main.ts
*/`;

const prod = process.argv[2] === "production";

// --- Modo desarrollo: compilar directamente dentro de tu vault de pruebas ---
//
// Define la variable de entorno CAIRN_DEV_VAULT_PLUGIN_DIR con la ruta a la
// carpeta del plugin dentro de tu vault, y `npm run dev` escribirá ahí
// main.js, manifest.json y styles.css en cada guardado — sin symlinks, sin
// copiar nada a mano. Combínalo con el plugin comunitario "Hot Reload" en
// ese vault para que Obsidian recargue el plugin solo.
//
// Ejemplo típico en WSL2, con el vault en el lado Windows:
//   export CAIRN_DEV_VAULT_PLUGIN_DIR="/mnt/c/Users/tu_usuario/ObsidianVaults/CairnDev/.obsidian/plugins/cairn-companion"
//   npm run dev
//
// Si la variable no está definida, `npm run dev` compila en la raíz del
// proyecto (comportamiento anterior). `npm run build` (producción) siempre
// compila en la raíz, ignora esta variable.
const devOutDir = process.env.CAIRN_DEV_VAULT_PLUGIN_DIR;
const outDir = prod ? "." : devOutDir || ".";

if (!prod && devOutDir && !existsSync(devOutDir)) {
	mkdirSync(devOutDir, { recursive: true });
}

const copyStaticAssets = {
	name: "copy-static-assets",
	setup(build) {
		build.onEnd((result) => {
			if (outDir === "." || result.errors.length > 0) return;
			for (const f of ["manifest.json", "styles.css"]) {
				try {
					copyFileSync(f, `${outDir}/${f}`);
				} catch (e) {
					console.warn(`No se pudo copiar ${f} a ${outDir}:`, e.message);
				}
			}
		});
	},
};

const context = await esbuild.context({
	banner: { js: banner },
	entryPoints: ["src/main.ts"],
	bundle: true,
	external: [
		"obsidian",
		"electron",
		"@codemirror/autocomplete",
		"@codemirror/collab",
		"@codemirror/commands",
		"@codemirror/language",
		"@codemirror/lint",
		"@codemirror/search",
		"@codemirror/state",
		"@codemirror/view",
		"@lezer/common",
		"@lezer/highlight",
		"@lezer/lr",
		...builtins,
	],
	format: "cjs",
	target: "es2020",
	logLevel: "info",
	sourcemap: prod ? false : "inline",
	treeShaking: true,
	outfile: `${outDir}/main.js`,
	minify: prod,
	plugins: [copyStaticAssets],
});

if (prod) {
	await context.rebuild();
	process.exit(0);
} else {
	await context.watch();
	console.log(
		outDir === "."
			? "Vigilando cambios — compilando en la raíz del proyecto."
			: `Vigilando cambios — compilando directamente en: ${outDir}`
	);
}
