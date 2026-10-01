PREFIX ?= /usr
BINDIR ?= $(PREFIX)/bin
MANDIR ?= $(PREFIX)/share/man
SYSCONFDIR ?= /etc
DESTDIR ?=
PYTHON ?= python3
INSTALL ?= install

.PHONY: all build check clean install

all: build

build: check

check:
	$(PYTHON) -c 'import ast, pathlib; ast.parse(pathlib.Path("attachments/ete.py").read_text(encoding="utf-8"))'

clean:
	@:

install: check
	$(INSTALL) -d "$(DESTDIR)$(BINDIR)"
	$(INSTALL) -d "$(DESTDIR)$(MANDIR)/man1"
	$(PYTHON) -c 'from pathlib import Path; import sys; path = Path(sys.argv[1]); data = Path("attachments/ete.py").read_bytes().replace(b"\r\n", b"\n"); path.write_bytes(data.replace(b"#!/usr/bin/env python3\n", b"#!/usr/bin/python3\n", 1)); path.chmod(0o755)' "$(DESTDIR)$(BINDIR)/ete"
	$(INSTALL) -m 0644 man/ete.1 "$(DESTDIR)$(MANDIR)/man1/ete.1"
