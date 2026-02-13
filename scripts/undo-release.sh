#!/bin/bash
set -euo pipefail

OFF='\033[0m' RED='\033[1;31m' GREEN='\033[1;32m' BLUE='\033[1;34m' BOLD='\033[1m' DIM='\033[2m'

success() { echo -e "  ${GREEN}done:${OFF}  $1"; }
info()    { echo -e "  ${BLUE}info:${OFF}  $1"; }
die()     { echo -e "  ${RED}error:${OFF} $1" >&2; exit 1; }

check_prerequisites() {
    git rev-parse --is-inside-work-tree > /dev/null 2>&1 || die "Not a git repository"

    REPO_ROOT="$(git rev-parse --show-toplevel)"
    PACKAGE_JSON="$REPO_ROOT/package.json"
    [ -f "$PACKAGE_JSON" ] || die "package.json not found"

    local msg
    msg=$(git log -1 --format='%s')
    [[ "$msg" == chore\(release\):* ]] || die "Last commit is not a release commit: ${msg}"

    CURRENT_VERSION=$(grep -o '"version": *"[^"]*"' "$PACKAGE_JSON" | head -1 | sed 's/"version": *"\(.*\)"/\1/')
    [ -n "$CURRENT_VERSION" ] || die "Could not read version from package.json"
    IFS='.' read -r MAJOR MINOR _PATCH <<< "$CURRENT_VERSION"

    CURRENT_TAG="v$CURRENT_VERSION"
    MAJOR_TAG="v$MAJOR"
}

confirm_undo() {
    echo ""
    echo -e "  ${BOLD}Undo release ${CURRENT_TAG}${OFF}"
    echo ""
    echo -e "  This will:"
    echo -e "  ${DIM}- Delete local tag ${CURRENT_TAG}${OFF}"
    echo -e "  ${DIM}- Delete local major tag ${MAJOR_TAG} (if present)${OFF}"
    echo -e "  ${DIM}- Reset the release commit and restore dist/${OFF}"
    echo ""
    echo -e -n "  Continue? [y/N] "
    read -r confirm

    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        info "Aborted"
        exit 0
    fi
    echo ""
}

delete_local_tags() {
    git tag -d "$CURRENT_TAG" > /dev/null 2>&1 && success "Deleted local tag ${BOLD}$CURRENT_TAG${OFF}" || true
    git tag -d "$MAJOR_TAG" > /dev/null 2>&1 && success "Deleted local major tag ${BOLD}$MAJOR_TAG${OFF}" || true
}

reset_local_commit() {
    git reset --soft HEAD~1 > /dev/null
    git restore --staged . > /dev/null
    git checkout -- "$PACKAGE_JSON" "$REPO_ROOT/dist/" > /dev/null 2>&1
    success "Reset release commit"
}

main() {
    check_prerequisites
    confirm_undo
    delete_local_tags
    reset_local_commit

    local restored
    restored=$(grep -o '"version": *"[^"]*"' "$PACKAGE_JSON" | head -1 | sed 's/"version": *"\(.*\)"/\1/')

    echo ""
    echo -e "  ${GREEN}${BOLD}Release undone${OFF}"
    echo -e "  ${DIM}Version restored to:${OFF} v$restored"
    echo ""
}

main
