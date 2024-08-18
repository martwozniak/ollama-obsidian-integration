export interface OllamaPluginSettings {
	ollamaUrl: string;
	modelName: string;
}

export const DEFAULT_SETTINGS: OllamaPluginSettings = {
	ollamaUrl: 'http://localhost:11434',
	modelName: 'llama3.1'
};
