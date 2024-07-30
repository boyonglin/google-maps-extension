// Track messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.action === "getSelectedText") {
    // Get the selected text from the webpage
    const selectedText = window.getSelection().toString();
    sendResponse({ selectedText });
  }
});

// Inject Active Tab Content
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getContent") {
    function getContent() {
      const titleElement = document.querySelector("head > title");
      const titleText = titleElement ? titleElement.innerText : "";
      const titleHtml = `<title>${titleText}</title>`;

      const h1Elements = document.querySelectorAll("h1");
      const h1Html = Array.from(h1Elements).map(h1 => `<h1>${h1.innerText}</h1>`).join("");

      // Get the summary subject (title or h1)
      const summarySubject = titleHtml || h1Html;

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

      let bodyTextWithoutHeaderFooter = bodyText;

      if (headerText) {
        const headerRegex = new RegExp(escapeRegExp(headerText), "g");
        bodyTextWithoutHeaderFooter = bodyTextWithoutHeaderFooter.replace(headerRegex, "").trim();
      }

      if (footerText) {
        const footerRegex = new RegExp(escapeRegExp(footerText), "g");
        bodyTextWithoutHeaderFooter = bodyTextWithoutHeaderFooter.replace(footerRegex, "").trim();
      }

      return summarySubject + bodyTextWithoutHeaderFooter;
    }

    const content = getContent();
    const contentLength = content.length;
    sendResponse({ content: content, length: contentLength });
  }
});
