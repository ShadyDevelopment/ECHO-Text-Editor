#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ECHO Text Editor  (command: ete)
Developer : Antonio Martinovic - ShadyDevelopment

A terminal text editor with Windows/GUI-style shortcuts (Notepad++ feel),
written in pure Python 3 (stdlib `curses` only - no third-party packages).

Layout of this file
    1. Constants / logo / helpers
    2. Syntax highlighting engine (Lang) + language table
    3. Buffer  - text storage + undo/redo (operation based)
    4. Clipboard (wl-copy / xclip / xsel / pbcopy / OSC52 fallback)
    5. Input decoding (keys, modified keys, bracketed paste, mouse)
    6. Editor  - editing commands, find/replace, rendering, mouse
    7. main()
"""
import base64
import curses
import locale
import os
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import termios
import time
import unicodedata

VERSION = "1.0.0"
APP = "ECHO Text Editor"
AUTHOR = "Antonio Martinovic - ShadyDevelopment"

LOGO = [
    r"  ______ ",
    r" |  ____|",
    r" | |__   ",
    r" |  __|  ",
    r" | |____ ",
    r" |______|",
]

# Token roles used by the highlighter
DEF, KW, STR, COM, NUM, TYP, SPC, FUN = range(8)

BR_OPEN = {'(': ')', '[': ']', '{': '}'}
BR_CLOSE = {')': '(', ']': '[', '}': '{'}

KEY_HINT = "F1 Help   ^S Save   ^F Find   ^R Replace   ^Q Quit"


# ============================================================================
# 1. Helpers
# ============================================================================
def cw(ch):
    """Display width of a single character (0, 1 or 2 cells)."""
    if ch < '\u0300':
        return 1
    if unicodedata.category(ch) in ('Mn', 'Me', 'Cf'):
        return 0
    return 2 if unicodedata.east_asian_width(ch) in 'WF' else 1


def disp_col(line, cx, ts=4):
    """Display column of character index `cx` (tabs expanded)."""
    c = 0
    for ch in line[:cx]:
        c += (ts - c % ts) if ch == '\t' else cw(ch)
    return c


def col_at(line, dc, ts=4):
    """Character index that covers display column `dc`."""
    c = 0
    for i, ch in enumerate(line):
        w = (ts - c % ts) if ch == '\t' else cw(ch)
        if c + w > dc:
            return i
        c += w
    return len(line)


def is_word(ch):
    return ch.isalnum() or ch == '_'


def end_of(a, text):
    """Position reached after inserting `text` at position `a`."""
    if '\n' not in text:
        return (a[0], a[1] + len(text))
    parts = text.split('\n')
    return (a[0] + len(parts) - 1, len(parts[-1]))


# ============================================================================
# 2. Syntax highlighting
# ============================================================================
class Lang:
    """A regex driven tokenizer. State (for multi-line constructs) is either
    None or a tuple (end_delimiter, role)."""

    def __init__(self, name, kw='', types='', lc=(), blocks=(), strs='"\'',
                 extra=(), words=True, numbers=True, ci=False, tabs=False):
        self.name, self.ci, self.tabs, self.lc = name, ci, tabs, tuple(lc)
        norm = (lambda s: set(s.lower().split())) if ci else (lambda s: set(s.split()))
        self.kw, self.types = norm(kw), norm(types)
        self.blocks, self.extra = list(blocks), list(extra)
        parts = []
        if lc:
            parts.append('(?P<lc>' + '|'.join(re.escape(x) for x in lc) + ').*')
        for i, (s, _e, _r) in enumerate(self.blocks):
            parts.append('(?P<b%d>%s)' % (i, re.escape(s)))
        for i, (pat, _r) in enumerate(self.extra):
            parts.append('(?P<x%d>%s)' % (i, pat))
        if strs:
            parts.append('(?P<s>' + '|'.join(
                q + r'(?:\\.|[^' + q + r'\\])*' + q + '?' for q in strs) + ')')
        if numbers:
            parts.append(r'(?P<n>\b(?:0[xX][0-9a-fA-F_]+|0[bB][01_]+|'
                         r'\d[\d_]*\.?\d*(?:[eE][+-]?\d+)?)\b)')
        if words:
            parts.append(r'(?P<w>[A-Za-z_$][\w$]*)')
        self.rx = re.compile('|'.join(parts)) if parts else None

    def tokenize(self, line, state):
        """Return (roles_per_char, state_at_end_of_line)."""
        n = len(line)
        roles = [DEF] * n
        if self.rx is None or n > 4000:
            return roles, state
        i = 0
        if state:
            end, role = state
            k = line.find(end)
            if k < 0:
                return [role] * n, state
            j = k + len(end)
            roles[:j] = [role] * j
            i, state = j, None
        rx = self.rx
        while i < n:
            m = rx.search(line, i)
            if not m:
                break
            s, e = m.span()
            g = m.lastgroup
            if g == 'lc':
                roles[s:] = [COM] * (n - s)
                break
            if g == 'w':
                w = m.group()
                key = w.lower() if self.ci else w
                if key in self.kw:
                    r = KW
                elif key in self.types:
                    r = TYP
                elif line[e:e + 1] == '(':
                    r = FUN
                else:
                    i = e
                    continue
            elif g == 'n':
                r = NUM
            elif g == 's':
                r = STR
            elif g[0] == 'x':
                r = self.extra[int(g[1:])][1]
            else:  # multi-line block (comment / triple string / template)
                _bs, be, r = self.blocks[int(g[1:])]
                k = line.find(be, e)
                if k < 0:
                    roles[s:] = [r] * (n - s)
                    state = (be, r)
                    break
                e = k + len(be)
            roles[s:e] = [r] * (e - s)
            i = e
        return roles, state


LANGS, EXT, NAMES = {}, {}, {}


def _add(lang, *exts, names=()):
    LANGS[lang.name] = lang
    for e in exts:
        EXT[e] = lang.name
    for n in names:
        NAMES[n] = lang.name


def _build_languages():
    cblk = [('/*', '*/', COM)]
    _add(Lang('Python',
              kw='False None True and as assert async await break class continue def del elif else '
                 'except finally for from global if import in is lambda nonlocal not or pass raise '
                 'return try while with yield match case',
              types='self cls int str float bool list dict set tuple bytes object print len range '
                    'type super open isinstance enumerate zip map filter sorted sum min max abs any '
                    'all Exception ValueError TypeError KeyError',
              lc=('#',), blocks=[('"""', '"""', STR), ("'''", "'''", STR)],
              extra=[(r'@[\w.]+', SPC)]), '.py', '.pyw', '.pyi')
    js_kw = ('async await break case catch class const continue debugger default delete do else '
             'export extends finally for from function if import in instanceof let new of return '
             'static super switch this throw try typeof var void while with yield')
    js_ty = ('true false null undefined NaN Infinity console window document Promise Array Object '
             'String Number Boolean Map Set JSON Math')
    _add(Lang('JavaScript', kw=js_kw, types=js_ty, lc=('//',),
              blocks=cblk + [('`', '`', STR)]), '.js', '.mjs', '.cjs', '.jsx')
    _add(Lang('TypeScript',
              kw=js_kw + ' interface type enum implements namespace declare readonly abstract '
                         'public private protected as is keyof',
              types=js_ty + ' string number boolean any unknown never',
              lc=('//',), blocks=cblk + [('`', '`', STR)]), '.ts', '.tsx')
    c_kw = ('auto break case const continue default do else enum extern for goto if inline '
            'register restrict return sizeof static struct switch typedef union volatile while')
    c_ty = ('int char short long float double void unsigned signed size_t bool FILE NULL true '
            'false uint8_t uint16_t uint32_t uint64_t int8_t int16_t int32_t int64_t')
    pre = [(r'^\s*#\s*\w+', SPC)]
    _add(Lang('C', kw=c_kw, types=c_ty, lc=('//',), blocks=cblk, extra=pre), '.c', '.h')
    _add(Lang('C++',
              kw=c_kw + ' class namespace template typename public private protected virtual '
                        'override new delete this using try catch throw nullptr constexpr noexcept '
                        'operator explicit friend mutable static_cast dynamic_cast '
                        'reinterpret_cast const_cast',
              types=c_ty + ' string vector map set std auto wchar_t',
              lc=('//',), blocks=cblk, extra=pre),
         '.cpp', '.cc', '.cxx', '.hpp', '.hh', '.hxx')
    _add(Lang('Java',
              kw='abstract assert break case catch class continue default do else enum extends '
                 'final finally for if implements import instanceof interface native new package '
                 'private protected public return static super switch synchronized this throw '
                 'throws try volatile while',
              types='int long double float boolean char byte short void String Integer List Map '
                    'true false null var',
              lc=('//',), blocks=cblk, extra=[(r'@\w+', SPC)]), '.java')
    _add(Lang('Go',
              kw='break case chan const continue default defer else fallthrough for func go goto '
                 'if import interface map package range return select struct switch type var',
              types='int int8 int16 int32 int64 uint uint8 uint16 uint32 uint64 float32 float64 '
                    'string bool byte rune error true false nil any make new len cap append',
              lc=('//',), blocks=cblk + [('`', '`', STR)], tabs=True), '.go')
    _add(Lang('Rust',
              kw='as async await break const continue crate dyn else enum extern fn for if impl in '
                 'let loop match mod move mut pub ref return self Self static struct super trait '
                 'type unsafe use where while',
              types='i8 i16 i32 i64 i128 isize u8 u16 u32 u64 u128 usize f32 f64 bool char str '
                    'String Vec Option Result Some None Ok Err Box true false',
              lc=('//',), blocks=cblk, extra=[(r"'\w+(?!')\b", SPC), (r'#!?\[[^\]]*\]', SPC)]), '.rs')
    _add(Lang('Shell',
              kw='if then else elif fi for while until do done case esac in function select time '
                 'return exit break continue local export readonly declare unset source alias',
              types='echo cd ls cat grep sed awk test true false read printf eval exec set shift',
              lc=('#',), numbers=False,
              extra=[(r'\$\{?[\w#?@*!$-]+\}?', SPC)]),
         '.sh', '.bash', '.zsh', '.ksh', names=('.bashrc', '.zshrc', '.profile', '.bash_profile'))
    _add(Lang('HTML', strs='"', words=False, numbers=False,
              blocks=[('<!--', '-->', COM)],
              extra=[(r'</?[A-Za-z][\w:-]*', KW), (r'/?>', KW), (r'&\w+;', SPC),
                     (r'[\w:-]+(?==)', TYP)]), '.html', '.htm', '.xhtml', '.vue')
    _add(Lang('XML', strs='"\'', words=False, numbers=False,
              blocks=[('<!--', '-->', COM)],
              extra=[(r'</?[A-Za-z?][\w:.-]*', KW), (r'\??/?>', KW), (r'&\w+;', SPC),
                     (r'[\w:-]+(?==)', TYP)]), '.xml', '.svg', '.xsd', '.plist')
    _add(Lang('CSS', strs='"\'', numbers=False, words=False, blocks=cblk,
              extra=[(r'#[0-9a-fA-F]{3,8}\b', NUM), (r'[.#][A-Za-z_-][\w-]*', SPC),
                     (r'@[\w-]+', KW), (r'[A-Za-z-]+(?=\s*:)', TYP),
                     (r'-?\d+\.?\d*(?:px|em|rem|%|vh|vw|s|ms|pt|deg)?', NUM)]),
         '.css', '.scss', '.less')
    _add(Lang('JSON', strs='"', kw='true false null',
              extra=[(r'"(?:\\.|[^"\\])*"(?=\s*:)', TYP)]), '.json', '.jsonc', '.geojson')
    _add(Lang('Markdown', strs='', words=False, numbers=False,
              blocks=[('```', '```', STR)],
              extra=[(r'^#{1,6}\s.*', SPC), (r'^\s*>.*', COM), (r'\*\*[^*\n]+\*\*', KW),
                     (r'`[^`\n]+`', STR), (r'^\s*(?:[-*+]|\d+\.)\s', SPC),
                     (r'\[[^\]\n]*\]\([^)\n]*\)', TYP)]), '.md', '.markdown')
    _add(Lang('YAML', kw='true false null yes no on off', lc=('#',),
              extra=[(r'^\s*(?:-\s+)?[\w./-]+(?=\s*:(?:\s|$))', TYP), (r'[&*][\w-]+', SPC)]),
         '.yml', '.yaml')
    _add(Lang('INI/TOML', kw='true false', lc=('#', ';'),
              extra=[(r'^\s*\[[^\]]*\]', SPC), (r'^\s*[\w.-]+(?=\s*=)', TYP)]),
         '.toml', '.ini', '.cfg', '.conf', '.desktop')
    _add(Lang('SQL', ci=True, lc=('--',), blocks=cblk,
              kw='select from where insert into values update set delete create table drop alter '
                 'add join left right inner outer on group by order having limit offset as and or '
                 'not null is in like between union all distinct primary key foreign references '
                 'index view case when then else end exists',
              types='int integer varchar text char date timestamp boolean float double decimal'),
         '.sql')
    _add(Lang('Lua', lc=('--',), blocks=[('--[[', ']]', COM)],
              kw='and break do else elseif end for function goto if in local not or repeat return '
                 'then until while',
              types='true false nil print pairs ipairs require table string math'), '.lua')
    _add(Lang('Ruby', lc=('#',),
              kw='alias and begin break case class def defined? do else elsif end ensure for if in '
                 'module next not or redo rescue retry return self super then undef unless until '
                 'when while yield',
              types='true false nil puts print require include attr_accessor',
              extra=[(r':\w+', SPC), (r'@@?\w+', TYP)]), '.rb', '.rake', names=('Rakefile', 'Gemfile'))
    _add(Lang('Makefile', lc=('#',), tabs=True, numbers=False,
              kw='ifeq ifneq ifdef ifndef else endif include define endef export override',
              extra=[(r'^[\w./%-]+(?=\s*:(?!=))', TYP), (r'\$[({][^)}]*[)}]|\$[@<^?*]', SPC)]),
         '.mk', names=('Makefile', 'makefile', 'GNUmakefile'))
    _add(Lang('Dockerfile', lc=('#',), ci=True, numbers=False,
              kw='from run cmd label expose env add copy entrypoint volume user workdir arg onbuild '
                 'stopsignal healthcheck shell as'), names=('Dockerfile',))


_build_languages()
SHEBANGS = [('python', 'Python'), ('node', 'JavaScript'), ('ruby', 'Ruby'),
            ('lua', 'Lua'), ('bash', 'Shell'), ('zsh', 'Shell'), ('sh', 'Shell')]


def detect_lang(path, first_line):
    """Pick a language from file name/extension, falling back to the shebang."""
    base = os.path.basename(path or '')
    if base in NAMES:
        return LANGS[NAMES[base]]
    ext = os.path.splitext(base)[1].lower()
    if ext in EXT:
        return LANGS[EXT[ext]]
    if first_line.startswith('#!'):
        for key, name in SHEBANGS:
            if key in first_line:
                return LANGS[name]
    return None


# ============================================================================
# 3. Buffer with operation-based undo/redo
# ============================================================================
class Op:
    __slots__ = ('a', 'old', 'new', 'cb', 'ca', 't', 'id')


class Buffer:
    """Lines of text + undo history.  Every edit is one primitive:
    replace(range a..b) with text. Undo/redo just replay the inverse."""

    def __init__(self, lines=None):
        self.lines = lines or ['']
        self.undo, self.redo = [], []
        self.counter = 0
        self.saved_id = 0
        self.dirty = None          # lowest row changed since last highlight pass

    # -- modification tracking ------------------------------------------------
    @property
    def cur_id(self):
        return self.undo[-1].id if self.undo else 0

    @property
    def modified(self):
        return self.cur_id != self.saved_id

    def mark_saved(self):
        self.seal()
        self.saved_id = self.cur_id

    def seal(self):
        """Stop merging further keystrokes into the previous undo step."""
        if self.undo:
            self.undo[-1].t = 0

    # -- primitives -------------------------------------------------------------
    def text_range(self, a, b):
        L = self.lines
        if a[0] == b[0]:
            return L[a[0]][a[1]:b[1]]
        return '\n'.join([L[a[0]][a[1]:]] + L[a[0] + 1:b[0]] + [L[b[0]][:b[1]]])

    def _apply(self, a, b, text):
        L = self.lines
        head, tail = L[a[0]][:a[1]], L[b[0]][b[1]:]
        L[a[0]:b[0] + 1] = (head + text + tail).split('\n')
        self.dirty = a[0] if self.dirty is None else min(self.dirty, a[0])

    def replace(self, a, b, text, cb, ca=None):
        """Replace a..b with text. cb/ca = cursor before/after (for undo/redo)."""
        old = self.text_range(a, b)
        if not old and not text:
            return a
        self._apply(a, b, text)
        end = end_of(a, text)
        if ca is None:
            ca = end
        now = time.monotonic()
        last = self.undo[-1] if self.undo else None
        merged = False
        if last and not self.redo and now - last.t < 1.0:
            if (not old and not last.old and len(text) == 1 and text != '\n'
                    and '\n' not in last.new and a == last.ca and len(last.new) < 200
                    and text.isalnum() == last.new[-1:].isalnum()):
                last.new += text
                last.ca = end
                merged = True
            elif (not text and not last.new and len(old) == 1 and old != '\n'
                  and '\n' not in last.old):
                if b == last.a:                      # Backspace run
                    last.old, last.a, last.ca = old + last.old, a, a
                    merged = True
                elif a == last.a:                    # Delete-key run
                    last.old += old
                    merged = True
        if merged:
            last.t = now
            self.counter += 1
            last.id = self.counter
        else:
            op = Op()
            op.a, op.old, op.new, op.cb, op.ca, op.t = a, old, text, cb, ca, now
            self.counter += 1
            op.id = self.counter
            self.undo.append(op)
            self.redo.clear()
            if len(self.undo) > 20000:
                del self.undo[:2000]
        return end

    def do_undo(self):
        if not self.undo:
            return None
        op = self.undo.pop()
        self._apply(op.a, end_of(op.a, op.new), op.old)
        self.redo.append(op)
        return op.cb

    def do_redo(self):
        if not self.redo:
            return None
        op = self.redo.pop()
        self._apply(op.a, end_of(op.a, op.old), op.new)
        self.undo.append(op)
        return op.ca


# ============================================================================
# 4. Clipboard
# ============================================================================
class Clipboard:
    COPY = [['wl-copy'], ['xclip', '-selection', 'clipboard', '-i'],
            ['xsel', '--clipboard', '--input'], ['pbcopy']]
    PASTE = [['wl-paste', '-n'], ['xclip', '-selection', 'clipboard', '-o'],
             ['xsel', '--clipboard', '--output'], ['pbpaste']]

    def __init__(self):
        self.text = ''
        self.copy_cmds = [c for c in self.COPY if shutil.which(c[0])]
        self.paste_cmds = [c for c in self.PASTE if shutil.which(c[0])]

    def set(self, text):
        self.text = text
        for cmd in self.copy_cmds:
            try:
                r = subprocess.run(cmd, input=text.encode('utf-8', 'replace'), timeout=2,
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                if r.returncode == 0:
                    return
            except (OSError, subprocess.SubprocessError):
                pass
        try:  # OSC 52: works over SSH in most modern terminals
            data = base64.b64encode(text.encode('utf-8', 'replace')).decode()
            if len(data) < 100000:
                os.write(1, ('\033]52;c;%s\a' % data).encode())
        except OSError:
            pass

    def get(self):
        for cmd in self.paste_cmds:
            try:
                r = subprocess.run(cmd, timeout=2, stdout=subprocess.PIPE,
                                   stderr=subprocess.DEVNULL)
                if r.returncode == 0 and r.stdout:
                    return r.stdout.decode('utf-8', 'replace')
            except (OSError, subprocess.SubprocessError):
                pass
        return self.text


# ============================================================================
# 5. Input decoding
# ============================================================================
def _modname(base, mod):
    m = mod - 1
    pre = ('C' if m & 4 else '') + ('A' if m & 2 else '') + ('S' if m & 1 else '')
    return pre + '-' + base if pre else base


INTKEYS = {}
for _n, _v in (('KEY_UP', 'UP'), ('KEY_DOWN', 'DOWN'), ('KEY_LEFT', 'LEFT'),
               ('KEY_RIGHT', 'RIGHT'), ('KEY_HOME', 'HOME'), ('KEY_END', 'END'),
               ('KEY_PPAGE', 'PGUP'), ('KEY_NPAGE', 'PGDN'), ('KEY_DC', 'DEL'),
               ('KEY_BACKSPACE', 'BACKSPACE'), ('KEY_BTAB', 'BTAB'), ('KEY_IC', 'INS'),
               ('KEY_ENTER', 'ENTER'), ('KEY_SLEFT', 'S-LEFT'), ('KEY_SRIGHT', 'S-RIGHT'),
               ('KEY_SR', 'S-UP'), ('KEY_SF', 'S-DOWN'), ('KEY_SHOME', 'S-HOME'),
               ('KEY_SEND', 'S-END'), ('KEY_SPREVIOUS', 'S-PGUP'), ('KEY_SNEXT', 'S-PGDN'),
               ('KEY_SDC', 'S-DEL'), ('KEY_RESIZE', 'RESIZE'), ('KEY_MOUSE', 'MOUSE'),
               ('KEY_F15', 'S-F3')):
    if hasattr(curses, _n):
        INTKEYS[getattr(curses, _n)] = _v
for _i in range(1, 13):
    INTKEYS[curses.KEY_F0 + _i] = 'F%d' % _i

EXT_KEYS = {'LFT': 'LEFT', 'RIT': 'RIGHT', 'UP': 'UP', 'DN': 'DOWN', 'HOM': 'HOME',
            'END': 'END', 'DC': 'DEL', 'PRV': 'PGUP', 'NXT': 'PGDN', 'IC': 'INS'}
BTN4 = getattr(curses, 'BUTTON4_PRESSED', 0x10000)
BTN5 = getattr(curses, 'BUTTON5_PRESSED', 0x200000)


# ============================================================================
# 6. The editor
# ============================================================================
class Editor:
    def __init__(self, scr, path, goto_line=None):
        self.scr = scr
        self.path = path
        self.clip = Clipboard()
        self.clip_text, self.clip_line = '', False
        self.paste_text = ''
        # cursor / selection / viewport
        self.cy = self.cx = self.want = 0
        self.anchor = None
        self.top_row = self.top_sub = self.left = 0
        self.follow = True
        self.wrap = False
        self.h = self.w = 0
        self.gut, self.tw, self.th = 5, 10, 10
        # file properties
        self.eol, self.final_nl = '\n', True
        self.use_tabs, self.indent_w, self.ts = False, 4, 4
        self.lang, self.states = None, [None]
        # find/replace
        self.find_text, self.repl_text = '', ''
        self.f_case, self.f_regex, self.find_rx = False, False, None
        # messages / overlay (prompt lines)
        self.msg, self.msg_t, self.msg_err = '', 0, False
        self.ov, self.ov_cur = None, (1, 0)
        # mouse
        self.dragging, self.drag_from = False, (0, 0)
        self.last_click, self.last_pos, self.clicks = 0, None, 0
        self.running = True
        self.buf = Buffer()
        self.init_colors()
        if path and os.path.exists(path):
            self.load(path)
        elif path:
            self.lang = detect_lang(path, '')
            self.use_tabs = bool(self.lang and self.lang.tabs)
            self.say("New file: " + path)
        if goto_line:
            self.cy = min(max(goto_line - 1, 0), len(self.buf.lines) - 1)
        self.commands = {
            '^C': self.copy, '^X': lambda: self.copy(True), '^V': self.paste,
            '^Z': self.undo, '^Y': self.redo, '^A': self.select_all, '^S': self.save,
            '^F': lambda: self.find_dialog(False), '^R': lambda: self.find_dialog(True),
            '^Q': self.quit, '^G': self.goto_dialog, '^W': self.toggle_wrap,
            'A-z': self.toggle_wrap, '^D': self.dup_line, '^L': self.del_line,
            '^_': self.toggle_comment, 'F1': self.show_help, 'F2': self.save_as,
            'F3': self.find_next, 'S-F3': self.find_prev,
            'A-UP': lambda: self.move_lines(-1), 'A-DOWN': lambda: self.move_lines(1),
            'ENTER': self.newline, 'BACKSPACE': self.backspace, 'DEL': self.delete,
            'C-BACKSPACE': self.del_word_back, 'C-DEL': self.del_word_fwd,
            'TAB': self.tab, 'BTAB': self.untab, 'ESC': self.escape, 'INS': lambda: None,
        }

    # ------------------------------------------------------------------ setup
    def init_colors(self):
        self.RA = [curses.A_NORMAL] * 8
        self.A_LN = self.A_LNC = self.A_SEL = self.A_BR = self.A_FIND = curses.A_NORMAL
        self.A_STAT = self.A_ERR = self.A_LOGO = self.A_MOD = self.A_OK = curses.A_NORMAL
        if not curses.has_colors():
            self.RA = [0, curses.A_BOLD, curses.A_UNDERLINE, curses.A_DIM, 0, curses.A_BOLD, 0, 0]
            self.A_SEL = self.A_BR = self.A_FIND = self.A_STAT = curses.A_REVERSE
            self.A_LNC = curses.A_BOLD
            self.A_MOD = self.A_OK = curses.A_REVERSE
            return
        curses.start_color()
        curses.use_default_colors()
        if curses.COLORS >= 256:
            pal = [(-1, -1), (197, -1), (186, -1), (244, -1), (141, -1), (81, -1), (208, -1),
                   (148, -1), (240, -1), (250, -1), (255, 24), (255, 60), (16, 148),
                   (16, 222), (196, -1), (81, -1), (16, 215), (16, 114)]
        else:
            B, R, G, Y, Bl, M, C, W = (curses.COLOR_BLACK, curses.COLOR_RED, curses.COLOR_GREEN,
                                       curses.COLOR_YELLOW, curses.COLOR_BLUE,
                                       curses.COLOR_MAGENTA, curses.COLOR_CYAN, curses.COLOR_WHITE)
            pal = [(-1, -1), (M, -1), (G, -1), (Bl, -1), (R, -1), (C, -1), (Y, -1), (C, -1),
                   (Bl, -1), (W, -1), (W, Bl), (W, Bl), (B, G), (B, Y), (R, -1), (C, -1),
                   (B, Y), (B, G)]
        for i, (fg, bg) in enumerate(pal):
            curses.init_pair(i + 1, fg, bg)
        cp = curses.color_pair
        self.RA = [cp(1), cp(2) | curses.A_BOLD, cp(3), cp(4), cp(5), cp(6), cp(7), cp(8)]
        (self.A_LN, self.A_LNC, self.A_STAT, self.A_SEL, self.A_BR, self.A_FIND, self.A_ERR,
         self.A_LOGO, self.A_MOD, self.A_OK) = (cp(9), cp(10) | curses.A_BOLD, cp(11), cp(12),
                                                cp(13) | curses.A_BOLD, cp(14), cp(15) | curses.A_BOLD,
                                                cp(16), cp(17) | curses.A_BOLD, cp(18) | curses.A_BOLD)

    def say(self, text, err=False):
        self.msg, self.msg_t, self.msg_err = text, time.time(), err

    # ---------------------------------------------------------------- file io
    def load(self, path):
        try:
            with open(path, 'rb') as f:
                text = f.read().decode('utf-8', 'surrogateescape')
        except OSError as e:
            self.say("Cannot open: %s" % e.strerror, True)
            return
        self.eol = '\r\n' if '\r\n' in text else '\n'
        text = text.replace('\r\n', '\n')
        lines = text.split('\n')
        self.final_nl = True
        if len(lines) > 1 and lines[-1] == '':
            lines.pop()
        elif len(lines) > 1:
            self.final_nl = False
        self.buf = Buffer(lines)
        self.lang = detect_lang(path, lines[0])
        tabs = sum(1 for l in lines[:500] if l.startswith('\t'))
        spaces = sum(1 for l in lines[:500] if l.startswith('  '))
        self.use_tabs = tabs > spaces or bool(self.lang and self.lang.tabs and tabs >= spaces)
        ind = [len(l) - len(l.lstrip(' ')) for l in lines[:500] if l.startswith(' ') and l.strip()]
        if ind and 2 <= min(ind) <= 8:
            self.indent_w = min(ind)
        self.states = [None]
        self.say("Opened %s (%d lines)" % (os.path.basename(path), len(lines)))

    def save(self):
        if not self.path:
            return self.save_as()
        return self._write(self.path)

    def save_as(self):
        p = self.prompt("Save as: ", self.path or '')
        if not p:
            return False
        p = os.path.expanduser(p)
        if os.path.exists(p) and os.path.abspath(p) != os.path.abspath(self.path or ''):
            if self.ask("'%s' exists. Overwrite? (Y)es / (N)o" % os.path.basename(p), 'yn') != 'y':
                return False
        return self._write(p)

    def _write(self, path):
        text = '\n'.join(self.buf.lines) + ('\n' if self.final_nl else '')
        if self.eol == '\r\n':
            text = text.replace('\n', '\r\n')
        data = text.encode('utf-8', 'surrogateescape')
        real = os.path.realpath(path)
        try:
            d = os.path.dirname(real) or '.'
            fd, tmp = tempfile.mkstemp(dir=d, prefix='.ete-')
            try:
                with os.fdopen(fd, 'wb') as f:
                    f.write(data)
                    f.flush()
                    os.fsync(f.fileno())
                if os.path.exists(real):
                    shutil.copymode(real, tmp)
                os.replace(tmp, real)
            except BaseException:
                if os.path.exists(tmp):
                    os.unlink(tmp)
                raise
        except OSError:
            try:                                   # fallback: write in place
                with open(real, 'wb') as f:
                    f.write(data)
            except OSError as e:
                self.say("Save failed: %s" % e.strerror, True)
                return False
        changed = path != self.path
        self.path = path
        if changed or self.lang is None:
            self.lang = detect_lang(path, self.buf.lines[0])
            self.states = [None]
        self.buf.mark_saved()
        self.say("Saved %s (%d lines)" % (os.path.basename(path), len(self.buf.lines)))
        return True

    def quit(self):
        if self.buf.modified:
            name = os.path.basename(self.path) if self.path else '[No Name]'
            a = self.ask("Save changes to %s? (Y)es / (N)o / (C)ancel" % name, 'ync')
            if a == 'y':
                if not self.save():
                    return
            elif a != 'n':
                return
        self.running = False

    # ------------------------------------------------------------- input layer
    def getkey(self):
        try:
            k = self.scr.get_wch()
        except curses.error:
            return None
        except KeyboardInterrupt:
            return '^C'
        if isinstance(k, int):
            if k in INTKEYS:
                return INTKEYS[k]
            try:                                   # extended terminfo keys (kLFT5 ...)
                m = re.fullmatch(r'k(\w+?)(\d)', curses.keyname(k).decode())
                if m and m.group(1) in EXT_KEYS:
                    return _modname(EXT_KEYS[m.group(1)], int(m.group(2)))
            except (curses.error, ValueError):
                pass
            return 'UNKNOWN'
        if k == '\x1b':
            return self.read_escape()
        if k in '\r\n':
            return 'ENTER'
        if k == '\t':
            return 'TAB'
        if k == '\x7f':
            return 'BACKSPACE'
        if k == '\x08':
            kbs = curses.tigetstr('kbs')
            return 'BACKSPACE' if kbs == b'\x08' else 'C-BACKSPACE'
        if ord(k) < 32:
            return '^' + chr(ord(k) + 64)
        return k

    def read_escape(self):
        """Decode an ESC sequence that ncurses did not translate (Ctrl/Alt
        modified keys, bracketed paste, Alt+char)."""
        scr = self.scr
        scr.nodelay(True)
        buf = ''
        try:
            while True:
                try:
                    c = scr.get_wch()
                except curses.error:
                    break
                if isinstance(c, int):
                    break
                buf += c
                if buf[0] == '[':
                    if len(buf) > 1 and (c.isalpha() or c == '~'):
                        break
                elif buf[0] == 'O':
                    if len(buf) >= 2:
                        break
                else:
                    break
        finally:
            scr.timeout(1000)
        if not buf:
            return 'ESC'
        if buf == '[200~':                         # bracketed paste
            scr.timeout(300)
            s = ''
            while True:
                try:
                    c = scr.get_wch()
                except curses.error:
                    break
                if isinstance(c, int):
                    continue
                s += c
                if s.endswith('\x1b[201~'):
                    s = s[:-6]
                    break
            scr.timeout(1000)
            self.paste_text = s.replace('\r\n', '\n').replace('\r', '\n')
            return 'PASTE'
        m = re.fullmatch(r'[\[O](\d*)(?:;(\d+))?([A-Za-z~])', buf)
        if m:
            n, mod, f = int(m.group(1) or 1), int(m.group(2) or 1), m.group(3)
            base = ({1: 'HOME', 2: 'INS', 3: 'DEL', 4: 'END', 5: 'PGUP', 6: 'PGDN'}.get(n)
                    if f == '~' else
                    {'A': 'UP', 'B': 'DOWN', 'C': 'RIGHT', 'D': 'LEFT', 'H': 'HOME', 'F': 'END',
                     'P': 'F1', 'Q': 'F2', 'R': 'F3', 'S': 'F4'}.get(f))
            return _modname(base, mod) if base else 'UNKNOWN'
        if len(buf) == 1:
            return 'A-' + buf
        return 'UNKNOWN'

    # ------------------------------------------------------------- main loop
    def run(self):
        while self.running:
            self.draw()
            self.handle(self.getkey())

    def handle(self, k):
        if k is None or k == 'UNKNOWN':
            return
        if k == 'RESIZE':
            self.scr.clear()
            return
        if k == 'MOUSE':
            return self.on_mouse()
        if k == 'PASTE':
            return self.insert_text(self.paste_text)
        sel, base = False, k
        if k.startswith('CS-'):
            sel, base = True, 'C-' + k[3:]
        elif k.startswith('S-'):
            sel, base = True, k[2:]
        if base in ('LEFT', 'RIGHT', 'UP', 'DOWN', 'HOME', 'END', 'PGUP', 'PGDN',
                    'C-LEFT', 'C-RIGHT', 'C-HOME', 'C-END'):
            return self.move(base, sel)
        fn = self.commands.get(k)
        if fn:
            return fn()
        if len(k) == 1 and (k.isprintable() or k == ' '):
            self.replace_sel(k)

    # ------------------------------------------------------- cursor movement
    def clamp(self):
        L = self.buf.lines
        self.cy = min(max(self.cy, 0), len(L) - 1)
        self.cx = min(max(self.cx, 0), len(L[self.cy]))

    def goto(self, r, c, select=False, keep_want=False):
        if select:
            if self.anchor is None:
                self.anchor = (self.cy, self.cx)
        else:
            self.anchor = None
        self.cy, self.cx = r, c
        self.clamp()
        if not keep_want:
            self.want = disp_col(self.buf.lines[self.cy], self.cx, self.ts)
        self.buf.seal()
        self.follow = True

    def sel(self):
        if self.anchor is None or self.anchor == (self.cy, self.cx):
            return None
        a, c = self.anchor, (self.cy, self.cx)
        return (a, c) if a < c else (c, a)

    def word_left(self, r, c):
        L = self.buf.lines
        if c == 0:
            return (r - 1, len(L[r - 1])) if r > 0 else (0, 0)
        line, i = L[r], c
        while i > 0 and not is_word(line[i - 1]):
            i -= 1
        while i > 0 and is_word(line[i - 1]):
            i -= 1
        return (r, i)

    def word_right(self, r, c):
        L = self.buf.lines
        line = L[r]
        if c >= len(line):
            return (r + 1, 0) if r + 1 < len(L) else (r, c)
        i = c
        while i < len(line) and not is_word(line[i]):
            i += 1
        while i < len(line) and is_word(line[i]):
            i += 1
        return (r, i)

    def vmove(self, d, select):
        """Move the cursor one visual row up/down (keeps desired column)."""
        L = self.buf.lines
        if not self.wrap:
            r = self.cy + d
            if r < 0:
                return self.goto(0, 0, select)
            if r >= len(L):
                return self.goto(len(L) - 1, len(L[-1]), select)
            return self.goto(r, col_at(L[r], self.want, self.ts), select, True)
        tw, wx = self.tw, self.want % self.tw
        dc = disp_col(L[self.cy], self.cx, self.ts)
        sub = dc // tw
        if d < 0:
            if sub > 0:
                r, ndc = self.cy, (sub - 1) * tw + wx
            elif self.cy > 0:
                r = self.cy - 1
                ndc = (self.seg_count(r) - 1) * tw + wx
            else:
                return self.goto(0, 0, select)
        else:
            if sub + 1 < self.seg_count(self.cy):
                r, ndc = self.cy, (sub + 1) * tw + wx
            elif self.cy + 1 < len(L):
                r, ndc = self.cy + 1, wx
            else:
                return self.goto(self.cy, len(L[self.cy]), select)
        self.goto(r, col_at(L[r], ndc, self.ts), select, True)

    def move(self, base, sel):
        L, s = self.buf.lines, self.sel()
        if base == 'LEFT':
            if s and not sel:
                self.goto(*s[0])
            elif self.cx > 0:
                self.goto(self.cy, self.cx - 1, sel)
            elif self.cy > 0:
                self.goto(self.cy - 1, len(L[self.cy - 1]), sel)
        elif base == 'RIGHT':
            if s and not sel:
                self.goto(*s[1])
            elif self.cx < len(L[self.cy]):
                self.goto(self.cy, self.cx + 1, sel)
            elif self.cy + 1 < len(L):
                self.goto(self.cy + 1, 0, sel)
        elif base == 'UP':
            self.vmove(-1, sel)
        elif base == 'DOWN':
            self.vmove(1, sel)
        elif base == 'C-LEFT':
            self.goto(*self.word_left(self.cy, self.cx), select=sel)
        elif base == 'C-RIGHT':
            self.goto(*self.word_right(self.cy, self.cx), select=sel)
        elif base == 'HOME':                       # smart home
            line = L[self.cy]
            ind = len(line) - len(line.lstrip())
            self.goto(self.cy, 0 if self.cx == ind and ind else ind, sel)
        elif base == 'END':
            self.goto(self.cy, len(L[self.cy]), sel)
        elif base == 'C-HOME':
            self.goto(0, 0, sel)
        elif base == 'C-END':
            self.goto(len(L) - 1, len(L[-1]), sel)
        elif base in ('PGUP', 'PGDN'):
            d = -1 if base == 'PGUP' else 1
            for _ in range(max(1, self.th - 1)):
                self.step_top(d)
                self.vmove(d, sel)
                self.follow = True

    def select_all(self):
        L = self.buf.lines
        self.anchor = (0, 0)
        self.cy, self.cx = len(L) - 1, len(L[-1])
        self.follow = True

    def escape(self):
        self.anchor = None
        self.find_rx = None

    # ---------------------------------------------------------- editing core
    def edit(self, a, b, text, ca=None):
        cb = (self.cy, self.cx)
        end = self.buf.replace(a, b, text, cb, ca)
        self.anchor = None
        self.cy, self.cx = ca if ca else end
        self.clamp()
        self.want = disp_col(self.buf.lines[self.cy], self.cx, self.ts)
        self.follow = True

    def replace_sel(self, text, ca=None):
        s = self.sel()
        a, b = s if s else ((self.cy, self.cx), (self.cy, self.cx))
        self.edit(a, b, text, ca)

    def insert_text(self, text):
        if text:
            self.replace_sel(text)

    @property
    def unit(self):
        return '\t' if self.use_tabs else ' ' * self.indent_w

    def newline(self):
        s = self.sel()
        a, b = s if s else ((self.cy, self.cx),) * 2
        L = self.buf.lines
        before, tail = L[a[0]][:a[1]], L[b[0]][b[1]:]
        indent = re.match(r'[ \t]*', before).group()
        stripped = before.rstrip()
        extra, ca = '', None
        if stripped and (stripped[-1] in BR_OPEN or
                         (stripped[-1] == ':' and self.lang and self.lang.name in ('Python', 'YAML'))):
            extra = self.unit
        text = '\n' + indent + extra
        if extra and stripped[-1] in BR_OPEN and tail[:1] == BR_OPEN[stripped[-1]]:
            ca = (a[0] + 1, len(indent + extra))
            text += '\n' + indent
        self.edit(a, b, text, ca)

    def backspace(self):
        if self.sel():
            return self.replace_sel('')
        L, r, c = self.buf.lines, self.cy, self.cx
        if c > 0:
            line = L[r]
            if not self.use_tabs and not line[:c].strip():   # soft-tab unindent
                n = c % self.indent_w or self.indent_w
                if line[c - n:c] == ' ' * n:
                    return self.edit((r, c - n), (r, c), '')
            self.edit((r, c - 1), (r, c), '')
        elif r > 0:
            self.edit((r - 1, len(L[r - 1])), (r, 0), '')

    def delete(self):
        if self.sel():
            return self.replace_sel('')
        L, r, c = self.buf.lines, self.cy, self.cx
        if c < len(L[r]):
            self.edit((r, c), (r, c + 1), '', ca=(r, c))
        elif r + 1 < len(L):
            self.edit((r, c), (r + 1, 0), '', ca=(r, c))

    def del_word_back(self):
        if self.sel():
            return self.replace_sel('')
        a = self.word_left(self.cy, self.cx)
        self.edit(a, (self.cy, self.cx), '')

    def del_word_fwd(self):
        if self.sel():
            return self.replace_sel('')
        b = self.word_right(self.cy, self.cx)
        self.edit((self.cy, self.cx), b, '', ca=(self.cy, self.cx))

    def sel_rows(self):
        s = self.sel()
        if not s:
            return self.cy, self.cy
        r1 = s[1][0] - (1 if s[1][1] == 0 and s[1][0] > s[0][0] else 0)
        return s[0][0], r1

    def tab(self):
        s = self.sel()
        if s and s[0][0] != s[1][0]:
            return self.shift_rows(False)
        if self.use_tabs:
            return self.replace_sel('\t')
        dc = disp_col(self.buf.lines[self.cy], self.cx, self.ts)
        self.replace_sel(' ' * (self.indent_w - dc % self.indent_w))

    def untab(self):
        self.shift_rows(True)

    def shift_rows(self, out):
        r0, r1 = self.sel_rows()
        L = self.buf.lines
        new = []
        for r in range(r0, r1 + 1):
            l = L[r]
            if not out:
                new.append(self.unit + l if l.strip() else l)
            elif l.startswith('\t'):
                new.append(l[1:])
            else:
                n = min(self.indent_w, len(l) - len(l.lstrip(' ')))
                new.append(l[n:])
        self.edit((r0, 0), (r1, len(L[r1])), '\n'.join(new))
        self.anchor = (r0, 0)
        self.cy, self.cx = r1, len(self.buf.lines[r1])

    def toggle_comment(self):
        if not self.lang or not self.lang.lc:
            return self.say("No line-comment syntax for this file type")
        p = self.lang.lc[0]
        r0, r1 = self.sel_rows()
        L = self.buf.lines
        rows = [L[r] for r in range(r0, r1 + 1)]
        nonempty = [l for l in rows if l.strip()]
        if not nonempty:
            return
        un = all(l.lstrip().startswith(p) for l in nonempty)
        ind = min(len(l) - len(l.lstrip()) for l in nonempty)
        new = []
        for l in rows:
            if not l.strip():
                new.append(l)
            elif un:
                i = len(l) - len(l.lstrip())
                rest = l[i + len(p):]
                new.append(l[:i] + (rest[1:] if rest.startswith(' ') else rest))
            else:
                new.append(l[:ind] + p + ' ' + l[ind:])
        cur = (self.cy, self.cx)
        self.edit((r0, 0), (r1, len(L[r1])), '\n'.join(new), ca=cur)

    def dup_line(self):
        s = self.sel()
        if s:
            self.edit(s[1], s[1], self.buf.text_range(*s))
            self.anchor = s[1]
        else:
            line = self.buf.lines[self.cy]
            self.edit((self.cy, len(line)), (self.cy, len(line)), '\n' + line,
                      ca=(self.cy + 1, self.cx))

    def del_line(self):
        L, r = self.buf.lines, self.cy
        if len(L) == 1:
            a, b, ca = (0, 0), (0, len(L[0])), (0, 0)
        elif r < len(L) - 1:
            a, b, ca = (r, 0), (r + 1, 0), (r, self.cx)
        else:
            a, b, ca = (r - 1, len(L[r - 1])), (r, len(L[r])), (r - 1, self.cx)
        self.edit(a, b, '', ca)

    def move_lines(self, d):
        r0, r1 = self.sel_rows()
        L = self.buf.lines
        if (d < 0 and r0 == 0) or (d > 0 and r1 >= len(L) - 1):
            return
        if d < 0:
            a, b = (r0 - 1, 0), (r1, len(L[r1]))
            text = '\n'.join(L[r0:r1 + 1] + [L[r0 - 1]])
        else:
            a, b = (r0, 0), (r1 + 1, len(L[r1 + 1]))
            text = '\n'.join([L[r1 + 1]] + L[r0:r1 + 1])
        anchor, cur = self.anchor, (self.cy, self.cx)
        self.edit(a, b, text, ca=(cur[0] + d, cur[1]))
        if anchor:
            self.anchor = (anchor[0] + d, anchor[1])

    # ------------------------------------------------------ clipboard / undo
    def copy(self, cut=False):
        s = self.sel()
        if s:
            text, self.clip_line = self.buf.text_range(*s), False
        else:
            text, self.clip_line = self.buf.lines[self.cy] + '\n', True
        self.clip.set(text)
        self.clip_text = text
        if cut:
            self.replace_sel('') if s else self.del_line()
        self.say(("Cut" if cut else "Copied") + (" line" if not s else " selection"))

    def paste(self):
        t = self.clip.get().replace('\r\n', '\n').replace('\r', '\n')
        if not t:
            return
        if self.clip_line and t == self.clip_text and not self.sel():
            self.edit((self.cy, 0), (self.cy, 0), t, ca=(self.cy + 1, self.cx))
        else:
            self.insert_text(t)

    def undo(self):
        p = self.buf.do_undo()
        if p is None:
            return self.say("Nothing to undo")
        self._after_history(p)

    def redo(self):
        p = self.buf.do_redo()
        if p is None:
            return self.say("Nothing to redo")
        self._after_history(p)

    def _after_history(self, p):
        self.cy, self.cx = p
        self.anchor = None
        self.clamp()
        self.want = disp_col(self.buf.lines[self.cy], self.cx, self.ts)
        self.follow = True

    def toggle_wrap(self):
        self.wrap = not self.wrap
        self.left = self.top_sub = 0
        self.follow = True
        self.say("Word wrap: " + ("ON" if self.wrap else "OFF"))

    # ---------------------------------------------------------- find/replace
    def compile_find(self):
        if not self.find_text:
            self.find_rx = None
            return True
        try:
            p = self.find_text if self.f_regex else re.escape(self.find_text)
            self.find_rx = re.compile(p, 0 if self.f_case else re.I)
            return True
        except re.error:
            self.find_rx = None
            return False

    def _matches(self, line):
        return [(m.start(), m.end()) for m in self.find_rx.finditer(line) if m.end() > m.start()]

    def search(self, pos, forward=True):
        """Find next/previous match from pos with wrap-around."""
        if not self.find_rx:
            return None
        L = self.buf.lines
        n, (r0, c0) = len(L), pos
        for k in range(n + 1):
            r = (r0 + k) % n if forward else (r0 - k) % n
            ms = self._matches(L[r])
            if forward:
                if k == 0:
                    ms = [x for x in ms if x[0] >= c0]
                elif k == n:
                    ms = [x for x in ms if x[0] < c0]
                if ms:
                    return (r,) + ms[0]
            else:
                if k == 0:
                    ms = [x for x in ms if x[0] < c0]
                elif k == n:
                    ms = [x for x in ms if x[0] >= c0]
                if ms:
                    return (r,) + ms[-1]
        return None

    def select_match(self, m):
        self.anchor = (m[0], m[1])
        self.cy, self.cx = m[0], m[2]
        self.want = disp_col(self.buf.lines[self.cy], self.cx, self.ts)
        self.follow = True

    def find_next(self):
        if not self.find_text:
            return self.find_dialog(False)
        s = self.sel()
        m = self.search(s[1] if s else (self.cy, self.cx), True)
        self.select_match(m) if m else self.say("Not found: " + self.find_text, True)

    def find_prev(self):
        if not self.find_text:
            return self.find_dialog(False)
        s = self.sel()
        m = self.search(s[0] if s else (self.cy, self.cx), False)
        self.select_match(m) if m else self.say("Not found: " + self.find_text, True)

    def _expand(self, m):
        if self.f_regex:
            try:
                return m.expand(self.repl_text)
            except (re.error, IndexError):
                pass
        return self.repl_text

    def replace_current(self):
        s = self.sel()
        if s and s[0][0] == s[1][0] and self.find_rx:
            m = self.find_rx.fullmatch(self.buf.text_range(*s))
            if m:
                self.edit(s[0], s[1], self._expand(m))
        self.find_next()

    def replace_all(self):
        if not self.find_rx:
            return
        L = self.buf.lines
        total, first, last, new = 0, None, None, []
        for r, line in enumerate(L):
            out, k = self.find_rx.subn(lambda m: self._expand(m), line)
            if k:
                total += k
                first = r if first is None else first
                last = r
            new.append(out)
        if not total:
            return self.say("Not found: " + self.find_text, True)
        cur = (self.cy, self.cx)
        self.edit((first, 0), (last, len(L[last])), '\n'.join(new[first:last + 1]), ca=cur)
        self.say("Replaced %d occurrence%s" % (total, '' if total == 1 else 's'))

    def fit(self, left, hint=''):
        """Fit prompt text in the bottom row. Returns (text, cursor_x)."""
        w = self.w
        if len(left) > w - 1:
            left = '…' + left[-(w - 2):]
        x = len(left)
        room = w - 1 - x
        if hint and room > len(hint) + 2:
            left = left + ' ' * (room - len(hint)) + hint
        return left, x

    def find_dialog(self, replace):
        s = self.sel()
        if s and s[0][0] == s[1][0]:
            self.find_text = self.buf.text_range(*s)
        start = s[0] if s else (self.cy, self.cx)
        focus = 1 if (replace and self.find_text) else 0
        self.compile_find()
        if self.find_rx:
            m = self.search(start, True)
            if m:
                self.select_match(m)
        try:
            while True:
                hint = "Enter=next Up/Dn Tab=replace ^T case[%s] ^E regex[%s] Esc" % (
                    'x' if self.f_case else ' ', 'x' if self.f_regex else ' ')
                ft, fx = self.fit("Find: " + self.find_text, hint)
                self.ov = [None, ft]
                self.ov_cur = (1, fx)
                if replace:
                    rt, rx = self.fit("Replace: " + self.repl_text,
                                      "Enter=replace ^R=replace all")
                    self.ov[0] = rt
                    if focus == 1:
                        self.ov_cur = (0, rx)
                self.draw()
                k = self.getkey()
                if k in ('ESC', '^Q'):
                    break
                if k is None or k in ('MOUSE', 'RESIZE', 'UNKNOWN'):
                    continue
                if k == 'ENTER':
                    self.replace_current() if focus == 1 else self.find_next()
                elif k in ('DOWN', 'F3'):
                    self.find_next()
                elif k in ('UP', 'S-F3'):
                    self.find_prev()
                elif k == 'TAB':
                    if replace:
                        focus ^= 1
                    else:
                        replace, focus = True, 1
                elif k == '^R':
                    if replace:
                        self.replace_all()
                    else:
                        replace, focus = True, 1
                elif k in ('^T', '^E'):
                    if k == '^T':
                        self.f_case = not self.f_case
                    else:
                        self.f_regex = not self.f_regex
                    if not self.compile_find() and self.find_text:
                        self.say("Invalid regular expression", True)
                    m = self.search(start, True)
                    if m:
                        self.select_match(m)
                else:
                    field = self.repl_text if focus == 1 else self.find_text
                    if k == 'BACKSPACE':
                        field = field[:-1]
                    elif k == 'PASTE':
                        field += self.paste_text.split('\n')[0]
                    elif k == '^V':
                        field += self.clip.get().split('\n')[0]
                    elif len(k) == 1:
                        field += k
                    else:
                        continue
                    if focus == 1:
                        self.repl_text = field
                    else:
                        self.find_text = field
                        if not self.compile_find() and field:
                            self.say("Invalid regular expression", True)
                        m = self.search(start, True)
                        if m:
                            self.select_match(m)
                        elif field:
                            self.say("Not found: " + field, True)
        finally:
            self.ov = None

    def goto_dialog(self):
        v = self.prompt("Go to line[:col]: ")
        if not v:
            return
        try:
            parts = v.replace(',', ':').split(':')
            r = int(parts[0]) - 1
            c = int(parts[1]) - 1 if len(parts) > 1 and parts[1] else 0
        except ValueError:
            return self.say("Invalid line number", True)
        self.goto(min(max(r, 0), len(self.buf.lines) - 1), max(c, 0))

    # ---------------------------------------------------------- modal prompts
    def prompt(self, label, initial=''):
        s = initial
        try:
            while True:
                t, x = self.fit(label + s)
                self.ov, self.ov_cur = [None, t], (1, x)
                self.draw()
                k = self.getkey()
                if k == 'ENTER':
                    return s
                if k in ('ESC', '^Q'):
                    return None
                if k == 'BACKSPACE':
                    s = s[:-1]
                elif k == 'PASTE':
                    s += self.paste_text.split('\n')[0]
                elif k == '^V':
                    s += self.clip.get().split('\n')[0]
                elif k and len(k) == 1:
                    s += k
        finally:
            self.ov = None

    def ask(self, text, choices):
        try:
            while True:
                t, _x = self.fit(text)
                self.ov, self.ov_cur = [None, t], None
                self.draw()
                k = self.getkey()
                if k == 'ESC':
                    return 'c' if 'c' in choices else 'n'
                if k and len(k) == 1 and k.lower() in choices:
                    return k.lower()
        finally:
            self.ov = None

    def show_help(self):
        rows = LOGO + ["", "%s  v%s" % (APP, VERSION), "by " + AUTHOR, "",
                       "File      ^S Save      F2 Save As      ^Q Quit",
                       "Edit      ^Z Undo      ^Y Redo         ^C/^X/^V Copy/Cut/Paste",
                       "          ^A Select all   ^D Duplicate line   ^L Delete line",
                       "          ^/ Toggle comment   Tab/Shift+Tab Indent/Unindent",
                       "          Alt+Up/Down Move line(s)   Ctrl+Backspace/Del Delete word",
                       "Search    ^F Find   ^R Replace   F3/Shift+F3 Next/Prev   ^G Go to line",
                       "View      ^W (or Alt+Z) Toggle word wrap",
                       "Select    Shift+Arrows / Ctrl+Shift+Arrows / Mouse drag / Double-click word",
                       "Mouse     Click, drag to select, wheel to scroll, triple-click line",
                       "",
                       "Without a selection, ^C and ^X copy/cut the current line.",
                       "", "Press any key to return"]
        self.scr.erase()
        h, w = self.scr.getmaxyx()
        y0 = max(0, (h - len(rows)) // 2)
        for i, t in enumerate(rows):
            if y0 + i >= h - 1:
                break
            attr = self.A_LOGO | curses.A_BOLD if i < len(LOGO) else 0
            if i < len(LOGO):
                x = max(0, (w - len(LOGO[0])) // 2)
            else:
                x = max(0, (w - len(max(rows[len(LOGO):], key=len))) // 2) if t[:1] == ' ' or t.split(' ')[0] in (
                    'File', 'Edit', 'Search', 'View', 'Select', 'Mouse', '') else max(0, (w - len(t)) // 2)
                if i < len(LOGO) + 4:
                    x = max(0, (w - len(t)) // 2)
            self.put(y0 + i, x, t[:w - 1], attr)
        self.scr.refresh()
        while True:
            k = self.getkey()
            if k == 'MOUSE':
                try:
                    curses.getmouse()
                except curses.error:
                    pass
            elif k not in (None, 'RESIZE'):
                break

    # --------------------------------------------------------------- layout
    def seg_count(self, row):
        if not self.wrap:
            return 1
        line = self.buf.lines[row]
        return max(1, -(-(disp_col(line, len(line), self.ts) + 1) // self.tw))

    def layout(self):
        h, w = self.scr.getmaxyx()
        self.h, self.w = h, w
        self.th = max(1, h - 2)
        self.gut = max(3, len(str(len(self.buf.lines)))) + 2
        self.tw = max(1, w - self.gut)
        if self.buf.dirty is not None:
            del self.states[self.buf.dirty + 1:]
            self.buf.dirty = None
        self.top_row = min(self.top_row, len(self.buf.lines) - 1)

    def step_top(self, d):
        if d > 0:
            if self.top_sub + 1 < self.seg_count(self.top_row):
                self.top_sub += 1
            elif self.top_row + 1 < len(self.buf.lines):
                self.top_row += 1
                self.top_sub = 0
        else:
            if self.top_sub > 0:
                self.top_sub -= 1
            elif self.top_row > 0:
                self.top_row -= 1
                self.top_sub = self.seg_count(self.top_row) - 1

    def scroll(self, n):
        self.follow = False
        self.layout()
        for _ in range(abs(n)):
            self.step_top(1 if n > 0 else -1)

    def ensure_visible(self):
        L, th, tw = self.buf.lines, self.th, self.tw
        dc = disp_col(L[self.cy], self.cx, self.ts)
        if not self.wrap:
            self.top_sub = 0
            if dc < self.left:
                self.left = dc
            elif dc >= self.left + tw:
                self.left = dc - tw + 1
            if self.cy < self.top_row:
                self.top_row = self.cy
            elif self.cy >= self.top_row + th:
                self.top_row = self.cy - th + 1
            return
        self.left = 0
        csub = dc // tw
        if (self.cy, csub) < (self.top_row, self.top_sub):
            self.top_row, self.top_sub = self.cy, csub
            return
        if self.cy - self.top_row > 2 * th:
            self.top_row, self.top_sub = self.cy, csub
            for _ in range(th - 1):
                self.step_top(-1)
            return
        d, r = -self.top_sub, self.top_row
        while r < self.cy:
            d += self.seg_count(r)
            r += 1
        d += csub
        while d >= th:
            self.step_top(1)
            d -= 1

    def state_at(self, row):
        S, L, lg = self.states, self.buf.lines, self.lang
        while len(S) <= row:
            k = len(S) - 1
            S.append(lg.tokenize(L[k], S[k])[1] if lg else None)
        return S[row]

    def cells(self, row):
        """Expand a line into screen cells: (text, source_col, role)."""
        line = self.buf.lines[row]
        roles = self.lang.tokenize(line, self.state_at(row))[0] if self.lang else None
        out, col, ts = [], 0, self.ts
        for i, ch in enumerate(line):
            role = roles[i] if roles else DEF
            if ch == '\t':
                n = ts - col % ts
                out.extend([(' ', i, role)] * n)
                col += n
                continue
            o = ord(ch)
            if o < 32 or 0x7f <= o < 0xa0 or 0xd800 <= o <= 0xdfff:
                ch = '?'
            w = cw(ch)
            if w == 0:
                if out:
                    out[-1] = (out[-1][0] + ch, out[-1][1], out[-1][2])
                continue
            out.append((ch, i, role))
            if w == 2:
                out.append(('', i, role))
            col += w
        out.append((' ', len(line), DEF))             # end-of-line cell
        return out

    def bracket_pair(self):
        L, line = self.buf.lines, self.buf.lines[self.cy]
        for c in (self.cx, self.cx - 1):
            if 0 <= c < len(line):
                ch = line[c]
                if ch in BR_OPEN:
                    m = self._scan((self.cy, c), ch, BR_OPEN[ch], 1)
                elif ch in BR_CLOSE:
                    m = self._scan((self.cy, c), ch, BR_CLOSE[ch], -1)
                else:
                    continue
                if m:
                    return {(self.cy, c), m}
        return ()

    def _scan(self, pos, ch, other, d):
        L, (r, c), depth, n = self.buf.lines, pos, 0, 0
        while 0 <= r < len(L):
            line = L[r]
            for i in (range(c, len(line)) if d > 0 else range(min(c, len(line) - 1), -1, -1)):
                x = line[i]
                if x == ch:
                    depth += 1
                elif x == other:
                    depth -= 1
                    if depth == 0:
                        return (r, i)
                n += 1
                if n > 30000:
                    return None
            r += d
            if 0 <= r < len(L):
                c = 0 if d > 0 else len(L[r]) - 1
        return None

    # -------------------------------------------------------------- drawing
    def put(self, y, x, text, attr=0):
        try:
            self.scr.addstr(y, x, text, attr)
        except curses.error:
            pass

    def draw(self):
        scr = self.scr
        scr.erase()
        h, w = scr.getmaxyx()
        if h < 4 or w < 20:
            self.put(0, 0, "Window too small")
            scr.refresh()
            return
        self.layout()
        if self.follow:
            self.ensure_visible()
            self.follow = False
        L, th, tw, gut = self.buf.lines, self.th, self.tw, self.gut
        sel, br = self.sel(), self.bracket_pair()
        cy, cx = self.cy, self.cx
        dc_cur = disp_col(L[cy], cx, self.ts)
        csub = dc_cur // tw if self.wrap else 0

        # welcome screen on an empty, unnamed buffer
        if not self.path and len(L) == 1 and not L[0] and not self.buf.modified:
            rows = LOGO + ["", APP + "  v" + VERSION, "by " + AUTHOR, "",
                           "Ctrl+S Save   Ctrl+F Find   Ctrl+Q Quit   F1 Help"]
            y0 = max(0, (th - len(rows)) // 2)
            for i, t in enumerate(rows):
                if y0 + i < th:
                    self.put(y0 + i, max(0, (w - len(t)) // 2), t[:w - 1],
                             (self.A_LOGO | curses.A_BOLD) if i < len(LOGO) else self.A_LN)

        row, sub = self.top_row, self.top_sub
        cur_y = cur_x = None
        for y in range(th):
            if row >= len(L):
                break
            line = L[row]
            cells = self.cells(row)
            if self.wrap:
                lo = sub * tw
                seg = cells[lo:lo + tw]
                nseg = max(1, -(-len(cells) // tw))
            else:
                lo = self.left
                seg = cells[lo:lo + tw]
                nseg = 1
            if sub == 0:
                self.put(y, 0, ' ' + str(row + 1).rjust(gut - 2) + ' ',
                         self.A_LNC if row == cy else self.A_LN)
            c0 = c1 = -1
            if sel and sel[0][0] <= row <= sel[1][0]:
                c0 = sel[0][1] if row == sel[0][0] else 0
                c1 = sel[1][1] if row == sel[1][0] else len(line) + 1
            hl = None
            if self.find_rx:
                ms = self._matches(line)
                if ms:
                    hl = set()
                    for s, e in ms:
                        hl.update(range(s, e))
            bset = {c for (r, c) in br if r == row} if br else ()
            runs = []
            for text, src, role in seg:
                if c0 <= src < c1:
                    a = self.A_SEL
                elif src in bset:
                    a = self.A_BR
                elif hl and src in hl:
                    a = self.A_FIND
                else:
                    a = self.RA[role]
                if runs and runs[-1][1] == a:
                    runs[-1][0] += text
                    runs[-1][2] += 1
                else:
                    runs.append([text, a, 1])
            x = gut
            for text, a, n in runs:
                self.put(y, x, text, a)
                x += n
            if row == cy and (not self.wrap or sub == csub):
                cur_y, cur_x = y, gut + dc_cur - lo
            sub += 1
            if sub >= nseg:
                row, sub = row + 1, 0

        # status bar ---------------------------------------------------------
        mod = self.buf.modified
        name = os.path.basename(self.path) if self.path else '[No Name]'
        left = " %s%s " % (name, ' *' if mod else '')
        s = self.sel()
        nsel = ''
        if s:
            n = len(self.buf.text_range(*s))
            nsel = " | Sel %d" % n
        right = [(" Ln %d/%d, Col %d%s | %s | UTF-8 | %s | %s%s | " % (
            cy + 1, len(L), dc_cur + 1, nsel, self.lang.name if self.lang else 'Plain Text',
            'CRLF' if self.eol == '\r\n' else 'LF',
            'WRAP | ' if self.wrap else '', 'Tab' if self.use_tabs else 'Sp:%d' % self.indent_w),
            self.A_STAT),
            (' Modified ' if mod else ' Saved ', self.A_MOD if mod else self.A_OK),
            (' ', self.A_STAT)]
        total = sum(len(t) for t, _ in right)
        self.put(h - 2, 0, ' ' * (w - 1), self.A_STAT)
        self.put(h - 2, 0, left[:w - 1], self.A_STAT | curses.A_BOLD)
        x = max(len(left), w - 1 - total)
        for t, a in right:
            self.put(h - 2, x, t[:max(0, w - 1 - x)], a)
            x += len(t)

        # message line / overlay ---------------------------------------------
        if self.ov:
            if self.ov[0] is not None:
                self.put(h - 2, 0, ' ' * (w - 1), self.A_STAT)
                self.put(h - 2, 0, self.ov[0][:w - 1], self.A_STAT | curses.A_BOLD)
            self.put(h - 1, 0, self.ov[1][:w - 1], curses.A_BOLD)
        elif self.msg and time.time() - self.msg_t < 5:
            self.put(h - 1, 0, self.msg[:w - 1], self.A_ERR if self.msg_err else curses.A_BOLD)
        else:
            self.put(h - 1, 0, KEY_HINT[:w - 1], self.A_LN)

        # cursor -------------------------------------------------------------
        if self.ov and self.ov_cur:
            ri, cxx = self.ov_cur
            curses.curs_set(1)
            scr.move(h - 2 + ri, min(cxx, w - 1))
        elif self.ov:
            curses.curs_set(0)
        elif cur_y is not None and 0 <= cur_x < w:
            curses.curs_set(1)
            scr.move(cur_y, cur_x)
        else:
            curses.curs_set(0)
        scr.refresh()

    # ---------------------------------------------------------------- mouse
    def pos_at(self, y, x):
        L = self.buf.lines
        row, sub = self.top_row, self.top_sub
        for _ in range(y):
            if sub + 1 < self.seg_count(row):
                sub += 1
            elif row + 1 < len(L):
                row, sub = row + 1, 0
            else:
                break
        dc = max(0, x - self.gut) + (sub * self.tw if self.wrap else self.left)
        return (row, col_at(L[row], dc, self.ts))

    def on_mouse(self):
        try:
            _id, mx, my, _z, bs = curses.getmouse()
        except curses.error:
            return
        if bs & BTN4:
            return self.scroll(-3)
        if bs & BTN5:
            return self.scroll(3)
        if self.dragging and (bs & curses.REPORT_MOUSE_POSITION):
            if my <= 0:
                self.scroll(-1)
            elif my >= self.th - 1:
                self.scroll(1)
            r, c = self.pos_at(min(max(my, 0), self.th - 1), mx)
            self.anchor = self.drag_from
            self.cy, self.cx = r, c
            self.want = disp_col(self.buf.lines[r], c, self.ts)
            return
        if bs & curses.BUTTON1_RELEASED:
            self.dragging = False
        elif bs & curses.BUTTON1_PRESSED:
            if my >= self.th:
                return
            pos = self.pos_at(my, mx)
            now = time.time()
            self.clicks = self.clicks + 1 if (now - self.last_click < 0.4 and pos[0] == (
                self.last_pos or (-1, -1))[0]) else 1
            self.last_click, self.last_pos = now, pos
            L = self.buf.lines
            r, c = pos
            if self.clicks == 2:                   # double-click: select word
                line = L[r]
                a = b = min(c, len(line))
                while a > 0 and is_word(line[a - 1]):
                    a -= 1
                while b < len(line) and is_word(line[b]):
                    b += 1
                self.anchor, self.cy, self.cx = (r, a), r, b
                self.dragging = False
            elif self.clicks >= 3:                 # triple-click: select line
                self.anchor = (r, 0)
                self.cy, self.cx = (r + 1, 0) if r + 1 < len(L) else (r, len(L[r]))
                self.dragging, self.clicks = False, 0
            else:
                if bs & curses.BUTTON_SHIFT:
                    if self.anchor is None:
                        self.anchor = (self.cy, self.cx)
                else:
                    self.anchor = None
                self.cy, self.cx = pos
                self.drag_from = self.anchor or pos
                self.dragging = True
            self.want = disp_col(L[self.cy], self.cx, self.ts)
            self.buf.seal()
        elif bs & curses.BUTTON3_PRESSED:
            self.paste()


# ============================================================================
# 7. Program entry
# ============================================================================
def setup_tty():
    """Take over Ctrl+C/Z/S/Q/V etc. so they reach the editor as keys."""
    try:
        fd = sys.stdin.fileno()
        a = termios.tcgetattr(fd)
        a[0] &= ~(termios.IXON | termios.IXOFF | termios.ICRNL | termios.INLCR | termios.IGNCR)
        a[3] &= ~(termios.ISIG | termios.IEXTEN | termios.ICANON | termios.ECHO)
        a[6][termios.VMIN], a[6][termios.VTIME] = 1, 0
        termios.tcsetattr(fd, termios.TCSANOW, a)
    except (termios.error, OSError, ValueError):
        pass


def curses_main(scr, path, line):
    curses.raw()                                   # ISIG off: Ctrl+C/Z are plain keys
    curses.noecho()
    scr.keypad(True)
    scr.timeout(1000)
    setup_tty()
    curses.mouseinterval(0)
    curses.mousemask(curses.ALL_MOUSE_EVENTS | curses.REPORT_MOUSE_POSITION)
    sys.stdout.write('\033[?2004h\033[?1002h')     # bracketed paste + drag tracking
    sys.stdout.flush()
    ed = Editor(scr, path, line)
    try:
        ed.run()
    except Exception:
        try:                                       # emergency dump, then re-raise
            rp = os.path.expanduser('~/.ete-recovery-%s' % os.path.basename(path or 'untitled'))
            with open(rp, 'wb') as f:
                f.write('\n'.join(ed.buf.lines).encode('utf-8', 'surrogateescape'))
            sys.stderr.write("ete crashed; buffer saved to %s\n" % rp)
        except Exception:
            pass
        raise
    finally:
        sys.stdout.write('\033[?2004l\033[?1002l')
        sys.stdout.flush()
        curses.mousemask(0)


def main(argv):
    args = argv[1:]
    if any(a in ('-h', '--help') for a in args):
        print("%s v%s - %s\n\nUsage: ete [+LINE] [FILE]\n       ete --version\n\n"
              "Press F1 inside the editor for the key reference." % (APP, VERSION, AUTHOR))
        return 0
    if any(a in ('-v', '--version') for a in args):
        print("ete %s" % VERSION)
        return 0
    line, path = None, None
    for a in args:
        if re.fullmatch(r'\+\d+', a):
            line = int(a[1:])
        elif path is None:
            path = a
    if path:
        if os.path.isdir(path):
            print("ete: '%s' is a directory" % path, file=sys.stderr)
            return 1
        if os.path.exists(path) and not os.access(path, os.R_OK):
            print("ete: cannot read '%s': permission denied" % path, file=sys.stderr)
            return 1
    if not (sys.stdin.isatty() and sys.stdout.isatty()):
        print("ete: must be run in an interactive terminal", file=sys.stderr)
        return 1
    locale.setlocale(locale.LC_ALL, '')
    os.environ.setdefault('ESCDELAY', '25')
    signal.signal(signal.SIGINT, signal.SIG_IGN)   # Ctrl+C must never kill the editor
    if hasattr(signal, 'SIGTSTP'):
        signal.signal(signal.SIGTSTP, signal.SIG_IGN)
    for s in (signal.SIGTERM, signal.SIGHUP):
        signal.signal(s, lambda *_: sys.exit(1))
    curses.wrapper(curses_main, path, line)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
