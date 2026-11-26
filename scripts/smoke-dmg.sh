#!/usr/bin/env bash
set -euo pipefail
image="$1"
scratch="$(mktemp -d)"
mountpoint="$scratch/volume"
cleanup() {
  if mount | grep -Fq " on $mountpoint "; then hdiutil detach "$mountpoint"; fi
  rm -rf "$scratch"
}
trap cleanup EXIT
hdiutil attach "$image" -readonly -nobrowse -mountpoint "$mountpoint"
ditto "$mountpoint/Tournamenter.app" "$scratch/Tournamenter.app"
hdiutil detach "$mountpoint"
node scripts/smoke.mjs "$scratch/Tournamenter.app/Contents/MacOS/Tournamenter"
