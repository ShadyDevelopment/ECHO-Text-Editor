import { type Op, type Pos, clampPos, endOf } from "./types";

export function textRange(lines: string[], a: Pos, b: Pos): string {
  if (a.r === b.r) return lines[a.r].slice(a.c, b.c);
  return [lines[a.r].slice(a.c), ...lines.slice(a.r + 1, b.r), lines[b.r].slice(0, b.c)].join("\n");
}

export function applyReplace(lines: string[], a: Pos, b: Pos, text: string): string[] {
  const head = lines[a.r].slice(0, a.c);
  const tail = lines[b.r].slice(b.c);
  const mid = (head + text + tail).split("\n");
  return [...lines.slice(0, a.r), ...mid, ...lines.slice(b.r + 1)];
}

export function wordLeft(lines: string[], r: number, c: number): Pos {
  if (c === 0) return r > 0 ? { r: r - 1, c: lines[r - 1].length } : { r: 0, c: 0 };
  const line = lines[r];
  let i = c;
  while (i > 0 && !/[A-Za-z0-9_]/.test(line[i - 1])) i--;
  while (i > 0 && /[A-Za-z0-9_]/.test(line[i - 1])) i--;
  return { r, c: i };
}

export function wordRight(lines: string[], r: number, c: number): Pos {
  const line = lines[r];
  if (c >= line.length) return r + 1 < lines.length ? { r: r + 1, c: 0 } : { r, c };
  let i = c;
  while (i < line.length && !/[A-Za-z0-9_]/.test(line[i])) i++;
  while (i < line.length && /[A-Za-z0-9_]/.test(line[i])) i++;
  return { r, c: i };
}

export function leadingIndent(line: string): string {
  const m = line.match(/^[ \t]*/);
  return m ? m[0] : "";
}

export function mergeUndo(last: Op | undefined, a: Pos, old: string, neu: string, end: Pos): Op | null {
  if (!last) return null;
  if (!old && !last.old && neu.length === 1 && neu !== "\n" && !last.neu.includes("\n") && a.r === last.ca.r && a.c === last.ca.c && last.neu.length < 200) {
    const alnum = /[A-Za-z0-9]/.test(neu);
    const prev = /[A-Za-z0-9]/.test(last.neu.slice(-1));
    if (alnum === prev) {
      return { ...last, neu: last.neu + neu, ca: end };
    }
  }
  if (!neu && !last.neu && old.length === 1 && old !== "\n" && !last.old.includes("\n")) {
    if (a.r === last.a.r && a.c + old.length === last.a.c) {
      return { ...last, old: old + last.old, a, ca: a };
    }
    if (a.r === last.a.r && a.c === last.a.c) {
      return { ...last, old: last.old + old };
    }
  }
  return null;
}

export { clampPos, endOf };
