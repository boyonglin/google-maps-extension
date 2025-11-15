"use strict";
class Payment {
    checkPay() {
        chrome.runtime.sendMessage({ action: "checkPay" }, (response) => {
            if (!response || !response.result) {
                return;
            }
            state.paymentStage = response.result;
            this.updateShortcutDisplay();
            this.updateNoteDisplay();
        });
    }
    updateShortcutDisplay() {
        if (state.paymentStage && (state.paymentStage.isTrial || state.paymentStage.isPremium)) {
            Array.from(shortcutTip).forEach((element) => {
                element.classList.remove("premium-only");
            });
        }
    }
    updateNoteDisplay() {
        if (!state.paymentStage)
            return;
        if (state.paymentStage.isFirst) {
            premiumNoteElement.innerHTML = chrome.i18n.getMessage("firstNote");
        }
        else if (state.paymentStage.isTrial) {
            const trialEndOn = this.calcTrialEndDate(state.paymentStage.trialEnd);
            paymentSpan.innerHTML = chrome.i18n.getMessage("trialNote", trialEndOn);
            premiumNoteElement.innerHTML = chrome.i18n.getMessage("remindNote");
            modal.text2Modal("premiumNote", "Gemini AI", "apiModal");
            modal.text2Modal("premiumNote", "Alt+S / ⌥+S", "tipsModal");
        }
        else if (state.paymentStage.isPremium) {
            const feedbackUrl = "https://forms.fillout.com/t/dFSEkAwKYKus";
            premiumNoteElement.innerHTML = chrome.i18n.getMessage("premiumNote");
            modal.text2Link("premiumNote", "回饋", feedbackUrl);
            modal.text2Link("premiumNote", "feedback", feedbackUrl);
            modal.text2Link("premiumNote", "フィードバック", feedbackUrl);
        }
        else if (state.paymentStage.isFree) {
            premiumNoteElement.innerHTML = chrome.i18n.getMessage("freeNote");
            modal.text2Link("premiumNote", "ExtensionPay", "https://extensionpay.com/");
        }
    }
    calcTrialEndDate(timestamp) {
        const date = new Date(timestamp);
        const shortDate = date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
        const time = date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
        return `${shortDate}, ${time}`;
    }
}
// CommonJS export for tests
if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
    module.exports = Payment;
}
