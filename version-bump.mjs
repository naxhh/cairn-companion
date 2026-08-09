import { readFileSync, writeFileSync } from "fs";

// Se ejecuta automáticamente por el hook "version" de npm (ver package.json)
// cuando corres `npm version patch|minor|major`. Mantiene manifest.json y
// versions.json sincronizados con la versión que acabas de asignar en
// package.json, tal como exige Obsidian para publicar.

const targetVersion = process.env.npm_package_version;

if (!targetVersion) {
	console.error("No se encontró npm_package_version. Ejecuta esto vía `npm version`, no directamente.");
	process.exit(1);
}

// manifest.json: actualiza "version", conserva minAppVersion tal cual
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t") + "\n");

// versions.json: añade la entrada nueva version -> minAppVersion mínima requerida
const versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t") + "\n");

console.log(`manifest.json y versions.json actualizados a la versión ${targetVersion} (minAppVersion ${minAppVersion}).`);
