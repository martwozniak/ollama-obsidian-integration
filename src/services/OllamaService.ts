import { OllamaPluginSettings } from '../models/OllamaPluginSettings';

export class OllamaService {
	constructor(private settings: OllamaPluginSettings) {}

	async generateResponse(prompt: string, onChunk: (chunk: string) => void): Promise<void> {
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

	async fetchModels(): Promise<string[]> {
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
