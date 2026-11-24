import assert from "node:assert/strict";
import { describe, it } from "node:test";

import staffRouteAccess from "../.test-build/staff-route-access.js";

const { getStaffRedirectPath } = staffRouteAccess;

describe("getStaffRedirectPath", () => {
  it("allows administrators to access every protected dashboard", () => {
    for (const pathname of ["/admin", "/waiter/orders", "/kitchen", "/billing/invoices"]) {
      assert.equal(getStaffRedirectPath("admin", pathname), null);
    }
  });

  it("allows waiters on the waiter dashboard and nested routes", () => {
    assert.equal(getStaffRedirectPath("waiter", "/waiter"), null);
    assert.equal(getStaffRedirectPath("waiter", "/waiter/orders/123"), null);
  });

  it("redirects waiters away from other dashboards", () => {
    assert.equal(getStaffRedirectPath("waiter", "/billing"), "/waiter");
  });

  it("does not allow lookalike waiter paths", () => {
    assert.equal(getStaffRedirectPath("waiter", "/waiter-settings"), "/waiter");
  });

  it("allows kitchen staff on the kitchen dashboard and nested routes", () => {
    assert.equal(getStaffRedirectPath("kitchen", "/kitchen"), null);
    assert.equal(getStaffRedirectPath("kitchen", "/kitchen/queue"), null);
  });

  it("redirects kitchen staff away from other dashboards", () => {
    assert.equal(getStaffRedirectPath("kitchen", "/admin"), "/kitchen");
  });

  it("allows billing staff on the billing dashboard and nested routes", () => {
    assert.equal(getStaffRedirectPath("billing", "/billing"), null);
    assert.equal(getStaffRedirectPath("billing", "/billing/payments/123"), null);
  });

  it("does not allow lookalike billing paths", () => {
    assert.equal(getStaffRedirectPath("billing", "/billing-settings"), "/billing");
  });

  it("redirects unknown or non-string roles to login", () => {
    for (const role of ["owner", "", null, undefined, 42, "constructor", "toString"]) {
      assert.equal(getStaffRedirectPath(role, "/billing"), "/login");
    }
  });
});
