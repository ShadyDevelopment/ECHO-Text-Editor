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
	$(INSTALL) -m 0755 attachments/ete.py "$(DESTDIR)$(BINDIR)/ete"
	$(INSTALL) -m 0644 man/ete.1 "$(DESTDIR)$(MANDIR)/man1/ete.1"
