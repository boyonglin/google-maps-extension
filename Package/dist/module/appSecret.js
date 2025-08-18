(() => {
  function attachMapLinkToPage(request) {
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

  // Make the function available globally
  globalThis.attachMapLinkToPage = attachMapLinkToPage;
})();