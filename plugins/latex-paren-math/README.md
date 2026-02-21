# LaTeX Paren Math

`LaTeX Paren Math` is an Obsidian plugin that converts paren/bracket LaTeX delimiters into Obsidian-native delimiters in markdown text.

It is designed for vaults where formulas are written as `\\( ... \\)` and `\\[ ... \\]`, but rendering is expected to rely on `$...$` and `$$...$$`.

The plugin provides three entry points: converting only the active note, converting all notes in the vault, and a ribbon shortcut for active-note conversion.

## What It Converts

The conversion rules are straightforward.

- `\\( ... \\)` becomes `$...$` when the expression stays on one line.
- `\\[ ... \\]` becomes `$$...$$`.
- Multi-line `\\( ... \\)` is intentionally preserved to avoid destructive rewrites.

The converter skips fenced code blocks and inline code spans, so source snippets are not rewritten accidentally.

## Commands

Use Command Palette and run one of the following:

- `Convert Active Note \(\), \[\] to $ / $$`
- `Convert All Notes \(\), \[\] to $ / $$`

You can also click the ribbon icon to run active-note conversion quickly.

## Installation (Manual)

Put `manifest.json`, `main.js`, and `versions.json` under:

`.obsidian/plugins/latex-paren-math/`

Then reload Obsidian and enable `LaTeX Paren Math` in Community Plugins.

## Notes

This plugin performs file modifications. Commit your vault (or back up) before bulk conversion if you want easy rollback.
