import type { TFile } from "obsidian";

export interface EonicBlockOptions {
  view: string;
  tag?: string;
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
