#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
    echo "Usage: $0 VERSION [OUTPUT_DIR]" >&2
    exit 2
fi

version="$1"
if [[ ! "$version" =~ ^[0-9][A-Za-z0-9.+~_-]*$ ]]; then
    echo "Invalid package version: $version" >&2
    exit 2
fi

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out="${2:-$root/dist}"
mkdir -p "$out"

source_version="$(sed -nE 's/^VERSION = "([^"]+)"\r?$/\1/p' "$root/attachments/ete.py")"
if [[ "$version" != "$source_version" ]]; then
    echo "Requested version $version does not match source version $source_version" >&2
    exit 2
fi

for tool in dpkg-deb rpmbuild make tar sed tr; do
    if ! command -v "$tool" >/dev/null 2>&1; then
        echo "Missing required packaging tool: $tool" >&2
        exit 1
    fi
done

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

deb_root="$work/deb"
install -d "$deb_root/DEBIAN" "$deb_root/usr/bin" "$deb_root/usr/share/doc/ete"
make -C "$root" DESTDIR="$deb_root" PREFIX=/usr BINDIR=/usr/bin SYSCONFDIR=/etc install
gzip -n -9 "$deb_root/usr/share/man/man1/ete.1"
install -m 0644 "$root/README.md" "$deb_root/usr/share/doc/ete/README.md"
install -m 0644 "$root/debian/copyright" "$deb_root/usr/share/doc/ete/copyright"
cat > "$deb_root/DEBIAN/control" <<EOF
Package: ete
Version: $version
Section: editors
Priority: optional
Architecture: all
Depends: python3 (>= 3.8), python3-curses
Maintainer: Antonio Martinovic <antoniomartinovic.business@outlook.com>
Description: ECHO terminal text editor
 A single-file curses editor with syntax highlighting, mouse support,
 Windows-style keyboard shortcuts, undo/redo, and find/replace.
EOF
chmod 0644 "$deb_root/DEBIAN/control"
dpkg-deb --build --root-owner-group "$deb_root" "$out/ete_${version}_all.deb" >/dev/null

rpm_top="$work/rpmbuild"
source_name="ECHO-Text-Editor-$version"
install -d "$rpm_top"/{BUILD,BUILDROOT,RPMS,SOURCES,SPECS,SRPMS} "$work/source/$source_name/attachments" "$work/source/$source_name/man"
install -m 0644 "$root/Makefile" "$root/README.md" "$root/LICENSE" "$work/source/$source_name/"
install -m 0644 "$root/attachments/ete.py" "$work/source/$source_name/attachments/ete.py"
install -m 0644 "$root/man/ete.1" "$work/source/$source_name/man/ete.1"
tar -C "$work/source" -czf "$rpm_top/SOURCES/v$version.tar.gz" "$source_name"
tr -d '\r' < "$root/ete.spec" > "$rpm_top/SPECS/ete.spec"
# Build dependencies are checked above; --nodeps lets Debian/Ubuntu's RPM
# tooling use apt-installed make/Python, which are not recorded in the RPM DB.
rpmbuild -bb --nodeps \
    --define "_topdir $rpm_top" \
    --define "_sourcedir $rpm_top/SOURCES" \
    "$rpm_top/SPECS/ete.spec" >/dev/null
find "$rpm_top/RPMS" -type f -name '*.rpm' -exec cp {} "$out/" \;

printf 'Built packages in %s:\n' "$out"
printf '  %s\n' "$out/ete_${version}_all.deb"
find "$out" -maxdepth 1 -type f -name 'ete-*.rpm' -printf '  %p\n'
