import type { RawEonicNote, EonicSchema } from "./types";

import { t } from "../i18n";

const RESERVED_PROPERTIES = new Set([
  "tags",
  "tag",
  "aliases",
  "alias",
  "cssclasses",
  "cssclass",
  "position",
  "duration",
  "order",
  "color",
  "description",
]);

export function detectSchema(
  notes: RawEonicNote[],
  hierarchyHints: string[] = [],
  selectedProperties?: string[],
): EonicSchema {
  const notesByTitle = new Map(notes.map((note) => [note.title, note]));

  const allKeys = new Set<string>();
  const populatedKeys = new Set<string>();
  const hierarchyKeys = new Set<string>();

  const isReserved = (key: string): boolean =>
    RESERVED_PROPERTIES.has(key.toLowerCase());

  // Find all custom property keys.
  for (const note of notes) {
    for (const [key, value] of Object.entries(note.frontmatter)) {
      if (isReserved(key)) continue;

      allKeys.add(key);

      if (
        value !== null &&
        value !== undefined &&
        value !== "" &&
        !(Array.isArray(value) && value.length === 0)
      ) {
        populatedKeys.add(key);
      }
    }
  }

  // Detect properties that reference collected notes.
  for (const note of notes) {
    for (const key of allKeys) {
      const value = note.frontmatter[key];

      if (
        typeof value === "string" &&
        value !== note.title &&
        notesByTitle.has(value)
      ) {
        hierarchyKeys.add(key);
      }
    }
  }

  // Determine how many ancestors a note references.
  function countAncestors(note: RawEonicNote): number {
    let count = 0;

    for (const key of hierarchyKeys) {
      const value = note.frontmatter[key];

      if (
        typeof value === "string" &&
        value !== note.title &&
        notesByTitle.has(value)
      ) {
        count++;
      }
    }

    return count;
  }

  // Estimate the hierarchy level of each property
  // from the notes it references.
  const propertyDepths = new Map<string, number>();

  for (const key of hierarchyKeys) {
    const depths: number[] = [];

    for (const note of notes) {
      const value = note.frontmatter[key];

      if (typeof value !== "string" || value === note.title) {
        continue;
      }

      const referencedNote = notesByTitle.get(value);

      if (referencedNote) {
        depths.push(countAncestors(referencedNote));
      }
    }

    propertyDepths.set(key, depths.length > 0 ? Math.min(...depths) : 0);
  }

  // Sort hierarchy keys by their inferred depth.
  const hierarchy = [...hierarchyKeys].sort((a, b) => {
    const depthA = propertyDepths.get(a) ?? 0;
    const depthB = propertyDepths.get(b) ?? 0;

    return depthA - depthB;
  });

  // A note's title occupies one additional level
  // after its ancestor properties.
  const requiredLevels = notes.reduce(
    (max, note) => Math.max(max, countAncestors(note) + 1),
    1,
  );

  // Find a name for the final, otherwise
  // undetectable hierarchy level.
  while (hierarchy.length < requiredLevels) {
    const hintIndex = hierarchy.length;

    const matchingPrefix = hierarchy.every(
      (key, index) => hierarchyHints[index] === key,
    );

    const hint = matchingPrefix ? hierarchyHints[hintIndex]?.trim() : undefined;

    if (
      hint &&
      !hierarchy.includes(hint) &&
      !populatedKeys.has(hint) &&
      !isReserved(hint)
    ) {
      hierarchy.push(hint);
    } else {
      let fallback = t("visualization.level") + " " + (hierarchy.length + 1);

      while (hierarchy.includes(fallback) || allKeys.has(fallback)) {
        fallback += "_";
      }

      hierarchy.push(fallback);
    }
  }

  // Everything else becomes a secondary property.
  const secondaryKeys = new Set(
    [...allKeys].filter((key) => !hierarchy.includes(key)),
  );

  const optionalProperties =
    selectedProperties !== undefined
      ? [...new Set(selectedProperties)].filter(
          (key) => secondaryKeys.has(key) && !isReserved(key),
        )
      : [...secondaryKeys].filter((key) => populatedKeys.has(key));

  return {
    hierarchy,
    optionalProperties,
  };
}
