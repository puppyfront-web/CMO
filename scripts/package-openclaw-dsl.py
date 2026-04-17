#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import tarfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = ROOT / "openclaw.skills.json"


def load_index() -> dict:
    return json.loads(INDEX_PATH.read_text(encoding="utf-8"))


def resolve_package(target: str) -> tuple[Path, dict]:
    target_path = (ROOT / target).resolve()
    if target_path.is_dir():
        manifest_path = target_path / "dsl.json"
        if not manifest_path.is_file():
            raise SystemExit(f"dsl manifest not found: {manifest_path}")
        return target_path, json.loads(manifest_path.read_text(encoding="utf-8"))

    index = load_index()
    for item in index["packages"]:
        if target in {item["packageName"], item["skillKey"], item["path"]}:
            skill_dir = ROOT / item["path"]
            manifest = json.loads((skill_dir / "dsl.json").read_text(encoding="utf-8"))
            return skill_dir, manifest

    raise SystemExit(f"unknown OpenClaw DSL package: {target}")


def create_archive(skill_dir: Path, manifest: dict, output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    archive_name = f"{manifest['distribution']['archiveBaseName']}-{manifest['version']}.dsl.tgz"
    archive_path = output_dir / archive_name

    with tarfile.open(archive_path, "w:gz") as archive:
        for rel_path in manifest["distribution"]["include"]:
            source = skill_dir / rel_path
            if not source.exists():
                raise SystemExit(f"manifest include path does not exist: {source}")
            archive.add(source, arcname=f"{skill_dir.name}/{rel_path}")

    return archive_path


def main(argv: list[str]) -> int:
    if len(argv) not in {2, 3}:
        print("usage: package-openclaw-dsl.py <package-name|skill-key|skill-dir> [output-dir]", file=sys.stderr)
        return 1

    skill_dir, manifest = resolve_package(argv[1])
    output_dir = Path(argv[2]).resolve() if len(argv) == 3 else (ROOT / "dist" / "openclaw")
    archive_path = create_archive(skill_dir, manifest, output_dir)
    print(archive_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
