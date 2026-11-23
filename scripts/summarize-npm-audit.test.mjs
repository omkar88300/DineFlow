import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { summarizeAuditJson } from "./summarize-npm-audit.mjs";

const cleanReport = () => ({
  metadata: { vulnerabilities: { critical: 0, high: 0, moderate: 0, low: 0 } },
  vulnerabilities: {},
});

describe("summarizeAuditJson", () => {
  it("reports a clean audit only when all severity counts are present and zero", () => {
    const summary = summarizeAuditJson(JSON.stringify(cleanReport()));
    assert.match(summary, /No dependency vulnerabilities were reported/);
    assert.match(summary, /unavailable or invalid audit report does fail the job/);
  });

  it("summarizes findings without treating vulnerabilities as an audit failure", () => {
    const summary = summarizeAuditJson(
      JSON.stringify({
        metadata: { vulnerabilities: { critical: 1, high: 0, moderate: 2, low: 0 } },
        vulnerabilities: {
          next: {
            severity: "critical",
            isDirect: true,
            range: "16.0.0 - 16.4.4",
            fixAvailable: { name: "next", version: "16.4.5", isSemVerMajor: false },
          },
          minimatch: {
            severity: "moderate",
            isDirect: false,
            range: "7.0.0 - 11.0.0",
            fixAvailable: false,
          },
        },
      })
    );

    assert.match(summary, /\| Critical \| 1 \|/);
    assert.match(summary, /\*\*next\*\* — critical, direct/);
    assert.match(summary, /fix available: yes/);
    assert.match(summary, /\*\*minimatch\*\* — moderate, transitive/);
    assert.match(summary, /fix available: no/);
    assert.match(summary, /Vulnerability findings are informational/);
  });

  it("rejects registry or authentication errors without exposing their summary", () => {
    assert.throws(
      () =>
        summarizeAuditJson(
          JSON.stringify({
            error: {
              code: "E401",
              summary: "Unauthorized at https://private-registry.example.com/token",
            },
          })
        ),
      (error) => {
        assert.match(error.message, /E401/);
        assert.doesNotMatch(error.message, /private-registry/);
        return true;
      }
    );
  });

  it("rejects reports that are missing vulnerability metadata", () => {
    assert.throws(
      () => summarizeAuditJson(JSON.stringify({ vulnerabilities: {} })),
      /missing vulnerability metadata/
    );
  });

  it("rejects missing severity counts instead of defaulting them to zero", () => {
    const report = cleanReport();
    delete report.metadata.vulnerabilities.high;
    assert.throws(
      () => summarizeAuditJson(JSON.stringify(report)),
      /invalid high vulnerability count/
    );
  });

  it("rejects negative severity counts", () => {
    const report = cleanReport();
    report.metadata.vulnerabilities.critical = -1;
    assert.throws(
      () => summarizeAuditJson(JSON.stringify(report)),
      /invalid critical vulnerability count/
    );
  });

  it("rejects non-integer severity counts", () => {
    const report = cleanReport();
    report.metadata.vulnerabilities.moderate = "2";
    assert.throws(
      () => summarizeAuditJson(JSON.stringify(report)),
      /invalid moderate vulnerability count/
    );
  });

  it("rejects reports without package vulnerability details", () => {
    const report = cleanReport();
    delete report.vulnerabilities;
    assert.throws(
      () => summarizeAuditJson(JSON.stringify(report)),
      /missing package vulnerability details/
    );
  });

  it("rejects nonzero vulnerability counts with no package details", () => {
    const report = cleanReport();
    report.metadata.vulnerabilities.critical = 1;
    assert.throws(
      () => summarizeAuditJson(JSON.stringify(report)),
      /reported vulnerability counts but omitted package details/
    );
  });

  it("rejects malformed JSON", () => {
    assert.throws(
      () => summarizeAuditJson("{not valid json"),
      /did not return valid JSON/
    );
  });

  it("rejects malformed package details", () => {
    assert.throws(
      () =>
        summarizeAuditJson(
          JSON.stringify({
            metadata: { vulnerabilities: { critical: 1, high: 0, moderate: 0, low: 0 } },
            vulnerabilities: { next: null },
          })
        ),
      /invalid details for package next/
    );
  });
});
