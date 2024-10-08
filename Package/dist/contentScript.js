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
        let nameHtml = parts[0];

        // Replace the candidate text with itself followed by the link emoji
        if (element.innerHTML.includes(nameHtml)) {
          element.innerHTML = element.innerHTML.replace(new RegExp(nameHtml, "g"), `${nameHtml}${linkHtml}`);
        }
      });
    }

    ["h1", "h2", "h3", "strong"].forEach(tag => {
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

  if (request.action === "updateIframeSize") {
    let iframeContainer = document.getElementById("TMEiframe");

    if (iframeContainer) {
      iframeContainer.style.width = (request.width + 2) + "px";
      iframeContainer.style.height = (request.height + 32 + 3) + "px"; // 32px for the draggable bar, 3px for the border
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

/********** Deprecated code **********/

// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   if (request.action === "injectIframe") {
//     const iframe = injectIframe();

//     iframe.onload = function () {
//       chrome.runtime.sendMessage({ type: "iframeLoaded" });
//     };
//   }

//   if (request.action === "removeIframe") {
//     removeIframe();
//   }

//   if (request.action === "adjustIframeX") {
//     let iframeContainer = document.getElementById("TMEiframe");

//     if (iframeContainer) {
//       chrome.storage.local.get("iframeCoords", (result) => {
//         const coords = result.iframeCoords;
//         const adjustedX = Math.min(coords.x, window.innerWidth - iframeContainer.offsetWidth - 40);

//         iframeContainer.style.left = `${adjustedX}px`;
//         chrome.storage.local.set({ iframeCoords: { x: adjustedX, y: coords.y } });
//       });
//     }
//   }
// });

// const defaultX = window.innerWidth - 500;
// const defaultY = 60;

// function injectIframe() {
//   // Remove any existing iframe with the same ID
//   const existingIframe = document.getElementById("TMEiframe");
//   if (existingIframe) {
//     existingIframe.remove();
//     chrome.runtime.sendMessage({ type: "iframeRemoved" });
//   }

//   // Create and inject a new iframe
//   let iframeContainer = document.createElement("div");
//   iframeContainer.id = "TMEiframe";
//   iframeContainer.style.left = defaultX + "px";
//   iframeContainer.style.top = defaultY + "px";
//   chrome.storage.local.set({ iframeCoords: { x: defaultX, y: defaultY } });

//   const draggableBar = document.createElement("div");
//   draggableBar.id = "TMEdrag";

//   const linesContainer = document.createElement("div");
//   linesContainer.id = "TMElines";

//   for (let i = 0; i < 6; i++) {
//     const line = document.createElement("div");
//     linesContainer.appendChild(line);
//   }

//   const closeButton = document.createElement("button");
//   closeButton.id = "TMEeject";
//   closeButton.title = chrome.i18n.getMessage("closeLabel");

//   // x.svg from Bootstrap Icons
//   closeButton.innerHTML = `
//   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x" viewBox="0 0 16 16">
//     <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
//   </svg>
//   `;

//   closeButton.addEventListener("click", () => {
//     iframeContainer.remove();
//     chrome.runtime.sendMessage({ type: "iframeRemoved" });
//   });

//   draggableBar.appendChild(linesContainer);
//   draggableBar.appendChild(closeButton);

//   const iframe = document.createElement("iframe");
//   iframe.id = "TMEmain";
//   iframe.src = chrome.runtime.getURL("../popup.html");

//   // Append the iframe elements
//   iframeContainer.appendChild(draggableBar);
//   iframeContainer.appendChild(iframe);
//   document.body.appendChild(iframeContainer);

//   // Make the iframe draggable
//   draggableBar.onmousedown = function (event) {
//     event.preventDefault();
//     const shiftX = event.clientX - iframeContainer.getBoundingClientRect().left;
//     const shiftY = event.clientY - iframeContainer.getBoundingClientRect().top;

//     document.onmousemove = function (event) {
//       iframeContainer.style.left = event.clientX - shiftX + "px";
//       iframeContainer.style.top = event.clientY - shiftY + "px";
//     };

//     document.onmouseup = function () {
//       document.onmousemove = null;
//       document.onmouseup = null;

//       const newX = iframeContainer.getBoundingClientRect().left;
//       const newY = iframeContainer.getBoundingClientRect().top;
//       chrome.storage.local.set({ iframeCoords: { x: newX, y: newY } });
//     };
//   };

//   draggableBar.ondragstart = function () {
//     return false;
//   };

//   return iframe;
// }

// function removeIframe() {
//   let iframeContainer = document.getElementById("TMEiframe");
//   if (iframeContainer) {
//     iframeContainer.remove();
//     chrome.runtime.sendMessage({ type: "iframeRemoved" });
//   }
// }

// // Close by esc key
// document.addEventListener("keydown", (event) => {
//   if (event.key === "Escape") {
//     removeIframe();
//   }
// });