#!/usr/bin/env python3
"""
Test Coverage Report Generator for Pharma-360
QA-002: Improve test coverage to >80%
"""

import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

class CoverageReporter:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.report_dir = self.project_root / "reports" / "coverage"
        self.report_dir.mkdir(parents=True, exist_ok=True)
        self.timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        
    def run_backend_tests_with_coverage(self):
        """Run backend tests with coverage"""
        print("\n🔍 Running backend tests with coverage...")
        
        try:
            result = subprocess.run(
                ["python", "-m", "pytest", "tests/", "--cov=backend", "--cov-report=json:backend_coverage.json", "--cov-report=html:backend_coverage_html"],
                cwd=self.project_root / "backend",
                capture_output=True,
                text=True,
                timeout=120
            )
            
            print(result.stdout)
            if result.stderr:
                print("Errors:", result.stderr)
            
            return result.returncode == 0
        except Exception as e:
            print(f"Error running backend tests: {e}")
            return False
    
    def run_frontend_tests_with_coverage(self):
        """Run frontend tests with coverage"""
        print("\n🔍 Running frontend tests with coverage...")
        
        try:
            result = subprocess.run(
                ["npm", "test", "--", "--coverage"],
                cwd=self.project_root / "frontend",
                capture_output=True,
                text=True,
                timeout=120
            )
            
            print(result.stdout)
            if result.stderr:
                print("Errors:", result.stderr)
            
            return result.returncode == 0
        except Exception as e:
            print(f"Error running frontend tests: {e}")
            return False
    
    def generate_coverage_report(self):
        """Generate a comprehensive coverage report"""
        print("\n📊 Generating coverage report...")
        
        report = {
            "timestamp": self.timestamp,
            "coverage": {
                "backend": {
                    "files": [],
                    "total": {"lines": 0, "covered": 0, "percentage": 0},
                    "details": {}
                },
                "frontend": {
                    "files": [],
                    "total": {"lines": 0, "covered": 0, "percentage": 0},
                    "details": {}
                }
            },
            "summary": {
                "total_lines": 0,
                "total_covered": 0,
                "overall_percentage": 0,
                "target": 80,
                "met_target": False
            }
        }
        
        # Try to read backend coverage
        backend_coverage_file = self.project_root / "backend" / "backend_coverage.json"
        if backend_coverage_file.exists():
            with open(backend_coverage_file) as f:
                backend_data = json.load(f)
            
            report["coverage"]["backend"] = self._parse_coverage_data(backend_data)
        
        # Try to read frontend coverage
        frontend_coverage_file = self.project_root / "frontend" / "coverage" / "coverage-final.json"
        if frontend_coverage_file.exists():
            with open(frontend_coverage_file) as f:
                frontend_data = json.load(f)
            
            report["coverage"]["frontend"] = self._parse_vitest_coverage(frontend_data)
        
        # Calculate overall
        total_lines = report["coverage"]["backend"]["total"]["lines"] + report["coverage"]["frontend"]["total"]["lines"]
        total_covered = report["coverage"]["backend"]["total"]["covered"] + report["coverage"]["frontend"]["total"]["covered"]
        
        if total_lines > 0:
            overall_percentage = (total_covered / total_lines) * 100
        else:
            overall_percentage = 0
        
        report["summary"] = {
            "total_lines": total_lines,
            "total_covered": total_covered,
            "overall_percentage": round(overall_percentage, 2),
            "target": 80,
            "met_target": overall_percentage >= 80
        }
        
        # Save report
        report_file = self.report_dir / f"coverage_report_{self.timestamp}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        # Save markdown report
        self._generate_markdown_report(report, report_file)
        
        return report
    
    def _parse_coverage_data(self, data):
        """Parse pytest-cov JSON output"""
        result = {
            "files": [],
            "total": {"lines": 0, "covered": 0, "percentage": 0},
            "details": {}
        }
        
        if "files" in data:
            for file_path, file_data in data["files"].items():
                lines = file_data.get("summary", {}).get("num_statements", 0)
                covered = file_data.get("summary", {}).get("num_executed", 0)
                percentage = file_data.get("summary", {}).get("percent_covered", 0)
                
                result["files"].append({
                    "path": file_path,
                    "lines": lines,
                    "covered": covered,
                    "percentage": round(percentage, 2)
                })
                
                result["total"]["lines"] += lines
                result["total"]["covered"] += covered
            
            if result["total"]["lines"] > 0:
                result["total"]["percentage"] = round(
                    (result["total"]["covered"] / result["total"]["lines"]) * 100, 2
                )
        
        return result
    
    def _parse_vitest_coverage(self, data):
        """Parse Vitest coverage JSON output"""
        result = {
            "files": [],
            "total": {"lines": 0, "covered": 0, "percentage": 0},
            "details": {}
        }
        
        if "total" in data:
            lines = data["total"].get("lines", {}).get("total", 0)
            covered = data["total"].get("lines", {}).get("covered", 0)
            percentage = data["total"].get("lines", {}).get("percent", 0)
            
            result["total"] = {
                "lines": lines,
                "covered": covered,
                "percentage": round(percentage, 2)
            }
        
        if "files" in data:
            for file_path, file_data in data["files"].items():
                lines = file_data.get("lines", {}).get("total", 0)
                covered = file_data.get("lines", {}).get("covered", 0)
                percentage = file_data.get("lines", {}).get("percent", 0)
                
                result["files"].append({
                    "path": file_path,
                    "lines": lines,
                    "covered": covered,
                    "percentage": round(percentage, 2)
                })
        
        return result
    
    def _generate_markdown_report(self, report, json_file):
        """Generate a markdown coverage report"""
        md_content = f"""# 📊 Pharma-360 Test Coverage Report

**Generated**: {report["timestamp"]}  
**Target**: {report["summary"]["target"]}% coverage  
**Status**: {"✅ MET" if report["summary"]["met_target"] else "❌ BELOW TARGET"}

---

## 🎯 Overall Coverage

| Metric | Value |
|--------|-------|
| Total Lines | {report["summary"]["total_lines"]} |
| Total Covered | {report["summary"]["total_covered"]} |
| **Overall Percentage** | **{report["summary"]["overall_percentage"]}%** |
| Target | {report["summary"]["target"]}% |

**Result**: {"✅ Target Met" if report["summary"]["met_target"] else f"⚠️ Need {report["summary"]["target"] - report["summary"]["overall_percentage"]:.2f}% more"}

---

## 🏗️ Backend Coverage

**Total**: {report["coverage"]["backend"]["total"]["percentage"]}%

| File | Lines | Covered | Coverage |
|------|-------|---------|----------|
"""
        
        for file_info in report["coverage"]["backend"]["files"]:
            md_content += f"| `{file_info['path']}` | {file_info['lines']} | {file_info['covered']} | {file_info['percentage']}% |\n"
        
        md_content += """
---

## 🎨 Frontend Coverage

**Total**: """ + f"{report["coverage"]["frontend"]["total"]["percentage"]}%\n\n"
        
        md_content += """| File | Lines | Covered | Coverage |
|------|-------|---------|----------|
"""
        
        for file_info in report["coverage"]["frontend"]["files"]:
            md_content += f"| `{file_info['path']}` | {file_info['lines']} | {file_info['covered']} | {file_info['percentage']}% |\n"
        
        md_content += """
---

## 📈 Recommendations

"""
        
        if not report["summary"]["met_target"]:
            needed = report["summary"]["target"] - report["summary"]["overall_percentage"]
            md_content += f"- ⚠️ Overall coverage is {report["summary"]["overall_percentage"]}%, need {needed:.2f}% more to reach {report["summary"]["target"]}% target\n"
            md_content += "- 🔍 Focus on files with coverage < 80%\n"
            md_content += "- ✅ Add more unit tests for uncovered functions\n"
            md_content += "- ✅ Add integration tests for complex workflows\n"
        else:
            md_content += "- ✅ Coverage target met!\n"
            md_content += "- 🎯 Continue improving coverage for better reliability\n"
            md_content += "- 📊 Consider adding more edge case tests\n"
        
        md_content += """
---

## 🔗 Related Files
- [JSON Report](""" + f"{json_file.name}" + """)
- [Backend Coverage HTML](backend/backend_coverage_html/index.html)
- [Frontend Coverage HTML](frontend/coverage/index.html)

---

**Generated by**: @agent-senior-en-assurance-qualit-qa-et-automatisation-e-2-e  
**QA-002**: Improve test coverage to >80%
"""
        
        md_file = self.report_dir / f"coverage_report_{self.timestamp}.md"
        with open(md_file, 'w') as f:
            f.write(md_content)
        
        print(f"✅ Coverage report saved to: {md_file}")
        print(f"✅ JSON report saved to: {json_file}")
    
    def print_summary(self, report):
        """Print a summary of the coverage report"""
        print("\n" + "="*60)
        print("📊 TEST COVERAGE REPORT SUMMARY")
        print("="*60)
        print(f"\n📅 Generated: {report['timestamp']}")
        print(f"\n🎯 OVERALL COVERAGE")
        print(f"   Total Lines: {report['summary']['total_lines']}")
        print(f"   Covered: {report['summary']['total_covered']}")
        print(f"   Percentage: {report['summary']['overall_percentage']}%")
        print(f"   Target: {report['summary']['target']}%")
        print(f"   Status: {'✅ MET' if report['summary']['met_target'] else '❌ BELOW TARGET'}")
        
        print(f"\n🏗️ BACKEND COVERAGE")
        print(f"   Percentage: {report['coverage']['backend']['total']['percentage']}%")
        print(f"   Files: {len(report['coverage']['backend']['files'])}")
        
        print(f"\n🎨 FRONTEND COVERAGE")
        print(f"   Percentage: {report['coverage']['frontend']['total']['percentage']}%")
        print(f"   Files: {len(report['coverage']['frontend']['files'])}")
        
        print("\n" + "="*60)


def main():
    reporter = CoverageReporter()
    
    print("\n" + "="*60)
    print("🚀 PHARMA-360 TEST COVERAGE REPORT GENERATOR")
    print("QA-002: Improve test coverage to >80%")
    print("="*60)
    
    # Run tests with coverage
    backend_success = reporter.run_backend_tests_with_coverage()
    frontend_success = reporter.run_frontend_tests_with_coverage()
    
    # Generate report
    report = reporter.generate_coverage_report()
    
    # Print summary
    reporter.print_summary(report)
    
    # Return exit code
    if report["summary"]["met_target"]:
        print("\n✅ Coverage target met!")
        return 0
    else:
        print(f"\n⚠️  Coverage below target: {report['summary']['overall_percentage']}% < {report['summary']['target']}%")
        return 1


if __name__ == "__main__":
    sys.exit(main())
