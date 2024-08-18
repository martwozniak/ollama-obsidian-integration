// src/utils.ts
import {Editor, EditorPosition, MarkdownView} from 'obsidian';

export async function processOllamaCommand(editor: Editor, raw_prompt: string, generateResponse: (prompt: string, onChunk: (chunk: string) => void) => Promise<void>) {
	const cursor = editor.getCursor();
	const prompt = raw_prompt;

	editor.setLine(cursor.line, '');
	editor.setCursor(cursor.line, 0);
	editor.replaceRange('\n', cursor);

	let response = '';

	const updateEditor = () => {
		editor.setValue(response);
		editor.scrollIntoView({from: cursor, to: cursor}, true);
	};

	await generateResponse(prompt, (chunk) => {
		response += chunk;
		updateEditor();
	});

	updateEditor();
	editor.setCursor(cursor.line + 1 + response.split('\n').length - 1, 0);
}

export function handleKeyPress(evt: KeyboardEvent, plugin: any) {
	if (evt.key === 'Enter' && !plugin.isProcessingCommand) {
		const activeLeaf = plugin.app.workspace.activeLeaf;
		if (activeLeaf.view instanceof MarkdownView) {
			const editor = activeLeaf.view.editor;
			const cursor = editor.getCursor();
			let lastLine = editor.getLine(cursor.line - 1);
			let initialLine = lastLine.replace(/^ollama\s+/, '');
			if (lastLine.trim().startsWith('ollama ')) {
				evt.preventDefault();
				plugin.isProcessingCommand = true;
				plugin.processOllamaCommand(editor, initialLine).finally(() => {
					plugin.isProcessingCommand = false;
				});
			}
		}
	}
}
