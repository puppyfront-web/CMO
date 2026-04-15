#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "usage: run_extension_dir.sh <extension-dir> <artifact-dir>" >&2
  exit 1
fi

EXTENSION_DIR="$1"
ARTIFACT_DIR="$2"

if [ ! -d "$EXTENSION_DIR" ]; then
  exit 0
fi

find "$EXTENSION_DIR" -maxdepth 1 -type f | sort | while read -r extension; do
  case "$extension" in
    *.sh)
      bash "$extension" "$ARTIFACT_DIR"
      ;;
    *.py)
      /usr/bin/python3 "$extension" "$ARTIFACT_DIR"
      ;;
    *)
      if [ -x "$extension" ]; then
        "$extension" "$ARTIFACT_DIR"
      fi
      ;;
  esac
done
