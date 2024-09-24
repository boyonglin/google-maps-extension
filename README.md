<p align="center">
  <img src="Package/images/icon-48.png" alt="The Maps Express Logo" width="48" />
</p>

<h1 align="center">The Maps Express</h1>

<p align="center">
  Speed up your search flow to Google Maps!
</p>

<p align="center">
  <em>Navigate places effortlessly with The Maps Express, experiencing rapid AI-integrated summaries or a single search key combination for minimal workflow disruption.</em>
</p>

---

## Contents
- Extension
    - [Features](#features)
    - [Usage Demo](#usage-demo)
- Instrcution
    - [Set Up](#set-up)
    - [Shortcut](#shortcut)
    - [Gemini API](#gemini-api)
    - [Google My Maps](#google-my-maps)
- Project
    - [Techstack](#techstack)
    - [Structure](#structure)
- [Reference](#reference)
- [Contributor](#contributor)

---

## Features
1. Quick Search: Use shortcuts (Ctrl+Shift+S / ⌘+⇧+S) or right-click highlighted text for quick searches, ideal for reading web pages.
2. Search Bar: Use shortcuts (Alt+Shift+S / ⌥+⇧+S) or click to open the extension, ideal for watching videos.
3. Search History: Saves up to 10 locations for quick redirection to Google Maps.
4. Favorite List: Click the PATCH PLUS icon on the right to save. Import or export favorites as needed.
5. Delete Mode: Simply check and delete items.
6. Place Summary: Set up the API key to summarize the locations on the current page. Results will be preserved for 1 day.

---

## Usage Demo
Youtube URL: https://youtu.be/xv0tVQAi3qo

---

## Set Up
If you want to develop and test your own version locally, you can follow these steps to install it in your browser for testing:
1. Open the browser extensions page and click "Manage extensions"
<img src="https://github.com/boyonglin/google-maps-extension/assets/56038738/117902e8-d4ac-4208-9f81-37f35489954f" width="320" alt="Manage extensions">

2. Open "Developer mode"
<img src="https://github.com/boyonglin/google-maps-extension/assets/56038738/56922b20-cae3-48c1-bb3e-810cf09e9df9" width="320" alt="Developer mode">

3. Click "Load unpacked" to open the folder you cloned to complete the installation
<img src="https://github.com/boyonglin/google-maps-extension/assets/56038738/358c9c2c-4698-402d-a141-451fabcc3913" width="800" alt="Load unpacked">

---

## Shortcut
If the shortcut doesn't work or you want to change it, follow these steps to adjust your browser:
1. Open the browser extensions page and click "Manage extensions"
<img src="https://github.com/boyonglin/google-maps-extension/assets/56038738/117902e8-d4ac-4208-9f81-37f35489954f" width="320" alt="Manage extensions">

2. Select "Keyboard shortcuts"
<img src="https://github.com/boyonglin/google-maps-extension/assets/56038738/783c9cbc-4e9f-4818-b075-e0da69efacf0" width="320" alt="Keyboard shortcuts">

3. Click the input field and type the shortcut
<img src="https://github.com/boyonglin/google-maps-extension/assets/56038738/248921af-ee7e-42af-ab2b-080bf03190b0" width="800" alt="Type the shortcut">

4. Change to "Global" level (if necessary)
<img src="https://github.com/boyonglin/google-maps-extension/assets/56038738/295e0d03-7a85-4851-8037-1ac574f1b99d" width="800" alt="Shortcut level">

---

## Gemini API
To apply the API key for the place summary and auto-attach links feature, you need to follow these steps:
1. Sign in Google AI Studio\
2. Consent to Legal Notice & Continue
<img src="https://github.com/user-attachments/assets/1d11ecdb-80eb-474b-a317-57e367640b15" width="500">

3. Create API key
<img src="https://github.com/user-attachments/assets/c429aad2-6402-49a6-aa8d-7775ec24da69" width="500">

4. Create API key in new project
<img src="https://github.com/user-attachments/assets/7041ef34-8968-40e8-9940-8b4ba87c0b00" width="500">

5. Copy
<img src="https://github.com/user-attachments/assets/0d87e72b-5864-4076-b3a4-fea5e09c9dde" width="500">

---

## Google My Maps
You can follow the steps below to use the exported CSV file to import places in Google My Maps:\
1. Open My Maps in Google Maps
<img src="https://github.com/user-attachments/assets/4eeed4e8-a8b7-4ce7-a5ec-8439305168d0" width="500">

2. Create a new map
<img src="https://github.com/user-attachments/assets/08be46cb-b370-4c6f-add7-33f334fbb40d" width="500">

3. Click import button
<img src="https://github.com/user-attachments/assets/2b1b54c6-b5b2-4f73-bdc0-9750cdbe8a70" width="500">

4. Choose exported CSV file to import
<img src="https://github.com/user-attachments/assets/c5f0f043-262f-4611-8b28-4a3247d202b3" width="500">

5. Choose columns (default is "name")
<img src="https://github.com/user-attachments/assets/04450982-6066-4228-b6b4-f04dc1914ac9" width="500">

6. Finish import
<img src="https://github.com/user-attachments/assets/d3d1f2fb-360e-4239-b8de-2ebec557ed16" width="500">

---

## Techstack
- Manifest V3
- Bootstrap 5.3.0
- Gemini 1.5 Flash
- LocalStorage
- Html iframe
- i18n localization
- ExtPay payment gateway

---

## Structure
- `_locales/`: Message localized for current locale
    - `en/`: English (default)
    - `zh_TW/`: Chinese (Taiwan)
    - `ja/`: Japanese
- `dist/`: JavaScript & CSS resources
    - `popup.js`: JS for the popup window
    - `popup.css`: CSS for the popup window
    - `background.js`: Event handling and browser interaction
    - `contentScript.js`: Accessing webpage content
    - `iframe.css`: CSS for the iframe window
    - `inject.js`: Injecting iframe into the webpage
    - `ejectLite.js`: Ejecting iframe from the webpage
    - `checkStatus.js`: Checking the status of the iframe
- `popup.html`: HTML for the popup window
- `manifest.json`: Configuration file for the extension

---

## Reference
- [Extensions - Chrome for Developers](https://developer.chrome.com/docs/extensions/)
- [Chrome Extension 開發與實作 - 羅拉拉](https://ithelp.ithome.com.tw/articles/10186017)
- [Localizing Your Chrome Extension - Shahed Nasser](https://levelup.gitconnected.com/localizing-your-chrome-extension-an-easy-tutorial-b0892e225576)
- [簡單用 Chrome Extension 接 Gemini API - Wolke](https://wolkesau.medium.com/簡單用-chrome-extension-接-gemini-api-下-prompt-就能實作文章摘要工具參加-google-百萬美金挑戰賽-ac2adda60c6f)
- [Prism - Redline Tool](https://chromewebstore.google.com/detail/prism-redline-tool/hkbhjllliedcceblibllaodamehmbfgm)

---

## Contributor
- Chin-Hsuan Sun
- Michael Wu
