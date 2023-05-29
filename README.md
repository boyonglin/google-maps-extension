# google-maps-extension
> Speed up your Google Maps search flow!

---

Search for anywhere from any webpage by Google Maps (fast).

---

## Contents
- [Framework](#framework)
- [Set Up](#set-up)
- [Shortcut](#shortcut)
- [Features](#features)
- [Structure](#structure)
- [Reference](#reference)

---

## Framework
- Bootstrap 5.3.0

---

## Features
- Quick search using shortcuts (Ctrl+Shift+S / ⌘+Shift+S) or right-click on the highlighted text.
- Click the extension to access your search history (up to 16) and Google Maps.
- Text search before accessing the Google Maps page.

---

## Set Up
If you want to develop and test your own version locally, you can follow these steps to install it in your browser for testing:
1. Open the browser extensions page and click "Manage extensions"
2. Open "Developer mode"
3. Click "Load unpacked" to open the folder you cloned to complete the installation

---

## Shortcut
If the shortcut doesn't work or you want to change it, follow these steps to adjust your browser:
1. Open the browser extensions page and click "Manage extensions"
2. Select "Keyboard shortcuts"
3. Click the input field and type the shortcut

---

## Structure
- `dist/`: JavaScript & CSS resources
    - `popup.js`: JS for the popup window
    - `popup.css`: CSS for the popup window
    - `background.js`: Event handling and browser interaction
    - `contentScript.js`: Accessing webpage content
- `popup.html`: HTML for the popup window
- `manifest.json`: Configuration file for the extension

---

## Reference
- [Extensions - Chrome Developers](https://developer.chrome.com/docs/extensions/)
- [Chrome Extension 開發與實作 - 羅拉拉](https://ithelp.ithome.com.tw/articles/10186017)