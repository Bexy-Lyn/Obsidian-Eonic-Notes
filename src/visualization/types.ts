import type { TFile } from "obsidian";

export interface EonicBlockOptions {
  view: string;
  tag?: string;
  order: EonicSortOrder;
  properties?: string[];
  timeline?: EonicTimelineOptions;
}

export interface EonicNote {
  file: TFile;
  title: string;
  ancestors: string[];
  level: number;

  duration: number;
  order: number;
  color: string;

  properties: Record<string, string>;
}

export interface EonicNode {
  title: string;
  level: number;
  note?: EonicNote;
  children: EonicNode[];
}

export interface EonicNote {
  file: TFile;
  title: string;
  description: string;

  ancestors: string[];
  level: number;

  duration: number;
  order: number;
  color: string;

  properties: Record<string, string>;
}

export type EonicSortOrder = "asc" | "desc";

export interface RawEonicNote {
  file: TFile;
  title: string;
  frontmatter: Record<string, unknown>;
}

export interface EonicSchema {
  hierarchy: string[];
  optionalProperties: string[];
}

export interface EonicTimelineOptions {
  label: string;
  start: number;
  column: number;
}
