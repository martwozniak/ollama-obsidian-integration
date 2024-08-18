import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	DropdownComponent,
	EditorSuggest,
	EditorPosition,
	TFile,
	EditorSuggestContext,
	EditorSuggestTriggerInfo
} from 'obsidian';

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
	suggestor: OllamaSuggestor;

	private isProcessingCommand = false;

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

		// Add the new command for /ollama syntax
		this.addCommand({
			id: 'process-ollama-inline-command',
			name: 'Process /ollama command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log('[ollama command]')
				const cursor = editor.getCursor();
				let initialLine = editor.getLine(cursor.line - 1);
				const match = initialLine.match(/^ollama\s+(.+)$/);
				if (match && !this.isProcessingCommand) {
					initialLine = initialLine.replace(/^ollama\s+/, '');
					this.isProcessingCommand = true;
					this.processOllamaCommand(editor, initialLine).finally(() => {
						this.isProcessingCommand = false;
					});
				}
			}
		});

		// Initialize the suggestor
		this.suggestor = new OllamaSuggestor(this.app, this);
		this.registerEditorSuggest(this.suggestor);

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

		//Add event listener for keypress events
		this.registerDomEvent(document, 'keydown', (evt: KeyboardEvent) => {
			this.handleKeyPress(evt);
		});
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	handleKeyPress(evt: KeyboardEvent) {
		if (evt.key === 'Enter' && !this.isProcessingCommand) {
			const activeLeaf = this.app.workspace.activeLeaf;
			if (activeLeaf.view instanceof MarkdownView) {

				const editor = activeLeaf.view.editor;
				const cursor = editor.getCursor();
				let lastLine = editor.getLine(cursor.line - 1);
				let line = editor.getLine(cursor.line);
				let initialLine = lastLine.replace(/^ollama\s+/, '');
				console.log('isProcessingCommand:', lastLine, this.isProcessingCommand);
				if (lastLine.trim().startsWith('ollama ')) {
					evt.preventDefault();
					this.isProcessingCommand = true;
					this.processOllamaCommand(editor, initialLine).finally(() => {
						this.isProcessingCommand = false;
					});
				}
			}
		}
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

	async processOllamaCommand(editor: Editor, raw_prompt: string) {
		const cursor = editor.getCursor();
			const prompt = raw_prompt;

			// Clear the current line
			editor.setLine(cursor.line, '');

			// Move cursor to the end of the current line
			editor.setCursor(cursor.line, 0);

			// Insert a new line for the response
			editor.replaceRange('\n', cursor);

			let response = '';
			let updateTimeout: NodeJS.Timeout | null = null;
			const updateInterval = 100; // Update every 100ms

			const updateEditor = () => {
				// editor.setLine(cursor.line + 1, response);
				editor.setValue(response);
				editor.scrollIntoView({from: cursor, to: cursor}, true);
			};

			await this.generateOllamaResponse(prompt, (chunk) => {
				response += chunk;
				updateEditor();
			});

			// Ensure final update is applied
			if (updateTimeout) {
				clearTimeout(updateTimeout);
			}
			updateEditor();

			// Move the cursor to the end of the response
			editor.setCursor(cursor.line + 1 + response.split('\n').length - 1, 0);

			new Notice('Ollama response generated');
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

		contentEl.createEl('br');

		const generateButton = contentEl.createEl('button', { text: 'Generate Response', attr: {
			style: 'margin-top: 10px; margin-bottom: 10px;'}
		});
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

class OllamaSuggestor extends EditorSuggest<string> {
	plugin: OllamaPlugin;

	constructor(app: App, plugin: OllamaPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onTrigger(cursor: EditorPosition, editor: Editor, file: TFile): EditorSuggestTriggerInfo | null {
		const line = editor.getLine(cursor.line).slice(0, cursor.ch);
		if (line.endsWith('/')) {
			return {
				start: { line: cursor.line, ch: cursor.ch - 1 },
				end: cursor,
				query: '/'
			};
		}
		return null;
	}

	getSuggestions(context: EditorSuggestContext): string[] {
		return ['ollama'];
	}

	renderSuggestion(suggestion: string, el: HTMLElement): void {
		el.setText(suggestion);
	}

	selectSuggestion(suggestion: string): void {
		const editor = this.context.editor;
		const cursor = editor.getCursor();
		editor.replaceRange(suggestion + ' ', { line: cursor.line, ch: cursor.ch - 1 }, cursor);
	}
}
