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
LINKED_TITLE = ROOT / "scripts" / "linked_doc_title.py"
VALIDATE_ROW = ROOT / "scripts" / "validate_row.py"
MARKDOWN_PAYLOAD = ROOT / "scripts" / "markdown_payload.py"
QUOTATION_SCHEMA = ROOT / "scripts" / "quotation_sheet_schema.py"
VALIDATE_QUOTATION = ROOT / "scripts" / "validate_quotation_sheet_data.py"


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
    def test_headers_include_generated_doc_columns(self) -> None:
        raw = subprocess.check_output(
            ["/usr/bin/python3", str(SCHEMA), "headers"], text=True
        ).strip()
        parsed = json.loads(raw)
        self.assertEqual(
            parsed,
            ["日期", "客户名", "电话", "客户类别", "需求", "对接阶段", "打电话录音脑图", "备注", "需求文档", "报价表"],
        )


class LinkedDocTitleTests(unittest.TestCase):
    def run_title(self, customer: str, industry: str, label: str, date: str) -> str:
        return subprocess.check_output(
            ["/usr/bin/python3", str(LINKED_TITLE), customer, industry, label, date],
            text=True,
        ).strip()

    def test_linked_title_with_customer_and_industry(self) -> None:
        self.assertEqual(
            self.run_title("李老师", "教育行业", "需求文档", "2026-04-16"),
            "李老师-教育行业-需求文档-2026-04-16",
        )

    def test_linked_title_fallback(self) -> None:
        self.assertEqual(
            self.run_title("", "跨境外贸", "报价表", "2026-04-16"),
            "跨境外贸-报价表-2026-04-16",
        )


class ValidateRowTests(unittest.TestCase):
    def run_validate(self, row_json: str) -> str:
        return subprocess.check_output(
            ["/usr/bin/python3", str(VALIDATE_ROW), "validate", row_json],
            text=True,
        ).strip()

    def test_accepts_exact_schema_width(self) -> None:
        row = json.dumps(
            [
                "2026-04-16",
                "李老师",
                "未提取到",
                "教育行业",
                "知识库",
                "初步沟通",
                "https://mindmap",
                "备注",
                "https://demand",
                "https://quote",
            ],
            ensure_ascii=False,
        )
        parsed = json.loads(self.run_validate(row))
        self.assertEqual(len(parsed), 10)

    def test_rejects_old_width_row(self) -> None:
        row = json.dumps(
            [
                "2026-04-16",
                "李老师",
                "未提取到",
                "教育行业",
                "知识库",
                "初步沟通",
                "https://mindmap",
                "备注",
            ],
            ensure_ascii=False,
        )
        with self.assertRaises(subprocess.CalledProcessError):
            self.run_validate(row)


class MarkdownPayloadTests(unittest.TestCase):
    def run_payload(self, markdown_path: str) -> str:
        return subprocess.check_output(
            ["/usr/bin/python3", str(MARKDOWN_PAYLOAD), "read", markdown_path],
            text=True,
        )

    def test_reads_small_markdown_file(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            file_path = Path(tmp) / "doc.md"
            file_path.write_text("# 标题\n\n正文", encoding="utf-8")
            self.assertEqual(self.run_payload(str(file_path)), "# 标题\n\n正文")

    def test_rejects_missing_markdown_file(self) -> None:
        with self.assertRaises(subprocess.CalledProcessError):
            self.run_payload("/tmp/does-not-exist.md")


class QuotationSheetSchemaTests(unittest.TestCase):
    def test_headers_include_quote_columns(self) -> None:
        raw = subprocess.check_output(
            ["/usr/bin/python3", str(QUOTATION_SCHEMA), "headers"], text=True
        ).strip()
        parsed = json.loads(raw)
        self.assertEqual(
            parsed,
            ["方案", "版本定位", "交付范围", "核心功能", "技术与集成边界", "工期", "报价", "不包含项", "建议适用客户", "报价依据"],
        )


class ValidateQuotationSheetTests(unittest.TestCase):
    def run_validate(self, data_path: str) -> str:
        return subprocess.check_output(
            ["/usr/bin/python3", str(VALIDATE_QUOTATION), "validate", data_path],
            text=True,
        ).strip()

    def test_accepts_valid_quotation_sheet_data(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            file_path = Path(tmp) / "quotation.json"
            file_path.write_text(
                json.dumps(
                    [
                        [
                            "基础版",
                            "MVP",
                            "单流程交付",
                            "问答与知识库",
                            "不含复杂集成",
                            "2周",
                            "12000元",
                            "本地部署",
                            "个人试用",
                            "轻量定制工具",
                        ]
                    ],
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )
            parsed = json.loads(self.run_validate(str(file_path)))
            self.assertEqual(len(parsed[0]), 10)

    def test_rejects_invalid_quotation_sheet_width(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            file_path = Path(tmp) / "quotation.json"
            file_path.write_text(
                json.dumps(
                    [["基础版", "MVP", "单流程交付"]],
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )
            with self.assertRaises(subprocess.CalledProcessError):
                self.run_validate(str(file_path))


if __name__ == "__main__":
    unittest.main()
