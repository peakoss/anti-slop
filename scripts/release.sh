#!/bin/bash
set -euo pipefail

OFF='\033[0m' RED='\033[1;31m' GREEN='\033[1;32m' BLUE='\033[1;34m' BOLD='\033[1m' DIM='\033[2m'

die()     { echo -e "  ${RED}error:${OFF} $1" >&2; exit 1; }
info()    { echo -e "  ${BLUE}info:${OFF}  $1"; }
success() { echo -e "  ${GREEN}done:${OFF}  $1"; }

check_prerequisites() {
    command -v git > /dev/null 2>&1 || die "git is not installed. Install it from https://git-scm.com"
    git rev-parse --is-inside-work-tree > /dev/null 2>&1 || die "Not a git repository"

    if ! git diff --quiet || ! git diff --cached --quiet; then
        die "Working tree is not clean. Commit or stash your changes first."
    fi

    REPO_ROOT="$(git rev-parse --show-toplevel)"
    PACKAGE_JSON="$REPO_ROOT/package.json"
    [ -f "$PACKAGE_JSON" ] || die "package.json not found"

    CURRENT_VERSION=$(grep -o '"version": *"[^"]*"' "$PACKAGE_JSON" | head -1 | sed 's/"version": *"\(.*\)"/\1/')
    [ -n "$CURRENT_VERSION" ] || die "Could not read version from package.json"
    IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
}

select_version() {
    local next_patch="$MAJOR.$MINOR.$((PATCH + 1))"
    local next_minor="$MAJOR.$((MINOR + 1)).0"
    local next_major="$((MAJOR + 1)).0.0"
    local options=("patch  →  v$next_patch" "minor  →  v$next_minor" "major  →  v$next_major")
    local selected=0 num=${#options[@]}

    echo ""
    echo -e "  Current version: ${BOLD}v${CURRENT_VERSION}${OFF}"
    echo ""
    echo -e "  ${BOLD}Select release type:${OFF}"
    echo ""

    tput civis 2>/dev/null || true

    local draw clear
    draw() {
        for i in "${!options[@]}"; do
            if [ "$i" -eq "$selected" ]; then
                echo -e "  ${GREEN}❯ ${options[$i]}${OFF}"
            else
                echo -e "  ${DIM}  ${options[$i]}${OFF}"
            fi
        done
    }
    clear() {
        for _ in "${options[@]}"; do
            tput cuu1 2>/dev/null
            tput el 2>/dev/null
        done
    }

    draw
    while true; do
        read -rsn1 key
        if [ "$key" = $'\x1b' ]; then
            read -rsn2 key
            case "$key" in
                '[A') [ "$selected" -gt 0 ] && selected=$((selected - 1)) ;;
                '[B') [ "$selected" -lt $((num - 1)) ] && selected=$((selected + 1)) ;;
            esac
            clear
            draw
        elif [ "$key" = '' ]; then
            break
        fi
    done

    tput cnorm 2>/dev/null || true

    case $selected in
        0) NEW_VERSION="$next_patch" ;;
        1) NEW_VERSION="$next_minor" ;;
        2) NEW_VERSION="$next_major" ;;
    esac

    SELECTED="$selected"
    NEW_TAG="v$NEW_VERSION"
    if [ "$selected" -eq 2 ]; then
        MAJOR_TAG="v$((MAJOR + 1))"
    else
        MAJOR_TAG="v$MAJOR"
    fi
}

build_action() {
    echo ""
    command -v bun > /dev/null 2>&1 || die "bun is not installed. Install it from https://bun.sh"

    local bun_version
    bun_version=$(bun --version)
    info "Using bun ${BOLD}v${bun_version}${OFF}"

    info "Building action..."
    bun run build --silent > /dev/null 2>&1 || die "Build failed. Fix errors before releasing."
    success "Built dist/index.mjs"

    if git diff --quiet -- "$REPO_ROOT/dist/"; then
        info "dist/ is already up to date"
    else
        git add "$REPO_ROOT/dist/" > /dev/null
        info "Staged dist/ changes"
    fi
}

bump_version() {
    echo ""
    info "Bumping ${BOLD}v${CURRENT_VERSION}${OFF} → ${BOLD}${NEW_TAG}${OFF}"
    echo ""

    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" "$PACKAGE_JSON"
    else
        sed -i "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" "$PACKAGE_JSON"
    fi
    success "Updated package.json to ${BOLD}$NEW_VERSION${OFF}"

    git add "$PACKAGE_JSON" > /dev/null
    local short_hash
    short_hash=$(git commit -S -m "chore(release): $NEW_TAG" --quiet && git rev-parse --short HEAD)
    FULL_COMMIT_HASH=$(git rev-parse HEAD)
    success "Created commit ${DIM}(${short_hash})${OFF}"
}

create_tags() {
    git tag "$NEW_TAG" --annotate --sign --message "Release $NEW_TAG"
    success "Created tag ${BOLD}$NEW_TAG${OFF}"

    if [ "$SELECTED" -eq 2 ]; then
        git tag "$MAJOR_TAG" --annotate --sign --message "Release $MAJOR_TAG"
        success "Created major tag ${BOLD}$MAJOR_TAG${OFF}"
    else
        git tag "$MAJOR_TAG" --force --annotate --sign --message "Update $MAJOR_TAG to $NEW_TAG"
        success "Updated major tag ${BOLD}$MAJOR_TAG${OFF} → ${BOLD}$NEW_TAG${OFF}"
    fi
}

push_release() {
    echo ""
    echo -e "  ${BOLD}Ready to push:${OFF}"
    echo -e "  ${DIM}Tag:${OFF}    $NEW_TAG"
    echo -e "  ${DIM}Major:${OFF}  $MAJOR_TAG"
    echo ""
    echo -e -n "  Push to remote? [y/N] "
    read -r confirm

    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo ""
        info "Skipped push. To push manually run:"
        echo -e "  ${DIM}git push --follow-tags${OFF}"
        [ "$SELECTED" -ne 2 ] && echo -e "  ${DIM}git push origin $MAJOR_TAG --force${OFF}"
        echo ""
        info "To undo this release run: ${DIM}scripts/undo-release.sh${OFF}"
        return
    fi

    git push --follow-tags --quiet
    [ "$SELECTED" -ne 2 ] && git push origin "$MAJOR_TAG" --force --quiet
    success "Pushed to remote"

    echo ""
    echo -e "  ${GREEN}${BOLD}Release $NEW_TAG complete!${OFF}"
    echo ""
    echo -e "  ${BOLD}Next steps:${OFF}"
    echo -e "  ${DIM}- Create a new GitHub release for this version${OFF}"
    echo ""
    echo -e "  ${BOLD}Tag:${OFF}    $NEW_TAG"
    echo -e "  ${BOLD}Major:${OFF}  $MAJOR_TAG"
    echo ""
    echo -e "  Users can reference this action as:"
    echo -e "  ${DIM}-${OFF} peakoss/anti-slop@$NEW_TAG"
    echo -e "  ${DIM}-${OFF} peakoss/anti-slop@$MAJOR_TAG"
    echo -e "  ${DIM}-${OFF} peakoss/anti-slop@$FULL_COMMIT_HASH ${DIM}(commit SHA)${OFF}"
    echo ""
}

main() {
    check_prerequisites
    select_version
    build_action
    bump_version
    create_tags
    push_release
}

main
