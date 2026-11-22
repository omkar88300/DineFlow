import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const SEVERITIES = ["critical", "high", "moderate", "low"];

export function summarizeAuditJson(jsonText) {
  let report;
  try {
    report = JSON.parse(jsonText);
  } catch {
    throw new Error(
      "npm audit did not return valid JSON. Check registry credentials and network access."
    );
  }

  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("npm audit returned an invalid report.");
  }

  if (report.error) {
    const code =
      typeof report.error.code === "string" && /^[A-Z0-9_]+$/.test(report.error.code)
        ? ` (${report.error.code})`
        : "";
    throw new Error(
      `npm audit could not complete${code}. Check registry credentials and network access.`
    );
  }

  const counts = report.metadata?.vulnerabilities;
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new Error("npm audit report is missing vulnerability metadata.");
  }

  const vulnerabilities = report.vulnerabilities ?? {};
  if (
    typeof vulnerabilities !== "object" ||
    Array.isArray(vulnerabilities)
  ) {
    throw new Error("npm audit report contains invalid package details.");
  }

  const lines = [
    "## Dependency audit",
    "",
    "| Severity | Findings |",
    "|---|---:|",
    ...SEVERITIES.map(
      (severity) => `| ${severity[0].toUpperCase()}${severity.slice(1)} | ${counts[severity] ?? 0} |`
    ),
  ];

  const findings = Object.entries(vulnerabilities);
  if (findings.length > 0) {
    lines.push("", "### Affected packages", "");

    for (const [name, detail] of findings) {
      if (!detail || typeof detail !== "object" || Array.isArray(detail)) {
        throw new Error(`npm audit returned invalid details for package ${name}.`);
      }

      const directness = detail.isDirect ? "direct" : "transitive";
      const fixAvailable =
        detail.fixAvailable === false
          ? "no"
          : detail.fixAvailable
            ? "yes"
            : "not reported";
      const affectedRange = String(detail.range ?? "not reported").replace(/[\\r\\n|]/g, " ");

      lines.push(
        `- **${name}** — ${detail.severity ?? "unknown"}, ${directness}; ` +
          `affected range: ${affectedRange}; fix available: ${fixAvailable}.`
      );
    }
  } else {
    const total = SEVERITIES.reduce(
      (sum, severity) => sum + (Number(counts[severity]) || 0),
      0
    );
    lines.push(
      "",
      total === 0
        ? "No dependency vulnerabilities were reported."
        : "Vulnerability counts were reported, but package details were not included."
    );
  }

  lines.push(
    "",
    "Vulnerability findings are informational and do not fail this job. " +
      "An unavailable or invalid audit report does fail the job."
  );

  return lines.join("\n") + "\n";
}

function main() {
  const reportPath = process.argv[2] ?? "npm-audit.json";

  try {
    const jsonText = readFileSync(reportPath, "utf8");
    const summary = summarizeAuditJson(jsonText);
    if (process.env.GITHUB_STEP_SUMMARY) {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
    }
    process.stdout.write(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown audit error.";
    const summary = [
      "## Dependency audit",
      "",
      "**Audit unavailable**",
      "",
      message,
      "",
    ].join("\n");

    if (process.env.GITHUB_STEP_SUMMARY) {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
    }
    console.error(message);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
