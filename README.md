![ollama-obsidian-integration](./docs/Obsidian.gif)
# Ollama Obsidian Integration

**Disclaimer**: Before installing this plugin, please make sure you have [Ollama](https://ollama.com/) installed. 
Without running Ollama API this extension will not work. Its called integration because it integrates with local Ollama API on your machine.
It does not require internet connection to work. (Of course if you downloaded your [ollama models](https://ollama.com/library) before)


![ollama-obsidian-dialog-integration-modal](./docs/Obsidian-Dialog.gif)
## First time developing plugins?

Quick starting guide for new plugin devs:

![ollama-obsidian-integration-settings](./docs/Obsidian-Settings.gif)
## Releasing new releases

- Update your `manifest.json` with your new version number, such as `1.0.1`, and the minimum Obsidian version required for your latest release.
- Update your `versions.json` file with `"new-plugin-version": "minimum-obsidian-version"` so older versions of Obsidian can download an older version of your plugin that's compatible.
- Create new GitHub release using your new version number as the "Tag version". Use the exact version number, don't include a prefix `v`. See here for an example: https://github.com/obsidianmd/obsidian-sample-plugin/releases
- Upload the files `manifest.json`, `main.js`, `styles.css` as binary attachments. Note: The manifest.json file must be in two places, first the root path of your repository and also in the release.
- Publish the release.

## Adding your plugin to the community plugin list

- Check the [plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines).
- Publish an initial version.
- Make sure you have a `README.md` file in the root of your repo.
- Make a pull request at https://github.com/obsidianmd/obsidian-releases to add your plugin.

## Funding URL

You can support this project here: https://www.patreon.com/marcinwozniak
