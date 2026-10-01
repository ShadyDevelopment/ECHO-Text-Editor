#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
LOG_FILE="${PUBLISH_LOG:-$ROOT/publish.log}"
mkdir -p -- "$(dirname -- "$LOG_FILE")"
exec > >(tee -a "$LOG_FILE") 2>&1

on_error() {
    local status=$?
    printf 'ERROR: publish pipeline failed at line %s (exit %s). Log: %s\n' \
        "${BASH_LINENO[0]:-unknown}" "$status" "$LOG_FILE" >&2
    exit "$status"
}
trap on_error ERR

require_command() {
    command -v "$1" >/dev/null 2>&1 || {
        printf 'ERROR: required command not found: %s\n' "$1" >&2
        return 127
    }
}

for tool in tee mktemp install tar gzip tr python3 make dpkg-parsechangelog \
    dpkg-source debuild lintian debsign dput gpg rpmbuild rpm; do
    require_command "$tool"
done

APP_NAME="$(sed -nE 's/^Source:[[:space:]]*([a-z0-9.+-]+)[[:space:]]*$/\1/p' "$ROOT/debian/control" | head -n 1)"
VERSION="$(python3 - "$ROOT/attachments/ete.py" <<'PY'
from pathlib import Path
import re
import sys

text = Path(sys.argv[1]).read_text(encoding="utf-8")
match = re.search(r'^VERSION\s*=\s*"([^"]+)"\s*$', text, re.MULTILINE)
if not match:
    raise SystemExit("Could not detect VERSION in attachments/ete.py")
print(match.group(1))
PY
)"
RPM_NAME="$(sed -nE 's/^Name:[[:space:]]*([a-zA-Z0-9.+_-]+)[[:space:]]*$/\1/p' "$ROOT/ete.spec" | head -n 1)"
CHANGELOG_VERSION="$(dpkg-parsechangelog -l "$ROOT/debian/changelog" -SVersion)"
CHANGELOG_DISTRIBUTION="$(dpkg-parsechangelog -l "$ROOT/debian/changelog" -SDistribution)"
DEB_VERSION="$CHANGELOG_VERSION"
DEB_VERSION_WITHOUT_EPOCH="${DEB_VERSION#*:}"
DEB_UPSTREAM_VERSION="${DEB_VERSION_WITHOUT_EPOCH%-*}"
GPG_KEY_ID="${GPG_KEY_ID:-64554B62900D3A0A}"
DEBFULLNAME="${DEBFULLNAME:-Antonio Martinovic (ShadyDevelopment)}"
DEBEMAIL="${DEBEMAIL:-antoniomartinovic.business@outlook.com}"

[[ -n "$APP_NAME" && -n "$RPM_NAME" ]] || {
    echo "ERROR: unable to detect package names from Debian/RPM metadata" >&2
    exit 2
}
[[ "$APP_NAME" == "$RPM_NAME" ]] || {
    printf 'ERROR: package name mismatch: DEB=%s RPM=%s\n' "$APP_NAME" "$RPM_NAME" >&2
    exit 2
}
[[ "$DEB_VERSION" =~ ^([0-9]+:)?[0-9][A-Za-z0-9.+~_-]*-[0-9][A-Za-z0-9.+~]*$ ]] || {
    printf 'ERROR: Debian changelog version is not a valid non-native version: %s\n' \
        "$DEB_VERSION" >&2
    exit 2
}
EXPECTED_DEB_UPSTREAM_VERSION="${VERSION%-octa}"
[[ "$DEB_UPSTREAM_VERSION" == "$EXPECTED_DEB_UPSTREAM_VERSION" ]] || {
    printf 'ERROR: Debian upstream version is %s; expected %s based on application version %s\n' \
        "$DEB_UPSTREAM_VERSION" "$EXPECTED_DEB_UPSTREAM_VERSION" "$VERSION" >&2
    exit 2
}
[[ "$CHANGELOG_DISTRIBUTION" == "stable" ]] || {
    printf 'ERROR: requested Mentors upload requires stable changelog, got %s\n' \
        "$CHANGELOG_DISTRIBUTION" >&2
    exit 2
}

SOURCE_DATE_EPOCH="$(dpkg-parsechangelog -l "$ROOT/debian/changelog" -SDate | xargs -r -I{} date -u -d "{}" +%s)"
export SOURCE_DATE_EPOCH DEBFULLNAME DEBEMAIL
export GPG_TTY="${GPG_TTY:-$(tty 2>/dev/null || true)}"

OUT_DIR="${PUBLISH_OUTPUT_DIR:-$ROOT/dist/publish-${VERSION}}"
mkdir -p -- "$OUT_DIR"
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/${APP_NAME}-publish.XXXXXX")"
SOURCE_HELPER="$ROOT/packaging/.create-source-archive-$$.sh"
cleanup() {
    rm -rf -- "$WORK_DIR"
    rm -f -- "$SOURCE_HELPER"
}
trap cleanup EXIT

printf 'Publishing candidate: %s %s\n' "$APP_NAME" "$VERSION"
printf 'Artifacts and diagnostics: %s\n' "$OUT_DIR"
printf 'Detailed log: %s\n' "$LOG_FILE"

tr -d '\r' < "$ROOT/packaging/create-source-archive.sh" > "$SOURCE_HELPER"
bash "$SOURCE_HELPER" "$VERSION" "$OUT_DIR" "$DEB_UPSTREAM_VERSION"
ORIG_TARBALL="$OUT_DIR/${APP_NAME}_${DEB_UPSTREAM_VERSION}.orig.tar.gz"
SOURCE_TARBALL="$OUT_DIR/${APP_NAME}-${VERSION}.tar.gz"

DEB_SOURCE_DIR="$WORK_DIR/${APP_NAME}-${DEB_UPSTREAM_VERSION}"
mkdir -p -- "$DEB_SOURCE_DIR"
tar -xzf "$ORIG_TARBALL" -C "$WORK_DIR"
cp -a -- "$ROOT/debian" "$DEB_SOURCE_DIR/debian"
while IFS= read -r -d '' file; do
    tr -d '\r' < "$file" > "$file.lf"
    cat "$file.lf" > "$file"
    rm -f -- "$file.lf"
done < <(find "$DEB_SOURCE_DIR/debian" -type f -print0)
chmod 0644 "$DEB_SOURCE_DIR/debian/changelog" "$DEB_SOURCE_DIR/debian/control" \
    "$DEB_SOURCE_DIR/debian/copyright" "$DEB_SOURCE_DIR/debian/source/format"
chmod 0755 "$DEB_SOURCE_DIR/debian/rules"
install -m 0644 "$ORIG_TARBALL" "$WORK_DIR/"

(
    cd "$DEB_SOURCE_DIR"
    debuild --no-lintian -S -sa -us -uc
)

shopt -s nullglob
CHANGES_FILES=("$WORK_DIR/${APP_NAME}_${DEB_VERSION_WITHOUT_EPOCH}_source.changes")
DSC_FILES=("$WORK_DIR/${APP_NAME}_${DEB_VERSION_WITHOUT_EPOCH}.dsc")
[[ ${#CHANGES_FILES[@]} -eq 1 && -f "${CHANGES_FILES[0]}" ]] || {
    echo "ERROR: source .changes file was not generated" >&2
    exit 1
}
[[ ${#DSC_FILES[@]} -eq 1 && -f "${DSC_FILES[0]}" ]] || {
    echo "ERROR: Debian .dsc file was not generated" >&2
    exit 1
}
CHANGES_FILE="${CHANGES_FILES[0]}"
DSC_FILE="${DSC_FILES[0]}"

lintian --profile debian --pedantic "$DSC_FILE" "$CHANGES_FILE"

RPM_TOP="$WORK_DIR/rpmbuild"
install -d "$RPM_TOP"/{BUILD,BUILDROOT,RPMS,SOURCES,SPECS,SRPMS}
install -m 0644 "$SOURCE_TARBALL" "$RPM_TOP/SOURCES/"
tr -d '\r' < "$ROOT/ete.spec" > "$RPM_TOP/SPECS/${APP_NAME}.spec"
if [[ -f /etc/fedora-release || -f /etc/redhat-release ]]; then
    rpmbuild -ba --define "_topdir $RPM_TOP" "$RPM_TOP/SPECS/${APP_NAME}.spec"
else
    echo "NOTE: non-RPM build host detected; rpmbuild --nodeps validates spec paths/build steps but not RPMDB BuildRequires."
    rpmbuild -ba --nodeps --define "_topdir $RPM_TOP" "$RPM_TOP/SPECS/${APP_NAME}.spec"
fi
find "$RPM_TOP/RPMS" "$RPM_TOP/SRPMS" -type f \( -name '*.rpm' -o -name '*.src.rpm' \) \
    -exec cp -f -- {} "$OUT_DIR/" \;

if command -v rpmlint >/dev/null 2>&1; then
    rpmlint "$RPM_TOP/SPECS/${APP_NAME}.spec"
fi

if [[ -n "${COPR_PROJECT:-}" ]]; then
    require_command copr-cli
    SRPM_FILE="$(find "$OUT_DIR" -maxdepth 1 -type f -name "${APP_NAME}-*.src.rpm" -print -quit)"
    [[ -n "$SRPM_FILE" ]] || {
        echo "ERROR: no SRPM found for Copr build" >&2
        exit 1
    }
    copr-cli build "$COPR_PROJECT" "$SRPM_FILE"
fi

if [[ "${PUBLISH_DRY_RUN:-0}" == "1" ]]; then
    echo "Dry run complete; signing and Mentors upload were skipped."
    exit 0
fi

echo "Signing Debian source package with key ${GPG_KEY_ID}."
debsign --no-conf -k"$GPG_KEY_ID" "$CHANGES_FILE"
gpg --verify "$CHANGES_FILE"

cp -f -- "$DSC_FILE" "$CHANGES_FILE" "$OUT_DIR/"
cp -f -- "$WORK_DIR/${APP_NAME}_${DEB_VERSION_WITHOUT_EPOCH}_source.buildinfo" "$OUT_DIR/"

echo "Uploading signed Debian source package to mentors.debian.net."
dput -c "$ROOT/.dput.cf" mentors "$CHANGES_FILE"

printf 'Publishing pipeline completed successfully.\nArtifacts: %s\nLog: %s\n' \
    "$OUT_DIR" "$LOG_FILE"
