(() => {
    function attachMapLinkToPage(request) {
        // Handle null, undefined, or empty content
        if (!request || !request.content) {
            return;
        }
        let candidates = request.content.split("\n").map(item => item.trim()).filter(item => item !== "");
        function attachMapLink(element) {
            // Skip if the element already contains a map link or a YouTube-formatted string
            if (element.querySelector('a[href*="https://www.google.com/maps"]') ||
                element.querySelector("yt-formatted-string") ||
                element.classList.contains("ytd-compact-video-renderer")) {
                return;
            }
            let processedCandidates = new Set();
            candidates.forEach(candidate => {
                const searchUrl = `${request.queryUrl}q=${encodeURIComponent(candidate)}`;
                const parts = candidate.split(/\s{4,}/);
                let candidateName = parts[0];
                // Skip if already processed this candidate name for this element
                if (processedCandidates.has(candidateName)) {
                    return;
                }
                // Check if this candidate name exists in the element text
                if (element.textContent.includes(candidateName)) {
                    // Find text nodes containing the candidate name
                    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
                    let textNode;
                    while (textNode = walker.nextNode()) {
                        if (textNode.textContent.includes(candidateName)) {
                            // Escape special regex characters to match literal strings
                            const escapedCandidate = candidateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            const regex = new RegExp(escapedCandidate);
                            const match = textNode.textContent.match(regex);
                            if (match) {
                                processedCandidates.add(candidateName);
                                // Split the text node and insert the pin after the candidate name
                                const beforeText = textNode.textContent.substring(0, match.index + match[0].length);
                                const afterText = textNode.textContent.substring(match.index + match[0].length);
                                // Replace the original text node
                                textNode.textContent = beforeText;
                                // Create and insert the pin
                                const pin = makePin(searchUrl);
                                textNode.parentNode.insertBefore(pin, textNode.nextSibling);
                                // Add the remaining text if any
                                if (afterText) {
                                    const afterTextNode = document.createTextNode(afterText);
                                    textNode.parentNode.insertBefore(afterTextNode, pin.nextSibling);
                                }
                                break; // Only process the first occurrence in this element
                            }
                        }
                    }
                }
            });
        }
        ["h1", "h2", "h3", "strong", "p", "td"].forEach(tag => {
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
    // Make the function available globally
    globalThis.attachMapLinkToPage = attachMapLinkToPage;
})();
//# sourceMappingURL=appSecret.js.map