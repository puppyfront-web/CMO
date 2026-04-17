#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import shutil
import sys
import tarfile
import tempfile
from pathlib import Path


def load_manifest(skill_dir: Path) -> dict:
    manifest_path = skill_dir / "dsl.json"
    if not manifest_path.is_file():
        raise SystemExit(f"dsl manifest not found: {manifest_path}")
    return json.loads(manifest_path.read_text(encoding="utf-8"))


def safe_symlink(source: Path, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() or target.is_symlink():
        if target.is_dir() and not target.is_symlink():
            shutil.rmtree(target)
        else:
            target.unlink()
    target.symlink_to(source)


def ensure_safe_archive_members(archive: tarfile.TarFile, destination: Path) -> None:
    destination = destination.resolve()
    for member in archive.getmembers():
        member_path = (destination / member.name).resolve()
        if not str(member_path).startswith(f"{destination}{os.sep}") and member_path != destination:
            raise SystemExit(f"unsafe archive entry: {member.name}")


def extract_archive(archive_path: Path, packages_dir: Path) -> Path:
    with tempfile.TemporaryDirectory() as tmp_dir:
        temp_root = Path(tmp_dir)
        with tarfile.open(archive_path, "r:gz") as archive:
            ensure_safe_archive_members(archive, temp_root)
            archive.extractall(temp_root)

        extracted_roots = [path for path in temp_root.iterdir() if path.is_dir()]
        if len(extracted_roots) != 1:
            raise SystemExit("dsl archive must contain exactly one top-level skill directory")

        extracted_skill_dir = extracted_roots[0]
        manifest = load_manifest(extracted_skill_dir)
        install_root = packages_dir / manifest["packageName"] / manifest["version"]
        final_skill_dir = install_root / manifest["skillDirName"]

        if install_root.exists():
            shutil.rmtree(install_root)
        install_root.mkdir(parents=True, exist_ok=True)
        shutil.move(str(extracted_skill_dir), str(final_skill_dir))
        return final_skill_dir


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("usage: install-openclaw-dsl.py <archive-path>", file=sys.stderr)
        return 1

    archive_path = Path(argv[1]).resolve()
    if not archive_path.is_file():
        raise SystemExit(f"dsl archive not found: {archive_path}")

    packages_dir = Path(os.environ.get("OPENCLAW_DSL_PACKAGES_DIR", "~/.openclaw/packages")).expanduser()
    global_skills_dir = Path(os.environ.get("OPENCLAW_GLOBAL_SKILLS_DIR", "~/.openclaw/workspace/skills")).expanduser()

    final_skill_dir = extract_archive(archive_path, packages_dir)
    manifest = load_manifest(final_skill_dir)
    link_path = global_skills_dir / manifest["install"]["globalLinkName"]
    safe_symlink(final_skill_dir, link_path)

    print(final_skill_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
