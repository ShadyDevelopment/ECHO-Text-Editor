import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { bracketPair, tokenizeLine } from "@/lib/editor/syntax";
import { ordered } from "@/lib/editor/types";
import { useEditor } from "@/store/editor-store";
import { cn } from "@/lib/utils";

const ROLE_CLASS: Record<string, string> = {
  kw: "tok-kw",
  str: "tok-str",
  com: "tok-com",
  num: "tok-num",
  typ: "tok-typ",
  spc: "tok-spc",
  fun: "tok-fun",
  def: "",
};

export function EditorPane() {
  const tab = useEditor((s) => s.activeTab());
  const findText = useEditor((s) => s.findText);
  const findCase = useEditor((s) => s.findCase);
  const overlay = useEditor((s) => s.overlay);
  const setCursor = useEditor((s) => s.setCursor);
  const selectWord = useEditor((s) => s.selectWord);
  const selectLine = useEditor((s) => s.selectLine);
  const scroller = useRef<HTMLDivElement>(null);
  const clicks = useRef({ n: 0, t: 0, r: -1 });

  const pairs = useMemo(
    () => bracketPair(tab.lines, tab.cursor.r, tab.cursor.c),
    [tab.lines, tab.cursor.r, tab.cursor.c],
  );

  const sel = tab.anchor ? ordered(tab.anchor, tab.cursor) : null;
  const gutterW = Math.max(3, String(tab.lines.length).length) + 1;

  const findRe = useMemo(() => {
    if (!findText || overlay !== "find") return null;
    try {
      return new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), findCase ? "g" : "gi");
    } catch {
      return null;
    }
  }, [findText, findCase, overlay]);

  useEffect(() => {
    const el = scroller.current?.querySelector(`[data-row="${tab.cursor.r}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [tab.cursor.r, tab.cursor.c, tab.id]);

  const onMouse = (e: React.MouseEvent, kind: "down" | "move") => {
    const rowEl = (e.target as HTMLElement).closest("[data-row]") as HTMLElement | null;
    if (!rowEl) return;
    const r = Number(rowEl.dataset.row);
    const code = rowEl.querySelector("[data-code]") as HTMLElement | null;
    if (!code) return;
    const col = colFromPoint(code, tab.lines[r] ?? "", e.clientX);
    const p = { r, c: col };
    if (kind === "down") {
      const now = Date.now();
      const next = now - clicks.current.t < 400 && clicks.current.r === r ? clicks.current.n + 1 : 1;
      clicks.current = { n: next, t: now, r };
      if (next === 2) selectWord(p);
      else if (next >= 3) selectLine(r);
      else setCursor(p, e.shiftKey);
    } else if (e.buttons === 1) {
      setCursor(p, true);
    }
  };

  const emptyWelcome =
    !tab.lines[0] && tab.lines.length === 1 && tab.name.startsWith("untitled") && tab.gen === 0;

  return (
    <div
      ref={scroller}
      className="editor-scroll relative min-h-0 flex-1 overflow-auto bg-bg font-mono text-sm leading-6"
      onMouseDown={(e) => onMouse(e, "down")}
      onMouseMove={(e) => onMouse(e, "move")}
    >
      {emptyWelcome ? <WelcomeArt /> : null}
      <div className="min-w-full pb-16">
        {tab.lines.map((line, r) => {
          const toks = tokenizeLine(line, tab.lang);
          const selRange = selRangeOnLine(sel, r, line.length);
          const finds = findRe
            ? [...line.matchAll(findRe)].map((m) => [m.index ?? 0, (m.index ?? 0) + m[0].length] as const)
            : [];
          return (
            <div key={r} data-row={r} className={cn("relative flex", r === tab.cursor.r && "bg-elevated/50")}>
              <span
                className={cn(
                  "sticky left-0 z-10 shrink-0 select-none bg-gutter pr-3 text-right text-subtle",
                  r === tab.cursor.r && "text-muted",
                )}
                style={{ width: `${gutterW + 1.5}ch` }}
              >
                {r + 1}
              </span>
              <span
                data-code
                className={cn(
                  "relative min-w-0 flex-1 whitespace-pre pr-8",
                  tab.wrap && "whitespace-pre-wrap break-all",
                )}
              >
                {selRange ? (
                  <span
                    className="pointer-events-none absolute top-0 h-full bg-sel"
                    style={{
                      left: `${selRange[0]}ch`,
                      width: `${Math.max(selRange[1] - selRange[0], 0.4)}ch`,
                    }}
                  />
                ) : null}
                {finds.map(([a, b], i) => (
                  <span
                    key={i}
                    className="pointer-events-none absolute top-0 h-full bg-find"
                    style={{ left: `${a}ch`, width: `${b - a}ch` }}
                  />
                ))}
                {toks.map((tok, i) => (
                  <span key={i} className={cn("relative", ROLE_CLASS[tok.role])}>
                    {paintBrackets(tok.text, tok.i0, pairs, r)}
                  </span>
                ))}
                {r === tab.cursor.r ? (
                  <span
                    className="pointer-events-none absolute top-[0.2em] h-[1.15em] w-px bg-accent"
                    style={{ left: `${tab.cursor.c}ch` }}
                  />
                ) : null}
                {line.length === 0 ? "\u00a0" : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function paintBrackets(text: string, i0: number, pairs: Set<string>, r: number) {
  if (!pairs.size) return text || "\u00a0";
  const parts: ReactNode[] = [];
  let buf = "";
  for (let i = 0; i < text.length; i++) {
    const key = `${r}:${i0 + i}`;
    if (pairs.has(key)) {
      if (buf) parts.push(buf);
      buf = "";
      parts.push(
        <span key={key} className="tok-br">
          {text[i]}
        </span>,
      );
    } else buf += text[i];
  }
  if (buf) parts.push(buf);
  return parts.length ? parts : text;
}

function colFromPoint(code: HTMLElement, line: string, clientX: number): number {
  const rect = code.getBoundingClientRect();
  const cs = getComputedStyle(code);
  const ch = measureCh(cs.font);
  const x = clientX - rect.left;
  if (x <= 0 || ch <= 0) return 0;
  return Math.max(0, Math.min(line.length, Math.round(x / ch)));
}

let chCache: { font: string; w: number } | null = null;
function measureCh(font: string) {
  if (chCache?.font === font) return chCache.w;
  const c = document.createElement("canvas").getContext("2d");
  if (!c) return 8;
  c.font = font;
  const w = c.measureText("M").width;
  chCache = { font, w };
  return w;
}

function selRangeOnLine(
  sel: [{ r: number; c: number }, { r: number; c: number }] | null,
  r: number,
  len: number,
): [number, number] | null {
  if (!sel) return null;
  const [a, b] = sel;
  if (r < a.r || r > b.r) return null;
  if (a.r === b.r && a.c === b.c) return null;
  const c0 = r === a.r ? a.c : 0;
  const c1 = r === b.r ? b.c : len;
  return [c0, c1];
}

function WelcomeArt() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <pre className="select-none text-center font-mono text-[13px] leading-5 tracking-wide text-accent/90">
        {`  ______
 |  ____|
 | |__
 |  __|
 | |____
 |______|

ECHO Text Editor  v1.0.0
Antonio Martinovic — ShadyDevelopment

Ctrl+S Save   Ctrl+F Find   Ctrl+Q Close   F1 Help`}
      </pre>
    </div>
  );
}
