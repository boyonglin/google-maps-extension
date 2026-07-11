const AUTO_ATTACH_BADGE_COLOR = "#dadce0";
const AUTO_ATTACH_BADGE_TEXT_COLOR = "#3c4043";
const AUTO_ATTACH_BADGE_TEXT = {
  loading: "…",
  error: "!",
};
const AUTO_ATTACH_BADGE_STATES = new Set(["loading", "error", "success"]);
const activeAutoAttachRuns = new Map();
let nextAutoAttachRunId = 0;

export function beginAutoAttachRun(tabId) {
  const runId = ++nextAutoAttachRunId;
  activeAutoAttachRuns.set(tabId, runId);
  return runId;
}

export function isCurrentAutoAttachRun(tabId, runId) {
  return activeAutoAttachRuns.get(tabId) === runId;
}

export function finishAutoAttachRun(tabId, runId, state, count = 0) {
  if (!isCurrentAutoAttachRun(tabId, runId)) return false;
  setAutoAttachBadge(tabId, state, count);
  activeAutoAttachRuns.delete(tabId);
  return true;
}

function formatBadgeCount(count) {
  return count > 999 ? "999+" : String(count);
}

export function setAutoAttachBadge(tabId, state, count = 0) {
  if (!AUTO_ATTACH_BADGE_STATES.has(state)) return;
  if (!Number.isSafeInteger(tabId)) return;

  const text = state === "success" ? formatBadgeCount(count) : AUTO_ATTACH_BADGE_TEXT[state];
  chrome.action.setBadgeBackgroundColor({ tabId, color: AUTO_ATTACH_BADGE_COLOR });
  chrome.action.setBadgeTextColor?.({ tabId, color: AUTO_ATTACH_BADGE_TEXT_COLOR });
  chrome.action.setBadgeText({ tabId, text });
}

export function clearAutoAttachBadge(tabId) {
  if (!Number.isSafeInteger(tabId)) return;
  chrome.action.setBadgeText({ tabId, text: "" });
}

// Called when a tab starts loading a new document: any in-flight run for
// that tab is now stale, so drop it and clear the badge it was driving.
export function cancelAutoAttachRun(tabId) {
  activeAutoAttachRuns.delete(tabId);
  clearAutoAttachBadge(tabId);
}
