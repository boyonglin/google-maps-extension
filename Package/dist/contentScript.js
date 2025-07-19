// Track tab messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Get the selected text from the webpage
  if (request && request.action === "getSelectedText") {
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
    let candidates = request.content.split("\n").map(item => item.trim()).filter(item => item !== "");

    function attachMapLink(element) {
      // Skip if the element already contains a map link or a YouTube-formatted string
      if (element.innerHTML.includes('href="https://www.google.com/maps?q=') ||
        element.querySelector("yt-formatted-string") ||
        element.classList.contains("ytd-compact-video-renderer")) {
        return;
      }

      candidates.forEach(candidate => {
        const searchUrl = `https://www.google.com/maps?q=${encodeURIComponent(candidate)}`;
        const linkHtml = `<a href="${searchUrl}" target="_blank" style="text-decoration: none; border: 0px;">📌</a>`;

        const parts = candidate.split(/\s{4,}/);
        let candidateName = parts[0];
        let hasReplaced = false;

        // Replace only the first instance of the candidate name with itself followed by the link emoji
        element.innerHTML = element.innerHTML.replace(new RegExp(candidateName, "g"), (match) => {
          if (!hasReplaced) {
            hasReplaced = true;
            return `${match}${linkHtml}`;
          }
          return match;
        });
      });
    }

    ["h1", "h2", "h3", "strong", "p"].forEach(tag => {
      document.querySelectorAll(tag).forEach(element => {
        attachMapLink(element);
      });
    });

    // Special case for YouTube video descriptions
    const inlineExpander = document.querySelector("div#description ytd-text-inline-expander yt-attributed-string");
    if (inlineExpander) {
      const spanElements = inlineExpander.querySelectorAll("span");
      spanElements.forEach(element => {
        attachMapLink(element);
      });
    }
  }

  // Check the connection between the background and the content script
  if (request.message === "ping") {
    sendResponse({ status: "connected" });
  }

  // Expand YouTube description if available
  if (request.action === "expandYouTubeDescription") {
    try {
      // Look for the expand button with the specific selector
      const expandButton = document.querySelector('tp-yt-paper-button#expand.button.style-scope.ytd-text-inline-expander');

      if (expandButton && expandButton.getAttribute('aria-disabled') !== 'true') {
        // Click the expand button
        expandButton.click();
        sendResponse({ expanded: true });
      } else {
        // Try alternative selectors for different YouTube layouts
        const altExpandButton = document.querySelector('ytd-text-inline-expander tp-yt-paper-button[id="expand"]') ||
          document.querySelector('#expand.ytd-text-inline-expander') ||
          document.querySelector('button[aria-label*="more"]') ||
          document.querySelector('button[aria-label*="Show more"]');

        if (altExpandButton) {
          altExpandButton.click();
          sendResponse({ expanded: true });
        } else {
          sendResponse({ expanded: false, message: "No expand button found" });
        }
      }
    } catch (error) {
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
    iframeContainer.style.opacity = "1";
    iframeContainer.style.transition = 'width 0.3s ease-in-out, height 0.3s ease-in-out';
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

function getContent() {
  // Get the summary topic
  const titleElement = document.querySelector("head > title");
  const titleText = titleElement ? titleElement.innerText : "";
  const summaryTopic = `Page's main topic: <title>${titleText}</title>`;

  // Get the plain text of the body (visible text || including hidden text)
  const bodyText = document.body.innerText || document.body.textContent;

  const headerElement = document.querySelector("header");
  const footerElement = document.querySelector("footer");
  const headerText = headerElement ? headerElement.innerText : "";
  const footerText = footerElement ? footerElement.innerText : "";

  // Remove header and footer text from bodyText
  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

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
      const text = `<${tag}>${element.innerText}</${tag}>`;
      bodyElement = bodyElement.replace(element.innerText, text);
    });
  }

  ["h1", "h2", "h3", "strong"].forEach(tag => wrapTag(tag));

  return summaryTopic + `\n\nPage body content: ` + bodyElement;
}