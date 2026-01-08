/**
 * Comprehensive Jest Unit Tests for Payment Component (payment.js)
 *
 * Tests cover:
 * - checkPay() - Payment status checking with chrome.runtime.sendMessage
 * - updateShortcutDisplay() - UI updates based on payment stage
 * - updateNoteDisplay() - Dynamic note content based on payment stage (isFirst, isTrial, isPremium, isFree)
 * - calcTrialEndDate() - Date formatting logic
 */

// Mock global objects that payment.js depends on
global.state = {
  paymentStage: null,
};

global.modal = {
  text2Modal: jest.fn(),
  text2Link: jest.fn(),
};

// Load the module
const Payment = require("../Package/dist/utils/payment.js");
const { mockI18n, cleanupDOM, wait } = require("./testHelpers");

describe("Payment Component - Full Coverage", () => {
  let paymentInstance;
  let shortcutTip, premiumNoteElement, paymentSpan;

  // Constants
  const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 86400000 milliseconds

  beforeEach(() => {
    // Setup DOM elements
    document.body.innerHTML = `
            <div class="premium-only shortcut-1">Shortcut 1</div>
            <div class="premium-only shortcut-2">Shortcut 2</div>
            <div class="premium-only shortcut-3">Shortcut 3</div>
            <p data-locale="premiumNote" id="premiumNoteElement"></p>
            <button id="paymentButton">
                <span id="paymentSpan"></span>
            </button>
        `;

    // Assign global references
    global.shortcutTip = shortcutTip = document.getElementsByClassName("premium-only");
    global.premiumNoteElement = premiumNoteElement = document.querySelector(
      'p[data-locale="premiumNote"]'
    );
    global.paymentSpan = paymentSpan = document.querySelector("#paymentButton > span");

    // Mock i18n messages
    mockI18n({
      firstNote: "Welcome! This is your first time.",
      trialNote: "Trial ends on $1",
      remindNote: "Enjoy premium features during trial!",
      premiumNote: "Thank you for being a premium user! 回饋 feedback フィードバック",
      freeNote: "Upgrade to premium via ExtensionPay",
    });

    // Reset state and mocks
    global.state.paymentStage = null;
    global.modal.text2Modal.mockClear();
    global.modal.text2Link.mockClear();

    // Create fresh instance
    paymentInstance = new Payment();
  });

  afterEach(() => {
    // Cleanup globals
    delete global.shortcutTip;
    delete global.premiumNoteElement;
    delete global.paymentSpan;
    cleanupDOM();
  });

  // ============================================================================
  // Test: checkPay
  // ============================================================================

  describe("checkPay", () => {
    test("should send checkPay message and update state", () => {
      const mockPaymentStage = {
        isFirst: false,
        isTrial: true,
        isPremium: false,
        isFree: false,
        trialEnd: Date.now() + ONE_DAY_MS, // 1 day from now
      };

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ result: mockPaymentStage });
      });

      // Spy on the instance methods
      const updateShortcutSpy = jest.spyOn(paymentInstance, "updateShortcutDisplay");
      const updateNoteSpy = jest.spyOn(paymentInstance, "updateNoteDisplay");

      paymentInstance.checkPay();

      // Verify sendMessage was called correctly
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: "checkPay" },
        expect.any(Function)
      );

      // Verify state was updated
      expect(global.state.paymentStage).toEqual(mockPaymentStage);

      // Verify display methods were called
      expect(updateShortcutSpy).toHaveBeenCalled();
      expect(updateNoteSpy).toHaveBeenCalled();
    });

    test("should handle response without result", () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({});
      });

      // Spy on the instance methods
      const updateShortcutSpy = jest.spyOn(paymentInstance, "updateShortcutDisplay");
      const updateNoteSpy = jest.spyOn(paymentInstance, "updateNoteDisplay");

      paymentInstance.checkPay();

      // When response.result is undefined, the early return prevents execution
      // State remains as it was (null from beforeEach)
      expect(global.state.paymentStage).toBeNull();

      // Methods should NOT be called due to early return in checkPay
      expect(updateShortcutSpy).not.toHaveBeenCalled();
      expect(updateNoteSpy).not.toHaveBeenCalled();
    });

    test("should handle null response", () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback(null);
      });

      // Spy on the instance methods
      const updateShortcutSpy = jest.spyOn(paymentInstance, "updateShortcutDisplay");
      const updateNoteSpy = jest.spyOn(paymentInstance, "updateNoteDisplay");

      // Should not throw (BUG FIX: we added null check in payment.js)
      expect(() => paymentInstance.checkPay()).not.toThrow();

      // Methods should NOT be called due to early return
      expect(updateShortcutSpy).not.toHaveBeenCalled();
      expect(updateNoteSpy).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Test: updateShortcutDisplay
  // ============================================================================

  describe("updateShortcutDisplay", () => {
    test("should remove premium-only class for trial users", () => {
      global.state.paymentStage = {
        isTrial: true,
        isPremium: false,
      };

      // Verify initial state - all elements should have premium-only
      Array.from(global.shortcutTip).forEach((element) => {
        expect(element.classList.contains("premium-only")).toBe(true);
      });

      paymentInstance.updateShortcutDisplay();

      // Verify premium-only class is removed from all elements
      Array.from(global.shortcutTip).forEach((element) => {
        expect(element.classList.contains("premium-only")).toBe(false);
      });
    });

    test("should remove premium-only class for premium users", () => {
      global.state.paymentStage = {
        isTrial: false,
        isPremium: true,
      };

      paymentInstance.updateShortcutDisplay();

      Array.from(global.shortcutTip).forEach((element) => {
        expect(element.classList.contains("premium-only")).toBe(false);
      });
    });

    test("should keep premium-only class for free users", () => {
      global.state.paymentStage = {
        isTrial: false,
        isPremium: false,
        isFree: true,
      };

      paymentInstance.updateShortcutDisplay();

      // Class should remain
      Array.from(global.shortcutTip).forEach((element) => {
        expect(element.classList.contains("premium-only")).toBe(true);
      });
    });

    test("should keep premium-only class for first-time users", () => {
      global.state.paymentStage = {
        isFirst: true,
        isTrial: false,
        isPremium: false,
      };

      paymentInstance.updateShortcutDisplay();

      Array.from(global.shortcutTip).forEach((element) => {
        expect(element.classList.contains("premium-only")).toBe(true);
      });
    });

    test("should remove premium-only class when both trial and premium are true", () => {
      global.state.paymentStage = { isTrial: true, isPremium: true };
      paymentInstance.updateShortcutDisplay();
      Array.from(shortcutTip).forEach((element) => {
        expect(element.classList.contains("premium-only")).toBe(false);
      });
    });
  });

  // ============================================================================
  // Test: updateNoteDisplay
  // ============================================================================

  describe("updateNoteDisplay - isFirst", () => {
    test("should display first-time user note", () => {
      global.state.paymentStage = {
        isFirst: true,
        isTrial: false,
        isPremium: false,
        isFree: false,
      };

      paymentInstance.updateNoteDisplay();

      expect(global.premiumNoteElement.innerHTML).toBe("Welcome! This is your first time.");

      // Should not call modal methods for first-time users
      expect(global.modal.text2Modal).not.toHaveBeenCalled();
      expect(global.modal.text2Link).not.toHaveBeenCalled();
    });
  });

  describe("updateNoteDisplay - isTrial", () => {
    test("should display trial note with end date and modal links", () => {
      const trialEndTimestamp = new Date("2025-11-15T14:30:00").getTime();
      global.state.paymentStage = { isTrial: true, trialEnd: trialEndTimestamp };

      paymentInstance.updateNoteDisplay();

      const expectedDate = paymentInstance.calcTrialEndDate(trialEndTimestamp);
      expect(paymentSpan.innerHTML).toContain(expectedDate);
      expect(premiumNoteElement.innerHTML).toBe("Enjoy premium features during trial!");
      expect(global.modal.text2Modal).toHaveBeenCalledWith("premiumNote", "Gemini AI", "apiModal");
      expect(global.modal.text2Modal).toHaveBeenCalledWith(
        "premiumNote",
        "Alt+S / ⌥+S",
        "tipsModal"
      );
      expect(global.modal.text2Modal).toHaveBeenCalledTimes(2);
    });
  });

  describe("updateNoteDisplay - isPremium", () => {
    test("should display premium note with multilingual feedback links", () => {
      global.state.paymentStage = { isPremium: true };
      const feedbackUrl = "https://forms.fillout.com/t/dFSEkAwKYKus";

      paymentInstance.updateNoteDisplay();

      expect(premiumNoteElement.innerHTML).toBe(
        "Thank you for being a premium user! 回饋 feedback フィードバック"
      );
      expect(global.modal.text2Link).toHaveBeenCalledWith("premiumNote", "回饋", feedbackUrl);
      expect(global.modal.text2Link).toHaveBeenCalledWith("premiumNote", "feedback", feedbackUrl);
      expect(global.modal.text2Link).toHaveBeenCalledWith(
        "premiumNote",
        "フィードバック",
        feedbackUrl
      );
      expect(global.modal.text2Link).toHaveBeenCalledTimes(3);
    });
  });

  describe("updateNoteDisplay - isFree", () => {
    test("should display free user note with ExtensionPay link", () => {
      global.state.paymentStage = { isFree: true };

      paymentInstance.updateNoteDisplay();

      expect(premiumNoteElement.innerHTML).toBe("Upgrade to premium via ExtensionPay");
      expect(global.modal.text2Link).toHaveBeenCalledWith(
        "premiumNote",
        "ExtensionPay",
        "https://extensionpay.com/"
      );
      expect(global.modal.text2Link).toHaveBeenCalledTimes(1);
    });
  });

  describe("updateNoteDisplay - Priority Testing", () => {
    test("should prioritize isFirst > isTrial > isPremium > isFree", () => {
      // Test if-else precedence: isFirst wins
      global.state.paymentStage = { isFirst: true, isTrial: true, isPremium: true, isFree: true };
      paymentInstance.updateNoteDisplay();
      expect(premiumNoteElement.innerHTML).toBe("Welcome! This is your first time.");

      // isTrial wins when isFirst is false
      global.state.paymentStage = {
        isTrial: true,
        isPremium: true,
        isFree: true,
        trialEnd: Date.now(),
      };
      paymentInstance.updateNoteDisplay();
      expect(global.modal.text2Modal).toHaveBeenCalled();

      // isPremium wins when isFirst and isTrial are false
      global.modal.text2Link.mockClear();
      global.state.paymentStage = { isPremium: true, isFree: true };
      paymentInstance.updateNoteDisplay();
      expect(global.modal.text2Link).toHaveBeenCalledTimes(3);
    });

    test("should handle all flags false gracefully", () => {
      global.state.paymentStage = {
        isFirst: false,
        isTrial: false,
        isPremium: false,
        isFree: false,
      };
      expect(() => paymentInstance.updateNoteDisplay()).not.toThrow();
      expect(global.modal.text2Modal).not.toHaveBeenCalled();
      expect(global.modal.text2Link).not.toHaveBeenCalled();
    });
  });

  describe("updateNoteDisplay - Edge Cases", () => {
    test("should handle missing trialEnd during trial", () => {
      global.state.paymentStage = { isTrial: true }; // trialEnd undefined
      expect(() => paymentInstance.updateNoteDisplay()).not.toThrow();
    });
  });

  // ============================================================================
  // Test: calcTrialEndDate
  // ============================================================================

  describe("calcTrialEndDate", () => {
    test("should format date in US locale with 24-hour time", () => {
      expect(paymentInstance.calcTrialEndDate(new Date("2025-11-15T14:30:00").getTime())).toMatch(
        /Nov 15, 14:30/
      );
      expect(paymentInstance.calcTrialEndDate(new Date("2025-01-05T08:15:00").getTime())).toMatch(
        /Jan 5, 08:15/
      );
      expect(paymentInstance.calcTrialEndDate(new Date("2025-03-10T14:00:00").getTime())).toContain(
        "14:00"
      );
    });

    test("should handle edge case timestamps", () => {
      // Midnight (timezone dependent: 00:00 or 24:00)
      expect(paymentInstance.calcTrialEndDate(new Date("2025-12-25T00:00:00").getTime())).toMatch(
        /Dec 25, (00:00|24:00)/
      );

      // Unix epoch
      expect(paymentInstance.calcTrialEndDate(0)).toMatch(/Jan 1, \d{2}:\d{2}/);

      // Invalid
      expect(paymentInstance.calcTrialEndDate(NaN)).toContain("Invalid Date");
    });

    test("should pad minutes and maintain consistent format", () => {
      const result = paymentInstance.calcTrialEndDate(new Date("2025-05-10T10:05:00").getTime());
      expect(result).toMatch(/^\w{3} \d{1,2}, \d{2}:\d{2}$/); // Format: "May 10, 10:05"
      expect(result).toContain(":05"); // Minutes padded
    });

    test("should be deterministic for same timestamp", () => {
      const timestamp = new Date("2025-07-04T12:00:00").getTime();
      expect(paymentInstance.calcTrialEndDate(timestamp)).toBe(
        paymentInstance.calcTrialEndDate(timestamp)
      );
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe("Integration - Full Payment Flow", () => {
    test("should handle trial user flow: unlock shortcuts and show trial note", () => {
      const trialEndTimestamp = Date.now() + ONE_DAY_MS;
      chrome.runtime.sendMessage.mockImplementation((msg, cb) =>
        cb({ result: { isTrial: true, trialEnd: trialEndTimestamp } })
      );

      paymentInstance.checkPay();

      expect(global.state.paymentStage.isTrial).toBe(true);
      Array.from(shortcutTip).forEach((el) =>
        expect(el.classList.contains("premium-only")).toBe(false)
      );
      expect(paymentSpan.innerHTML).toBeTruthy();
      expect(global.modal.text2Modal).toHaveBeenCalledTimes(2);
    });

    test("should handle premium user flow: unlock shortcuts and show feedback links", () => {
      chrome.runtime.sendMessage.mockImplementation((msg, cb) =>
        cb({ result: { isPremium: true } })
      );

      paymentInstance.checkPay();

      expect(global.state.paymentStage.isPremium).toBe(true);
      Array.from(shortcutTip).forEach((el) =>
        expect(el.classList.contains("premium-only")).toBe(false)
      );
      expect(global.modal.text2Link).toHaveBeenCalledTimes(3);
    });

    test("should handle free user flow: keep shortcuts locked", () => {
      chrome.runtime.sendMessage.mockImplementation((msg, cb) => cb({ result: { isFree: true } }));

      paymentInstance.checkPay();

      Array.from(shortcutTip).forEach((el) =>
        expect(el.classList.contains("premium-only")).toBe(true)
      );
      expect(global.modal.text2Link).toHaveBeenCalledWith(
        "premiumNote",
        "ExtensionPay",
        "https://extensionpay.com/"
      );
    });

    test("should handle rapid successive calls without errors", async () => {
      chrome.runtime.sendMessage.mockImplementation((msg, cb) =>
        setTimeout(() => cb({ result: { isPremium: true } }), 10)
      );

      paymentInstance.checkPay();
      paymentInstance.checkPay();
      paymentInstance.checkPay();

      await wait(50);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(3);
    });
  });

  // ============================================================================
  // Constructor and Error Handling
  // ============================================================================

  describe("Constructor and Error Handling", () => {
    test("should create instance with all required methods", () => {
      expect(paymentInstance).toBeInstanceOf(Payment);
      ["checkPay", "updateShortcutDisplay", "updateNoteDisplay", "calcTrialEndDate"].forEach(
        (method) => {
          expect(typeof paymentInstance[method]).toBe("function");
        }
      );
    });

    test("should handle runtime errors gracefully", () => {
      // Null response from chrome.runtime.sendMessage
      chrome.runtime.sendMessage.mockImplementation((msg, cb) => cb(null));
      const spy1 = jest.spyOn(paymentInstance, "updateShortcutDisplay");
      const spy2 = jest.spyOn(paymentInstance, "updateNoteDisplay");

      expect(() => paymentInstance.checkPay()).not.toThrow();
      expect(spy1).not.toHaveBeenCalled(); // Early return prevents call
      expect(spy2).not.toHaveBeenCalled();

      // Empty shortcut collection
      const original = global.shortcutTip;
      global.shortcutTip = [];
      global.state.paymentStage = { isTrial: true };
      expect(() => paymentInstance.updateShortcutDisplay()).not.toThrow();
      global.shortcutTip = original;
    });

    test("should throw when DOM elements are missing", () => {
      const origNote = global.premiumNoteElement;
      const origSpan = global.paymentSpan;

      global.premiumNoteElement = null;
      global.state.paymentStage = { isFirst: true };
      expect(() => paymentInstance.updateNoteDisplay()).toThrow();

      global.premiumNoteElement = origNote;
      global.paymentSpan = null;
      global.state.paymentStage = { isTrial: true, trialEnd: Date.now() };
      expect(() => paymentInstance.updateNoteDisplay()).toThrow();

      global.paymentSpan = origSpan;
    });
  });
});
