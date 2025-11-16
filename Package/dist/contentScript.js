// Track tab messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!request) {
        return;
    }
    // Get the selected text from the webpage
    if (request.action === "getSelectedText") {
        const selectedText = window.getSelection().toString();
        sendResponse({ selectedText });
    }
    // Inject Active Tab Content
    if (request.action === "getContent") {
        const content = getContent();
        const contentLength = content.length;
        sendResponse({ content: content, length: contentLength });
    }
    if (request.action === "attachMapLink" && request.content) {
        globalThis.attachMapLinkToPage(request);
    }
    // Check the connection between the background and the content script
    if (request.message === "ping") {
        sendResponse({ status: "connected" });
    }
    // Expand YouTube description if available
    if (request.action === "expandYouTubeDescription") {
        try {
            // Look for the expand button with the specific selector
            const expandButton = document.querySelector("tp-yt-paper-button#expand.button.style-scope.ytd-text-inline-expander");
            if (expandButton && expandButton.getAttribute("aria-disabled") !== "true") {
                // Click the expand button
                expandButton.click();
                sendResponse({ expanded: true });
            }
            else {
                // Try alternative selectors for different YouTube layouts
                const altExpandButton = document.querySelector('ytd-text-inline-expander tp-yt-paper-button[id="expand"]') ||
                    document.querySelector('#expand.ytd-text-inline-expander') ||
                    document.querySelector('button[aria-label*="more"]') ||
                    document.querySelector('button[aria-label*="Show more"]');
                if (altExpandButton && altExpandButton.getAttribute("aria-disabled") !== "true") {
                    altExpandButton.click();
                    sendResponse({ expanded: true });
                }
                else {
                    sendResponse({ expanded: false, message: "No expand button found" });
                }
            }
        }
        catch (error) {
            sendResponse({ expanded: false, error: error.message });
        }
        return true; // Keep message channel open for async response
    }
    if (request.action === "updateIframeSize") {
        let iframeContainer = document.getElementById("TMEiframe");
        if (iframeContainer) {
            iframeContainer.style.width = (request.width + 2) + "px";
            iframeContainer.style.height = (request.height + 32 + 3) + "px"; // 32px for the draggable bar, 3px for the border
        }
    }
    if (request.action === "finishIframe") {
        let iframeContainer = document.getElementById("TMEiframe");
        if (iframeContainer) {
            iframeContainer.style.opacity = "1";
            iframeContainer.style.transition = "width 0.3s ease-in-out, height 0.3s ease-in-out";
        }
    }
    if (request.action === "consoleQuote" && request.stage) {
        const quotes = {
            first: '"Er — hello," — Harry Potter',
            trial: '"Do enjoy yourself, won’t you? While you can." — Lucius Malfoy',
            payment: '"Useful little treasure detectors," — Rubeus Hagrid',
            premium: '"Where your treasure is, there will your heart be also." — upon the frozen, lichen-spotted granite',
            free: '"Well, their main job is to keep it from the Muggles that there’s still witches an’ wizards up an’ down the country." — Ministry of Magic',
            missing: '"Is there anything missing?" “Riddle’s API’s gone,” — Harry Potter'
        };
        const quote = quotes[request.stage];
        if (quote) {
            console.log(quote);
        }
    }
});
// Get plain text from an element (visible text || including hidden text)
function getTextContent(element) {
    if (!element)
        return "";
    return element.innerText || element.textContent;
}
// Remove header and footer text from bodyText
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function getContent() {
    // Get the summary topic
    const titleElement = document.querySelector("head > title");
    const titleText = getTextContent(titleElement);
    const summaryTopic = `Page's main topic: <title>${titleText}</title>`;
    const headerElement = document.querySelector("header");
    const footerElement = document.querySelector("footer");
    const headerText = getTextContent(headerElement);
    const footerText = getTextContent(footerElement);
    const bodyText = getTextContent(document.body);
    let bodyElement = bodyText;
    if (headerText) {
        const headerRegex = new RegExp(escapeRegExp(headerText), "g");
        bodyElement = bodyElement.replace(headerRegex, "").trim();
    }
    if (footerText) {
        const footerRegex = new RegExp(escapeRegExp(footerText), "g");
        bodyElement = bodyElement.replace(footerRegex, "").trim();
    }
    // Preserved <h1>, <h2>, <h3>, and <strong> tags
    function wrapTag(tag) {
        const elements = document.querySelectorAll(tag);
        elements.forEach(element => {
            const elementText = getTextContent(element);
            const text = `<${tag}>${elementText}</${tag}>`;
            bodyElement = bodyElement.replace(elementText, text);
        });
    }
    ["h1", "h2", "h3", "strong"].forEach(tag => wrapTag(tag));
    return summaryTopic + `\n\nPage body content: ` + bodyElement;
}
//# sourceMappingURL=contentScript.js.map