import type { LangName, Role } from "./types";

export type Lang = {
  name: LangName;
  kw: Set<string>;
  types: Set<string>;
  lc: string[];
  block?: [string, string];
  strings: string[];
  extras: { re: RegExp; role: Role }[];
  ci?: boolean;
};

function S(s: string) {
  return new Set(s.split(/\s+/).filter(Boolean));
}

const C_BLOCK: [string, string] = ["/*", "*/"];

export const LANGS: Record<string, Lang> = {
  Python: {
    name: "Python",
    kw: S("False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case"),
    types: S("self cls int str float bool list dict set tuple bytes object print len range type super open isinstance enumerate zip map filter sorted sum min max abs any all Exception"),
    lc: ["#"],
    strings: ["'", '"'],
    extras: [{ re: /@[\w.]+/g, role: "spc" }],
  },
  JavaScript: {
    name: "JavaScript",
    kw: S("async await break case catch class const continue debugger default delete do else export extends finally for from function if import in instanceof let new of return static super switch this throw try typeof var void while with yield"),
    types: S("true false null undefined NaN Infinity console window document Promise Array Object String Number Boolean Map Set JSON Math"),
    lc: ["//"],
    block: C_BLOCK,
    strings: ["'", '"', "`"],
    extras: [],
  },
  TypeScript: {
    name: "TypeScript",
    kw: S("async await break case catch class const continue debugger default delete do else export extends finally for from function if import in instanceof let new of return static super switch this throw try typeof var void while with yield interface type enum implements namespace declare readonly abstract public private protected as is keyof"),
    types: S("true false null undefined string number boolean any unknown never"),
    lc: ["//"],
    block: C_BLOCK,
    strings: ["'", '"', "`"],
    extras: [],
  },
  HTML: {
    name: "HTML",
    kw: new Set(),
    types: new Set(),
    lc: [],
    block: ["<!--", "-->"],
    strings: ['"'],
    extras: [
      { re: /<\/?[A-Za-z][\w:-]*/g, role: "kw" },
      { re: /\/?>/g, role: "kw" },
      { re: /[\w:-]+(?==)/g, role: "typ" },
    ],
  },
  CSS: {
    name: "CSS",
    kw: new Set(),
    types: new Set(),
    lc: [],
    block: C_BLOCK,
    strings: ["'", '"'],
    extras: [
      { re: /#[0-9a-fA-F]{3,8}\b/g, role: "num" },
      { re: /[.#][A-Za-z_-][\w-]*/g, role: "spc" },
      { re: /@[\w-]+/g, role: "kw" },
      { re: /[A-Za-z-]+(?=\s*:)/g, role: "typ" },
    ],
  },
  JSON: {
    name: "JSON",
    kw: S("true false null"),
    types: new Set(),
    lc: [],
    strings: ['"'],
    extras: [{ re: /"(?:\\.|[^"\\])*"(?=\s*:)/g, role: "typ" }],
  },
  Markdown: {
    name: "Markdown",
    kw: new Set(),
    types: new Set(),
    lc: [],
    strings: [],
    extras: [
      { re: /^#{1,6}\s.*/g, role: "spc" },
      { re: /^\s*>.*/g, role: "com" },
      { re: /\*\*[^*\n]+\*\*/g, role: "kw" },
      { re: /`[^`\n]+`/g, role: "str" },
      { re: /^\s*(?:[-*+]|\d+\.)\s/g, role: "spc" },
    ],
  },
  C: {
    name: "C",
    kw: S("auto break case const continue default do else enum extern for goto if inline register restrict return sizeof static struct switch typedef union volatile while"),
    types: S("int char short long float double void unsigned signed size_t bool FILE NULL true false"),
    lc: ["//"],
    block: C_BLOCK,
    strings: ['"'],
    extras: [{ re: /^\s*#\s*\w+/g, role: "spc" }],
  },
  "C++": {
    name: "C++",
    kw: S("auto break case const continue default do else enum extern for goto if inline register restrict return sizeof static struct switch typedef union volatile while class namespace template typename public private protected virtual override new delete this using try catch throw nullptr constexpr"),
    types: S("int char short long float double void unsigned signed string vector map set std auto"),
    lc: ["//"],
    block: C_BLOCK,
    strings: ['"'],
    extras: [{ re: /^\s*#\s*\w+/g, role: "spc" }],
  },
  Shell: {
    name: "Shell",
    kw: S("if then else elif fi for while until do done case esac in function select time return exit break continue local export readonly declare unset source alias"),
    types: S("echo cd ls cat grep sed awk test true false read printf eval exec set shift"),
    lc: ["#"],
    strings: ["'", '"'],
    extras: [{ re: /\$\{?[\w#?@*!$-]+\}?/g, role: "spc" }],
  },
  YAML: {
    name: "YAML",
    kw: S("true false null yes no on off"),
    types: new Set(),
    lc: ["#"],
    strings: ["'", '"'],
    extras: [{ re: /^\s*(?:-\s+)?[\w./-]+(?=\s*:)/g, role: "typ" }],
  },
};

const EXT: Record<string, LangName> = {
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
  yaml: "YAML",
};

export function detectLang(name: string, first = ""): LangName {
  const base = name.split("/").pop() ?? name;
  const ext = base.includes(".") ? base.split(".").pop()!.toLowerCase() : "";
  if (ext && EXT[ext]) return EXT[ext];
  if (first.startsWith("#!")) {
    if (first.includes("python")) return "Python";
    if (first.includes("node")) return "JavaScript";
    if (first.includes("bash") || first.includes("sh")) return "Shell";
  }
  return "Plain Text";
}

export function commentPrefix(lang: LangName): string | null {
  const L = LANGS[lang];
  return L?.lc[0] ?? null;
}

export type LineTok = { text: string; role: Role; i0: number };

export function tokenizeLine(line: string, langName: LangName): LineTok[] {
  const lang = LANGS[langName];
  if (!lang || !line) return [{ text: line, role: "def", i0: 0 }];
  const roles: Role[] = Array(line.length).fill("def");

  const paint = (s: number, e: number, r: Role) => {
    for (let i = Math.max(0, s); i < Math.min(e, line.length); i++) roles[i] = r;
  };

  if (lang.lc.length) {
    let best = -1;
    for (const p of lang.lc) {
      const k = line.indexOf(p);
      if (k >= 0 && (best < 0 || k < best)) best = k;
    }
    if (best >= 0) {
      // ignore comment marker inside strings later — good enough for demo
      paint(best, line.length, "com");
    }
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
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
      if (roles[m.index] === "com") continue;
      paint(m.index, m.index + m[0].length, "str");
    }
  }

  const num = /\b(?:0[xX][0-9a-fA-F_]+|\d[\d_]*\.?\d*(?:[eE][+-]?\d+)?)\b/g;
  let nm: RegExpExecArray | null;
  while ((nm = num.exec(line))) {
    if (roles[nm.index] === "def") paint(nm.index, nm.index + nm[0].length, "num");
  }

  const word = /[A-Za-z_$][\w$]*/g;
  let wm: RegExpExecArray | null;
  while ((wm = word.exec(line))) {
    if (roles[wm.index] !== "def") continue;
    const w = lang.ci ? wm[0].toLowerCase() : wm[0];
    if (lang.kw.has(w)) paint(wm.index, wm.index + wm[0].length, "kw");
    else if (lang.types.has(w)) paint(wm.index, wm.index + wm[0].length, "typ");
    else if (line[wm.index + wm[0].length] === "(") paint(wm.index, wm.index + wm[0].length, "fun");
  }

  for (const ex of lang.extras) {
    ex.re.lastIndex = 0;
    let em: RegExpExecArray | null;
    const re = new RegExp(ex.re.source, ex.re.flags.includes("g") ? ex.re.flags : ex.re.flags + "g");
    while ((em = re.exec(line))) {
      if (roles[em.index] === "com" || roles[em.index] === "str") continue;
      paint(em.index, em.index + em[0].length, ex.role);
    }
  }

  const out: LineTok[] = [];
  let i = 0;
  while (i < line.length) {
    const r = roles[i];
    let j = i + 1;
    while (j < line.length && roles[j] === r) j++;
    out.push({ text: line.slice(i, j), role: r, i0: i });
    i = j;
  }
  if (!out.length) out.push({ text: "", role: "def", i0: 0 });
  return out;
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const BR_OPEN: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
const BR_CLOSE: Record<string, string> = { ")": "(", "]": "[", "}": "{" };

export function bracketPair(lines: string[], r: number, c: number): Set<string> {
  const line = lines[r] ?? "";
  const out = new Set<string>();
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

function scan(lines: string[], r: number, c: number, ch: string, other: string, d: number) {
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
        if (depth === 0) return { r, c: i };
      }
      if (++n > 20000) return null;
    }
    r += d;
    c = d > 0 ? 0 : (lines[r]?.length ?? 1) - 1;
  }
  return null;
}
