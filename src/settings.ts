import { App, PluginSettingTab, Setting } from "obsidian";

import type EonicNotesPlugin from "./main";
import { t } from "./i18n";

export interface EonicNotesSettings {
  tag: string;
  hierarchy: string[];
  optionalProperties: string[];
}

export const DEFAULT_SETTINGS: EonicNotesSettings = {
  tag: "#eonic",
  hierarchy: ["Eon", "Era", "Period", "Epoch"],
  optionalProperties: [],
};

export class EonicNotesSettingTab extends PluginSettingTab {
  plugin: EonicNotesPlugin;

  constructor(app: App, plugin: EonicNotesPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("eonic-notes-settings");

    new Setting(containerEl).setName(t("settings.title")).setHeading();

    new Setting(containerEl)
      .setName(t("settings.tag.name"))
      .setDesc(t("settings.tag.description"))
      .addText((text) =>
        text
          .setPlaceholder(t("settings.tag.placeholder"))
          .setValue(this.plugin.settings.tag)
          .onChange(async (value) => {
            this.plugin.settings.tag = value.trim();
            await this.plugin.saveSettings();
          }),
      )
      .setClass("eonic-notes-tag-setting");

    this.renderArraySetting(
      t("settings.hierarchy.name"),
      t("settings.hierarchy.description"),
      "hierarchy",
    );

    this.renderArraySetting(
      t("settings.optionalProperties.name"),
      t("settings.optionalProperties.description"),
      "optionalProperties",
    );
  }

  private renderArraySetting(
    title: string,
    description: string,
    key: "hierarchy" | "optionalProperties",
  ): void {
    new Setting(this.containerEl)
      .setName(title)
      .setDesc(description)
      .setHeading();

    const listEl = this.containerEl.createDiv({
      cls: "eonic-notes-array-list",
    });

    const values = this.plugin.settings[key];

    values.forEach((value, index) => {
      new Setting(listEl)
        .setClass("eonic-notes-array-row")
        .addText((text) =>
          text
            .setPlaceholder(t("settings.propertyPlaceholder"))
            .setValue(value)
            .onChange(async (newValue) => {
              this.plugin.settings[key][index] = newValue;
              await this.plugin.saveSettings();
            }),
        )
        .addExtraButton((button) =>
          button
            .setIcon("arrow-up")
            .setTooltip(t("settings.moveUp"))
            .setDisabled(index === 0)
            .onClick(async () => {
              await this.moveItem(key, index, -1);
            }),
        )
        .addExtraButton((button) =>
          button
            .setIcon("arrow-down")
            .setTooltip(t("settings.moveDown"))
            .setDisabled(index === values.length - 1)
            .onClick(async () => {
              await this.moveItem(key, index, 1);
            }),
        )
        .addExtraButton((button) =>
          button
            .setIcon("trash")
            .setTooltip(t("settings.removeProperty"))
            .onClick(async () => {
              this.plugin.settings[key].splice(index, 1);
              await this.plugin.saveSettings();
              this.display();
            }),
        );
    });

    new Setting(this.containerEl).addButton((button) =>
      button
        .setButtonText(t("settings.addProperty"))
        .setIcon("plus")
        .onClick(async () => {
          this.plugin.settings[key].push("");
          await this.plugin.saveSettings();
          this.display();
        }),
    );
  }

  private async moveItem(
    key: "hierarchy" | "optionalProperties",
    index: number,
    direction: number,
  ): Promise<void> {
    const values = this.plugin.settings[key];
    const target = index + direction;

    if (target < 0 || target >= values.length) return;

    [values[index], values[target]] = [values[target]!, values[index]!];

    await this.plugin.saveSettings();
    this.display();
  }
}
