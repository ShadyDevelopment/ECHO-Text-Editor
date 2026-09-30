# ECHO Text Editor

ECHO (`ete`) is a single-file terminal text editor for Linux, written in Python
3 with the standard-library `curses` module. It aims for a familiar GUI-editor
workflow in a terminal: Windows-style shortcuts, syntax coloring, mouse
selection, and undo/redo—without third-party Python dependencies.

## Run

```bash
python3 attachments/ete.py [ +LINE ] [FILE]
```

For example:

```bash
python3 attachments/ete.py notes.md
python3 attachments/ete.py +42 src/main.py
```

ECHO needs an interactive terminal. `curses` is included with most Linux Python
installations; on some distributions it is packaged separately (for example,
`python3-curses`).

## Install as `ete`

To install for the current user, put `ete.py` and `install-ete.sh` from
`public/` in the same directory, then run:

```bash
bash install-ete.sh
```

The script installs the executable as `~/.local/bin/ete`. If that directory is
not already on `PATH`, add this line to `~/.bashrc` or `~/.zshrc`, then open a
new shell:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

Alternatively, install the source directly:

```bash
install -Dm755 attachments/ete.py "$HOME/.local/bin/ete"
```

Check the installation and open a file:

```bash
ete --version
ete filename.txt
```

No installation is required to run `python3 attachments/ete.py filename.txt`.

## Build Debian and RPM packages

On Debian/Ubuntu, install `dpkg-deb` and `rpmbuild` (the `rpm` package on
Debian/Ubuntu), then build both packages with:

```bash
bash packaging/build-packages.sh 1.0.1
```

The script writes `ete_1.0.1_all.deb` and `ete-1.0.1-1.noarch.rpm` to `dist/`.
The `v*` Git tags are also built by GitHub Actions and published as GitHub
Releases with both packages attached.

## Shortcuts

| Shortcut | Action |
| --- | --- |
| Ctrl+C / Ctrl+X / Ctrl+V | Copy / cut / paste |
| Ctrl+Z / Ctrl+Y | Undo / redo |
| Ctrl+A | Select all |
| Ctrl+S / F2 | Save / Save as |
| Ctrl+F / Ctrl+R | Find / find and replace |
| F3 / Shift+F3 | Find next / previous |
| Ctrl+Q | Quit, prompting to save modified files |
| Ctrl+G | Go to line (optionally `line:column`) |
| Ctrl+W or Alt+Z | Toggle word wrap |
| Tab / Shift+Tab | Indent / unindent |
| F1 | Help |

Without a selection, Ctrl+C and Ctrl+X copy or cut the current line. Use the
mouse to place the cursor, drag to select, double-click to select a word,
triple-click to select a line, and scroll to move through the buffer.

Clipboard integration uses `wl-copy`/`wl-paste` on Wayland or `xclip`/`xsel`
under X11 when available. ECHO also keeps an internal clipboard and attempts
OSC 52 copying as a terminal fallback.

## Source files

- `attachments/ete.py` — standalone editor source.
- `public/ete.py` — identical copy served by the project’s CLI download panel.
- `public/install-ete.sh` — per-user installer for a colocated `ete.py`.
