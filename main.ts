import {
	Editor,
	MarkdownView,
	Notice,
	Plugin,
} from 'obsidian';
import {OllamaService} from "./src/services/OllamaService";
import {DEFAULT_SETTINGS, OllamaPluginSettings} from "./src/models/OllamaPluginSettings";
import {OllamaSuggestor} from "./src/OllamaSuggestor";
import {OllamaPromptModal} from "./src/OllamaPromptModal";
import {OllamaSettingTab} from "./src/OllamaSettingTab";

export default class OllamaPlugin extends Plugin {
	settings: OllamaPluginSettings;
	suggestor: OllamaSuggestor;
	ollamaService: OllamaService;

	private isProcessingCommand = false;

	async onload() {
		await this.loadSettings();
		this.ollamaService = new OllamaService(this.settings);

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
			id: 'process-ollama-inline',
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
			if (activeLeaf?.view instanceof MarkdownView) {
				const editor = activeLeaf.view.editor;
				const cursor = editor.getCursor();
				const lastLine = editor.getLine(cursor.line - 1);
				const initialLine = lastLine.replace(/^ollama\s+/, '');
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
		await this.ollamaService.generateResponse(prompt, onChunk);
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

			const updateEditor = () => {
				// editor.setLine(cursor.line + 1, response);
				editor.setValue(response);
				editor.scrollIntoView({from: cursor, to: cursor}, true);
			};

			await this.ollamaService.generateResponse(prompt, (chunk) => {
				response += chunk;
				updateEditor();
			});

			updateEditor();

			// Move the cursor to the end of the response
			editor.setCursor(cursor.line + 1 + response.split('\n').length - 1, 0);

			new Notice('Ollama response generated');
	}

	async fetchOllamaModels(): Promise<string[]> {
		return this.ollamaService.fetchModels();
	}

}
