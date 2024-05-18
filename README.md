# google-maps-extension
> Speed up your Google Maps search flow!
> Search and save right in your browser using Google Maps (fast).

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

## Roadmap
- [x] Quick search using shortcuts
- [x] Search bar in the popup window
- [x] Record search history
- [x] Save the favorite spot
- [x] Delete mode
- [x] Export the favorite list
- [x] Chinese language
- [ ] AI summarized locations

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
- `_locales/`: Message localized for current locale
    - `en/`: English (default)
    - `zh_TW/`: Chinese (Taiwan)
- `dist/`: JavaScript & CSS resources
    - `popup.js`: JS for the popup window
    - `popup.css`: CSS for the popup window
    - `background.js`: Event handling and browser interaction
    - `contentScript.js`: Accessing webpage content
- `popup.html`: HTML for the popup window
- `manifest.json`: Configuration file for the extension

---

## Reference
- [Extensions - Chrome for Developers](https://developer.chrome.com/docs/extensions/)
- [Chrome Extension 開發與實作 - 羅拉拉](https://ithelp.ithome.com.tw/articles/10186017)
- [Localizing Your Chrome Extension - Shahed Nasser](https://levelup.gitconnected.com/localizing-your-chrome-extension-an-easy-tutorial-b0892e225576)
