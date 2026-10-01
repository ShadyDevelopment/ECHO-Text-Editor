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
deb_version="${version}-1"

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out="${2:-$root/dist}"
mkdir -p "$out"

source_version="$(sed -nE 's/^VERSION = "([^"]+)"\r?$/\1/p' "$root/attachments/ete.py")"
if [[ "$version" != "$source_version" ]]; then
    echo "Requested version $version does not match source version $source_version" >&2
    exit 2
fi

for tool in dpkg-deb rpmbuild make tar gzip sed tr; do
    if ! command -v "$tool" >/dev/null 2>&1; then
        echo "Missing required packaging tool: $tool" >&2
        exit 1
    fi
done

work="$(mktemp -d)"
source_helper="$root/packaging/.create-source-archive-$$.sh"
cleanup() {
    rm -rf -- "$work"
    rm -f -- "$source_helper"
}
trap cleanup EXIT

tr -d '\r' < "$root/packaging/create-source-archive.sh" > "$source_helper"
bash "$source_helper" "$version" "$out"
source_name="ete-$version"

deb_root="$work/deb"
install -d "$deb_root/DEBIAN" "$deb_root/usr/bin" "$deb_root/usr/share/doc/ete"
make -C "$root" DESTDIR="$deb_root" PREFIX=/usr BINDIR=/usr/bin SYSCONFDIR=/etc install
gzip -n -9 "$deb_root/usr/share/man/man1/ete.1"
tr -d '\r' < "$root/debian/copyright" > "$deb_root/usr/share/doc/ete/copyright"
tr -d '\r' < "$root/debian/changelog" | gzip -n -9 > "$deb_root/usr/share/doc/ete/changelog.Debian.gz"
cat > "$deb_root/DEBIAN/control" <<EOF
Package: ete
Version: $deb_version
Section: editors
Priority: optional
Architecture: all
Depends: python3 (>= 3.8)
Maintainer: Antonio Martinovic <antoniomartinovic.business@outlook.com>
Description: ECHO terminal text editor
 A single-file curses editor with syntax highlighting, mouse support,
 Windows-style keyboard shortcuts, undo/redo, and find/replace.
EOF
chmod 0644 "$deb_root/DEBIAN/control"
dpkg-deb --build --root-owner-group "$deb_root" "$out/ete_${deb_version}_all.deb" >/dev/null

rpm_top="$work/rpmbuild"
install -d "$rpm_top"/{BUILD,BUILDROOT,RPMS,SOURCES,SPECS,SRPMS}
install -m 0644 "$out/$source_name.tar.gz" "$rpm_top/SOURCES/"
tr -d '\r' < "$root/ete.spec" > "$rpm_top/SPECS/ete.spec"
# Build dependencies are checked above; --nodeps lets Debian/Ubuntu's RPM
# tooling use apt-installed make/Python, which are not recorded in the RPM DB.
rpmbuild -ba --nodeps \
    --define "_topdir $rpm_top" \
    --define "_sourcedir $rpm_top/SOURCES" \
    "$rpm_top/SPECS/ete.spec" >/dev/null
find "$rpm_top/RPMS" -type f -name '*.rpm' -exec cp {} "$out/" \;
find "$rpm_top/SRPMS" -type f -name '*.src.rpm' -exec cp {} "$out/" \;

printf 'Built packages in %s:\n' "$out"
printf '  %s\n' "$out/ete_${deb_version}_all.deb"
printf '  %s\n' "$out/$source_name.tar.gz"
printf '  %s\n' "$out/ete_${version}.orig.tar.gz"
find "$out" -maxdepth 1 -type f -name 'ete-*.rpm' -printf '  %p\n'
find "$out" -maxdepth 1 -type f -name 'ete-*.src.rpm' -printf '  %p\n'
