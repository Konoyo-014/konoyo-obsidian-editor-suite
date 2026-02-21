# Obsidian Community Plugins Submission Notes

## Current State

The plugins are maintained together in this suite repository for development convenience.

For Community Plugins listing, keep one plugin per public repository to match the submission model used in `obsidian-releases/community-plugins.json`.

## Submission Prerequisites (per plugin repo)

- public GitHub repository
- `manifest.json` in repo root
- `README.md` in repo root
- license file
- tagged release whose assets include at least:
  - `manifest.json`
  - `main.js`
  - `styles.css` (if the plugin uses one)

## Submission Flow (per plugin)

1. Create a dedicated plugin repo.
2. Prepare and tag a release (`x.y.z`) with required assets.
3. Submit a PR to `obsidianmd/obsidian-releases` updating `community-plugins.json`.
4. Wait for review and merge.

## Practical Recommendation

Keep this suite as your maintenance source, and mirror each plugin to its own release repo for marketplace publication.
