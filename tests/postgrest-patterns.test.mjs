import assert from "node:assert/strict";
import { describe, it } from "node:test";

import postgrestPatterns from "../.test-build/postgrest-patterns.js";

const { escapePostgrestIlikePattern } = postgrestPatterns;

describe("escapePostgrestIlikePattern", () => {
  it("leaves ordinary email addresses unchanged", () => {
    assert.equal(
      escapePostgrestIlikePattern("asha@example.com"),
      "asha@example.com"
    );
  });

  it("escapes percent and underscore wildcard characters", () => {
    assert.equal(
      escapePostgrestIlikePattern("a_sha%tag@example.com"),
      "a\\_sha\\%tag@example.com"
    );
  });

  it("escapes the backslash escape character", () => {
    assert.equal(
      escapePostgrestIlikePattern("a\\sha@example.com"),
      "a\\\\sha@example.com"
    );
  });
});
