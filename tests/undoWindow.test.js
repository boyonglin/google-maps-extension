/**
 * Jest Unit Tests for UndoWindow (undoWindow.js)
 * Tests for the shared undo-countdown helper used by History/Gemini
 */

const UndoWindow = require("../Package/dist/utils/undoWindow.js");

describe("UndoWindow", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("should have no pending payload before start() is called", () => {
    const undoWindow = new UndoWindow(jest.fn());
    expect(undoWindow.pending).toBeNull();
  });

  test("should expose the payload passed to start()", () => {
    const undoWindow = new UndoWindow(jest.fn());
    undoWindow.start(["Tokyo", "Paris"]);
    expect(undoWindow.pending).toEqual(["Tokyo", "Paris"]);
  });

  test("should call onExpire and clear pending after 6 seconds without consume()", () => {
    const onExpire = jest.fn();
    const undoWindow = new UndoWindow(onExpire);
    undoWindow.start(["Tokyo"]);

    jest.advanceTimersByTime(6000);

    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(undoWindow.pending).toBeNull();
  });

  test("should not call onExpire before 6 seconds have elapsed", () => {
    const onExpire = jest.fn();
    const undoWindow = new UndoWindow(onExpire);
    undoWindow.start(["Tokyo"]);

    jest.advanceTimersByTime(5999);

    expect(onExpire).not.toHaveBeenCalled();
    expect(undoWindow.pending).toEqual(["Tokyo"]);
  });

  test("consume() should return the pending payload and clear it", () => {
    const undoWindow = new UndoWindow(jest.fn());
    undoWindow.start(["Tokyo"]);

    const result = undoWindow.consume();

    expect(result).toEqual(["Tokyo"]);
    expect(undoWindow.pending).toBeNull();
  });

  test("consume() should return null when nothing is pending", () => {
    const undoWindow = new UndoWindow(jest.fn());
    expect(undoWindow.consume()).toBeNull();
  });

  test("consume() should prevent the timer from firing onExpire afterward", () => {
    const onExpire = jest.fn();
    const undoWindow = new UndoWindow(onExpire);
    undoWindow.start(["Tokyo"]);

    undoWindow.consume();
    jest.advanceTimersByTime(6000);

    expect(onExpire).not.toHaveBeenCalled();
  });

  test("start() called again before expiry should reset the 6-second countdown", () => {
    const onExpire = jest.fn();
    const undoWindow = new UndoWindow(onExpire);
    undoWindow.start(["Tokyo"]);

    jest.advanceTimersByTime(5000);
    undoWindow.start(["Osaka"]);
    jest.advanceTimersByTime(5000);

    // Only 5s have elapsed since the second start(), so it should not have expired yet.
    expect(onExpire).not.toHaveBeenCalled();
    expect(undoWindow.pending).toEqual(["Osaka"]);

    jest.advanceTimersByTime(1000);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });
});
