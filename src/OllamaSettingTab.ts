import {
	App,
	PluginSettingTab,
	Setting,
	DropdownComponent,
	Notice
} from 'obsidian';
import OllamaPlugin from './main';

export class OllamaSettingTab extends PluginSettingTab {
	plugin: OllamaPlugin;
	modelDropdown: DropdownComponent;

	constructor(app: App, plugin: OllamaPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	async display(): Promise<void> {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Ollama URL')
			.setDesc('The URL of your local Ollama instance')
			.addText(text => text
				.setPlaceholder('Enter the Ollama URL')
				.setValue(this.plugin.settings.ollamaUrl)
				.onChange(async (value) => {
					this.plugin.settings.ollamaUrl = value;
					await this.plugin.saveSettings();
					this.updateModelDropdown();
				}));

		const modelSetting = new Setting(containerEl)
			.setName('Model Name')
			.setDesc('The name of the Ollama model to use');

		modelSetting.addDropdown(async (dropdown) => {
			this.modelDropdown = dropdown;
			const models = await this.plugin.fetchOllamaModels();
			models.forEach((model) => {
				dropdown.addOption(model, model);
			});
			dropdown.setValue(this.plugin.settings.modelName);
			dropdown.onChange(async (value) => {
				this.plugin.settings.modelName = value;
				await this.plugin.saveSettings();
			});
		});

		new Setting(containerEl)
			.setName('Refresh Models')
			.setDesc('Fetch the latest list of models from Ollama')
			.addButton((button) => {
				button.setButtonText('Refresh')
					.onClick(async () => {
						await this.updateModelDropdown();
						new Notice('Models refreshed');
					});
			});
	}

	async updateModelDropdown() {
		const models = await this.plugin.fetchOllamaModels();
		this.modelDropdown.clear();
		models.forEach((model) => {
			this.modelDropdown.addOption(model, model);
		});
		if (models.includes(this.plugin.settings.modelName)) {
			this.modelDropdown.setValue(this.plugin.settings.modelName);
		} else if (models.length > 0) {
			this.plugin.settings.modelName = models[0];
			await this.plugin.saveSettings();
		}
		this.modelDropdown.onChange(async (value) => {
			this.plugin.settings.modelName = value;
			await this.plugin.saveSettings();
		});
	}
}
