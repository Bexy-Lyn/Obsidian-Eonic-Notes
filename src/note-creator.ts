import { App, normalizePath, TFile } from "obsidian";

import type { EonicNotesSettings } from "./settings";
import { t } from "./i18n";

export class EonicNoteCreator {
  constructor(
    private app: App,
    private settings: EonicNotesSettings,
  ) {}

  async create(): Promise<TFile> {
    const path = this.getUniquePath();

    // Create the file with empty YAML frontmatter.
    const file = await this.app.vault.create(path, "---\n---\n");

    // Use Obsidian's YAML API to populate properties.
    await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
      const tag = this.settings.tag.trim().replace(/^#+/, "");

      if (tag) {
        frontmatter.tags = [tag];
      }

      // Hierarchy properties start empty.
      for (const property of this.settings.hierarchy) {
        const key = property.trim();

        if (key && !(key in frontmatter)) {
          frontmatter[key] = "";
        }
      }

      // Optional properties also start empty.
      for (const property of this.settings.optionalProperties) {
        const key = property.trim();

        if (key && !(key in frontmatter)) {
          frontmatter[key] = "";
        }
      }

      // Numeric properties.
      frontmatter.duration = 0;
      frontmatter.order = 1;
      // Visual appearance
      frontmatter.color = "#909090";
    });

    return file;
  }

  private getUniquePath(): string {
    const baseName = t("note.untitled");
    let name = baseName;
    let counter = 1;

    while (this.app.vault.getAbstractFileByPath(normalizePath(`${name}.md`))) {
      name = `${baseName} ${counter}`;
      counter++;
    }

    return normalizePath(`${name}.md`);
  }
}
