window.TME = {
    /**
     * Theme utilities for iframe context
     */
    applyTheme: function (element, isDarkMode) {
        if (isDarkMode) {
            element.setAttribute("data-theme", "dark");
        } else {
            element.removeAttribute("data-theme");
        }
    },
    
    getSystemPreference: function () {
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
    },

    setup: function () {
        const defaultX = window.innerWidth - 480;
        const defaultY = 50;

        let iframeContainer = document.createElement("div");
        iframeContainer.id = "TMEiframe";
        iframeContainer.style.left = defaultX + "px";
        iframeContainer.style.top = defaultY + "px";
        
        // Apply dark mode theme if enabled
        chrome.storage.local.get("isDarkMode", ({ isDarkMode }) => {
            if (isDarkMode === undefined) {
                // Check system preference if no stored preference
                const prefersDark = TME.getSystemPreference();
                TME.applyTheme(iframeContainer, prefersDark);
            } else {
                TME.applyTheme(iframeContainer, isDarkMode);
            }
        });
        // iframeContainer.style.resize = "vertical";

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
        closeButton.title = chrome.i18n.getMessage("closeLabel");

        // x.svg from Bootstrap Icons
        closeButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x" viewBox="0 0 16 16">
          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
        </svg>
        `;

        // Close by button click
        closeButton.addEventListener("click", () => {
            TME.eject();
        });

        // Close by Esc key
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                TME.eject();
            }
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
            };
        };

        draggableBar.ondragstart = function () {
            return false;
        };

        // Adjust iframe left position when the document width becomes smaller
        window.addEventListener("resize", () => {
            const coordsX = iframeContainer.getBoundingClientRect().left;
            const adjustedX = Math.min(coordsX, window.innerWidth - iframeContainer.offsetWidth - 40);

            iframeContainer.style.left = `${adjustedX}px`;
        });

        // Create a custom resizer
        const resizer = document.createElement("div");
        resizer.style.width = "100%";
        resizer.style.height = "0";
        resizer.style.position = "absolute";
        resizer.style.right = "0";
        resizer.style.bottom = "0";
        resizer.style.cursor = "ns-resize";
        resizer.style.border = "8px solid transparent";
        iframeContainer.appendChild(resizer);

        let isResizing = false;
        let initialMouseY = 0;

        resizer.addEventListener("mousedown", (event) => {
            isResizing = true;
            initialMouseY = event.clientY;
            iframeContainer.style.transition = "none";
            event.preventDefault();
        });

        document.addEventListener("mousemove", (event) => {
            if (isResizing) {
                let currentMouseY = event.clientY;
                let newHeight = currentMouseY - iframeContainer.getBoundingClientRect().top;
                const mouseDirection = currentMouseY <= initialMouseY ? "up" : "down";
                const maxAllowedHeight = window.innerHeight - 100;
                const mouseUpEvent = new MouseEvent("mouseup");

                // upper and lower height limits
                if (newHeight <= 452 && mouseDirection === "up") {
                    newHeight = 452;
                    document.dispatchEvent(mouseUpEvent);
                    isResizing = false;
                } else if (newHeight >= maxAllowedHeight && mouseDirection === "down") {
                    newHeight = maxAllowedHeight;
                    document.dispatchEvent(mouseUpEvent);
                    isResizing = false;
                }

                iframeContainer.style.height = `${newHeight}px`;

                // min iframe height 452 - min list container height 112 = other element height 340
                const heightChange = newHeight - 340;

                chrome.runtime.sendMessage({
                    type: "resize",
                    heightChange: heightChange
                });
            }
        });

        document.addEventListener("mouseup", () => {
            if (isResizing) {
                iframeContainer.style.transition = "width 0.3s ease-in-out, height 0.3s ease-in-out";
            }
            isResizing = false;
        });

        return iframe;
    },
    eject: function () {
        let iframeContainer = document.getElementById("TMEiframe");
        if (iframeContainer) {
            iframeContainer.remove();
            window.TMEhasRun = false;
            console.log("The Maps Express Deactivated - " + Date());
        }
    }
};

(function () {
    const ascii = String.raw`
_____  _     ____
 | |  | |_| | |_
 |_|  |_| | |_|__
 _       __    ___   __
| |\/|  / /\  | |_) ( (⎺
|_|  | /_/--\ |_|   _)_)
 ____  _     ___   ___   ____  __   __
| |_  \ \_/ | |_) | |_) | |_  ( (⎺ ( (⎺
|_|__ /_/ \ |_|   |_| \ |_|__ _)_) _)_)
`;
    const css = 'font-family: "Consolas","Cascadia Code","Courier New",monospace;';
    console.log('%c' + ascii, css);

    console.log("Activated - " + Date());

    TME.setup();
})();
