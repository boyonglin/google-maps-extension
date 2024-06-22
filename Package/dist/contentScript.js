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
    function getContentPreserveH1() {
      // Get all <h1> elements
      const h1Elements = document.querySelectorAll('h1');
      const h1Html = Array.from(h1Elements).map(h1 => `<h1>${h1.textContent}</h1>`).join('');

      // Remove the footer element if it exists
      const footer = document.querySelector('footer');
      if (footer) {
        footer.remove();
      }

      // Get the plain text of the body
      const bodyText = document.body.innerText || document.body.textContent;

      return h1Html + bodyText;
    }

    const content = getContentPreserveH1();
    const contentLength = content.length;
    sendResponse({ content: content, length: contentLength });
  }
});
