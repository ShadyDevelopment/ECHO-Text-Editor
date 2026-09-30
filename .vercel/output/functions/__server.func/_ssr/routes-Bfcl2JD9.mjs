import { i as __toESM } from "../_runtime.mjs";
import { G as require_react, y as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Search, c as Download, i as Terminal, l as CircleHelp, n as WrapText, o as FolderOpen, s as FilePlus, t as X } from "../_libs/lucide-react.mjs";
import { t as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { t as create } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-Bfcl2JD9.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function cmp(a, b) {
	return a.r !== b.r ? a.r - b.r : a.c - b.c;
}
function ordered(a, b) {
	return cmp(a, b) <= 0 ? [a, b] : [b, a];
}
function clampPos(lines, p) {
	const r = Math.max(0, Math.min(p.r, lines.length - 1));
	return {
		r,
		c: Math.max(0, Math.min(p.c, (lines[r] ?? "").length))
	};
}
function endOf(a, text) {
	if (!text.includes("\n")) return {
		r: a.r,
		c: a.c + text.length
	};
	const parts = text.split("\n");
	return {
		r: a.r + parts.length - 1,
		c: parts[parts.length - 1].length
	};
}
function textRange(lines, a, b) {
	if (a.r === b.r) return lines[a.r].slice(a.c, b.c);
	return [
		lines[a.r].slice(a.c),
		...lines.slice(a.r + 1, b.r),
		lines[b.r].slice(0, b.c)
	].join("\n");
}
function applyReplace(lines, a, b, text) {
	const head = lines[a.r].slice(0, a.c);
	const tail = lines[b.r].slice(b.c);
	const mid = (head + text + tail).split("\n");
	return [
		...lines.slice(0, a.r),
		...mid,
		...lines.slice(b.r + 1)
	];
}
function wordLeft(lines, r, c) {
	if (c === 0) return r > 0 ? {
		r: r - 1,
		c: lines[r - 1].length
	} : {
		r: 0,
		c: 0
	};
	const line = lines[r];
	let i = c;
	while (i > 0 && !/[A-Za-z0-9_]/.test(line[i - 1])) i--;
	while (i > 0 && /[A-Za-z0-9_]/.test(line[i - 1])) i--;
	return {
		r,
		c: i
	};
}
function wordRight(lines, r, c) {
	const line = lines[r];
	if (c >= line.length) return r + 1 < lines.length ? {
		r: r + 1,
		c: 0
	} : {
		r,
		c
	};
	let i = c;
	while (i < line.length && !/[A-Za-z0-9_]/.test(line[i])) i++;
	while (i < line.length && /[A-Za-z0-9_]/.test(line[i])) i++;
	return {
		r,
		c: i
	};
}
function leadingIndent(line) {
	const m = line.match(/^[ \t]*/);
	return m ? m[0] : "";
}
function mergeUndo(last, a, old, neu, end) {
	if (!last) return null;
	if (!old && !last.old && neu.length === 1 && neu !== "\n" && !last.neu.includes("\n") && a.r === last.ca.r && a.c === last.ca.c && last.neu.length < 200) {
		if (/[A-Za-z0-9]/.test(neu) === /[A-Za-z0-9]/.test(last.neu.slice(-1))) return {
			...last,
			neu: last.neu + neu,
			ca: end
		};
	}
	if (!neu && !last.neu && old.length === 1 && old !== "\n" && !last.old.includes("\n")) {
		if (a.r === last.a.r && a.c + old.length === last.a.c) return {
			...last,
			old: old + last.old,
			a,
			ca: a
		};
		if (a.r === last.a.r && a.c === last.a.c) return {
			...last,
			old: last.old + old
		};
	}
	return null;
}
function S(s) {
	return new Set(s.split(/\s+/).filter(Boolean));
}
var C_BLOCK = ["/*", "*/"];
var LANGS = {
	Python: {
		name: "Python",
		kw: S("False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case"),
		types: S("self cls int str float bool list dict set tuple bytes object print len range type super open isinstance enumerate zip map filter sorted sum min max abs any all Exception"),
		lc: ["#"],
		strings: ["'", "\""],
		extras: [{
			re: /@[\w.]+/g,
			role: "spc"
		}]
	},
	JavaScript: {
		name: "JavaScript",
		kw: S("async await break case catch class const continue debugger default delete do else export extends finally for from function if import in instanceof let new of return static super switch this throw try typeof var void while with yield"),
		types: S("true false null undefined NaN Infinity console window document Promise Array Object String Number Boolean Map Set JSON Math"),
		lc: ["//"],
		block: C_BLOCK,
		strings: [
			"'",
			"\"",
			"`"
		],
		extras: []
	},
	TypeScript: {
		name: "TypeScript",
		kw: S("async await break case catch class const continue debugger default delete do else export extends finally for from function if import in instanceof let new of return static super switch this throw try typeof var void while with yield interface type enum implements namespace declare readonly abstract public private protected as is keyof"),
		types: S("true false null undefined string number boolean any unknown never"),
		lc: ["//"],
		block: C_BLOCK,
		strings: [
			"'",
			"\"",
			"`"
		],
		extras: []
	},
	HTML: {
		name: "HTML",
		kw: /* @__PURE__ */ new Set(),
		types: /* @__PURE__ */ new Set(),
		lc: [],
		block: ["<!--", "-->"],
		strings: ["\""],
		extras: [
			{
				re: /<\/?[A-Za-z][\w:-]*/g,
				role: "kw"
			},
			{
				re: /\/?>/g,
				role: "kw"
			},
			{
				re: /[\w:-]+(?==)/g,
				role: "typ"
			}
		]
	},
	CSS: {
		name: "CSS",
		kw: /* @__PURE__ */ new Set(),
		types: /* @__PURE__ */ new Set(),
		lc: [],
		block: C_BLOCK,
		strings: ["'", "\""],
		extras: [
			{
				re: /#[0-9a-fA-F]{3,8}\b/g,
				role: "num"
			},
			{
				re: /[.#][A-Za-z_-][\w-]*/g,
				role: "spc"
			},
			{
				re: /@[\w-]+/g,
				role: "kw"
			},
			{
				re: /[A-Za-z-]+(?=\s*:)/g,
				role: "typ"
			}
		]
	},
	JSON: {
		name: "JSON",
		kw: S("true false null"),
		types: /* @__PURE__ */ new Set(),
		lc: [],
		strings: ["\""],
		extras: [{
			re: /"(?:\\.|[^"\\])*"(?=\s*:)/g,
			role: "typ"
		}]
	},
	Markdown: {
		name: "Markdown",
		kw: /* @__PURE__ */ new Set(),
		types: /* @__PURE__ */ new Set(),
		lc: [],
		strings: [],
		extras: [
			{
				re: /^#{1,6}\s.*/g,
				role: "spc"
			},
			{
				re: /^\s*>.*/g,
				role: "com"
			},
			{
				re: /\*\*[^*\n]+\*\*/g,
				role: "kw"
			},
			{
				re: /`[^`\n]+`/g,
				role: "str"
			},
			{
				re: /^\s*(?:[-*+]|\d+\.)\s/g,
				role: "spc"
			}
		]
	},
	C: {
		name: "C",
		kw: S("auto break case const continue default do else enum extern for goto if inline register restrict return sizeof static struct switch typedef union volatile while"),
		types: S("int char short long float double void unsigned signed size_t bool FILE NULL true false"),
		lc: ["//"],
		block: C_BLOCK,
		strings: ["\""],
		extras: [{
			re: /^\s*#\s*\w+/g,
			role: "spc"
		}]
	},
	"C++": {
		name: "C++",
		kw: S("auto break case const continue default do else enum extern for goto if inline register restrict return sizeof static struct switch typedef union volatile while class namespace template typename public private protected virtual override new delete this using try catch throw nullptr constexpr"),
		types: S("int char short long float double void unsigned signed string vector map set std auto"),
		lc: ["//"],
		block: C_BLOCK,
		strings: ["\""],
		extras: [{
			re: /^\s*#\s*\w+/g,
			role: "spc"
		}]
	},
	Shell: {
		name: "Shell",
		kw: S("if then else elif fi for while until do done case esac in function select time return exit break continue local export readonly declare unset source alias"),
		types: S("echo cd ls cat grep sed awk test true false read printf eval exec set shift"),
		lc: ["#"],
		strings: ["'", "\""],
		extras: [{
			re: /\$\{?[\w#?@*!$-]+\}?/g,
			role: "spc"
		}]
	},
	YAML: {
		name: "YAML",
		kw: S("true false null yes no on off"),
		types: /* @__PURE__ */ new Set(),
		lc: ["#"],
		strings: ["'", "\""],
		extras: [{
			re: /^\s*(?:-\s+)?[\w./-]+(?=\s*:)/g,
			role: "typ"
		}]
	}
};
var EXT = {
	py: "Python",
	pyw: "Python",
	js: "JavaScript",
	mjs: "JavaScript",
	cjs: "JavaScript",
	jsx: "JavaScript",
	ts: "TypeScript",
	tsx: "TypeScript",
	html: "HTML",
	htm: "HTML",
	css: "CSS",
	json: "JSON",
	md: "Markdown",
	markdown: "Markdown",
	c: "C",
	h: "C",
	cpp: "C++",
	cc: "C++",
	hpp: "C++",
	sh: "Shell",
	bash: "Shell",
	zsh: "Shell",
	yml: "YAML",
	yaml: "YAML"
};
function detectLang(name, first = "") {
	const base = name.split("/").pop() ?? name;
	const ext = base.includes(".") ? base.split(".").pop().toLowerCase() : "";
	if (ext && EXT[ext]) return EXT[ext];
	if (first.startsWith("#!")) {
		if (first.includes("python")) return "Python";
		if (first.includes("node")) return "JavaScript";
		if (first.includes("bash") || first.includes("sh")) return "Shell";
	}
	return "Plain Text";
}
function commentPrefix(lang) {
	return LANGS[lang]?.lc[0] ?? null;
}
function tokenizeLine(line, langName) {
	const lang = LANGS[langName];
	if (!lang || !line) return [{
		text: line,
		role: "def",
		i0: 0
	}];
	const roles = Array(line.length).fill("def");
	const paint = (s, e, r) => {
		for (let i = Math.max(0, s); i < Math.min(e, line.length); i++) roles[i] = r;
	};
	if (lang.lc.length) {
		let best = -1;
		for (const p of lang.lc) {
			const k = line.indexOf(p);
			if (k >= 0 && (best < 0 || k < best)) best = k;
		}
		if (best >= 0) paint(best, line.length, "com");
	}
	if (lang.block) {
		const [bs, be] = lang.block;
		let i = 0;
		while (i < line.length) {
			const s = line.indexOf(bs, i);
			if (s < 0) break;
			const e = line.indexOf(be, s + bs.length);
			const end = e < 0 ? line.length : e + be.length;
			paint(s, end, "com");
			i = end;
		}
	}
	for (const q of lang.strings) {
		const re = new RegExp(`${escapeRe(q)}(?:\\\\.|[^${escapeRe(q)}\\\\])*${escapeRe(q)}?`, "g");
		let m;
		while (m = re.exec(line)) {
			if (roles[m.index] === "com") continue;
			paint(m.index, m.index + m[0].length, "str");
		}
	}
	const num = /\b(?:0[xX][0-9a-fA-F_]+|\d[\d_]*\.?\d*(?:[eE][+-]?\d+)?)\b/g;
	let nm;
	while (nm = num.exec(line)) if (roles[nm.index] === "def") paint(nm.index, nm.index + nm[0].length, "num");
	const word = /[A-Za-z_$][\w$]*/g;
	let wm;
	while (wm = word.exec(line)) {
		if (roles[wm.index] !== "def") continue;
		const w = lang.ci ? wm[0].toLowerCase() : wm[0];
		if (lang.kw.has(w)) paint(wm.index, wm.index + wm[0].length, "kw");
		else if (lang.types.has(w)) paint(wm.index, wm.index + wm[0].length, "typ");
		else if (line[wm.index + wm[0].length] === "(") paint(wm.index, wm.index + wm[0].length, "fun");
	}
	for (const ex of lang.extras) {
		ex.re.lastIndex = 0;
		let em;
		const re = new RegExp(ex.re.source, ex.re.flags.includes("g") ? ex.re.flags : ex.re.flags + "g");
		while (em = re.exec(line)) {
			if (roles[em.index] === "com" || roles[em.index] === "str") continue;
			paint(em.index, em.index + em[0].length, ex.role);
		}
	}
	const out = [];
	let i = 0;
	while (i < line.length) {
		const r = roles[i];
		let j = i + 1;
		while (j < line.length && roles[j] === r) j++;
		out.push({
			text: line.slice(i, j),
			role: r,
			i0: i
		});
		i = j;
	}
	if (!out.length) out.push({
		text: "",
		role: "def",
		i0: 0
	});
	return out;
}
function escapeRe(s) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
var BR_OPEN = {
	"(": ")",
	"[": "]",
	"{": "}"
};
var BR_CLOSE = {
	")": "(",
	"]": "[",
	"}": "{"
};
function bracketPair(lines, r, c) {
	const line = lines[r] ?? "";
	const out = /* @__PURE__ */ new Set();
	for (const col of [c, c - 1]) {
		if (col < 0 || col >= line.length) continue;
		const ch = line[col];
		if (BR_OPEN[ch]) {
			const m = scan(lines, r, col, ch, BR_OPEN[ch], 1);
			if (m) {
				out.add(`${r}:${col}`);
				out.add(`${m.r}:${m.c}`);
				return out;
			}
		} else if (BR_CLOSE[ch]) {
			const m = scan(lines, r, col, ch, BR_CLOSE[ch], -1);
			if (m) {
				out.add(`${r}:${col}`);
				out.add(`${m.r}:${m.c}`);
				return out;
			}
		}
	}
	return out;
}
function scan(lines, r, c, ch, other, d) {
	let depth = 0;
	let n = 0;
	while (r >= 0 && r < lines.length) {
		const line = lines[r];
		const start = d > 0 ? c : Math.min(c, line.length - 1);
		const end = d > 0 ? line.length : -1;
		for (let i = start; i !== end; i += d) {
			const x = line[i];
			if (x === ch) depth++;
			else if (x === other) {
				depth--;
				if (depth === 0) return {
					r,
					c: i
				};
			}
			if (++n > 2e4) return null;
		}
		r += d;
		c = d > 0 ? 0 : (lines[r]?.length ?? 1) - 1;
	}
	return null;
}
var SAMPLE_PYTHON = `#!/usr/bin/env python3
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
var SAMPLE_JS = `// ECHO sample — JavaScript
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
var SAMPLE_MD = `# ECHO Text Editor

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
var SAMPLE_HTML = `<!doctype html>
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
function uid() {
	return Math.random().toString(36).slice(2, 10);
}
function fromText(name, text) {
	let lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
	if (lines.length > 1 && lines[lines.length - 1] === "") lines = lines.slice(0, -1);
	if (!lines.length) lines = [""];
	const lang = detectLang(name, lines[0] ?? "");
	return {
		id: uid(),
		name,
		lines,
		cursor: {
			r: 0,
			c: 0
		},
		anchor: null,
		want: 0,
		undo: [],
		redo: [],
		gen: 0,
		savedGen: 0,
		lang,
		wrap: false,
		useTabs: false,
		indentW: 4
	};
}
var SEED = [
	fromText("welcome.py", SAMPLE_PYTHON),
	fromText("demo.js", SAMPLE_JS),
	fromText("readme.md", SAMPLE_MD)
];
SEED[0].savedGen = 0;
SEED.forEach((t) => {
	t.savedGen = t.gen;
});
function persist(tabs, active) {
	try {
		const slim = tabs.map((t) => ({
			...t,
			undo: t.undo.slice(-40),
			redo: []
		}));
		localStorage.setItem("echo-ete", JSON.stringify({
			tabs: slim,
			active
		}));
	} catch {}
}
function patchActive(tabs, id, fn) {
	return tabs.map((t) => t.id === id ? fn(t) : t);
}
function unit(t) {
	return t.useTabs ? "	" : " ".repeat(t.indentW);
}
var useEditor = create((set, get) => ({
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
		set({
			active: id,
			overlay: "none"
		});
		persist(get().tabs, id);
	},
	newFile() {
		const t = fromText("untitled.txt", "");
		t.lang = "Plain Text";
		set((s) => {
			const tabs = [...s.tabs, t];
			persist(tabs, t.id);
			return {
				tabs,
				active: t.id,
				overlay: "none"
			};
		});
	},
	openSample(kind) {
		const [name, text] = {
			py: ["welcome.py", SAMPLE_PYTHON],
			js: ["demo.js", SAMPLE_JS],
			md: ["readme.md", SAMPLE_MD],
			html: ["index.html", SAMPLE_HTML]
		}[kind];
		get().openText(name, text);
	},
	openText(name, text) {
		const t = fromText(name, text);
		t.savedGen = t.gen;
		set((s) => {
			const tabs = [...s.tabs, t];
			persist(tabs, t.id);
			return {
				tabs,
				active: t.id,
				overlay: "none",
				msg: `Opened ${name}`
			};
		});
	},
	closeTab(id, force) {
		const s = get();
		const t = s.tabs.find((x) => x.id === id);
		if (!t) return;
		if (!force && t.gen !== t.savedGen) {
			set({
				active: id,
				overlay: "quit"
			});
			return;
		}
		const tabs = s.tabs.filter((x) => x.id !== id);
		if (!tabs.length) {
			const n = fromText("untitled.txt", "");
			set({
				tabs: [n],
				active: n.id,
				overlay: "none"
			});
			persist([n], n.id);
			return;
		}
		const active = s.active === id ? tabs[tabs.length - 1].id : s.active;
		set({
			tabs,
			active,
			overlay: "none"
		});
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
			return { tabs: patchActive(s.tabs, s.active, (t) => {
				const L = t.lines;
				let { r, c } = t.cursor;
				const sel = t.anchor && cmp(t.anchor, t.cursor) !== 0 ? ordered(t.anchor, t.cursor) : null;
				const go = (nr, nc, keepWant = false) => {
					const p = clampPos(L, {
						r: nr,
						c: nc
					});
					return {
						...t,
						cursor: p,
						anchor: select ? t.anchor ?? t.cursor : null,
						want: keepWant ? t.want : p.c
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
			}) };
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
				const op = {
					a: x,
					old,
					neu: text,
					cb: t.cursor,
					ca: cursor
				};
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
					gen: t.gen + 1
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
		const last = before.trimEnd().slice(-1);
		let extra = "";
		if (last === "{" || last === "[" || last === "(" || last === ":" && (t.lang === "Python" || t.lang === "YAML")) extra = unit(t);
		let text = "\n" + indent + extra;
		let ca;
		const closer = {
			"{": "}",
			"[": "]",
			"(": ")"
		};
		if (extra && closer[last] && tail[0] === closer[last]) {
			ca = {
				r: a.r + 1,
				c: (indent + extra).length
			};
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
					get().edit({
						r,
						c: c - n
					}, {
						r,
						c
					}, "");
					return;
				}
			}
			get().edit({
				r,
				c: c - 1
			}, {
				r,
				c
			}, "");
		} else if (r > 0) get().edit({
			r: r - 1,
			c: t.lines[r - 1].length
		}, {
			r,
			c: 0
		}, "");
	},
	del() {
		const t = get().activeTab();
		if (t.anchor && cmp(t.anchor, t.cursor) !== 0) {
			get().replaceSel("");
			return;
		}
		const { r, c } = t.cursor;
		if (c < t.lines[r].length) get().edit({
			r,
			c
		}, {
			r,
			c: c + 1
		}, "", {
			r,
			c
		});
		else if (r + 1 < t.lines.length) get().edit({
			r,
			c
		}, {
			r: r + 1,
			c: 0
		}, "", {
			r,
			c
		});
	},
	tab(out) {
		const t = get().activeTab();
		const [r0, r1] = t.anchor && t.anchor.r !== t.cursor.r ? [Math.min(t.anchor.r, t.cursor.r), Math.max(t.anchor.r, t.cursor.r)] : t.anchor && cmp(t.anchor, t.cursor) !== 0 && out ? [Math.min(t.anchor.r, t.cursor.r), Math.max(t.anchor.r, t.cursor.r)] : [t.cursor.r, t.cursor.r];
		if (out || t.anchor && t.anchor.r !== t.cursor.r) {
			const L = t.lines;
			const neu = L.slice(r0, r1 + 1).map((l) => {
				if (!out) return l.trim() ? unit(t) + l : l;
				if (l.startsWith("	")) return l.slice(1);
				const n = Math.min(t.indentW, l.length - l.trimStart().length);
				return l.slice(n);
			});
			get().edit({
				r: r0,
				c: 0
			}, {
				r: r1,
				c: L[r1].length
			}, neu.join("\n"));
			set((s) => ({ tabs: patchActive(s.tabs, s.active, (d) => ({
				...d,
				anchor: {
					r: r0,
					c: 0
				},
				cursor: {
					r: r1,
					c: d.lines[r1].length
				}
			})) }));
			return;
		}
		if (t.useTabs) get().replaceSel("	");
		else {
			const c = t.cursor.c;
			get().replaceSel(" ".repeat(t.indentW - c % t.indentW));
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
					want: op.cb.c
				};
			});
			persist(tabs, s.active);
			return {
				tabs,
				msg: "Undo"
			};
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
					want: op.ca.c
				};
			});
			persist(tabs, s.active);
			return {
				tabs,
				msg: "Redo"
			};
		});
	},
	selectAll() {
		set((s) => ({ tabs: patchActive(s.tabs, s.active, (t) => ({
			...t,
			anchor: {
				r: 0,
				c: 0
			},
			cursor: {
				r: t.lines.length - 1,
				c: t.lines[t.lines.length - 1].length
			}
		})) }));
	},
	setCursor(p, select) {
		set((s) => ({ tabs: patchActive(s.tabs, s.active, (t) => {
			const cursor = clampPos(t.lines, p);
			return {
				...t,
				cursor,
				want: cursor.c,
				anchor: select ? t.anchor ?? t.cursor : null
			};
		}) }));
	},
	selectWord(p) {
		set((s) => ({ tabs: patchActive(s.tabs, s.active, (t) => {
			const line = t.lines[p.r] ?? "";
			let a = Math.min(p.c, line.length);
			let b = a;
			while (a > 0 && /[A-Za-z0-9_]/.test(line[a - 1])) a--;
			while (b < line.length && /[A-Za-z0-9_]/.test(line[b])) b++;
			return {
				...t,
				anchor: {
					r: p.r,
					c: a
				},
				cursor: {
					r: p.r,
					c: b
				},
				want: b
			};
		}) }));
	},
	selectLine(r) {
		set((s) => ({ tabs: patchActive(s.tabs, s.active, (t) => {
			const rr = Math.max(0, Math.min(r, t.lines.length - 1));
			if (rr + 1 < t.lines.length) return {
				...t,
				anchor: {
					r: rr,
					c: 0
				},
				cursor: {
					r: rr + 1,
					c: 0
				},
				want: 0
			};
			return {
				...t,
				anchor: {
					r: rr,
					c: 0
				},
				cursor: {
					r: rr,
					c: t.lines[rr].length
				},
				want: t.lines[rr].length
			};
		}) }));
	},
	toggleWrap() {
		set((s) => {
			const tabs = patchActive(s.tabs, s.active, (t) => ({
				...t,
				wrap: !t.wrap
			}));
			return {
				tabs,
				msg: `Word wrap: ${tabs.find((x) => x.id === s.active).wrap ? "ON" : "OFF"}`
			};
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
		get().edit({
			r: r0,
			c: 0
		}, {
			r: r1,
			c: t.lines[r1].length
		}, neu.join("\n"), t.cursor);
	},
	dupLine() {
		const t = get().activeTab();
		if (t.anchor && cmp(t.anchor, t.cursor) !== 0) {
			const [a, b] = ordered(t.anchor, t.cursor);
			get().edit(b, b, textRange(t.lines, a, b));
			return;
		}
		const line = t.lines[t.cursor.r];
		get().edit({
			r: t.cursor.r,
			c: line.length
		}, {
			r: t.cursor.r,
			c: line.length
		}, "\n" + line, {
			r: t.cursor.r + 1,
			c: t.cursor.c
		});
	},
	delLine() {
		const t = get().activeTab();
		const r = t.cursor.r;
		const L = t.lines;
		if (L.length === 1) {
			get().edit({
				r: 0,
				c: 0
			}, {
				r: 0,
				c: L[0].length
			}, "", {
				r: 0,
				c: 0
			});
			return;
		}
		if (r < L.length - 1) get().edit({
			r,
			c: 0
		}, {
			r: r + 1,
			c: 0
		}, "", {
			r,
			c: t.cursor.c
		});
		else get().edit({
			r: r - 1,
			c: L[r - 1].length
		}, {
			r,
			c: L[r].length
		}, "", {
			r: r - 1,
			c: t.cursor.c
		});
	},
	moveLines(d) {
		const t = get().activeTab();
		const r0 = t.anchor ? Math.min(t.anchor.r, t.cursor.r) : t.cursor.r;
		const r1 = t.anchor ? Math.max(t.anchor.r, t.cursor.r) : t.cursor.r;
		const L = t.lines;
		if (d < 0 && r0 === 0 || d > 0 && r1 >= L.length - 1) return;
		if (d < 0) {
			const text = [...L.slice(r0, r1 + 1), L[r0 - 1]].join("\n");
			get().edit({
				r: r0 - 1,
				c: 0
			}, {
				r: r1,
				c: L[r1].length
			}, text, {
				r: t.cursor.r - 1,
				c: t.cursor.c
			});
		} else {
			const text = [L[r1 + 1], ...L.slice(r0, r1 + 1)].join("\n");
			get().edit({
				r: r0,
				c: 0
			}, {
				r: r1 + 1,
				c: L[r1 + 1].length
			}, text, {
				r: t.cursor.r + 1,
				c: t.cursor.c
			});
		}
	},
	findNext(dir = 1) {
		const s = get();
		if (!s.findText) {
			set({ overlay: "find" });
			return;
		}
		let re;
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
			const hits = [...t.lines[r].matchAll(new RegExp(re.source, re.flags))].filter((m) => m[0].length);
			const filtered = dir > 0 ? k === 0 ? hits.filter((m) => (m.index ?? 0) >= start.c + (k === 0 && r === start.r ? 0 : 0) && (r !== start.r || (m.index ?? 0) >= start.c)) : hits : k === 0 ? hits.filter((m) => (m.index ?? 0) < start.c) : hits;
			const pick = dir > 0 ? filtered[0] : filtered[filtered.length - 1];
			if (pick && pick.index != null) {
				const c0 = pick.index;
				const c1 = c0 + pick[0].length;
				set((st) => ({
					tabs: patchActive(st.tabs, st.active, (d) => ({
						...d,
						anchor: {
							r,
							c: c0
						},
						cursor: {
							r,
							c: c1
						},
						want: c1
					})),
					msg: `Match on line ${r + 1}`
				}));
				return;
			}
		}
		set({ msg: `Not found: ${s.findText}` });
	},
	replaceOne() {
		const s = get();
		if (s.activeTab().anchor) s.replaceSel(s.replText);
		get().findNext(1);
	},
	replaceAll() {
		const s = get();
		if (!s.findText) return;
		let re;
		try {
			const src = s.findRegex ? s.findText : s.findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			re = new RegExp(src, s.findRegex ? s.findCase ? "g" : "gi" : s.findCase ? "g" : "gi");
		} catch {
			set({ msg: "Invalid regular expression" });
			return;
		}
		const t = s.activeTab();
		let total = 0;
		const neu = t.lines.map((line) => {
			return line.replace(re, () => {
				total++;
				return s.replText;
			});
		});
		if (!total) {
			set({ msg: `Not found: ${s.findText}` });
			return;
		}
		get().edit({
			r: 0,
			c: 0
		}, {
			r: t.lines.length - 1,
			c: t.lines[t.lines.length - 1].length
		}, neu.join("\n"), t.cursor);
		set({ msg: `Replaced ${total} occurrence${total === 1 ? "" : "s"}` });
	},
	gotoLine(n, c = 0) {
		set((s) => ({
			tabs: patchActive(s.tabs, s.active, (t) => {
				const p = clampPos(t.lines, {
					r: n - 1,
					c: Math.max(0, c - 1)
				});
				return {
					...t,
					cursor: p,
					anchor: null,
					want: p.c
				};
			}),
			overlay: "none"
		}));
	},
	markSaved() {
		set((s) => {
			const tabs = patchActive(s.tabs, s.active, (t) => ({
				...t,
				savedGen: t.gen
			}));
			persist(tabs, s.active);
			return {
				tabs,
				msg: `Saved ${s.activeTab().name}`
			};
		});
	},
	rename(name) {
		set((s) => {
			const tabs = patchActive(s.tabs, s.active, (t) => ({
				...t,
				name,
				lang: detectLang(name, t.lines[0] ?? "")
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
				const parsed = JSON.parse(raw);
				if (parsed.tabs?.length) {
					set({
						tabs: parsed.tabs,
						active: parsed.active,
						hydrated: true
					});
					return;
				}
			}
		} catch {}
		set({ hydrated: true });
	}
}));
function downloadTab(t) {
	const blob = new Blob([t.lines.join("\n") + "\n"], { type: "text/plain" });
	const a = document.createElement("a");
	a.href = URL.createObjectURL(blob);
	a.download = t.name || "untitled.txt";
	a.click();
	URL.revokeObjectURL(a.href);
}
var ROLE_CLASS = {
	kw: "tok-kw",
	str: "tok-str",
	com: "tok-com",
	num: "tok-num",
	typ: "tok-typ",
	spc: "tok-spc",
	fun: "tok-fun",
	def: ""
};
function EditorPane() {
	const tab = useEditor((s) => s.activeTab());
	const findText = useEditor((s) => s.findText);
	const findCase = useEditor((s) => s.findCase);
	const overlay = useEditor((s) => s.overlay);
	const setCursor = useEditor((s) => s.setCursor);
	const selectWord = useEditor((s) => s.selectWord);
	const selectLine = useEditor((s) => s.selectLine);
	const scroller = (0, import_react.useRef)(null);
	const clicks = (0, import_react.useRef)({
		n: 0,
		t: 0,
		r: -1
	});
	const pairs = (0, import_react.useMemo)(() => bracketPair(tab.lines, tab.cursor.r, tab.cursor.c), [
		tab.lines,
		tab.cursor.r,
		tab.cursor.c
	]);
	const sel = tab.anchor ? ordered(tab.anchor, tab.cursor) : null;
	const gutterW = Math.max(3, String(tab.lines.length).length) + 1;
	const findRe = (0, import_react.useMemo)(() => {
		if (!findText || overlay !== "find") return null;
		try {
			return new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), findCase ? "g" : "gi");
		} catch {
			return null;
		}
	}, [
		findText,
		findCase,
		overlay
	]);
	(0, import_react.useEffect)(() => {
		(scroller.current?.querySelector(`[data-row="${tab.cursor.r}"]`))?.scrollIntoView({ block: "nearest" });
	}, [
		tab.cursor.r,
		tab.cursor.c,
		tab.id
	]);
	const onMouse = (e, kind) => {
		const rowEl = e.target.closest("[data-row]");
		if (!rowEl) return;
		const r = Number(rowEl.dataset.row);
		const code = rowEl.querySelector("[data-code]");
		if (!code) return;
		const p = {
			r,
			c: colFromPoint(code, tab.lines[r] ?? "", e.clientX)
		};
		if (kind === "down") {
			const now = Date.now();
			const next = now - clicks.current.t < 400 && clicks.current.r === r ? clicks.current.n + 1 : 1;
			clicks.current = {
				n: next,
				t: now,
				r
			};
			if (next === 2) selectWord(p);
			else if (next >= 3) selectLine(r);
			else setCursor(p, e.shiftKey);
		} else if (e.buttons === 1) setCursor(p, true);
	};
	const emptyWelcome = !tab.lines[0] && tab.lines.length === 1 && tab.name.startsWith("untitled") && tab.gen === 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		ref: scroller,
		className: "editor-scroll relative min-h-0 flex-1 overflow-auto bg-bg font-mono text-sm leading-6",
		onMouseDown: (e) => onMouse(e, "down"),
		onMouseMove: (e) => onMouse(e, "move"),
		children: [emptyWelcome ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WelcomeArt, {}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "min-w-full pb-16",
			children: tab.lines.map((line, r) => {
				const toks = tokenizeLine(line, tab.lang);
				const selRange = selRangeOnLine(sel, r, line.length);
				const finds = findRe ? [...line.matchAll(findRe)].map((m) => [m.index ?? 0, (m.index ?? 0) + m[0].length]) : [];
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					"data-row": r,
					className: cn("relative flex", r === tab.cursor.r && "bg-elevated/50"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: cn("sticky left-0 z-10 shrink-0 select-none bg-gutter pr-3 text-right text-subtle", r === tab.cursor.r && "text-muted"),
						style: { width: `${gutterW + 1.5}ch` },
						children: r + 1
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						"data-code": true,
						className: cn("relative min-w-0 flex-1 whitespace-pre pr-8", tab.wrap && "whitespace-pre-wrap break-all"),
						children: [
							selRange ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "pointer-events-none absolute top-0 h-full bg-sel",
								style: {
									left: `${selRange[0]}ch`,
									width: `${Math.max(selRange[1] - selRange[0], .4)}ch`
								}
							}) : null,
							finds.map(([a, b], i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "pointer-events-none absolute top-0 h-full bg-find",
								style: {
									left: `${a}ch`,
									width: `${b - a}ch`
								}
							}, i)),
							toks.map((tok, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: cn("relative", ROLE_CLASS[tok.role]),
								children: paintBrackets(tok.text, tok.i0, pairs, r)
							}, i)),
							r === tab.cursor.r ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "pointer-events-none absolute top-[0.2em] h-[1.15em] w-px bg-accent",
								style: { left: `${tab.cursor.c}ch` }
							}) : null,
							line.length === 0 ? "\xA0" : null
						]
					})]
				}, r);
			})
		})]
	});
}
function paintBrackets(text, i0, pairs, r) {
	if (!pairs.size) return text || "\xA0";
	const parts = [];
	let buf = "";
	for (let i = 0; i < text.length; i++) {
		const key = `${r}:${i0 + i}`;
		if (pairs.has(key)) {
			if (buf) parts.push(buf);
			buf = "";
			parts.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "tok-br",
				children: text[i]
			}, key));
		} else buf += text[i];
	}
	if (buf) parts.push(buf);
	return parts.length ? parts : text;
}
function colFromPoint(code, line, clientX) {
	const rect = code.getBoundingClientRect();
	const ch = measureCh(getComputedStyle(code).font);
	const x = clientX - rect.left;
	if (x <= 0 || ch <= 0) return 0;
	return Math.max(0, Math.min(line.length, Math.round(x / ch)));
}
var chCache = null;
function measureCh(font) {
	if (chCache?.font === font) return chCache.w;
	const c = document.createElement("canvas").getContext("2d");
	if (!c) return 8;
	c.font = font;
	const w = c.measureText("M").width;
	chCache = {
		font,
		w
	};
	return w;
}
function selRangeOnLine(sel, r, len) {
	if (!sel) return null;
	const [a, b] = sel;
	if (r < a.r || r > b.r) return null;
	if (a.r === b.r && a.c === b.c) return null;
	return [r === a.r ? a.c : 0, r === b.r ? b.c : len];
}
function WelcomeArt() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4 py-8",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex max-w-full flex-col items-center text-center font-mono text-[13px] leading-5 tracking-wide text-accent/90",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: "/ete-logo.png",
				alt: "ECHO Text Editor",
				className: "mb-4 max-h-44 w-56 max-w-full select-none object-contain"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "select-none",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: "ECHO Text Editor v1.0.4-octa" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: "Developed by Antonio Martinovic" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						"Copyright © ",
						(/* @__PURE__ */ new Date()).getFullYear(),
						" ShadyDevelopment"
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						"Git:",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: "https://github.com/ShadyDevelopment/ECHO-Text-Editor",
							target: "_blank",
							rel: "noreferrer",
							className: "pointer-events-auto underline underline-offset-4",
							children: "ShadyDevelopment/ECHO-Text-Editor"
						})
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3",
						children: "Ctrl+S Save · Ctrl+F Find · Ctrl+Q Close · F1 Help"
					})
				]
			})]
		})
	});
}
function EchoApp() {
	const store = useEditor();
	const ta = (0, import_react.useRef)(null);
	const [gotoVal, setGotoVal] = (0, import_react.useState)("");
	const [saveName, setSaveName] = (0, import_react.useState)("");
	const tab = store.activeTab();
	(0, import_react.useEffect)(() => {
		store.hydrate();
	}, [store]);
	(0, import_react.useEffect)(() => {
		ta.current?.focus();
	}, [tab.id, store.overlay]);
	(0, import_react.useEffect)(() => {
		const onCopy = (e) => {
			if (store.overlay !== "none" && store.overlay !== "find") return;
			e.preventDefault();
			e.clipboardData?.setData("text/plain", store.selectionText());
			store.msg;
		};
		document.addEventListener("copy", onCopy);
		return () => document.removeEventListener("copy", onCopy);
	}, [store]);
	const save = () => {
		downloadTab(tab);
		store.markSaved();
	};
	const onKey = (e) => {
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
		const mapMove = {
			ArrowLeft: ctrl ? "C-LEFT" : "LEFT",
			ArrowRight: ctrl ? "C-RIGHT" : "RIGHT",
			ArrowUp: "UP",
			ArrowDown: "DOWN",
			Home: ctrl ? "C-HOME" : "HOME",
			End: ctrl ? "C-END" : "END",
			PageUp: "PGUP",
			PageDown: "PGDN"
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
				navigator.clipboard.writeText(store.selectionText());
				return;
			}
			if (k === "x") {
				e.preventDefault();
				navigator.clipboard.writeText(store.selectionText());
				store.replaceSel("");
				return;
			}
			if (k === "v") return;
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
	const onPaste = (e) => {
		e.preventDefault();
		const text = e.clipboardData.getData("text/plain").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
		if (text) store.replaceSel(text);
	};
	const onInput = (e) => {
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-dvh min-h-0 flex-col bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex shrink-0 items-center gap-2 border-b border-border bg-surface px-3 py-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogoMark, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "font-sans text-sm font-medium tracking-tight",
							children: "ECHO Text Editor"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "truncate font-mono text-xs text-muted",
							children: "ete · ShadyDevelopment"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "hidden items-center gap-1 sm:flex",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
								label: "New",
								onClick: () => store.newFile(),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilePlus, { className: "size-4" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "inline-flex",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "file",
									className: "sr-only",
									onChange: async (e) => {
										const f = e.target.files?.[0];
										if (!f) return;
										store.openText(f.name, await f.text());
										e.target.value = "";
									}
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "inline-flex h-10 w-10 items-center justify-center rounded-sm text-muted hover:bg-elevated hover:text-fg",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FolderOpen, { className: "size-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "sr-only",
										children: "Open file"
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
								label: "Save",
								onClick: save,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "size-4" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
								label: "Find",
								onClick: () => store.setOverlay("find"),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "size-4" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
								label: "Wrap",
								onClick: () => store.toggleWrap(),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WrapText, { className: "size-4" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
								label: "Linux CLI",
								onClick: () => store.setOverlay("cli"),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Terminal, { className: "size-4" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
								label: "Help",
								onClick: () => store.setOverlay(store.overlay === "help" ? "none" : "help"),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleHelp, { className: "size-4" })
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
				className: "flex shrink-0 items-end gap-px overflow-x-auto border-b border-border bg-gutter px-1 pt-1",
				children: [store.tabs.map((t) => {
					const on = t.id === tab.id;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => store.setActive(t.id),
						className: cn("group flex h-9 max-w-48 items-center gap-2 rounded-t-sm px-3 font-mono text-xs", on ? "bg-bg text-fg" : "text-muted hover:bg-elevated hover:text-fg"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "truncate",
							children: [t.name, t.gen !== t.savedGen ? " *" : ""]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							role: "button",
							tabIndex: 0,
							className: "rounded-xs p-1 text-subtle hover:bg-elevated hover:text-fg",
							onClick: (e) => {
								e.stopPropagation();
								store.closeTab(t.id);
							},
							onKeyDown: (e) => {
								if (e.key === "Enter") store.closeTab(t.id);
							},
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-3" })
						})]
					}, t.id);
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "mb-0.5 ml-1 inline-flex h-8 w-8 items-center justify-center rounded-sm text-muted hover:bg-elevated hover:text-fg",
					onClick: () => store.newFile(),
					"aria-label": "New file",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilePlus, { className: "size-4" })
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex min-h-0 flex-1",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EditorPane, {})
			}),
			store.overlay === "find" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FindBar, {}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
				className: "flex h-7 shrink-0 items-center justify-between gap-3 overflow-hidden border-t border-border bg-surface px-3 font-mono text-[11px] text-muted",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "truncate font-medium text-fg",
						children: [tab.name, dirty ? " *" : ""]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "hidden truncate sm:inline",
						children: store.msg
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "shrink-0 tabular-nums",
						children: [
							"Ln ",
							tab.cursor.r + 1,
							"/",
							tab.lines.length,
							", Col ",
							tab.cursor.c + 1,
							selLen > 1 ? ` | Sel ${selLen}` : "",
							" | ",
							tab.lang,
							" | UTF-8 | LF",
							tab.wrap ? " | WRAP" : "",
							" | ",
							tab.useTabs ? "Tab" : `Sp:${tab.indentW}`,
							" |",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: dirty ? "text-warn" : "text-accent",
								children: dirty ? "Modified" : "Saved"
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
				ref: ta,
				"aria-label": "Editor input",
				className: "sr-only",
				autoCapitalize: "off",
				autoCorrect: "off",
				spellCheck: false,
				onKeyDown: onKey,
				onPaste,
				onInput,
				onBlur: () => {
					if (store.overlay === "none") queueMicrotask(() => ta.current?.focus());
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex shrink-0 gap-1 overflow-x-auto border-t border-border bg-surface p-2 sm:hidden",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MobBtn, {
						onClick: () => store.undo(),
						children: "Undo"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MobBtn, {
						onClick: save,
						children: "Save"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MobBtn, {
						onClick: () => store.setOverlay("find"),
						children: "Find"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MobBtn, {
						onClick: () => store.toggleWrap(),
						children: "Wrap"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MobBtn, {
						onClick: () => store.setOverlay("cli"),
						children: "CLI"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MobBtn, {
						onClick: () => store.setOverlay("help"),
						children: "Help"
					})
				]
			}),
			store.overlay === "help" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HelpModal, { onClose: () => store.setOverlay("none") }) : null,
			store.overlay === "quit" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, {
				title: `Save changes to ${tab.name}?`,
				onClose: () => store.confirmQuit("cancel"),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "The buffer has unsaved edits."
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-5 flex flex-wrap gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primary, {
							onClick: () => store.confirmQuit("save"),
							children: "Save"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ghost, {
							onClick: () => store.confirmQuit("discard"),
							children: "Don't save"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ghost, {
							onClick: () => store.confirmQuit("cancel"),
							children: "Cancel"
						})
					]
				})]
			}) : null,
			store.overlay === "goto" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Modal, {
				title: "Go to line",
				onClose: () => store.setOverlay("none"),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: (e) => {
						e.preventDefault();
						const [ln, col] = gotoVal.split(/[: ,]/);
						store.gotoLine(Number(ln) || 1, col ? Number(col) : 1);
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						autoFocus: true,
						value: gotoVal,
						onChange: (e) => setGotoVal(e.target.value),
						placeholder: "line[:col]",
						className: "h-11 w-full rounded-md border border-border bg-elevated px-3 font-mono text-sm text-fg outline-none ring-accent focus:ring-2"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primary, {
							type: "submit",
							children: "Go"
						})
					})]
				})
			}) : null,
			store.overlay === "saveas" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Modal, {
				title: "Save as",
				onClose: () => store.setOverlay("none"),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: (e) => {
						e.preventDefault();
						if (saveName.trim()) {
							store.rename(saveName.trim());
							downloadTab({
								...tab,
								name: saveName.trim()
							});
							store.markSaved();
							store.setOverlay("none");
						}
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						autoFocus: true,
						value: saveName,
						onChange: (e) => setSaveName(e.target.value),
						className: "h-11 w-full rounded-md border border-border bg-elevated px-3 font-mono text-sm text-fg outline-none ring-accent focus:ring-2"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primary, {
							type: "submit",
							children: "Download"
						})
					})]
				})
			}) : null,
			store.overlay === "cli" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CliPanel, { onClose: () => store.setOverlay("none") }) : null
		]
	});
}
function FindBar() {
	const store = useEditor();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex shrink-0 flex-col gap-2 border-t border-border bg-surface px-3 py-2 sm:flex-row sm:items-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "flex min-w-0 flex-1 items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "shrink-0 font-mono text-xs text-muted",
					children: "Find"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					autoFocus: true,
					value: store.findText,
					onChange: (e) => store.setFind({ findText: e.target.value }),
					className: "h-10 min-w-0 flex-1 rounded-sm border border-border bg-elevated px-2 font-mono text-sm text-fg outline-none ring-accent focus:ring-2"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "flex min-w-0 flex-1 items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "shrink-0 font-mono text-xs text-muted",
					children: "Replace"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: store.replText,
					onChange: (e) => store.setFind({ replText: e.target.value }),
					className: "h-10 min-w-0 flex-1 rounded-sm border border-border bg-elevated px-2 font-mono text-sm text-fg outline-none ring-accent focus:ring-2"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ghost, {
						onClick: () => store.findNext(1),
						children: "Next"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ghost, {
						onClick: () => store.findNext(-1),
						children: "Prev"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ghost, {
						onClick: () => store.replaceOne(),
						children: "Replace"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ghost, {
						onClick: () => store.replaceAll(),
						children: "All"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "ml-2 flex items-center gap-1 font-mono text-xs text-muted",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: store.findCase,
							onChange: (e) => store.setFind({ findCase: e.target.checked })
						}), "Aa"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex items-center gap-1 font-mono text-xs text-muted",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: store.findRegex,
							onChange: (e) => store.setFind({ findRegex: e.target.checked })
						}), ".*"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
						label: "Close find",
						onClick: () => store.setOverlay("none"),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" })
					})
				]
			})
		]
	});
}
function HelpModal({ onClose }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Modal, {
		title: "ECHO · key reference",
		onClose,
		wide: true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
			className: "overflow-auto font-mono text-xs leading-5 text-muted",
			children: `File      Ctrl+S Save      F2 Save As      Ctrl+Q Close tab
Edit      Ctrl+Z Undo      Ctrl+Y Redo     Ctrl+C/X/V Copy/Cut/Paste
          Ctrl+A Select all   Ctrl+D Duplicate   Ctrl+L Delete line
          Ctrl+/ Comment      Tab / Shift+Tab Indent
          Alt+Up/Down Move line(s)
Search    Ctrl+F Find   Ctrl+R Replace   F3 Next   Ctrl+G Go to line
View      Ctrl+W or Alt+Z  Word wrap
Select    Shift+Arrows · mouse drag · double-click word · triple-click line

Without a selection, copy/cut takes the current line.

The Linux CLI build (ete) is a single Python 3 file using curses.
Open the CLI panel to download ete.py and the install snippet.`
		})
	});
}
function CliPanel({ onClose }) {
	const store = useEditor();
	const [src, setSrc] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		fetch("/ete.py").then((r) => r.text()).then(setSrc).catch(() => setSrc("# Could not load ete.py"));
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, {
		title: "Linux CLI · ete",
		onClose,
		wide: true,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Single-file Python 3 editor (stdlib curses). Same Windows-style shortcuts, including Ctrl+C copy without killing the process."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
				className: "mt-4 list-decimal space-y-2 pl-5 font-mono text-xs leading-5 text-fg",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/ete.py",
						download: "ete.py",
						className: "text-accent underline-offset-2 hover:underline",
						children: "Download ete.py"
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["Install globally:", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
						className: "mt-2 overflow-auto rounded-md bg-elevated p-3 text-[11px] text-muted",
						children: `mkdir -p ~/.local/bin
install -m 755 ete.py ~/.local/bin/ete
# ensure ~/.local/bin is on PATH
ete --version
ete filename.txt`
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["Or run in place: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "text-accent",
						children: "python3 ete.py notes.md"
					})] })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 flex flex-wrap gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primary, {
					onClick: () => {
						if (src) store.openText("ete.py", src);
						onClose();
					},
					children: "Open source in editor"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ghost, {
					onClick: () => {
						store.openSample("py");
						onClose();
					},
					children: "Python sample"
				})]
			})
		]
	});
}
function LogoMark() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 40 40",
		className: "size-9 shrink-0 text-accent",
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				width: "40",
				height: "40",
				rx: "8",
				className: "fill-elevated"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M6 8 L20 20 L6 32",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "4"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M24 10 h10 v3.2 h-6.4 v4.2 h6.4 v3.2 h-6.4 V26 H34 v3.2 H24 z",
				fill: "currentColor"
			})
		]
	});
}
function IconBtn({ children, onClick, label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		title: label,
		"aria-label": label,
		onClick,
		className: "inline-flex h-10 w-10 items-center justify-center rounded-sm text-muted hover:bg-elevated hover:text-fg",
		children
	});
}
function MobBtn({ children, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		onClick,
		className: "h-10 rounded-sm border border-border bg-elevated px-3 font-mono text-xs text-fg",
		children
	});
}
function Modal({ title, children, onClose, wide }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-50 flex items-end justify-center bg-bg/70 p-3 sm:items-center",
		onClick: onClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: cn("max-h-[85dvh] w-full overflow-auto rounded-xl border border-border bg-surface p-5 shadow-lg", wide ? "max-w-2xl" : "max-w-md"),
			onClick: (e) => e.stopPropagation(),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-4 flex items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-sans text-base font-medium tracking-tight",
					children: title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: onClose,
					className: "rounded-sm p-1 text-muted hover:text-fg",
					"aria-label": "Close",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" })
				})]
			}), children]
		})
	});
}
function Primary({ children, onClick, type = "button" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type,
		onClick,
		className: "inline-flex h-10 items-center rounded-md bg-accent px-4 font-sans text-sm font-medium text-accent-fg hover:opacity-90",
		children
	});
}
function Ghost({ children, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		onClick,
		className: "inline-flex h-10 items-center rounded-md border border-border px-3 font-sans text-sm text-fg hover:bg-elevated",
		children
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EchoApp, {});
}
//#endregion
export { Home as component };
