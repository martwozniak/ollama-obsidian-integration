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

	selectSuggestion(suggestion: string, evt: MouseEvent | KeyboardEvent): void {
		if (!this.context) return;
		const { editor, start, end } = this.context;
		editor.replaceRange(suggestion + ' ', start, end);
	}
}
