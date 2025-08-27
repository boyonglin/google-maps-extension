(() => {
  function attachMapLinkToPage(request) {
    let candidates = request.content.split("\n").map(item => item.trim()).filter(item => item !== "");

    function attachMapLink(element) {
      // Skip if the element already contains a map link or a YouTube-formatted string
      if (element.innerHTML.includes('href="https://www.google.com/maps') ||
        element.querySelector("yt-formatted-string") ||
        element.classList.contains("ytd-compact-video-renderer")) {
        return;
      }

      let processedCandidates = new Set();

      candidates.forEach(candidate => {
        const searchUrl = `${request.queryUrl}q=${encodeURIComponent(candidate)}`;
        const linkHtml = `<a href="${searchUrl}" target="_blank" style="text-decoration: none; border: 0px;">📌</a>`;

        const parts = candidate.split(/\s{4,}/);
        let candidateName = parts[0];

        // Skip if already processed this candidate name for this element
        if (processedCandidates.has(candidateName)) {
          return;
        }

        // Check if this candidate name exists in the element text
        if (element.textContent.includes(candidateName)) {
          element.innerHTML = element.innerHTML.replace(new RegExp(candidateName), (match) => {
            processedCandidates.add(candidateName);
            return `${match}${linkHtml}`;
          });
        }
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

  // Make the function available globally
  globalThis.attachMapLinkToPage = attachMapLinkToPage;
})();