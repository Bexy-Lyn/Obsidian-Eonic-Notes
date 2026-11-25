import { App, getAllTags } from "obsidian";

import type { EonicNotesSettings } from "../settings";
import type { EonicNote } from "./types";

function normalizeTag(tag: string): string {
  return "#" + tag.trim().replace(/^#+/, "").toLowerCase();
}

function readNumber(value: unknown, fallback: number): number {
  if (typeof value !== "number" && typeof value !== "string") {
    return fallback;
  }

  if (value === "") return fallback;

  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

function readText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.map(readText).join(", ");
  }

  return String(value).trim();
}

export function collectEonicNotes(
  app: App,
  settings: EonicNotesSettings,
  additionalTag?: string,
): EonicNote[] {
  const notes: EonicNote[] = [];

  if (!settings.tag.trim()) return notes;

  const requiredTag = normalizeTag(settings.tag);

  const filterTag = additionalTag?.trim()
    ? normalizeTag(additionalTag)
    : undefined;

  const hierarchy = settings.hierarchy.map((key) => key.trim()).filter(Boolean);

  if (hierarchy.length === 0) return notes;

  for (const file of app.vault.getMarkdownFiles()) {
    const cache = app.metadataCache.getFileCache(file);

    if (!cache) continue;

    const tags = (getAllTags(cache) ?? []).map(normalizeTag);

    if (!tags.includes(requiredTag)) continue;

    if (filterTag && !tags.includes(filterTag)) {
      continue;
    }

    const fm = cache.frontmatter ?? {};

    // Collect the ancestors until the first
    // empty hierarchy property.
    const ancestors: string[] = [];

    for (const key of hierarchy) {
      const value = readText(fm[key]);

      if (!value) break;

      ancestors.push(value);
    }

    // A note needs an available hierarchy level
    // for its own title.
    if (ancestors.length >= hierarchy.length) {
      continue;
    }

    const properties: Record<string, string> = Object.create(null);

    for (const property of settings.optionalProperties) {
      const key = property.trim();

      if (key) {
        properties[key] = readText(fm[key]);
      }
    }

    const color =
      typeof fm.color === "string" && /^#[0-9a-fA-F]{6}$/.test(fm.color)
        ? fm.color
        : "#80CFE8";

    notes.push({
      file,
      title: file.basename,
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
