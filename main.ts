import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, DropdownComponent } from 'obsidian';

interface OllamaPluginSettings {
	ollamaUrl: string;
	modelName: string;
}

const DEFAULT_SETTINGS: OllamaPluginSettings = {
	ollamaUrl: 'http://localhost:11434',
	modelName: 'llama2'
}

export default class OllamaPlugin extends Plugin {
	settings: OllamaPluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('star', 'Ollama AI Integration', (evt: MouseEvent) => {
			new OllamaPromptModal(this.app, this).open();
		});
		ribbonIconEl.addClass('ollama-plugin-ribbon-class');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-ollama-prompt-modal',
			name: 'Open Ollama prompt modal',
			callback: () => {
				new OllamaPromptModal(this.app, this).open();
			}
		});

		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'generate-ollama-response',
			name: 'Generate Ollama response',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const selection = editor.getSelection();
				if (selection) {
					this.generateOllamaResponse(selection, (response) => {
						editor.replaceSelection(response);
					});
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new OllamaSettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async generateOllamaResponse(prompt: string, onChunk: (chunk: string) => void): Promise<void> {
		try {
			const response = await fetch(`${this.settings.ollamaUrl}/api/generate`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					"model": this.settings.modelName,
					"prompt": prompt,
					"stream": true,
				}),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error('Response body is not readable');
			}

			const decoder = new TextDecoder();
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value);
				const lines = chunk.split('\n');
				for (const line of lines) {
					if (line.trim() === '') continue;
					try {
						const parsed = JSON.parse(line);
						if (parsed.response) {
							onChunk(parsed.response);
						}
					} catch (e) {
						console.error('Error parsing JSON:', e);
					}
				}
			}
		} catch (error) {
			console.error('Error generating Ollama response:', error);
			onChunk(`Error: Failed to generate response from Ollama. Details: ${error.message}`);
		}
	}

	async fetchOllamaModels(): Promise<string[]> {
		try {
			const response = await fetch(`${this.settings.ollamaUrl}/api/tags`);
			if (!response.ok) {
				throw new Error('Failed to fetch models');
			}
			const data = await response.json();
			return data.models.map((model: { name: string }) => model.name);
		} catch (error) {
			console.error('Error fetching Ollama models:', error);
			return [];
		}
	}
}

class OllamaPromptModal extends Modal {
	plugin: OllamaPlugin;
	promptInput: HTMLTextAreaElement;
	responseOutput: HTMLDivElement;

	constructor(app: App, plugin: OllamaPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Ollama Prompt' });

		this.promptInput = contentEl.createEl('textarea', {
			attr: { rows: '4', cols: '50', placeholder: 'Enter your prompt here' }
		});

		const generateButton = contentEl.createEl('button', { text: 'Generate Response' });
		generateButton.addEventListener('click', this.generateResponse.bind(this));

		this.responseOutput = contentEl.createEl('div', { cls: 'ollama-response' });
	}

	async generateResponse() {
		const prompt = this.promptInput.value;
		if (prompt) {
			this.responseOutput.setText('');
			await this.plugin.generateOllamaResponse(prompt, (chunk) => {
				this.responseOutput.setText(this.responseOutput.textContent + chunk);
			});
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class OllamaSettingTab extends PluginSettingTab {
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
