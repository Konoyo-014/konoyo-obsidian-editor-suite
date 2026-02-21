# Live Preview Bold Fix

`Live Preview Bold Fix` stabilizes rendering behavior in Obsidian Live Preview without rewriting note content.

It targets two practical issues:

- inconsistent bold rendering around punctuation and brackets in mixed CJK/English text
- preview-layer rendering for `\\( ... \\)` and `\\[ ... \\]` in Live Preview

## Scope

This plugin only affects editor rendering. It does not convert or mutate markdown files.

The current stable baseline in this repository is `1.7.3`.

## How It Works

The bold fix applies a deterministic decoration layer for strong text and marker visibility near cursor positions.

The math preview path reuses Obsidian's built-in math widget behavior for visual consistency with native math rendering.

## Installation (Manual)

Put `manifest.json`, `main.js`, and `versions.json` under:

`.obsidian/plugins/live-preview-bold-fix/`

Then reload Obsidian and enable `Live Preview Bold Fix` in Community Plugins.

## Compatibility Notes

Because this plugin works at the CodeMirror decoration layer, compatibility can depend on other editor-rendering plugins that patch the same ranges.

If you test changes, use a dedicated note with reproducible examples for bold boundaries and inline/block math.
