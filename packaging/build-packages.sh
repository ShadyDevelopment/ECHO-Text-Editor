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

rpm_version="${version%%-*}"
rpm_release="1"
if [[ "$version" == *-* ]]; then
    rpm_release+=".${version#*-}"
fi

for tool in dpkg-deb rpmbuild; do
    if ! command -v "$tool" >/dev/null 2>&1; then
        echo "Missing required packaging tool: $tool" >&2
        exit 1
    fi
done

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

deb_root="$work/deb"
install -d "$deb_root/DEBIAN" "$deb_root/usr/bin" "$deb_root/usr/share/doc/ete"
install -m 0755 "$root/attachments/ete.py" "$deb_root/usr/bin/ete"
install -m 0644 "$root/README.md" "$deb_root/usr/share/doc/ete/README.md"
cat > "$deb_root/DEBIAN/control" <<EOF
Package: ete
Version: $version
Section: editors
Priority: optional
Architecture: all
Depends: python3 (>= 3.8)
Maintainer: Antonio Martinovic - ShadyDevelopment
Description: ECHO terminal text editor
 A single-file curses editor with syntax highlighting, mouse support,
 Windows-style keyboard shortcuts, undo/redo, and find/replace.
EOF
chmod 0644 "$deb_root/DEBIAN/control"
dpkg-deb --build --root-owner-group "$deb_root" "$out/ete_${version}_all.deb" >/dev/null

rpm_top="$work/rpmbuild"
install -d "$rpm_top"/{BUILD,BUILDROOT,RPMS,SOURCES,SPECS,SRPMS}
install -m 0755 "$root/attachments/ete.py" "$rpm_top/SOURCES/ete.py"
install -m 0644 "$root/README.md" "$rpm_top/SOURCES/README.md"
cat > "$rpm_top/SPECS/ete.spec" <<EOF
Name:           ete
Version:        $rpm_version
Release:        $rpm_release%{?dist}
Summary:        ECHO terminal text editor
License:        Unspecified
BuildArch:      noarch
Requires:       python3 >= 3.8

%description
A single-file curses editor with syntax highlighting, mouse support,
Windows-style keyboard shortcuts, undo/redo, and find/replace.

%prep

%build

%install
install -D -m 0755 %{_sourcedir}/ete.py %{buildroot}%{_bindir}/ete
install -D -m 0644 %{_sourcedir}/README.md %{buildroot}%{_datadir}/doc/ete/README.md

%files
%{_bindir}/ete
%{_datadir}/doc/ete/README.md
EOF
rpmbuild -bb --define "_topdir $rpm_top" "$rpm_top/SPECS/ete.spec" >/dev/null
find "$rpm_top/RPMS" -type f -name '*.rpm' -exec cp {} "$out/" \;

printf 'Built packages in %s:\n' "$out"
printf '  %s\n' "$out/ete_${version}_all.deb"
find "$out" -maxdepth 1 -type f -name "ete-${rpm_version}-${rpm_release}*.rpm" -printf '  %p\n'
