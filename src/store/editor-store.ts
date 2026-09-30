import { create } from "zustand";
import { applyReplace, leadingIndent, mergeUndo, textRange, wordLeft, wordRight } from "@/lib/editor/buffer";
import { commentPrefix, detectLang } from "@/lib/editor/syntax";
import { SAMPLE_HTML, SAMPLE_JS, SAMPLE_MD, SAMPLE_PYTHON } from "@/lib/editor/samples";
import { clampPos, cmp, endOf, ordered, type LangName, type Op, type Pos, type TabDoc } from "@/lib/editor/types";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function fromText(name: string, text: string): TabDoc {
  const raw = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  let lines = raw.split("\n");
  if (lines.length > 1 && lines[lines.length - 1] === "") lines = lines.slice(0, -1);
  if (!lines.length) lines = [""];
  const lang = detectLang(name, lines[0] ?? "");
  return {
    id: uid(),
    name,
    lines,
    cursor: { r: 0, c: 0 },
    anchor: null,
    want: 0,
    undo: [],
    redo: [],
    gen: 0,
    savedGen: 0,
    lang,
    wrap: false,
    useTabs: false,
    indentW: 4,
  };
}

const SEED: TabDoc[] = [
  fromText("welcome.py", SAMPLE_PYTHON),
  fromText("demo.js", SAMPLE_JS),
  fromText("readme.md", SAMPLE_MD),
];
SEED[0].savedGen = 0;
SEED.forEach((t) => {
  t.savedGen = t.gen;
});

type Overlay = "none" | "find" | "help" | "quit" | "goto" | "cli" | "saveas";

type State = {
  tabs: TabDoc[];
  active: string;
  overlay: Overlay;
  findText: string;
  replText: string;
  findCase: boolean;
  findRegex: boolean;
  msg: string;
  hydrated: boolean;
  activeTab: () => TabDoc;
  setActive: (id: string) => void;
  newFile: () => void;
  openSample: (kind: "py" | "js" | "md" | "html") => void;
  openText: (name: string, text: string) => void;
  closeTab: (id: string, force?: boolean) => void;
  requestQuit: () => void;
  confirmQuit: (action: "save" | "discard" | "cancel") => void;
  setOverlay: (o: Overlay) => void;
  setFind: (p: Partial<Pick<State, "findText" | "replText" | "findCase" | "findRegex">>) => void;
  move: (base: string, select: boolean) => void;
  edit: (a: Pos, b: Pos, text: string, ca?: Pos) => void;
  replaceSel: (text: string) => void;
  newline: () => void;
  backspace: () => void;
  del: () => void;
  tab: (out: boolean) => void;
  undo: () => void;
  redo: () => void;
  selectAll: () => void;
  setCursor: (p: Pos, select?: boolean) => void;
  selectWord: (p: Pos) => void;
  selectLine: (r: number) => void;
  toggleWrap: () => void;
  toggleComment: () => void;
  dupLine: () => void;
  delLine: () => void;
  moveLines: (d: number) => void;
  findNext: (dir?: 1 | -1) => void;
  replaceOne: () => void;
  replaceAll: () => void;
  gotoLine: (n: number, c?: number) => void;
  markSaved: () => void;
  rename: (name: string) => void;
  selectionText: () => string;
  hydrate: () => void;
};

function persist(tabs: TabDoc[], active: string) {
  try {
    const slim = tabs.map((t) => ({
      ...t,
      undo: t.undo.slice(-40),
      redo: [],
    }));
    localStorage.setItem("echo-ete", JSON.stringify({ tabs: slim, active }));
  } catch {
    /* ignore quota */
  }
}

function patchActive(tabs: TabDoc[], id: string, fn: (t: TabDoc) => TabDoc): TabDoc[] {
  return tabs.map((t) => (t.id === id ? fn(t) : t));
}

function unit(t: TabDoc) {
  return t.useTabs ? "\t" : " ".repeat(t.indentW);
}

export const useEditor = create<State>((set, get) => ({
  tabs: SEED,
  active: SEED[0].id,
  overlay: "none",
  findText: "",
  replText: "",
  findCase: false,
  findRegex: false,
  msg: "F1 Help   Ctrl+S Save   Ctrl+F Find   Ctrl+Q Close",
  hydrated: false,

  activeTab() {
    const s = get();
    return s.tabs.find((t) => t.id === s.active) ?? s.tabs[0];
  },

  setActive(id) {
    set({ active: id, overlay: "none" });
    persist(get().tabs, id);
  },

  newFile() {
    const t = fromText("untitled.txt", "");
    t.lang = "Plain Text";
    set((s) => {
      const tabs = [...s.tabs, t];
      persist(tabs, t.id);
      return { tabs, active: t.id, overlay: "none" };
    });
  },

  openSample(kind) {
    const map = {
      py: ["welcome.py", SAMPLE_PYTHON],
      js: ["demo.js", SAMPLE_JS],
      md: ["readme.md", SAMPLE_MD],
      html: ["index.html", SAMPLE_HTML],
    } as const;
    const [name, text] = map[kind];
    get().openText(name, text);
  },

  openText(name, text) {
    const t = fromText(name, text);
    t.savedGen = t.gen;
    set((s) => {
      const tabs = [...s.tabs, t];
      persist(tabs, t.id);
      return { tabs, active: t.id, overlay: "none", msg: `Opened ${name}` };
    });
  },

  closeTab(id, force) {
    const s = get();
    const t = s.tabs.find((x) => x.id === id);
    if (!t) return;
    if (!force && t.gen !== t.savedGen) {
      set({ active: id, overlay: "quit" });
      return;
    }
    const tabs = s.tabs.filter((x) => x.id !== id);
    if (!tabs.length) {
      const n = fromText("untitled.txt", "");
      set({ tabs: [n], active: n.id, overlay: "none" });
      persist([n], n.id);
      return;
    }
    const active = s.active === id ? tabs[tabs.length - 1].id : s.active;
    set({ tabs, active, overlay: "none" });
    persist(tabs, active);
  },

  requestQuit() {
    const t = get().activeTab();
    if (t.gen !== t.savedGen) set({ overlay: "quit" });
    else get().closeTab(t.id, true);
  },

  confirmQuit(action) {
    const t = get().activeTab();
    if (action === "cancel") {
      set({ overlay: "none" });
      return;
    }
    if (action === "save") {
      set({ overlay: "none" });
      get().markSaved();
      downloadTab(t);
    }
    get().closeTab(t.id, true);
  },

  setOverlay(o) {
    set({ overlay: o });
  },

  setFind(p) {
    set(p);
  },

  move(base, select) {
    set((s) => {
      const tabs = patchActive(s.tabs, s.active, (t) => {
        const L = t.lines;
        let { r, c } = t.cursor;
        const sel = t.anchor && cmp(t.anchor, t.cursor) !== 0 ? ordered(t.anchor, t.cursor) : null;
        const go = (nr: number, nc: number, keepWant = false) => {
          const p = clampPos(L, { r: nr, c: nc });
          return {
            ...t,
            cursor: p,
            anchor: select ? (t.anchor ?? t.cursor) : null,
            want: keepWant ? t.want : p.c,
          };
        };
        if (base === "LEFT") {
          if (sel && !select) return go(sel[0].r, sel[0].c);
          if (c > 0) return go(r, c - 1);
          if (r > 0) return go(r - 1, L[r - 1].length);
          return t;
        }
        if (base === "RIGHT") {
          if (sel && !select) return go(sel[1].r, sel[1].c);
          if (c < L[r].length) return go(r, c + 1);
          if (r + 1 < L.length) return go(r + 1, 0);
          return t;
        }
        if (base === "UP") return go(r - 1, Math.min(t.want, (L[r - 1] ?? "").length), true);
        if (base === "DOWN") return go(r + 1, Math.min(t.want, (L[r + 1] ?? "").length), true);
        if (base === "HOME") {
          const ind = L[r].length - L[r].trimStart().length;
          return go(r, c === ind && ind ? 0 : ind);
        }
        if (base === "END") return go(r, L[r].length);
        if (base === "C-LEFT") {
          const p = wordLeft(L, r, c);
          return go(p.r, p.c);
        }
        if (base === "C-RIGHT") {
          const p = wordRight(L, r, c);
          return go(p.r, p.c);
        }
        if (base === "C-HOME") return go(0, 0);
        if (base === "C-END") return go(L.length - 1, L[L.length - 1].length);
        if (base === "PGUP") return go(Math.max(0, r - 30), Math.min(t.want, (L[Math.max(0, r - 30)] ?? "").length), true);
        if (base === "PGDN") return go(Math.min(L.length - 1, r + 30), t.want, true);
        return t;
      });
      return { tabs };
    });
  },

  edit(a, b, text, ca) {
    set((s) => {
      const tabs = patchActive(s.tabs, s.active, (t) => {
        const [x, y] = ordered(a, b);
        const old = textRange(t.lines, x, y);
        if (!old && !text) return t;
        const lines = applyReplace(t.lines, x, y, text);
        const end = endOf(x, text);
        const cursor = ca ?? end;
        const op: Op = { a: x, old, neu: text, cb: t.cursor, ca: cursor };
        const last = t.undo[t.undo.length - 1];
        const merged = t.redo.length ? null : mergeUndo(last, x, old, text, end);
        const undo = merged ? [...t.undo.slice(0, -1), merged] : [...t.undo.slice(-400), op];
        return {
          ...t,
          lines,
          cursor: clampPos(lines, cursor),
          anchor: null,
          want: (ca ?? end).c,
          undo,
          redo: [],
          gen: t.gen + 1,
        };
      });
      persist(tabs, s.active);
      return { tabs };
    });
  },

  replaceSel(text) {
    const t = get().activeTab();
    const a = t.anchor ?? t.cursor;
    get().edit(a, t.cursor, text);
  },

  newline() {
    const t = get().activeTab();
    const [a, b] = t.anchor ? ordered(t.anchor, t.cursor) : [t.cursor, t.cursor];
    const before = t.lines[a.r].slice(0, a.c);
    const tail = t.lines[b.r].slice(b.c);
    const indent = leadingIndent(before);
    const stripped = before.trimEnd();
    const last = stripped.slice(-1);
    let extra = "";
    if (last === "{" || last === "[" || last === "(" || (last === ":" && (t.lang === "Python" || t.lang === "YAML"))) {
      extra = unit(t);
    }
    let text = "\n" + indent + extra;
    let ca: Pos | undefined;
    const closer: Record<string, string> = { "{": "}", "[": "]", "(": ")" };
    if (extra && closer[last] && tail[0] === closer[last]) {
      ca = { r: a.r + 1, c: (indent + extra).length };
      text += "\n" + indent;
    }
    get().edit(a, b, text, ca);
  },

  backspace() {
    const t = get().activeTab();
    if (t.anchor && cmp(t.anchor, t.cursor) !== 0) {
      get().replaceSel("");
      return;
    }
    const { r, c } = t.cursor;
    if (c > 0) {
      const line = t.lines[r];
      if (!t.useTabs && !line.slice(0, c).trim()) {
        const n = c % t.indentW || t.indentW;
        if (line.slice(c - n, c) === " ".repeat(n)) {
          get().edit({ r, c: c - n }, { r, c }, "");
          return;
        }
      }
      get().edit({ r, c: c - 1 }, { r, c }, "");
    } else if (r > 0) {
      get().edit({ r: r - 1, c: t.lines[r - 1].length }, { r, c: 0 }, "");
    }
  },

  del() {
    const t = get().activeTab();
    if (t.anchor && cmp(t.anchor, t.cursor) !== 0) {
      get().replaceSel("");
      return;
    }
    const { r, c } = t.cursor;
    if (c < t.lines[r].length) get().edit({ r, c }, { r, c: c + 1 }, "", { r, c });
    else if (r + 1 < t.lines.length) get().edit({ r, c }, { r: r + 1, c: 0 }, "", { r, c });
  },

  tab(out) {
    const t = get().activeTab();
    const [r0, r1] = t.anchor && t.anchor.r !== t.cursor.r
      ? [Math.min(t.anchor.r, t.cursor.r), Math.max(t.anchor.r, t.cursor.r)]
      : t.anchor && cmp(t.anchor, t.cursor) !== 0 && out
        ? [Math.min(t.anchor.r, t.cursor.r), Math.max(t.anchor.r, t.cursor.r)]
        : [t.cursor.r, t.cursor.r];
    if (out || (t.anchor && t.anchor.r !== t.cursor.r)) {
      const L = t.lines;
      const neu = L.slice(r0, r1 + 1).map((l) => {
        if (!out) return l.trim() ? unit(t) + l : l;
        if (l.startsWith("\t")) return l.slice(1);
        const n = Math.min(t.indentW, l.length - l.trimStart().length);
        return l.slice(n);
      });
      get().edit({ r: r0, c: 0 }, { r: r1, c: L[r1].length }, neu.join("\n"));
      set((s) => ({
        tabs: patchActive(s.tabs, s.active, (d) => ({
          ...d,
          anchor: { r: r0, c: 0 },
          cursor: { r: r1, c: d.lines[r1].length },
        })),
      }));
      return;
    }
    if (t.useTabs) get().replaceSel("\t");
    else {
      const c = t.cursor.c;
      get().replaceSel(" ".repeat(t.indentW - (c % t.indentW)));
    }
  },

  undo() {
    set((s) => {
      const tabs = patchActive(s.tabs, s.active, (t) => {
        const op = t.undo[t.undo.length - 1];
        if (!op) return t;
        const lines = applyReplace(t.lines, op.a, endOf(op.a, op.neu), op.old);
        return {
          ...t,
          lines,
          cursor: clampPos(lines, op.cb),
          anchor: null,
          undo: t.undo.slice(0, -1),
          redo: [...t.redo, op],
          gen: t.gen + 1,
          want: op.cb.c,
        };
      });
      persist(tabs, s.active);
      return { tabs, msg: "Undo" };
    });
  },

  redo() {
    set((s) => {
      const tabs = patchActive(s.tabs, s.active, (t) => {
        const op = t.redo[t.redo.length - 1];
        if (!op) return t;
        const lines = applyReplace(t.lines, op.a, endOf(op.a, op.old), op.neu);
        return {
          ...t,
          lines,
          cursor: clampPos(lines, op.ca),
          anchor: null,
          redo: t.redo.slice(0, -1),
          undo: [...t.undo, op],
          gen: t.gen + 1,
          want: op.ca.c,
        };
      });
      persist(tabs, s.active);
      return { tabs, msg: "Redo" };
    });
  },

  selectAll() {
    set((s) => ({
      tabs: patchActive(s.tabs, s.active, (t) => ({
        ...t,
        anchor: { r: 0, c: 0 },
        cursor: { r: t.lines.length - 1, c: t.lines[t.lines.length - 1].length },
      })),
    }));
  },

  setCursor(p, select) {
    set((s) => ({
      tabs: patchActive(s.tabs, s.active, (t) => {
        const cursor = clampPos(t.lines, p);
        return {
          ...t,
          cursor,
          want: cursor.c,
          anchor: select ? (t.anchor ?? t.cursor) : null,
        };
      }),
    }));
  },

  selectWord(p) {
    set((s) => ({
      tabs: patchActive(s.tabs, s.active, (t) => {
        const line = t.lines[p.r] ?? "";
        let a = Math.min(p.c, line.length);
        let b = a;
        while (a > 0 && /[A-Za-z0-9_]/.test(line[a - 1])) a--;
        while (b < line.length && /[A-Za-z0-9_]/.test(line[b])) b++;
        return { ...t, anchor: { r: p.r, c: a }, cursor: { r: p.r, c: b }, want: b };
      }),
    }));
  },

  selectLine(r) {
    set((s) => ({
      tabs: patchActive(s.tabs, s.active, (t) => {
        const rr = Math.max(0, Math.min(r, t.lines.length - 1));
        if (rr + 1 < t.lines.length) {
          return { ...t, anchor: { r: rr, c: 0 }, cursor: { r: rr + 1, c: 0 }, want: 0 };
        }
        return { ...t, anchor: { r: rr, c: 0 }, cursor: { r: rr, c: t.lines[rr].length }, want: t.lines[rr].length };
      }),
    }));
  },

  toggleWrap() {
    set((s) => {
      const tabs = patchActive(s.tabs, s.active, (t) => ({ ...t, wrap: !t.wrap }));
      const t = tabs.find((x) => x.id === s.active)!;
      return { tabs, msg: `Word wrap: ${t.wrap ? "ON" : "OFF"}` };
    });
  },

  toggleComment() {
    const t = get().activeTab();
    const p = commentPrefix(t.lang);
    if (!p) {
      set({ msg: "No line-comment syntax for this file type" });
      return;
    }
    const r0 = t.anchor ? Math.min(t.anchor.r, t.cursor.r) : t.cursor.r;
    const r1 = t.anchor ? Math.max(t.anchor.r, t.cursor.r) : t.cursor.r;
    const rows = t.lines.slice(r0, r1 + 1);
    const nonempty = rows.filter((l) => l.trim());
    if (!nonempty.length) return;
    const un = nonempty.every((l) => l.trimStart().startsWith(p));
    const ind = Math.min(...nonempty.map((l) => l.length - l.trimStart().length));
    const neu = rows.map((l) => {
      if (!l.trim()) return l;
      if (un) {
        const i = l.length - l.trimStart().length;
        const rest = l.slice(i + p.length);
        return l.slice(0, i) + (rest.startsWith(" ") ? rest.slice(1) : rest);
      }
      return l.slice(0, ind) + p + " " + l.slice(ind);
    });
    get().edit({ r: r0, c: 0 }, { r: r1, c: t.lines[r1].length }, neu.join("\n"), t.cursor);
  },

  dupLine() {
    const t = get().activeTab();
    if (t.anchor && cmp(t.anchor, t.cursor) !== 0) {
      const [a, b] = ordered(t.anchor, t.cursor);
      get().edit(b, b, textRange(t.lines, a, b));
      return;
    }
    const line = t.lines[t.cursor.r];
    get().edit({ r: t.cursor.r, c: line.length }, { r: t.cursor.r, c: line.length }, "\n" + line, {
      r: t.cursor.r + 1,
      c: t.cursor.c,
    });
  },

  delLine() {
    const t = get().activeTab();
    const r = t.cursor.r;
    const L = t.lines;
    if (L.length === 1) {
      get().edit({ r: 0, c: 0 }, { r: 0, c: L[0].length }, "", { r: 0, c: 0 });
      return;
    }
    if (r < L.length - 1) get().edit({ r, c: 0 }, { r: r + 1, c: 0 }, "", { r, c: t.cursor.c });
    else get().edit({ r: r - 1, c: L[r - 1].length }, { r, c: L[r].length }, "", { r: r - 1, c: t.cursor.c });
  },

  moveLines(d) {
    const t = get().activeTab();
    const r0 = t.anchor ? Math.min(t.anchor.r, t.cursor.r) : t.cursor.r;
    const r1 = t.anchor ? Math.max(t.anchor.r, t.cursor.r) : t.cursor.r;
    const L = t.lines;
    if ((d < 0 && r0 === 0) || (d > 0 && r1 >= L.length - 1)) return;
    if (d < 0) {
      const text = [...L.slice(r0, r1 + 1), L[r0 - 1]].join("\n");
      get().edit({ r: r0 - 1, c: 0 }, { r: r1, c: L[r1].length }, text, { r: t.cursor.r - 1, c: t.cursor.c });
    } else {
      const text = [L[r1 + 1], ...L.slice(r0, r1 + 1)].join("\n");
      get().edit({ r: r0, c: 0 }, { r: r1 + 1, c: L[r1 + 1].length }, text, { r: t.cursor.r + 1, c: t.cursor.c });
    }
  },

  findNext(dir = 1) {
    const s = get();
    if (!s.findText) {
      set({ overlay: "find" });
      return;
    }
    let re: RegExp;
    try {
      const src = s.findRegex ? s.findText : s.findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      re = new RegExp(src, s.findCase ? "g" : "gi");
    } catch {
      set({ msg: "Invalid regular expression" });
      return;
    }
    const t = s.activeTab();
    const start = t.cursor;
    const n = t.lines.length;
    for (let k = 0; k <= n; k++) {
      const r = (start.r + k * dir + n * 4) % n;
      const line = t.lines[r];
      const ms = [...line.matchAll(new RegExp(re.source, re.flags))];
      const hits = ms.filter((m) => m[0].length);
      const filtered =
        dir > 0
          ? k === 0
            ? hits.filter((m) => (m.index ?? 0) >= start.c + (k === 0 && r === start.r ? 0 : 0) && (r !== start.r || (m.index ?? 0) >= start.c))
            : hits
          : k === 0
            ? hits.filter((m) => (m.index ?? 0) < start.c)
            : hits;
      const pick = dir > 0 ? filtered[0] : filtered[filtered.length - 1];
      if (pick && pick.index != null) {
        const c0 = pick.index;
        const c1 = c0 + pick[0].length;
        set((st) => ({
          tabs: patchActive(st.tabs, st.active, (d) => ({
            ...d,
            anchor: { r, c: c0 },
            cursor: { r, c: c1 },
            want: c1,
          })),
          msg: `Match on line ${r + 1}`,
        }));
        return;
      }
    }
    set({ msg: `Not found: ${s.findText}` });
  },

  replaceOne() {
    const s = get();
    const t = s.activeTab();
    if (t.anchor) {
      s.replaceSel(s.replText);
    }
    get().findNext(1);
  },

  replaceAll() {
    const s = get();
    if (!s.findText) return;
    let re: RegExp;
    try {
      const src = s.findRegex ? s.findText : s.findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      re = new RegExp(src, s.findRegex ? (s.findCase ? "g" : "gi") : s.findCase ? "g" : "gi");
    } catch {
      set({ msg: "Invalid regular expression" });
      return;
    }
    const t = s.activeTab();
    let total = 0;
    const neu = t.lines.map((line) => {
      const out = line.replace(re, () => {
        total++;
        return s.replText;
      });
      return out;
    });
    if (!total) {
      set({ msg: `Not found: ${s.findText}` });
      return;
    }
    get().edit({ r: 0, c: 0 }, { r: t.lines.length - 1, c: t.lines[t.lines.length - 1].length }, neu.join("\n"), t.cursor);
    set({ msg: `Replaced ${total} occurrence${total === 1 ? "" : "s"}` });
  },

  gotoLine(n, c = 0) {
    set((s) => ({
      tabs: patchActive(s.tabs, s.active, (t) => {
        const p = clampPos(t.lines, { r: n - 1, c: Math.max(0, c - 1) });
        return { ...t, cursor: p, anchor: null, want: p.c };
      }),
      overlay: "none",
    }));
  },

  markSaved() {
    set((s) => {
      const tabs = patchActive(s.tabs, s.active, (t) => ({ ...t, savedGen: t.gen }));
      persist(tabs, s.active);
      return { tabs, msg: `Saved ${s.activeTab().name}` };
    });
  },

  rename(name) {
    set((s) => {
      const tabs = patchActive(s.tabs, s.active, (t) => ({
        ...t,
        name,
        lang: detectLang(name, t.lines[0] ?? "") as LangName,
      }));
      persist(tabs, s.active);
      return { tabs };
    });
  },

  selectionText() {
    const t = get().activeTab();
    if (!t.anchor || cmp(t.anchor, t.cursor) === 0) return t.lines[t.cursor.r] + "\n";
    const [a, b] = ordered(t.anchor, t.cursor);
    return textRange(t.lines, a, b);
  },

  hydrate() {
    if (get().hydrated) return;
    try {
      const raw = localStorage.getItem("echo-ete");
      if (raw) {
        const parsed = JSON.parse(raw) as { tabs: TabDoc[]; active: string };
        if (parsed.tabs?.length) {
          set({ tabs: parsed.tabs, active: parsed.active, hydrated: true });
          return;
        }
      }
    } catch {
      /* ignore */
    }
    set({ hydrated: true });
  },
}));

export function downloadTab(t: TabDoc) {
  const blob = new Blob([t.lines.join("\n") + "\n"], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = t.name || "untitled.txt";
  a.click();
  URL.revokeObjectURL(a.href);
}

export function fileBody(t: TabDoc) {
  return t.lines.join("\n");
}
