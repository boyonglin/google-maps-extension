window.TME = {
    setup: function () {
        const defaultX = window.innerWidth - 500;
        const defaultY = 60;

        // Create and inject a new iframe
        let iframeContainer = document.createElement("div");
        iframeContainer.id = "TMEiframe";
        iframeContainer.style.left = defaultX + "px";
        iframeContainer.style.top = defaultY + "px";
        chrome.storage.local.set({ iframeCoords: { x: defaultX, y: defaultY } });

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

                const newX = iframeContainer.getBoundingClientRect().left;
                const newY = iframeContainer.getBoundingClientRect().top;
                chrome.storage.local.set({ iframeCoords: { x: newX, y: newY } });
            };
        };

        draggableBar.ondragstart = function () {
            return false;
        };

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
    console.log(`_____  _     ____     _       __    ___   __      ____  _     ___   ___   ____  __   __\n | |  | |_| | |_     | |\\/|  / /\\  | |_) ( (\`    | |_  \\ \\_/ | |_) | |_) | |_  ( (\` ( (\`\n |_|  |_| | |_|__    |_|  | /_/--\\ |_|   _)_)    |_|__ /_/ \\ |_|   |_| \\ |_|__ _)_) _)_)
       `);
    console.log("Activated - " + Date());

    TME.setup();
})();
