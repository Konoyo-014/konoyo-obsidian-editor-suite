# Konoyo Obsidian Editor Suite

A maintained monorepo for Konoyo's Obsidian editor plugins.

This repository currently contains two plugins:

- `plugins/latex-paren-math`: one-click delimiter conversion (`\\( \\)` and `\\[ \\]` to `$` and `$$`)
- `plugins/live-preview-bold-fix`: Live Preview decoration fixes for bold boundaries and paren/bracket math preview

## Repository Layout

```text
plugins/
  latex-paren-math/
  live-preview-bold-fix/
docs/
```

Each plugin directory contains its own `manifest.json`, `main.js`, `versions.json`, and plugin-level README.

## Author

Plugin metadata author is set to `Konoyo`.

## Local Manual Install

Copy plugin files into your vault:

- `.obsidian/plugins/latex-paren-math/`
- `.obsidian/plugins/live-preview-bold-fix/`

Then reload Obsidian and enable the plugin in Community Plugins.

## Marketplace Notes

Obsidian Community Plugins are listed per plugin repo entry. In practice, one plugin should map to one public GitHub repository when submitting to `obsidian-releases`.

This suite repo is the maintenance home. If you decide to submit both plugins to the Community Plugins list, publish each plugin from its own dedicated public repo.

Details are documented in `docs/marketplace.md`.
