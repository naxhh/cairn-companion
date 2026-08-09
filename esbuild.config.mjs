import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";
import { existsSync, mkdirSync, copyFileSync } from "fs";

const banner = `/*
Cairn Companion - Obsidian plugin
Compiled automatically, do not edit directly. Edit src/main.ts
*/`;

const prod = process.argv[2] === "production";

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
			? "Watching changes — compiling in the project root."
			: `Watching changes — compiling directly in: ${outDir}`
	);
}
