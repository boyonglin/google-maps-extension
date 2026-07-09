(() => {
  function attachMapLinkToPage(request) {
    if (!request || !request.content) {
      return;
    }

    let candidates = request.content
      .split("\n")
      .map((item) => item.trim())
      .filter((item) => item !== "");

    function attachMapLink(element) {
      if (
        element.querySelector('a[href*="https://www.google.com/maps"]') ||
        element.querySelector("yt-formatted-string") ||
        element.classList.contains("yt-lockup-metadata-view-model__title")
      ) {
        return;
      }

      let processedCandidates = new Set();

      candidates.forEach((candidate) => {
        const searchUrl = `${request.queryUrl}q=${encodeURIComponent(candidate)}`;

        const parts = candidate.split(/\s{4,}/);
        let candidateName = parts[0];

        if (processedCandidates.has(candidateName)) {
          return;
        }

        if (element.textContent.includes(candidateName)) {
          const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);

          let textNode;
          while ((textNode = walker.nextNode())) {
            if (textNode.textContent.includes(candidateName)) {
              const escapedCandidate = candidateName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
              const regex = new RegExp(escapedCandidate);
              const match = textNode.textContent.match(regex);
              if (match) {
                processedCandidates.add(candidateName);

                const beforeText = textNode.textContent.substring(0, match.index + match[0].length);
                const afterText = textNode.textContent.substring(match.index + match[0].length);
                textNode.textContent = beforeText;
                const pin = makePin(searchUrl);
                textNode.parentNode.insertBefore(pin, textNode.nextSibling);
                if (afterText) {
                  const afterTextNode = document.createTextNode(afterText);
                  textNode.parentNode.insertBefore(afterTextNode, pin.nextSibling);
                }

                break;
              }
            }
          }
        }
      });
    }

    ["h1", "h2", "h3", "strong", "p", "td"].forEach((tag) => {
      document.querySelectorAll(tag).forEach((element) => {
        attachMapLink(element);
      });
    });

    const inlineExpander = document.querySelector(
      "div#description ytd-text-inline-expander yt-attributed-string"
    );
    if (inlineExpander) {
      const spanElements = inlineExpander.querySelectorAll("span");
      spanElements.forEach((element) => {
        attachMapLink(element);
      });
    }
  }

  function makePin(href) {
    const a = document.createElement("a");
    a.target = "_blank";
    a.rel = "noopener";
    a.href = href;
    a.textContent = "📌";
    a.style.textDecoration = "none";
    a.style.border = "0px";
    return a;
  }

  globalThis.attachMapLinkToPage = attachMapLinkToPage;
})();
