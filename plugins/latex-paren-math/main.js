const { Plugin, Notice, TFile } = require("obsidian");

function convertLatexDelimiters(markdown) {
  if (typeof markdown !== "string" || markdown.length === 0) return markdown;

  const fencedPattern = /(```[\s\S]*?```|~~~[\s\S]*?~~~)/g;
  const inlineCodePattern = /(`+[^`]*?`+)/g;

  const convertSegment = (text) => {
    if (!text) return text;

    return text
      .replace(/\\\\\[([\s\S]+?)\\\\\]/g, (_, expr) => `$$${expr}$$`)
      .replace(/(?<!\\)\\\[([\s\S]+?)(?<!\\)\\\]/g, (_, expr) => `$$${expr}$$`)
      .replace(/\\\\\(([\s\S]+?)\\\\\)/g, (_, expr) => {
        if (expr.includes("\n")) return `\\\\(${expr}\\\\)`;
        return `$${expr}$`;
      })
      .replace(/(?<!\\)\\\(([\s\S]+?)(?<!\\)\\\)/g, (_, expr) => {
        if (expr.includes("\n")) return `\\(${expr}\\)`;
        return `$${expr}$`;
      });
  };

  return markdown
    .split(fencedPattern)
    .map((block) => {
      if (!block) return block;
      if (block.startsWith("```") || block.startsWith("~~~")) return block;

      return block
        .split(inlineCodePattern)
        .map((piece) => {
          if (!piece) return piece;
          if (piece.startsWith("`") && piece.endsWith("`")) return piece;
          return convertSegment(piece);
        })
        .join("");
    })
    .join("");
}

module.exports = class LatexParenMathPlugin extends Plugin {
  async onload() {
    this.processing = new Set();

    const convertActiveNote = async () => {
      const file = this.app.workspace.getActiveFile();
      if (!(file instanceof TFile) || file.extension !== "md") {
        new Notice("No active markdown note.");
        return;
      }

      const changed = await this.convertFileIfNeeded(file);
      new Notice(changed ? "Converted math delimiters in active note." : "No LaTeX paren/bracket delimiters found.");
    };

    this.addCommand({
      id: "convert-active-note-latex-delimiters",
      name: "Convert Active Note \\(\\), \\[\\] to $ / $$",
      callback: convertActiveNote,
    });

    this.addCommand({
      id: "convert-all-notes-latex-delimiters",
      name: "Convert All Notes \\(\\), \\[\\] to $ / $$",
      callback: async () => {
        const files = this.app.vault.getMarkdownFiles();
        let changedCount = 0;
        for (const file of files) {
          const changed = await this.convertFileIfNeeded(file);
          if (changed) changedCount += 1;
        }
        new Notice(`Converted math delimiters in ${changedCount} note(s).`);
      },
    });

    this.addRibbonIcon("replace", "Convert Active Note \\(\\), \\[\\] to $ / $$", convertActiveNote);
  }

  async convertFileIfNeeded(file) {
    if (!(file instanceof TFile) || file.extension !== "md") return false;
    if (this.processing.has(file.path)) return false;

    this.processing.add(file.path);
    try {
      const original = await this.app.vault.read(file);
      const converted = convertLatexDelimiters(original);
      if (converted === original) return false;
      await this.app.vault.modify(file, converted);
      return true;
    } catch (error) {
      new Notice(`Failed to convert delimiters: ${file.basename}`);
      console.error("latex-paren-math conversion error", error);
      return false;
    } finally {
      this.processing.delete(file.path);
    }
  }
};
