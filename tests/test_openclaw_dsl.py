import json
import os
import subprocess
import tarfile
import tempfile
import unittest
from pathlib import Path
from io import BytesIO


ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = ROOT / "openclaw.skills.json"
PACKAGE_SCRIPT = ROOT / "scripts" / "package-openclaw-dsl.py"
INSTALL_SCRIPT = ROOT / "scripts" / "install-openclaw-dsl.py"


class OpenClawDslTests(unittest.TestCase):
    def test_index_lists_expected_packages(self) -> None:
        index = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
        package_names = {item["packageName"] for item in index["packages"]}
        self.assertIn("douyin-live-welcome-announcer-openclaw", package_names)
        self.assertIn("feishu-call-log-workflow", package_names)

    def test_each_manifest_has_required_entrypoints(self) -> None:
        index = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
        for item in index["packages"]:
            skill_dir = ROOT / item["path"]
            manifest = json.loads((skill_dir / "dsl.json").read_text(encoding="utf-8"))

            self.assertEqual(manifest["packageName"], item["packageName"])
            self.assertTrue((skill_dir / manifest["entry"]["skill"]).is_file())
            self.assertTrue((skill_dir / manifest["entry"]["workflow"]).is_file())
            self.assertTrue((skill_dir / manifest["entry"]["agent"]).is_file())
            self.assertTrue((skill_dir / manifest["install"]["installGlobal"]).is_file())
            self.assertTrue((skill_dir / manifest["install"]["uninstallGlobal"]).is_file())

    def test_package_script_builds_a_skill_archive(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            output = subprocess.check_output(
                ["python3", str(PACKAGE_SCRIPT), "feishu-call-log-workflow", tmp_dir],
                cwd=ROOT,
                text=True
            ).strip()

            archive_path = Path(output)
            self.assertTrue(archive_path.is_file())

            with tarfile.open(archive_path, "r:gz") as archive:
                members = archive.getnames()

            self.assertIn("feishu-call-log-workflow/dsl.json", members)
            self.assertIn("feishu-call-log-workflow/SKILL.md", members)
            self.assertIn("feishu-call-log-workflow/workflow.md", members)

    def test_install_script_extracts_and_links_skill(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            archive_path = Path(
                subprocess.check_output(
                    ["python3", str(PACKAGE_SCRIPT), "douyin-live-welcome-announcer-openclaw", tmp_dir],
                    cwd=ROOT,
                    text=True
                ).strip()
            )
            packages_dir = Path(tmp_dir) / "packages"
            global_skills_dir = Path(tmp_dir) / "global-skills"
            env = os.environ.copy()
            env["OPENCLAW_DSL_PACKAGES_DIR"] = str(packages_dir)
            env["OPENCLAW_GLOBAL_SKILLS_DIR"] = str(global_skills_dir)

            installed_dir = Path(
                subprocess.check_output(
                    ["python3", str(INSTALL_SCRIPT), str(archive_path)],
                    cwd=ROOT,
                    text=True,
                    env=env
                ).strip()
            )

            self.assertTrue(installed_dir.is_dir())
            self.assertTrue((installed_dir / "dsl.json").is_file())

            link_path = global_skills_dir / "douyin-live-welcome-announcer-openclaw"
            self.assertTrue(link_path.is_symlink())
            self.assertEqual(link_path.resolve(), installed_dir.resolve())

    def test_install_script_rejects_archive_with_path_traversal(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            archive_path = Path(tmp_dir) / "malicious.dsl.tgz"
            with tarfile.open(archive_path, "w:gz") as archive:
                payload = b"owned"
                info = tarfile.TarInfo(name="../escape.txt")
                info.size = len(payload)
                archive.addfile(info, BytesIO(payload))

            result = subprocess.run(
                ["python3", str(INSTALL_SCRIPT), str(archive_path)],
                cwd=ROOT,
                text=True,
                capture_output=True
            )

            self.assertNotEqual(result.returncode, 0)
            self.assertIn("unsafe archive entry", result.stderr)


if __name__ == "__main__":
    unittest.main()
