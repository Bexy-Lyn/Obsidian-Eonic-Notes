import { App, getAllTags } from "obsidian";

import type { RawEonicNote, EonicNote, EonicSchema } from "./types";

function normalizeTag(tag: string): string {
  return "#" + tag.trim().replace(/^#+/, "").toLowerCase();
}

function readNumber(value: unknown, fallback: number): number {
  if (typeof value !== "number" && typeof value !== "string") {
    return fallback;
  }

  if (typeof value === "string" && !value.trim()) {
    return fallback;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

export function readText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.map(readText).join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value) ?? "";
  }

  return String(value).trim();
}

// Collect notes without interpreting their properties.
export function collectRawEonicNotes(
  app: App,
  requiredTag: string,
  additionalTag?: string,
): RawEonicNote[] {
  if (!requiredTag.trim()) return [];

  const baseTag = normalizeTag(requiredTag);

  const filterTag = additionalTag?.trim()
    ? normalizeTag(additionalTag)
    : undefined;

  const notes: RawEonicNote[] = [];

  for (const file of app.vault.getMarkdownFiles()) {
    const cache = app.metadataCache.getFileCache(file);

    if (!cache) continue;

    const tags = (getAllTags(cache) ?? []).map(normalizeTag);

    if (!tags.includes(baseTag)) continue;

    if (filterTag && !tags.includes(filterTag)) {
      continue;
    }

    notes.push({
      file,
      title: file.basename,
      frontmatter: cache.frontmatter ?? {},
    });
  }

  return notes;
}

// Interpret the raw notes using a discovered schema.
export function normalizeEonicNotes(
  rawNotes: RawEonicNote[],
  schema: EonicSchema,
): EonicNote[] {
  const titles = new Set(rawNotes.map((note) => note.title));

  const notes: EonicNote[] = [];

  for (const raw of rawNotes) {
    const fm = raw.frontmatter;

    const ancestors: string[] = [];

    for (const key of schema.hierarchy) {
      const value = fm[key];

      if (
        typeof value !== "string" ||
        !titles.has(value) ||
        value === raw.title
      ) {
        break;
      }

      ancestors.push(value);
    }

    if (ancestors.length >= schema.hierarchy.length) {
      continue;
    }

    const properties: Record<string, string> = Object.create(null);

    for (const key of schema.optionalProperties) {
      properties[key] = readText(fm[key]);
    }

    const color =
      typeof fm.color === "string" && /^#[0-9a-fA-F]{6}$/.test(fm.color)
        ? fm.color
        : "#80CFE8";

    notes.push({
      file: raw.file,
      title: raw.title,
      description: readText(fm.description),

      ancestors,
      level: ancestors.length,

      duration: Math.max(0, readNumber(fm.duration, 0)),

      order: readNumber(fm.order, 1),

      color,
      properties,
    });
  }

  return notes;
}
