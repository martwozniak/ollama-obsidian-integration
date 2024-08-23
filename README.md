![ollama-obsidian-integration](./docs/Obsidian.gif)
# Ollama Obsidian Integration
This plugin integrates Ollama's AI capabilities directly into your Obsidian workflow, allowing you to generate AI-powered content seamlessly within your notes.

**Disclaimer**: Before installing this plugin, please make sure you have [Ollama](https://ollama.com/) installed. 
Without running Ollama API this extension will not work. Its called integration because it integrates with local Ollama API on your machine.
It does not require internet connection to work. (Of course if you downloaded your [ollama models](https://ollama.com/library) before)


![ollama-obsidian-dialog-integration-modal](./docs/Obsidian-Dialog.gif)
## Installation

1. Open Obsidian and go to Settings > Community Plugins.
2. Disable Safe Mode if it's enabled.
3. Click on "Browse" and search for "Ollama".
4. Find the "Ollama Plugin" and click "Install".
5. Once installed, enable the plugin.

## Configuration

1. Go to Settings > Ollama Plugin.
2. Set the "Ollama URL" to the address of your local Ollama instance (e.g., `http://localhost:11434`).
3. Select your preferred Ollama model from the dropdown list.
4. Click "Refresh Models" if you've added new models to your Ollama instance.

## Usage

### Using the Prompt Modal

1. Click the Ollama icon in the left ribbon, or use the command palette to open the "Ollama prompt modal".
2. Enter your prompt in the text area.
3. Click "Generate Response" to get the AI-generated content.
4. The response will appear below the input area.

### Using Inline Commands

1. In your note, type `/ollama` followed by your prompt.
2. Press Enter to generate the response.
3. The AI-generated content will be inserted directly into your note.

### Using Editor Commands

1. Select text in your note.
2. Open the command palette and search for "Generate Ollama response".
3. The selected text will be used as a prompt, and the response will replace the selection.

### Auto-suggestions

As you type `/` in your notes, the plugin will suggest the Ollama command, allowing for quick access to AI generation.

![ollama-obsidian-integration-settings](./docs/Obsidian-Settings.gif)
## Tips

- Experiment with different prompts to get the best results.
- Use specific and clear language in your prompts for more accurate responses.
- Remember that the quality of the output depends on the selected Ollama model.

## Troubleshooting

- If you're not getting responses, check that your Ollama URL is correct and that the Ollama service is running.
- Ensure you've selected a valid model in the plugin settings.
- Check the console for any error messages if you're experiencing issues.

## Support

For support, please open an issue on the GitHub repository or consult the Obsidian community forums.

Enjoy enhancing your note-taking with AI-powered insights!

## Funding URL

You can support this project here: https://www.patreon.com/marcinwozniak
