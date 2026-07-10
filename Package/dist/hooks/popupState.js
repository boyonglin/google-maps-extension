const SUMMARY_TTL_MS = 24 * 60 * 60 * 1000;
const POPUP_TABS = new Set(["history", "favorite", "gemini"]);

function stringList(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

function summaryItems(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item.name === "string")
    .map((item) => ({
      name: item.name,
      clue: typeof item.clue === "string" ? item.clue : "",
    }));
}

// Shared TTL check for hydrateSnapshot, reducer, and external callers
function isSummaryFresh(items, timestamp, now) {
  return (
    Array.isArray(items) &&
    items.length > 0 &&
    Number.isFinite(timestamp) &&
    timestamp > 0 &&
    timestamp <= now &&
    now - timestamp <= SUMMARY_TTL_MS
  );
}

function initialPopupSnapshot() {
  return {
    boot: "loading",
    activeTab: "history",
    activeTabTouched: false,
    history: { items: [], emptyReason: "initial" },
    favorite: { items: [], status: "empty", errorKey: null },
    summary: {
      phase: "empty",
      items: [],
      errorKey: null,
      estimateSeconds: null,
      requestId: null,
      originTabId: null,
      timestamp: null,
    },
    api: { status: "missing", token: 0 },
    video: { available: null, enabled: false, token: 0 },
    deleteMode: { source: null, selectedValues: [] },
    onboarding: { demoHistoryVisible: false },
  };
}

function hydrateSnapshot(current, payload = {}) {
  const now = Number.isFinite(payload.now) ? payload.now : Date.now();
  const persistedSummary = summaryItems(payload.summaryList);
  const timestamp = Number(payload.timestamp);
  const summaryIsFresh = isSummaryFresh(persistedSummary, timestamp, now);

  return {
    ...current,
    boot: "ready",
    // Preserve user tab selection
    activeTab: current.activeTabTouched
      ? current.activeTab
      : POPUP_TABS.has(payload.lastActiveTab)
        ? payload.lastActiveTab
        : "history",
    history: { items: stringList(payload.searchHistoryList), emptyReason: "initial" },
    favorite: {
      items: stringList(payload.favoriteList),
      status: stringList(payload.favoriteList).length ? "ready" : "empty",
      errorKey: null,
    },
    summary: summaryIsFresh
      ? {
          ...current.summary,
          phase: "ready",
          items: persistedSummary,
          timestamp,
        }
      : { ...initialPopupSnapshot().summary },
    api: {
      status: payload.geminiApiKey ? "verifying" : "missing",
      token: current.api.token + 1,
    },
    video: {
      ...current.video,
      enabled: Boolean(payload.videoSummaryToggle),
    },
  };
}

function reducePopupState(current, action = {}) {
  switch (action.type) {
    case "HYDRATE":
      return hydrateSnapshot(current, action.payload);
    case "SET_ACTIVE_TAB":
      return POPUP_TABS.has(action.tab) && action.tab !== current.activeTab
        ? {
            ...current,
            activeTab: action.tab,
            activeTabTouched: true,
            deleteMode: { source: null, selectedValues: [] },
          }
        : current;
    case "HISTORY_SET": {
      const items = stringList(action.items);
      return {
        ...current,
        history: {
          items,
          emptyReason: items.length
            ? "initial"
            : action.emptyReason || current.history.emptyReason || "initial",
        },
        deleteMode:
          current.deleteMode.source === "history" && items.length === 0
            ? { source: null, selectedValues: [] }
            : current.deleteMode,
      };
    }
    case "FAVORITE_SET": {
      const items = stringList(action.items);
      return {
        ...current,
        favorite: {
          items,
          status: items.length ? "ready" : "empty",
          errorKey: null,
        },
        deleteMode:
          current.deleteMode.source === "favorite" && items.length === 0
            ? { source: null, selectedValues: [] }
            : current.deleteMode,
      };
    }
    case "FAVORITE_ERROR":
      return {
        ...current,
        favorite: { ...current.favorite, status: "error", errorKey: action.errorKey },
      };
    case "SUMMARY_START":
      return {
        ...current,
        summary: {
          ...initialPopupSnapshot().summary,
          phase: "generating",
          requestId: action.requestId,
          originTabId: action.originTabId ?? null,
        },
      };
    case "SUMMARY_ESTIMATE":
      if (action.requestId !== current.summary.requestId) return current;
      return {
        ...current,
        summary: { ...current.summary, estimateSeconds: action.estimateSeconds ?? null },
      };
    case "SUMMARY_SUCCESS":
      if (action.requestId !== current.summary.requestId) return current;
      return {
        ...current,
        summary: {
          ...current.summary,
          phase: "ready",
          items: summaryItems(action.items),
          errorKey: null,
          estimateSeconds: null,
          requestId: null,
          timestamp: action.timestamp ?? Date.now(),
        },
      };
    case "SUMMARY_ERROR":
      if (action.requestId !== current.summary.requestId) return current;
      return {
        ...current,
        summary: {
          ...current.summary,
          phase: "error",
          items: [],
          errorKey: action.errorKey || "geminiErrorMsg",
          estimateSeconds: null,
          requestId: null,
        },
      };
    case "SUMMARY_CLEAR":
      return { ...current, summary: { ...initialPopupSnapshot().summary } };
    case "SUMMARY_STORAGE_SET": {
      if (current.summary.phase === "generating") return current;
      const items = summaryItems(action.items);
      const now = Number.isFinite(action.now) ? action.now : Date.now();
      const timestamp = Number(action.timestamp);
      const isFresh = isSummaryFresh(items, timestamp, now);
      return isFresh
        ? {
            ...current,
            summary: {
              ...initialPopupSnapshot().summary,
              phase: "ready",
              items,
              timestamp,
            },
          }
        : { ...current, summary: { ...initialPopupSnapshot().summary } };
    }
    case "API_VERIFY_START":
      return {
        ...current,
        api: { status: action.hasKey ? "verifying" : "missing", token: action.token },
      };
    case "API_VERIFY_RESULT":
      return action.token === current.api.token
        ? { ...current, api: { status: action.valid ? "valid" : "invalid", token: action.token } }
        : current;
    case "VIDEO_CONTEXT_REQUEST":
      return { ...current, video: { ...current.video, available: null, token: action.token } };
    case "VIDEO_CONTEXT_RESULT":
      return action.token === current.video.token
        ? { ...current, video: { ...current.video, available: Boolean(action.available) } }
        : current;
    case "VIDEO_TOGGLE":
      return { ...current, video: { ...current.video, enabled: Boolean(action.enabled) } };
    case "DELETE_ENTER":
      return action.source === "history" || action.source === "favorite"
        ? { ...current, deleteMode: { source: action.source, selectedValues: [] } }
        : current;
    case "DELETE_TOGGLE": {
      if (!current.deleteMode.source) return current;
      const selected = new Set(current.deleteMode.selectedValues);
      selected.has(action.value) ? selected.delete(action.value) : selected.add(action.value);
      return {
        ...current,
        deleteMode: { ...current.deleteMode, selectedValues: Array.from(selected) },
      };
    }
    case "DELETE_TOGGLE_ALL": {
      if (!current.deleteMode.source) return current;
      const values = stringList(action.values);
      const allSelected =
        values.length > 0 && values.every((v) => current.deleteMode.selectedValues.includes(v));
      return {
        ...current,
        deleteMode: { ...current.deleteMode, selectedValues: allSelected ? [] : values },
      };
    }
    case "DELETE_CANCEL":
      return { ...current, deleteMode: { source: null, selectedValues: [] } };
    case "ONBOARDING_DEMO_SET":
      return {
        ...current,
        onboarding: { ...current.onboarding, demoHistoryVisible: Boolean(action.visible) },
      };
    default:
      return current;
  }
}

class State {
  constructor() {
    this.snapshot = initialPopupSnapshot();
    this.listeners = new Set();

    // State not owned by tab reducer
    this.paymentStage = null;
    this.previousWidth = 0;
    this.previousHeight = 0;
    this.summarizedTabId = undefined;
  }

  getSnapshot() {
    return this.snapshot;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispatch(action) {
    const next = reducePopupState(this.snapshot, action);
    if (next !== this.snapshot) {
      this.snapshot = next;
      this.listeners.forEach((listener) => listener(next, action));
    }
    return this.snapshot;
  }

  buildSearchUrl(q) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "buildSearchUrl", query: q }, (response) =>
        resolve(response?.url)
      );
    });
  }

  buildDirectionsUrl(origin, destination) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: "buildDirectionsUrl", origin, destination },
        (response) => resolve(response?.url)
      );
    });
  }

  buildMapsButtonUrl() {
    chrome.runtime.sendMessage({ action: "buildMapsUrl" }, (response) => {
      if (response && response.url) mapsButton.href = response.url;
    });
  }

  updateDimensions(width, height) {
    this.previousWidth = width;
    this.previousHeight = height;
  }
}

State.reduce = reducePopupState;
State.initialSnapshot = initialPopupSnapshot;
State.SUMMARY_TTL_MS = SUMMARY_TTL_MS;
State.isSummaryFresh = isSummaryFresh;

if (typeof module !== "undefined" && module.exports) {
  module.exports = State;
}
