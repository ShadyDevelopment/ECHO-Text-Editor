#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -lt 1 || $# -gt 3 ]]; then
    echo "Usage: $0 VERSION [OUTPUT_DIR] [DEBIAN_UPSTREAM_VERSION]" >&2
    exit 2
fi

version="$1"
deb_upstream_version="${3:-$version}"
if [[ ! "$version" =~ ^[0-9][A-Za-z0-9.+~_-]*$ ]]; then
    echo "Invalid package version: $version" >&2
    exit 2
fi
if [[ ! "$deb_upstream_version" =~ ^[0-9][A-Za-z0-9.+~_-]*$ ]]; then
    echo "Invalid Debian upstream version: $deb_upstream_version" >&2
    exit 2
fi

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out="${2:-$root/dist}"
mkdir -p "$out"

for tool in install tar gzip tr; do
    if ! command -v "$tool" >/dev/null 2>&1; then
        echo "Missing required source archive tool: $tool" >&2
        exit 1
    fi
done

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

source_name="ete-$version"
source_tree="$work/$source_name"
install -d "$source_tree/attachments" "$source_tree/man"
for text_file in Makefile LICENSE attachments/ete.py man/ete.1; do
    target="$source_tree/$text_file"
    install -d "$(dirname "$target")"
    tr -d '\r' < "$root/$text_file" > "$target"
    chmod 0644 "$target"
done

source_date_epoch="${SOURCE_DATE_EPOCH:-$(git -C "$root" log -1 --format=%ct 2>/dev/null || date -u +%s)}"
if [[ ! "$source_date_epoch" =~ ^[0-9]+$ ]]; then
    echo "SOURCE_DATE_EPOCH must be a non-negative integer" >&2
    exit 2
fi

tar --sort=name --owner=0 --group=0 --numeric-owner --mtime="@$source_date_epoch" \
    -cf - -C "$work" "$source_name" | gzip -n -9 > "$out/$source_name.tar.gz"
deb_source_name="ete-$deb_upstream_version"
if [[ "$deb_source_name" != "$source_name" ]]; then
    cp -a "$source_tree" "$work/$deb_source_name"
fi
tar --sort=name --owner=0 --group=0 --numeric-owner --mtime="@$source_date_epoch" \
    -cf - -C "$work" "$deb_source_name" | gzip -n -9 > "$out/ete_${deb_upstream_version}.orig.tar.gz"

printf 'Created curated source archives:\n  %s\n  %s\n' \
    "$out/$source_name.tar.gz" "$out/ete_${deb_upstream_version}.orig.tar.gz"
