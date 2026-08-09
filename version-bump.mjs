import { readFileSync, writeFileSync } from "fs";

// Automatically executed by the "version" hook of npm (see package.json)
// when you run `npm version patch|minor|major`. It keeps manifest.json and
// versions.json synchronized with the version you just assigned in
// package.json, as required by Obsidian for publishing.

const targetVersion = process.env.npm_package_version;

if (!targetVersion) {
	console.error("npm_package_version not found. Run this via `npm version`, not directly.");
	process.exit(1);
}

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t") + "\n");

const versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t") + "\n");

console.log(`manifest.json and versions.json updated to version ${targetVersion} (minAppVersion ${minAppVersion}).`);
