import { Plugin } from "obsidian";

import {
  DEFAULT_SETTINGS,
  EonicNotesSettingTab,
  type EonicNotesSettings,
} from "./settings";

export default class EonicNotesPlugin extends Plugin {
  settings!: EonicNotesSettings;

  async onload() {
    await this.loadSettings();

    this.addSettingTab(new EonicNotesSettingTab(this.app, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
