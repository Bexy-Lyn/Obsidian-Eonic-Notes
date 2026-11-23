import { App, Modal, Notice, Setting, TFile } from "obsidian";

import { t } from "../i18n";

const DEFAULT_COLOR = "#80CFE8";
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export class EonicColorEditorModal extends Modal {
  private file: TFile;
  private currentColor: string;
  private previewEl!: HTMLElement;
  private saveQueue: Promise<void> = Promise.resolve();

  constructor(app: App, file: TFile) {
    super(app);
    this.file = file;

    const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;

    const savedColor = frontmatter?.color;

    this.currentColor =
      typeof savedColor === "string" && HEX_COLOR.test(savedColor)
        ? savedColor
        : DEFAULT_COLOR;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("eonic-notes-color-modal");

    this.setTitle(t("colorEditor.title"));

    contentEl.createEl("p", {
      text: t("colorEditor.description"),
    });

    new Setting(contentEl).setName(t("note.color")).addColorPicker((picker) => {
      picker.setValue(this.currentColor).onChange(async (color) => {
        this.updatePreview(color);
        await this.saveColor(color);
      });
    });

    // Large preview of the selected background color.
    this.previewEl = contentEl.createDiv({
      cls: "eonic-notes-color-preview",
    });

    this.updatePreview(this.currentColor);

    new Setting(contentEl).addButton((button) =>
      button.setButtonText(t("colorEditor.close")).onClick(() => this.close()),
    );
  }

  private updatePreview(color: string): void {
    this.previewEl.style.backgroundColor = color;
    this.previewEl.setText(this.file.basename);
  }

  private saveColor(color: string): Promise<void> {
    if (!HEX_COLOR.test(color)) {
      return Promise.resolve();
    }

    this.saveQueue = this.saveQueue
      .catch(() => {
        // Keep the queue usable after a failed write.
      })
      .then(async () => {
        try {
          await this.app.fileManager.processFrontMatter(
            this.file,
            (frontmatter) => {
              frontmatter.color = color;
            },
          );

          this.currentColor = color;
        } catch (error) {
          console.error("Eonic Notes: Failed to save color", error);

          new Notice(t("colorEditor.saveFailed"));
        }
      });

    return this.saveQueue;
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
