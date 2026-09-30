export type Pos = { r: number; c: number };

export type Op = {
  a: Pos;
  old: string;
  neu: string;
  cb: Pos;
  ca: Pos;
};

export type LangName =
  | "Python"
  | "JavaScript"
  | "TypeScript"
  | "HTML"
  | "CSS"
  | "JSON"
  | "Markdown"
  | "C"
  | "C++"
  | "Shell"
  | "YAML"
  | "Plain Text";

export type Role = "def" | "kw" | "str" | "com" | "num" | "typ" | "spc" | "fun";

export type TabDoc = {
  id: string;
  name: string;
  lines: string[];
  cursor: Pos;
  anchor: Pos | null;
  want: number;
  undo: Op[];
  redo: Op[];
  gen: number;
  savedGen: number;
  lang: LangName;
  wrap: boolean;
  useTabs: boolean;
  indentW: number;
};

export function cmp(a: Pos, b: Pos): number {
  return a.r !== b.r ? a.r - b.r : a.c - b.c;
}

export function ordered(a: Pos, b: Pos): [Pos, Pos] {
  return cmp(a, b) <= 0 ? [a, b] : [b, a];
}

export function clampPos(lines: string[], p: Pos): Pos {
  const r = Math.max(0, Math.min(p.r, lines.length - 1));
  const c = Math.max(0, Math.min(p.c, (lines[r] ?? "").length));
  return { r, c };
}

export function endOf(a: Pos, text: string): Pos {
  if (!text.includes("\n")) return { r: a.r, c: a.c + text.length };
  const parts = text.split("\n");
  return { r: a.r + parts.length - 1, c: parts[parts.length - 1].length };
}

export function isWord(ch: string): boolean {
  return /[A-Za-z0-9_]/.test(ch);
}
