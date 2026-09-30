export const SAMPLE_PYTHON = `#!/usr/bin/env python3
"""ECHO sample — Python highlighting, auto-indent, and find/replace."""

from typing import Iterable


def fibonacci(n: int) -> list[int]:
    # Classic sequence, returned as a list
    a, b = 0, 1
    out = []
    for _ in range(n):
        out.append(a)
        a, b = b, a + b
    return out


class Echo:
    def __init__(self, name: str = "ECHO"):
        self.name = name

    def greet(self) -> str:
        return f"{self.name} Text Editor — Ctrl+S to save, Ctrl+F to find."


if __name__ == "__main__":
    print(Echo().greet())
    print(fibonacci(12))
`;

export const SAMPLE_JS = `// ECHO sample — JavaScript
const KEYS = {
  copy: "Ctrl+C",
  paste: "Ctrl+V",
  find: "Ctrl+F",
  save: "Ctrl+S",
};

function highlight(code) {
  return code.split("\\n").map((line, i) => ({ i, line }));
}

export async function openBuffer(path) {
  const res = await fetch(path);
  const text = await res.text();
  console.log("opened", path, text.length);
  return highlight(text);
}

openBuffer("/ete.py").then((rows) => {
  console.log(rows.slice(0, 5));
});
`;

export const SAMPLE_MD = `# ECHO Text Editor

A Notepad++-style editor for the Linux terminal — and this live preview.

## Shortcuts

- **Ctrl+C / X / V** — copy, cut, paste
- **Ctrl+Z / Y** — undo / redo
- **Ctrl+F / R** — find / replace
- **Ctrl+S** — download the current file
- **Ctrl+Q** — close the buffer (asks to save)
- **F1** — help

## Linux CLI

Download \`ete.py\` from the **Linux CLI** panel. It is a single-file Python 3 curses editor with the same keybindings.
`;

export const SAMPLE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>ECHO</title>
    <link rel="stylesheet" href="app.css" />
  </head>
  <body>
    <header>
      <h1>ECHO Text Editor</h1>
    </header>
    <!-- Click around, drag to select, double-click a word -->
    <main id="app"></main>
  </body>
</html>
`;
