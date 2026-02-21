const { Plugin } = require("obsidian");
const { Decoration, ViewPlugin } = require("@codemirror/view");

let ACTIVE_PLUGIN = null;

function isLivePreview(view) {
  const container = view.dom.closest(".markdown-source-view.mod-cm6");
  return !!container && container.classList.contains("is-live-preview");
}

function isWhitespace(char) {
  return !!char && /\s/u.test(char);
}

function isEscaped(text, index) {
  let backslashes = 0;
  for (let i = index - 1; i >= 0 && text[i] === "\\"; i -= 1) {
    backslashes += 1;
  }
  return backslashes % 2 === 1;
}

function countCharRun(text, index, char) {
  let end = index;
  while (end < text.length && text[end] === char) {
    end += 1;
  }
  return end - index;
}

function canOpenStrong(prevChar, nextChar) {
  void prevChar;
  if (!nextChar || isWhitespace(nextChar)) return false;
  return true;
}

function canCloseStrong(prevChar, nextChar) {
  void nextChar;
  if (!prevChar || isWhitespace(prevChar)) return false;
  return true;
}

function collectStrongMatchesInPlainText(segment, baseOffset) {
  const matches = [];
  const stack = [];

  for (let i = 0; i < segment.length - 1; i += 1) {
    const marker = segment.startsWith("**", i)
      ? "**"
      : segment.startsWith("__", i)
        ? "__"
        : null;

    if (!marker) continue;
    if (isEscaped(segment, i)) {
      i += 1;
      continue;
    }

    const prevChar = i > 0 ? segment[i - 1] : "";
    const nextChar = i + 2 < segment.length ? segment[i + 2] : "";

    const top = stack.length > 0 ? stack[stack.length - 1] : null;
    const closesExisting =
      !!top && top.marker === marker && canCloseStrong(prevChar, nextChar);
    const opensNew = canOpenStrong(prevChar, nextChar);

    if (closesExisting) {
      const opener = stack.pop();
      const contentFrom = baseOffset + opener.contentStart;
      const contentTo = baseOffset + i;
      if (contentFrom < contentTo) {
        matches.push({
          contentFrom,
          contentTo,
          openMarkerFrom: baseOffset + opener.markerStart,
          openMarkerTo: baseOffset + opener.markerStart + 2,
          closeMarkerFrom: baseOffset + i,
          closeMarkerTo: baseOffset + i + 2,
        });
      }
      i += 1;
      continue;
    }

    if (opensNew) {
      stack.push({ marker, markerStart: i, contentStart: i + 2 });
      i += 1;
      continue;
    }
  }

  return matches;
}

function collectStrongMatches(text, baseOffset) {
  const matches = [];

  let cursor = 0;
  while (cursor < text.length) {
    let tickStart = -1;
    for (let i = cursor; i < text.length; i += 1) {
      if (text[i] === "`" && !isEscaped(text, i)) {
        tickStart = i;
        break;
      }
    }

    if (tickStart === -1) {
      matches.push(
        ...collectStrongMatchesInPlainText(text.slice(cursor), baseOffset + cursor)
      );
      break;
    }

    if (tickStart > cursor) {
      matches.push(
        ...collectStrongMatchesInPlainText(
          text.slice(cursor, tickStart),
          baseOffset + cursor
        )
      );
    }

    const tickCount = countCharRun(text, tickStart, "`");
    let tickEnd = -1;
    for (let i = tickStart + tickCount; i < text.length; i += 1) {
      if (text[i] !== "`") continue;
      const run = countCharRun(text, i, "`");
      if (run === tickCount) {
        tickEnd = i;
        break;
      }
      i += run - 1;
    }

    if (tickEnd === -1) {
      matches.push(
        ...collectStrongMatchesInPlainText(
          text.slice(tickStart),
          baseOffset + tickStart
        )
      );
      break;
    }

    cursor = tickEnd + tickCount;
  }

  return matches;
}

function collectLatexParenMathMatchesInPlainText(segment, baseOffset) {
  const matches = [];

  for (let i = 0; i < segment.length - 1; i += 1) {
    const kind = segment.startsWith("\\(", i)
      ? "inline"
      : segment.startsWith("\\[", i)
        ? "block"
        : null;
    if (!kind) continue;
    if (isEscaped(segment, i)) {
      i += 1;
      continue;
    }

    const closeToken = kind === "inline" ? "\\)" : "\\]";
    let closeIndex = -1;
    for (let j = i + 2; j < segment.length - 1; j += 1) {
      if (!segment.startsWith(closeToken, j)) continue;
      if (isEscaped(segment, j)) continue;
      closeIndex = j;
      break;
    }
    if (closeIndex === -1) continue;

    matches.push({
      kind,
      expression: segment.slice(i + 2, closeIndex),
      openMarkerFrom: baseOffset + i,
      openMarkerTo: baseOffset + i + 2,
      closeMarkerFrom: baseOffset + closeIndex,
      closeMarkerTo: baseOffset + closeIndex + 2,
    });
    i = closeIndex + 1;
  }

  return matches;
}

function collectLatexParenMathMatches(text, baseOffset) {
  const matches = [];

  let cursor = 0;
  while (cursor < text.length) {
    let tickStart = -1;
    for (let i = cursor; i < text.length; i += 1) {
      if (text[i] === "`" && !isEscaped(text, i)) {
        tickStart = i;
        break;
      }
    }

    if (tickStart === -1) {
      matches.push(
        ...collectLatexParenMathMatchesInPlainText(
          text.slice(cursor),
          baseOffset + cursor
        )
      );
      break;
    }

    if (tickStart > cursor) {
      matches.push(
        ...collectLatexParenMathMatchesInPlainText(
          text.slice(cursor, tickStart),
          baseOffset + cursor
        )
      );
    }

    const tickCount = countCharRun(text, tickStart, "`");
    let tickEnd = -1;
    for (let i = tickStart + tickCount; i < text.length; i += 1) {
      if (text[i] !== "`") continue;
      const run = countCharRun(text, i, "`");
      if (run === tickCount) {
        tickEnd = i;
        break;
      }
      i += run - 1;
    }

    if (tickEnd === -1) {
      break;
    }
    cursor = tickEnd + tickCount;
  }

  return matches;
}

function collectLatexMathMatchesByKind(text, baseOffset, kind) {
  return collectLatexParenMathMatches(text, baseOffset).filter(
    (match) => match.kind === kind
  );
}

function matchOverlapsVisibleRanges(match, visibleRanges) {
  for (const vr of visibleRanges) {
    if (rangesIntersect(match.openMarkerFrom, match.closeMarkerTo, vr.from, vr.to)) {
      return true;
    }
  }
  return false;
}

function rangesIntersect(aFrom, aTo, bFrom, bTo) {
  return aFrom < bTo && bFrom < aTo;
}

function shouldHideMarkersForMatch(match, selection) {
  if (!selection) return true;

  const radius = 2;
  const openFrom = Math.max(0, match.openMarkerFrom - radius);
  const openTo = match.openMarkerTo + radius;
  const closeFrom = Math.max(0, match.closeMarkerFrom - radius);
  const closeTo = match.closeMarkerTo + radius;

  const selFrom = Math.min(selection.from, selection.to);
  const selTo = Math.max(selection.from, selection.to);

  if (selFrom === selTo) {
    const head = selFrom;
    const nearOpen = head >= openFrom && head <= openTo;
    const nearClose = head >= closeFrom && head <= closeTo;
    return !(nearOpen || nearClose);
  }

  const touchesOpen = rangesIntersect(selFrom, selTo, openFrom, openTo);
  const touchesClose = rangesIntersect(selFrom, selTo, closeFrom, closeTo);
  return !(touchesOpen || touchesClose);
}

function shouldRenderLatexMathWidget(match, selection) {
  if (!selection) return true;
  // Keep trigger boundaries tight: preview comes back as soon as the caret
  // leaves the exact math range, instead of requiring multiple extra moves.
  const from = match.openMarkerFrom;
  const to = match.closeMarkerTo;
  const selFrom = Math.min(selection.from, selection.to);
  const selTo = Math.max(selection.from, selection.to);

  if (selFrom === selTo) {
    const head = selFrom;
    return !(head >= from && head <= to);
  }

  return !rangesIntersect(selFrom, selTo, from, to);
}

function isBuiltinMathWidgetCandidate(widget) {
  if (!widget || typeof widget !== "object") return false;
  const proto = widget.constructor?.prototype;
  if (!proto) return false;

  return (
    Object.hasOwn(widget, "math") &&
    Object.hasOwn(widget, "block") &&
    typeof proto.initDOM === "function" &&
    typeof proto.render === "function" &&
    typeof proto.setPos === "function" &&
    typeof proto.hookClickHandler === "function" &&
    typeof proto.addEditButton === "function" &&
    typeof proto.resizeWidget === "function"
  );
}

function patchDecorationForBuiltinMathWidget(plugin) {
  const originalReplace = Decoration.replace;
  const originalWidget = Decoration.widget;

  const tryCapture = (candidate) => {
    if (plugin.builtinMathWidgetCtor) return;
    if (!isBuiltinMathWidgetCandidate(candidate)) return;
    plugin.builtinMathWidgetCtor = candidate.constructor;
    plugin.bumpDecorationEpoch();
  };

  Decoration.replace = function patchedReplace(spec) {
    if (spec && spec.widget) tryCapture(spec.widget);
    return originalReplace.call(this, spec);
  };

  Decoration.widget = function patchedWidget(spec) {
    if (spec && spec.widget) tryCapture(spec.widget);
    return originalWidget.call(this, spec);
  };

  return () => {
    Decoration.replace = originalReplace;
    Decoration.widget = originalWidget;
  };
}

function createBuiltinMathWidget(match, ctor) {
  if (!ctor) return null;
  try {
    const block = match.kind === "block";
    const widget = new ctor(match.expression, block);
    if (typeof widget.setPos === "function") {
      let contentFrom = match.openMarkerTo;
      let contentTo = match.closeMarkerFrom;
      if (block && match.expression.startsWith("\n")) contentFrom += 1;
      if (block && match.expression.endsWith("\n")) contentTo -= 1;
      if (contentTo < contentFrom) {
        contentFrom = match.openMarkerTo;
        contentTo = match.closeMarkerFrom;
      }
      widget.setPos(contentFrom, contentTo);
    }
    return widget;
  } catch (error) {
    console.error("live-preview-bold-fix builtin math widget error", error);
    return null;
  }
}

function buildDecorations(view) {
  if (!isLivePreview(view)) return Decoration.none;

  const marks = [];
  const seenMathRanges = new Set();
  const selection = view.state.selection?.main ?? null;
  const mathWidgetCtor = ACTIVE_PLUGIN?.builtinMathWidgetCtor ?? null;
  const addMathReplacement = (match) => {
    if (!mathWidgetCtor) return;
    const key = `${match.kind}:${match.openMarkerFrom}:${match.closeMarkerTo}`;
    if (seenMathRanges.has(key)) return;
    seenMathRanges.add(key);

    if (!shouldRenderLatexMathWidget(match, selection)) return;

    const widget = createBuiltinMathWidget(match, mathWidgetCtor);
    if (!widget) return;

    // Keep replace decorations non-block to avoid unstable cross-line editing behavior.
    marks.push(
      Decoration.replace({
        widget,
        block: false,
      }).range(match.openMarkerFrom, match.closeMarkerTo)
    );
  };

  for (const range of view.visibleRanges) {
    let pos = range.from;
    while (pos <= range.to) {
      const line = view.state.doc.lineAt(pos);
      const strongMatches = collectStrongMatches(line.text, line.from);
      for (const match of strongMatches) {
        marks.push(
          Decoration.mark({ class: "lp-strong-fix" }).range(
            match.contentFrom,
            match.contentTo
          )
        );
        if (shouldHideMarkersForMatch(match, selection)) {
          marks.push(
            Decoration.mark({ class: "lp-strong-marker-fix" }).range(
              match.openMarkerFrom,
              match.openMarkerTo
            )
          );
          marks.push(
            Decoration.mark({ class: "lp-strong-marker-fix" }).range(
              match.closeMarkerFrom,
              match.closeMarkerTo
            )
          );
        }
      }

      const inlineMathMatches = collectLatexMathMatchesByKind(
        line.text,
        line.from,
        "inline"
      );
      for (const match of inlineMathMatches) {
        addMathReplacement(match);
      }

      if (line.to >= range.to) break;
      pos = line.to + 1;
    }
  }

  const docText = view.state.doc.toString();
  const blockMathMatches = collectLatexMathMatchesByKind(docText, 0, "block");
  for (const match of blockMathMatches) {
    if (!matchOverlapsVisibleRanges(match, view.visibleRanges)) continue;
    addMathReplacement(match);
  }

  return Decoration.set(marks, true);
}

const livePreviewStrongFixExtension = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.epoch = ACTIVE_PLUGIN?.decorationEpoch ?? 0;
      this.decorations = buildDecorations(view);
    }

    update(update) {
      const nextEpoch = ACTIVE_PLUGIN?.decorationEpoch ?? this.epoch;
      if (
        nextEpoch !== this.epoch ||
        update.docChanged ||
        update.viewportChanged ||
        update.selectionSet ||
        update.focusChanged
      ) {
        this.epoch = nextEpoch;
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  {
    decorations: (value) => value.decorations,
  }
);

module.exports = class LivePreviewBoldFixPlugin extends Plugin {
  async onload() {
    ACTIVE_PLUGIN = this;
    this.builtinMathWidgetCtor = null;
    this.decorationEpoch = 0;
    this.refreshScheduled = false;

    const styleEl = document.createElement("style");
    styleEl.textContent = `
      .markdown-source-view.mod-cm6.is-live-preview .cm-line .cm-strong {
        font-weight: inherit !important;
      }
      .markdown-source-view.mod-cm6.is-live-preview .cm-line .cm-formatting-strong {
        font-weight: inherit !important;
      }
      .markdown-source-view.mod-cm6.is-live-preview .cm-line .cm-hmd-strong {
        font-weight: inherit !important;
      }
      .markdown-source-view.mod-cm6.is-live-preview .cm-line strong {
        font-weight: inherit !important;
      }

      .markdown-source-view.mod-cm6.is-live-preview .cm-line .lp-strong-fix {
        font-weight: 700 !important;
      }

      .markdown-source-view.mod-cm6.is-live-preview .cm-line .lp-strong-marker-fix {
        font-size: 0 !important;
        letter-spacing: 0 !important;
      }
    `;
    document.head.appendChild(styleEl);
    this.register(() => styleEl.remove());

    this.register(patchDecorationForBuiltinMathWidget(this));
    this.registerEditorExtension(livePreviewStrongFixExtension);
  }

  bumpDecorationEpoch() {
    this.decorationEpoch += 1;
    if (this.refreshScheduled) return;
    this.refreshScheduled = true;
    window.setTimeout(() => {
      this.refreshScheduled = false;
      const leaves = this.app.workspace.getLeavesOfType("markdown");
      for (const leaf of leaves) {
        const cm = leaf.view?.editor?.cm;
        if (!cm) continue;
        cm.dispatch({ selection: cm.state.selection });
      }
    }, 0);
  }

  onunload() {
    if (ACTIVE_PLUGIN === this) ACTIVE_PLUGIN = null;
  }
};
