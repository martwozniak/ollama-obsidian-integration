import { App, Modal } from 'obsidian';
import OllamaPlugin from "../main";

export class OllamaPromptModal extends Modal {
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

		const generateButton = contentEl.createEl('button', {
			text: 'Generate Response',
			attr: { style: 'margin-top: 10px; margin-bottom: 10px;' }
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
