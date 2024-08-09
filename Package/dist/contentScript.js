// Track tab messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  // Get the selected text from the webpage
  if (request && request.action === "getSelectedText") {
    const selectedText = window.getSelection().toString();
    sendResponse({ selectedText });
  }

  // Inject Active Tab Content
  if (request.action === "getContent") {
    function getContent() {
      const titleElement = document.querySelector("head > title");
      const titleText = titleElement ? titleElement.innerText : "";
      const titleHtml = `<title>${titleText}</title>`;

      const h1Elements = document.querySelectorAll("h1");
      const h1Html = Array.from(h1Elements).map(h1 => `<h1>${h1.innerText}</h1>`).join("");

      // Get the summary subject (title or h1)
      const summarySubject = titleHtml + h1Html;

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

  // Check the connection between the background and the content
  if (request.message === "ping") {
    sendResponse({ status: "connected" });
  }

  const defaultX = window.innerWidth - 500;
  const defaultY = 60;

  if (request.action === "injectIframe") {
    let iframeContainer = document.getElementById("TMEiframe");
    if (!iframeContainer) {
      // Create the iframe elements
      iframeContainer = document.createElement("div");
      iframeContainer.id = "TMEiframe";

      const draggableBar = document.createElement("div");
      draggableBar.id = "TMEdrag";

      const linesContainer = document.createElement("div");
      linesContainer.id = "TMElines";

      for (let i = 0; i < 6; i++) {
        const line = document.createElement("div");
        linesContainer.appendChild(line);
      }

      const closeButton = document.createElement("button");
      closeButton.id = "TMEeject";

      // x.svg from Bootstrap Icons
      closeButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x" viewBox="0 0 16 16">
        <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
      </svg>
      `;

      closeButton.addEventListener("click", () => {
        iframeContainer.remove();
        chrome.runtime.sendMessage({ type: "iframeRemoved" });
      });

      draggableBar.appendChild(linesContainer);
      draggableBar.appendChild(closeButton);

      const iframe = document.createElement("iframe");
      iframe.id = "TMEmain";
      iframe.src = chrome.runtime.getURL("../popup.html");

      // Append the iframe elements
      iframeContainer.appendChild(draggableBar);
      iframeContainer.appendChild(iframe);
      document.body.appendChild(iframeContainer);

      // Make the iframe draggable
      draggableBar.onmousedown = function (event) {
        event.preventDefault();
        const shiftX = event.clientX - iframeContainer.getBoundingClientRect().left;
        const shiftY = event.clientY - iframeContainer.getBoundingClientRect().top;

        document.onmousemove = function (event) {
          iframeContainer.style.left = event.clientX - shiftX + "px";
          iframeContainer.style.top = event.clientY - shiftY + "px";
        };

        document.onmouseup = function () {
          document.onmousemove = null;
          document.onmouseup = null;

          const newX = iframeContainer.getBoundingClientRect().left;
          const newY = iframeContainer.getBoundingClientRect().top;
          chrome.storage.local.set({ iframeCoords: { x: newX, y: newY } });
        };
      };

      draggableBar.ondragstart = function () {
        return false;
      };

      iframe.onload = function () {
        chrome.storage.local.set({ iframeCoords: { x: defaultX, y: defaultY } });
        chrome.runtime.sendMessage({ type: "iframeLoaded" });
      };
    }
  }

  if (request.action === "removeIframe") {
    let iframeContainer = document.getElementById("TMEiframe");
    if (iframeContainer) {
      iframeContainer.remove();
      chrome.runtime.sendMessage({ type: "iframeRemoved" });
    }
  }

  if (request.action === "updateIframeSize") {
    let iframeContainer = document.getElementById("TMEiframe");

    chrome.storage.local.get("iframeCoords", (result) => {
      let coords = result.iframeCoords || { x: defaultX, y: defaultY };

      if (iframeContainer) {
        iframeContainer.style.left = coords.x + "px";
        iframeContainer.style.top = coords.y + "px";
        iframeContainer.style.width = (request.width + 2) + "px";
        iframeContainer.style.height = (request.height + 32 + 3) + "px"; // 32px for the draggable bar, 3px for the border
      }
    });
  }

  if (request.action === "adjustIframeX") {
    let iframeContainer = document.getElementById("TMEiframe");

    if (iframeContainer) {
      chrome.storage.local.get("iframeCoords", (result) => {
        const coords = result.iframeCoords || { x: defaultX, y: defaultY };

        // Adjust left position if the window size becomes smaller than the iframe width
        const adjustedX = Math.min(coords.x, window.innerWidth - iframeContainer.offsetWidth - 40);

        iframeContainer.style.left = `${adjustedX}px`;
        chrome.storage.local.set({ iframeCoords: { x: adjustedX, y: coords.y } });
      });
    }
  }
});