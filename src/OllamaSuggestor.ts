import {
	App,
	Editor,
	EditorPosition,
	EditorSuggest,
	EditorSuggestContext,
	EditorSuggestTriggerInfo,
	TFile
} from 'obsidian';
import OllamaPlugin from "../main";

export class OllamaSuggestor extends EditorSuggest<string> {
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
