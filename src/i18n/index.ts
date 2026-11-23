import { getLanguage } from "obsidian";

import en from "./en.json";
import de from "./de.json";

type TranslationKey = {
  [K in keyof typeof en]: {
    [P in keyof (typeof en)[K]]: (typeof en)[K][P] extends string
      ? `${K & string}.${P & string}`
      : {
          [Q in keyof (typeof en)[K][P]]: `${K & string}.${P & string}.${Q & string}`;
        }[keyof (typeof en)[K][P]];
  }[keyof (typeof en)[K]];
}[keyof typeof en];

const translations: Record<string, Record<string, unknown>> = {
  en,
  de,
};

function lookup(
  dictionary: Record<string, unknown>,
  key: string,
): string | undefined {
  let current: unknown = dictionary;

  for (const part of key.split(".")) {
    if (typeof current !== "object" || current === null || !(part in current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === "string" ? current : undefined;
}

export function t(key: TranslationKey): string {
  const language = getLanguage().toLowerCase().split("-")[0];

  return language
    ? (lookup(translations[language] ?? en, key) ?? lookup(en, key) ?? key)
    : key;
}
