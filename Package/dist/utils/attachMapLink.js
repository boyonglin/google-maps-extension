(() => {
  function normalizeCandidate(value) {
    return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
  }

  function getExistingCandidateKeys() {
    const keys = new Set();

    document.querySelectorAll('a[href*="https://www.google.com/maps"]').forEach((pin) => {
      const markedCandidate = pin.dataset.tmeCandidate;
      if (markedCandidate) {
        keys.add(normalizeCandidate(markedCandidate));
        return;
      }

      // Upgrade pins created before data-tme-map-pin was introduced. Do not
      // treat ordinary host-page Maps links as extension pins.
      if (pin.textContent.trim() !== "📌") return;

      try {
        const queryCandidate = new URL(pin.href).searchParams.get("q");
        if (queryCandidate) {
          const candidateName = queryCandidate.split(/\s{4,}/)[0];
          const candidateKey = normalizeCandidate(candidateName);
          pin.dataset.tmeMapPin = "";
          pin.dataset.tmeCandidate = candidateKey;
          keys.add(candidateKey);
        }
      } catch (_error) {
        // Ignore malformed host-page links.
      }
    });

    return keys;
  }

  function getAttachedCandidateCount() {
    return new Set(
      Array.from(document.querySelectorAll("a[data-tme-map-pin]"))
        .map((pin) => pin.dataset.tmeCandidate)
        .filter(Boolean)
        .map(normalizeCandidate)
    ).size;
  }

  function attachMapLinkToPage(request) {
    if (!request || !request.content) {
      return 0;
    }

    let candidates = request.content
      .split("\n")
      .map((item) => item.trim())
      .filter((item) => item !== "");

    // De-duplicate across nested elements, repeated model output, and
    // subsequent auto-attach runs in the same document.
    const existingCandidates = getExistingCandidateKeys();

    function attachMapLink(element) {
      if (
        element.querySelector('a[href*="https://www.google.com/maps"]') ||
        element.querySelector("yt-formatted-string") ||
        element.classList.contains("yt-lockup-metadata-view-model__title")
      ) {
        return;
      }

      const processedCandidates = new Set();

      candidates.forEach((candidate) => {
        const searchUrl = `${request.queryUrl}q=${encodeURIComponent(candidate)}`;

        const parts = candidate.split(/\s{4,}/);
        let candidateName = parts[0];
        const candidateKey = normalizeCandidate(candidateName);

        if (existingCandidates.has(candidateKey) || processedCandidates.has(candidateKey)) {
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
                processedCandidates.add(candidateKey);

                const beforeText = textNode.textContent.substring(0, match.index + match[0].length);
                const afterText = textNode.textContent.substring(match.index + match[0].length);
                textNode.textContent = beforeText;
                const pin = makePin(searchUrl, candidateKey);
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

    return getAttachedCandidateCount();
  }

  function makePin(href, candidateName) {
    const a = document.createElement("a");
    a.target = "_blank";
    a.rel = "noopener";
    a.href = href;
    a.textContent = "📌";
    a.dataset.tmeMapPin = "";
    a.dataset.tmeCandidate = candidateName;
    a.style.textDecoration = "none";
    a.style.border = "0px";
    a.style.marginLeft = "4px";
    return a;
  }

  globalThis.attachMapLinkToPage = attachMapLinkToPage;
})();
