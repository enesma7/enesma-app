import assert from "node:assert/strict";
import test from "node:test";
import { OFFICE_DOCS_URL, pageShareUrl, shouldUseHistoryBack } from "./docbar.js";

test("office documents fallback is the Agent Hub route", () => {
  assert.equal(OFFICE_DOCS_URL, "https://agent.enesmarealty.com/#/compliance/office-documents");
});

test("history.back only when this tab came from a Hub page", () => {
  const agent = "https://agent.enesmarealty.com/#/compliance/office-documents";
  const appHub = "https://app.enesmarealty.com/hub/#/compliance/office-documents";
  assert.equal(shouldUseHistoryBack(agent, 2), true);
  assert.equal(shouldUseHistoryBack(appHub, 3), true);
  assert.equal(shouldUseHistoryBack(agent, 1), false);
  assert.equal(shouldUseHistoryBack("", 4), false);
  assert.equal(shouldUseHistoryBack("https://example.com/", 4), false);
  assert.equal(shouldUseHistoryBack("https://app.enesmarealty.com/forms/cda.html", 4), false);
  assert.equal(shouldUseHistoryBack("https://app.enesmarealty.com/transactions/", 4), false);
  assert.equal(shouldUseHistoryBack("not a url", 4), false);
});

test("share link is the current page without a hash", () => {
  assert.equal(
    pageShareUrl("https://app.enesmarealty.com/forms/w9.html#page=2"),
    "https://app.enesmarealty.com/forms/w9.html"
  );
  assert.equal(
    pageShareUrl("https://app.enesmarealty.com/forms/cda.html?v=2#x"),
    "https://app.enesmarealty.com/forms/cda.html?v=2"
  );
});
