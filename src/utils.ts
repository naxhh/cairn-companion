export function normalize(s: string): string {
	return s.trim().toLowerCase();
}

// Frontmatter/override values come in as `unknown`; stringify only the
// primitives that have a meaningful string form, falling back otherwise
// instead of risking "[object Object]" from a stray table/array value.
export function asString(value: unknown, fallback = ""): string {
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	return fallback;
}