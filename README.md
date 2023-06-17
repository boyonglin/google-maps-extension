![patch-plus-fill](https://github.com/boyonglin/google-maps-extension/assets/56038738/6bdcd9d0-2487-4cc1-9178-99069d293766)# google-maps-extension
> Speed up your Google Maps search flow!
> Search for anywhere from any webpage by Google Maps (fast).

---

## Contents
- Extension
    - [Features](#features)
    - [Usage Demo](#usage-demo)
- Developer
    - [Set Up](#set-up)
    - [Shortcut](#shortcut)
- Project
    - [Framework](#framework)
    - [Structure](#structure)
- [Reference](#reference)

---

## Features
- [x] Quick search using shortcuts (Ctrl+Shift+S / ⌘+Shift+S) or right-click on the highlighted text.
- [x] Use shortcuts (Alt+Shift+S / Ctrl+Shift+S) or click the icon to open the extension and start searching.
- [x] Open the extension to access your Search History (up to 10) and redirect to Google Maps.
- [x] Click the `Patch plus` icon to save your spots in Favorite List for quick access without limitation.
- [x] Switch to Delete Mode to individually cross out your Search History or Favorite List.
- [ ] Organize the favorite list

---

## Usage Demo
Youtube URL: https://youtu.be/3S3xlCGoDJ8

---

## Set Up
If you want to develop and test your own version locally, you can follow these steps to install it in your browser for testing:
1. Open the browser extensions page and click "Manage extensions"\
![manage_extensions](https://github.com/boyonglin/google-maps-extension/assets/56038738/117902e8-d4ac-4208-9f81-37f35489954f)
2. Open "Developer mode"\
![developer_mode](https://github.com/boyonglin/google-maps-extension/assets/56038738/56922b20-cae3-48c1-bb3e-810cf09e9df9)
3. Click "Load unpacked" to open the folder you cloned to complete the installation\
![load_unpacked](https://github.com/boyonglin/google-maps-extension/assets/56038738/358c9c2c-4698-402d-a141-451fabcc3913)

---

## Shortcut
If the shortcut doesn't work or you want to change it, follow these steps to adjust your browser:
1. Open the browser extensions page and click "Manage extensions"\
![manage_extensions](https://github.com/boyonglin/google-maps-extension/assets/56038738/117902e8-d4ac-4208-9f81-37f35489954f)
2. Select "Keyboard shortcuts"\
![keyboard_shortcuts](https://github.com/boyonglin/google-maps-extension/assets/56038738/783c9cbc-4e9f-4818-b075-e0da69efacf0)
3. Click the input field and type the shortcut\
![type_the_shortcut](https://github.com/boyonglin/google-maps-extension/assets/56038738/248921af-ee7e-42af-ab2b-080bf03190b0)

---

## Framework
- Bootstrap 5.3.0

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
