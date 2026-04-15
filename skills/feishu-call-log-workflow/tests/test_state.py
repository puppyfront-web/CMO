import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path("/Users/tutu/Documents/New project/skills/feishu-call-log-workflow")
STATE = ROOT / "scripts" / "state.py"
TITLE = ROOT / "scripts" / "doc_title.py"
SCHEMA = ROOT / "scripts" / "schema.py"


class WorkflowStateTests(unittest.TestCase):
    def run_state(self, *args: str, state_dir: str) -> str:
        env = os.environ.copy()
        env["OPENCLAW_SKILL_STATE_DIR"] = state_dir
        return subprocess.check_output(
            ["/usr/bin/python3", str(STATE), *args], text=True, env=env
        ).strip()

    def test_set_and_get_sheet(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            self.run_state("set-sheet", "https://example.com/sheet", state_dir=tmp)
            value = self.run_state("get-sheet", state_dir=tmp)
            self.assertEqual(value, "https://example.com/sheet")

    def test_clear_sheet(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            self.run_state("set-sheet", "https://example.com/sheet", state_dir=tmp)
            self.run_state("clear-sheet", state_dir=tmp)
            value = self.run_state("get-sheet", state_dir=tmp)
            self.assertEqual(value, "")

    def test_show_state(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            self.run_state("set-sheet", "https://example.com/sheet", state_dir=tmp)
            raw = self.run_state("show", state_dir=tmp)
            parsed = json.loads(raw)
            self.assertEqual(parsed["default_sheet_url"], "https://example.com/sheet")


class DocTitleTests(unittest.TestCase):
    def run_title(self, customer: str, industry: str, date: str) -> str:
        return subprocess.check_output(
            ["/usr/bin/python3", str(TITLE), customer, industry, date], text=True
        ).strip()

    def test_title_with_customer_and_industry(self) -> None:
        self.assertEqual(
            self.run_title("李老师", "教育行业", "2026-04-15"),
            "李老师-教育行业-2026-04-15",
        )

    def test_title_fallback(self) -> None:
        self.assertEqual(
            self.run_title("潮总", "", "2026-04-15"),
            "潮总-通话脑图-2026-04-15",
        )


class SchemaTests(unittest.TestCase):
    def test_headers_include_note_column(self) -> None:
        raw = subprocess.check_output(
            ["/usr/bin/python3", str(SCHEMA), "headers"], text=True
        ).strip()
        parsed = json.loads(raw)
        self.assertEqual(
            parsed,
            ["日期", "客户名", "电话", "客户类别", "需求", "对接阶段", "打电话录音脑图", "备注"],
        )


if __name__ == "__main__":
    unittest.main()
