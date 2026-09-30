import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Download,
  FilePlus,
  FolderOpen,
  HelpCircle,
  Search,
  Terminal,
  WrapText,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadTab, useEditor } from "@/store/editor-store";
import { EditorPane } from "./editor-pane";

export function EchoApp() {
  const store = useEditor();
  const ta = useRef<HTMLTextAreaElement>(null);
  const [gotoVal, setGotoVal] = useState("");
  const [saveName, setSaveName] = useState("");
  const tab = store.activeTab();

  useEffect(() => {
    store.hydrate();
  }, [store]);

  useEffect(() => {
    ta.current?.focus();
  }, [tab.id, store.overlay]);

  useEffect(() => {
    const onCopy = (e: ClipboardEvent) => {
      if (store.overlay !== "none" && store.overlay !== "find") return;
      e.preventDefault();
      e.clipboardData?.setData("text/plain", store.selectionText());
      store.msg; // keep
    };
    document.addEventListener("copy", onCopy);
    return () => document.removeEventListener("copy", onCopy);
  }, [store]);

  const save = () => {
    downloadTab(tab);
    store.markSaved();
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const overlay = store.overlay;
    if (overlay === "help" && e.key !== "F1") {
      if (e.key === "Escape") {
        e.preventDefault();
        store.setOverlay("none");
      }
      return;
    }
    if (overlay === "quit") {
      const k = e.key.toLowerCase();
      if (k === "y") store.confirmQuit("save");
      else if (k === "n") store.confirmQuit("discard");
      else if (k === "Escape" || k === "c") store.confirmQuit("cancel");
      e.preventDefault();
      return;
    }
    if (overlay === "goto" || overlay === "saveas" || overlay === "cli") {
      if (e.key === "Escape") {
        e.preventDefault();
        store.setOverlay("none");
      }
      return;
    }

    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    const alt = e.altKey;

    const mapMove: Record<string, string> = {
      ArrowLeft: ctrl ? "C-LEFT" : "LEFT",
      ArrowRight: ctrl ? "C-RIGHT" : "RIGHT",
      ArrowUp: "UP",
      ArrowDown: "DOWN",
      Home: ctrl ? "C-HOME" : "HOME",
      End: ctrl ? "C-END" : "END",
      PageUp: "PGUP",
      PageDown: "PGDN",
    };

    if (overlay === "find") {
      if (e.key === "Escape") {
        e.preventDefault();
        store.setOverlay("none");
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (shift) store.findNext(-1);
        else if (ctrl && e.key === "Enter") store.replaceAll();
        else store.findNext(1);
        return;
      }
      if (e.key === "F3") {
        e.preventDefault();
        store.findNext(shift ? -1 : 1);
        return;
      }
      return;
    }

    if (e.key === "F1") {
      e.preventDefault();
      store.setOverlay(store.overlay === "help" ? "none" : "help");
      return;
    }
    if (e.key === "F3") {
      e.preventDefault();
      store.findNext(shift ? -1 : 1);
      return;
    }
    if (e.key === "F2") {
      e.preventDefault();
      setSaveName(tab.name);
      store.setOverlay("saveas");
      return;
    }

    if (ctrl && !alt) {
      const k = e.key.toLowerCase();
      if (k === "c") {
        e.preventDefault();
        void navigator.clipboard.writeText(store.selectionText());
        return;
      }
      if (k === "x") {
        e.preventDefault();
        void navigator.clipboard.writeText(store.selectionText());
        store.replaceSel("");
        return;
      }
      if (k === "v") {
        return; // native paste on textarea
      }
      if (k === "z") {
        e.preventDefault();
        store.undo();
        return;
      }
      if (k === "y") {
        e.preventDefault();
        store.redo();
        return;
      }
      if (k === "a") {
        e.preventDefault();
        store.selectAll();
        return;
      }
      if (k === "s") {
        e.preventDefault();
        save();
        return;
      }
      if (k === "f") {
        e.preventDefault();
        store.setOverlay("find");
        return;
      }
      if (k === "h" || k === "r") {
        e.preventDefault();
        store.setOverlay("find");
        return;
      }
      if (k === "q") {
        e.preventDefault();
        store.requestQuit();
        return;
      }
      if (k === "g") {
        e.preventDefault();
        setGotoVal("");
        store.setOverlay("goto");
        return;
      }
      if (k === "w") {
        e.preventDefault();
        store.toggleWrap();
        return;
      }
      if (k === "d") {
        e.preventDefault();
        store.dupLine();
        return;
      }
      if (k === "l") {
        e.preventDefault();
        store.delLine();
        return;
      }
      if (k === "/" || k === "_") {
        e.preventDefault();
        store.toggleComment();
        return;
      }
    }

    if (alt && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      store.moveLines(e.key === "ArrowUp" ? -1 : 1);
      return;
    }
    if (alt && e.key.toLowerCase() === "z") {
      e.preventDefault();
      store.toggleWrap();
      return;
    }

    if (mapMove[e.key]) {
      e.preventDefault();
      store.move(mapMove[e.key], shift);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      store.newline();
      return;
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      store.backspace();
      return;
    }
    if (e.key === "Delete") {
      e.preventDefault();
      store.del();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      store.tab(shift);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      store.setOverlay("none");
      store.setCursor(tab.cursor, false);
      return;
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    if (text) store.replaceSel(text);
  };

  const onInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const v = e.currentTarget.value;
    if (!v) return;
    e.currentTarget.value = "";
    if (store.overlay !== "none") return;
    store.replaceSel(v);
  };

  const dirty = tab.gen !== tab.savedGen;
  const selLen = (() => {
    if (!tab.anchor) return 0;
    const t = store.selectionText();
    return t.endsWith("\n") && !tab.anchor ? 0 : t.length;
  })();

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-bg text-fg">
      <header className="flex shrink-0 items-center gap-2 border-b border-border bg-surface px-3 py-2">
        <LogoMark />
        <div className="min-w-0 flex-1">
          <div className="font-sans text-sm font-medium tracking-tight">ECHO Text Editor</div>
          <div className="truncate font-mono text-xs text-muted">ete · ShadyDevelopment</div>
        </div>
        <div className="hidden items-center gap-1 sm:flex">
          <IconBtn label="New" onClick={() => store.newFile()}>
            <FilePlus className="size-4" />
          </IconBtn>
          <label className="inline-flex">
            <input
              type="file"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                store.openText(f.name, await f.text());
                e.target.value = "";
              }}
            />
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-sm text-muted hover:bg-elevated hover:text-fg">
              <FolderOpen className="size-4" />
              <span className="sr-only">Open file</span>
            </span>
          </label>
          <IconBtn label="Save" onClick={save}>
            <Download className="size-4" />
          </IconBtn>
          <IconBtn label="Find" onClick={() => store.setOverlay("find")}>
            <Search className="size-4" />
          </IconBtn>
          <IconBtn label="Wrap" onClick={() => store.toggleWrap()}>
            <WrapText className="size-4" />
          </IconBtn>
          <IconBtn label="Linux CLI" onClick={() => store.setOverlay("cli")}>
            <Terminal className="size-4" />
          </IconBtn>
          <IconBtn label="Help" onClick={() => store.setOverlay(store.overlay === "help" ? "none" : "help")}>
            <HelpCircle className="size-4" />
          </IconBtn>
        </div>
      </header>

      <nav className="flex shrink-0 items-end gap-px overflow-x-auto border-b border-border bg-gutter px-1 pt-1">
        {store.tabs.map((t) => {
          const on = t.id === tab.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => store.setActive(t.id)}
              className={cn(
                "group flex h-9 max-w-48 items-center gap-2 rounded-t-sm px-3 font-mono text-xs",
                on ? "bg-bg text-fg" : "text-muted hover:bg-elevated hover:text-fg",
              )}
            >
              <span className="truncate">
                {t.name}
                {t.gen !== t.savedGen ? " *" : ""}
              </span>
              <span
                role="button"
                tabIndex={0}
                className="rounded-xs p-1 text-subtle hover:bg-elevated hover:text-fg"
                onClick={(e) => {
                  e.stopPropagation();
                  store.closeTab(t.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") store.closeTab(t.id);
                }}
              >
                <X className="size-3" />
              </span>
            </button>
          );
        })}
        <button
          type="button"
          className="mb-0.5 ml-1 inline-flex h-8 w-8 items-center justify-center rounded-sm text-muted hover:bg-elevated hover:text-fg"
          onClick={() => store.newFile()}
          aria-label="New file"
        >
          <FilePlus className="size-4" />
        </button>
      </nav>

      <div className="flex min-h-0 flex-1">
        <EditorPane />
      </div>

      {store.overlay === "find" ? (
        <FindBar />
      ) : null}

      <footer className="flex h-7 shrink-0 items-center justify-between gap-3 overflow-hidden border-t border-border bg-surface px-3 font-mono text-[11px] text-muted">
        <span className="truncate font-medium text-fg">
          {tab.name}
          {dirty ? " *" : ""}
        </span>
        <span className="hidden truncate sm:inline">{store.msg}</span>
        <span className="shrink-0 tabular-nums">
          Ln {tab.cursor.r + 1}/{tab.lines.length}, Col {tab.cursor.c + 1}
          {selLen > 1 ? ` | Sel ${selLen}` : ""} | {tab.lang} | UTF-8 | LF
          {tab.wrap ? " | WRAP" : ""} | {tab.useTabs ? "Tab" : `Sp:${tab.indentW}`} |{" "}
          <span className={dirty ? "text-warn" : "text-accent"}>{dirty ? "Modified" : "Saved"}</span>
        </span>
      </footer>

      <textarea
        ref={ta}
        aria-label="Editor input"
        className="sr-only"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        onKeyDown={onKey}
        onPaste={onPaste}
        onInput={onInput}
        onBlur={() => {
          if (store.overlay === "none") queueMicrotask(() => ta.current?.focus());
        }}
      />

      <div className="flex shrink-0 gap-1 overflow-x-auto border-t border-border bg-surface p-2 sm:hidden">
        <MobBtn onClick={() => store.undo()}>Undo</MobBtn>
        <MobBtn onClick={save}>Save</MobBtn>
        <MobBtn onClick={() => store.setOverlay("find")}>Find</MobBtn>
        <MobBtn onClick={() => store.toggleWrap()}>Wrap</MobBtn>
        <MobBtn onClick={() => store.setOverlay("cli")}>CLI</MobBtn>
        <MobBtn onClick={() => store.setOverlay("help")}>Help</MobBtn>
      </div>

      {store.overlay === "help" ? <HelpModal onClose={() => store.setOverlay("none")} /> : null}
      {store.overlay === "quit" ? (
        <Modal
          title={`Save changes to ${tab.name}?`}
          onClose={() => store.confirmQuit("cancel")}
        >
          <p className="text-sm text-muted">The buffer has unsaved edits.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Primary onClick={() => store.confirmQuit("save")}>Save</Primary>
            <Ghost onClick={() => store.confirmQuit("discard")}>Don't save</Ghost>
            <Ghost onClick={() => store.confirmQuit("cancel")}>Cancel</Ghost>
          </div>
        </Modal>
      ) : null}
      {store.overlay === "goto" ? (
        <Modal title="Go to line" onClose={() => store.setOverlay("none")}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const [ln, col] = gotoVal.split(/[: ,]/);
              store.gotoLine(Number(ln) || 1, col ? Number(col) : 1);
            }}
          >
            <input
              autoFocus
              value={gotoVal}
              onChange={(e) => setGotoVal(e.target.value)}
              placeholder="line[:col]"
              className="h-11 w-full rounded-md border border-border bg-elevated px-3 font-mono text-sm text-fg outline-none ring-accent focus:ring-2"
            />
            <div className="mt-4">
              <Primary type="submit">Go</Primary>
            </div>
          </form>
        </Modal>
      ) : null}
      {store.overlay === "saveas" ? (
        <Modal title="Save as" onClose={() => store.setOverlay("none")}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (saveName.trim()) {
                store.rename(saveName.trim());
                downloadTab({ ...tab, name: saveName.trim() });
                store.markSaved();
                store.setOverlay("none");
              }
            }}
          >
            <input
              autoFocus
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              className="h-11 w-full rounded-md border border-border bg-elevated px-3 font-mono text-sm text-fg outline-none ring-accent focus:ring-2"
            />
            <div className="mt-4">
              <Primary type="submit">Download</Primary>
            </div>
          </form>
        </Modal>
      ) : null}
      {store.overlay === "cli" ? <CliPanel onClose={() => store.setOverlay("none")} /> : null}
    </div>
  );
}

function FindBar() {
  const store = useEditor();
  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-surface px-3 py-2 sm:flex-row sm:items-center">
      <label className="flex min-w-0 flex-1 items-center gap-2">
        <span className="shrink-0 font-mono text-xs text-muted">Find</span>
        <input
          autoFocus
          value={store.findText}
          onChange={(e) => store.setFind({ findText: e.target.value })}
          className="h-10 min-w-0 flex-1 rounded-sm border border-border bg-elevated px-2 font-mono text-sm text-fg outline-none ring-accent focus:ring-2"
        />
      </label>
      <label className="flex min-w-0 flex-1 items-center gap-2">
        <span className="shrink-0 font-mono text-xs text-muted">Replace</span>
        <input
          value={store.replText}
          onChange={(e) => store.setFind({ replText: e.target.value })}
          className="h-10 min-w-0 flex-1 rounded-sm border border-border bg-elevated px-2 font-mono text-sm text-fg outline-none ring-accent focus:ring-2"
        />
      </label>
      <div className="flex flex-wrap items-center gap-1">
        <Ghost onClick={() => store.findNext(1)}>Next</Ghost>
        <Ghost onClick={() => store.findNext(-1)}>Prev</Ghost>
        <Ghost onClick={() => store.replaceOne()}>Replace</Ghost>
        <Ghost onClick={() => store.replaceAll()}>All</Ghost>
        <label className="ml-2 flex items-center gap-1 font-mono text-xs text-muted">
          <input
            type="checkbox"
            checked={store.findCase}
            onChange={(e) => store.setFind({ findCase: e.target.checked })}
          />
          Aa
        </label>
        <label className="flex items-center gap-1 font-mono text-xs text-muted">
          <input
            type="checkbox"
            checked={store.findRegex}
            onChange={(e) => store.setFind({ findRegex: e.target.checked })}
          />
          .*
        </label>
        <IconBtn label="Close find" onClick={() => store.setOverlay("none")}>
          <X className="size-4" />
        </IconBtn>
      </div>
    </div>
  );
}

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="ECHO · key reference" onClose={onClose} wide>
      <pre className="overflow-auto font-mono text-xs leading-5 text-muted">
        {`File      Ctrl+S Save      F2 Save As      Ctrl+Q Close tab
Edit      Ctrl+Z Undo      Ctrl+Y Redo     Ctrl+C/X/V Copy/Cut/Paste
          Ctrl+A Select all   Ctrl+D Duplicate   Ctrl+L Delete line
          Ctrl+/ Comment      Tab / Shift+Tab Indent
          Alt+Up/Down Move line(s)
Search    Ctrl+F Find   Ctrl+R Replace   F3 Next   Ctrl+G Go to line
View      Ctrl+W or Alt+Z  Word wrap
Select    Shift+Arrows · mouse drag · double-click word · triple-click line

Without a selection, copy/cut takes the current line.

The Linux CLI build (ete) is a single Python 3 file using curses.
Open the CLI panel to download ete.py and the install snippet.`}
      </pre>
    </Modal>
  );
}

function CliPanel({ onClose }: { onClose: () => void }) {
  const store = useEditor();
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    fetch("/ete.py")
      .then((r) => r.text())
      .then(setSrc)
      .catch(() => setSrc("# Could not load ete.py"));
  }, []);

  return (
    <Modal title="Linux CLI · ete" onClose={onClose} wide>
      <p className="text-sm text-muted">
        Single-file Python 3 editor (stdlib curses). Same Windows-style shortcuts, including Ctrl+C copy without
        killing the process.
      </p>
      <ol className="mt-4 list-decimal space-y-2 pl-5 font-mono text-xs leading-5 text-fg">
        <li>
          <a href="/ete.py" download="ete.py" className="text-accent underline-offset-2 hover:underline">
            Download ete.py
          </a>
        </li>
        <li>Install globally:
          <pre className="mt-2 overflow-auto rounded-md bg-elevated p-3 text-[11px] text-muted">{`mkdir -p ~/.local/bin
install -m 755 ete.py ~/.local/bin/ete
# ensure ~/.local/bin is on PATH
ete --version
ete filename.txt`}</pre>
        </li>
        <li>Or run in place: <code className="text-accent">python3 ete.py notes.md</code></li>
      </ol>
      <div className="mt-4 flex flex-wrap gap-2">
        <Primary
          onClick={() => {
            if (src) store.openText("ete.py", src);
            onClose();
          }}
        >
          Open source in editor
        </Primary>
        <Ghost
          onClick={() => {
            store.openSample("py");
            onClose();
          }}
        >
          Python sample
        </Ghost>
      </div>
    </Modal>
  );
}

function LogoMark() {
  return (
    <svg viewBox="0 0 40 40" className="size-9 shrink-0 text-accent" aria-hidden="true">
      <rect width="40" height="40" rx="8" className="fill-elevated" />
      <path d="M6 8 L20 20 L6 32" fill="none" stroke="currentColor" strokeWidth="4" />
      <path d="M24 10 h10 v3.2 h-6.4 v4.2 h6.4 v3.2 h-6.4 V26 H34 v3.2 H24 z" fill="currentColor" />
    </svg>
  );
}

function IconBtn({
  children,
  onClick,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-sm text-muted hover:bg-elevated hover:text-fg"
    >
      {children}
    </button>
  );
}

function MobBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-10 rounded-sm border border-border bg-elevated px-3 font-mono text-xs text-fg"
    >
      {children}
    </button>
  );
}

function Modal({
  title,
  children,
  onClose,
  wide,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-bg/70 p-3 sm:items-center" onClick={onClose}>
      <div
        className={cn(
          "max-h-[85dvh] w-full overflow-auto rounded-xl border border-border bg-surface p-5 shadow-lg",
          wide ? "max-w-2xl" : "max-w-md",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="font-sans text-base font-medium tracking-tight">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-sm p-1 text-muted hover:text-fg" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Primary({
  children,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="inline-flex h-10 items-center rounded-md bg-accent px-4 font-sans text-sm font-medium text-accent-fg hover:opacity-90"
    >
      {children}
    </button>
  );
}

function Ghost({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center rounded-md border border-border px-3 font-sans text-sm text-fg hover:bg-elevated"
    >
      {children}
    </button>
  );
}
