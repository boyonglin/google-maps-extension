<div align="center">

# The Maps Express: AI-First Extension for Google Maps

**A Shortcut to Google Maps, but Rich and Beautiful.**

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/lfkhadednlnfhmhagkhapejkhpjibaic?label=Chrome%20Web%20Store)](https://chromewebstore.google.com/detail/lfkhadednlnfhmhagkhapejkhpjibaic)
[![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/lfkhadednlnfhmhagkhapejkhpjibaic)](https://chromewebstore.google.com/detail/lfkhadednlnfhmhagkhapejkhpjibaic)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/)
[![Gemini](https://img.shields.io/badge/Gemini_Flash_(latest)-supported-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](../../issues)

🌐 [English](README.md) | [繁體中文](README-multi-lan/README.zh-TW.md) | [日本語](README-multi-lan/README.ja.md)

<a href="https://chromewebstore.google.com/detail/lfkhadednlnfhmhagkhapejkhpjibaic">
  <img src="https://img.shields.io/badge/Google_chrome-4285F4?style=for-the-badge&logo=Google-chrome&logoColor=white" alt="Chrome Web Store" />
</a>&nbsp;&nbsp;
<a href="https://clancylin.gumroad.com/l/place-summary">
  <img src="https://img.shields.io/badge/GUMROAD-36A9AE?style=for-the-badge&logo=gumroad&logoColor=white" alt="Gumroad" />
</a>&nbsp;&nbsp;
<a href="https://bento-we-clancy.figma.site/the-maps-express">
  <img src="https://img.shields.io/badge/Portfolio-768CFF?style=for-the-badge&logo=bento&logoColor=white" alt="Portfolio" />
</a>

</div>

---

> A Chrome extension that **streamlines your Google Maps workflow** — search locations, get directions, and manage favorites with a **single shortcut** or right-click, plus **AI-powered place summaries** via Gemini.
>
> **No workflow disruption. No context switching. Just fast maps.**

---

## Demo

https://youtu.be/xv0tVQAi3qo

<!-- If you have a gif/video file, you can embed it like this: -->
<!-- https://github.com/user-attachments/assets/YOUR_VIDEO_ID -->

---

## Features at a Glance

| Feature | Details |
|---------|---------|
| **Quick Search** | Highlight text + `Ctrl+Shift+S` / `⌘+⇧+S` or right-click → instant Google Maps search |
| **Search Bar** | Open via `Alt+Shift+S` / `⌥+⇧+S` or click icon — search without leaving the page |
| **Quick Directions** | Right-click highlighted text or press `Alt+R` / `⌥+R` → get directions instantly |
| **Search History** | Auto-saves your last 10 searches for quick re-access |
| **Favorites List** | Save, import, and export favorite locations as CSV — works with Google My Maps |
| **Place Summary** | AI-powered summaries of locations on any page via Gemini Flash |
| **Video Summary** | Extract and summarize locations mentioned in YouTube videos |
| **Auto-attach Links** | Automatically detect place names on web pages and attach Google Maps links |
| **3 UI languages** | English · 繁體中文 · 日本語 — auto-detected |
| **Dark / Light theme** | Theme toggle following your preference |

---

## How It Works

```
You're browsing an article / watching a YouTube video / planning a trip
        │
        ▼
Highlight a place name (or press the shortcut)
        │
        ├─→ Quick Search    → opens Google Maps in a grouped tab
        ├─→ Quick Directions → opens Google Maps directions
        └─→ Place Summary   → Gemini AI summarizes the location
        │
        ▼
Search history auto-saved · ⭐ Favorite to your list
        │
        ▼
Export favorites as CSV → import into Google My Maps
        → Your personal map, built from any website
```

---

## Installation

### For Users — Chrome Web Store (Recommended)

Install directly from the [Chrome Web Store](https://chromewebstore.google.com/detail/lfkhadednlnfhmhagkhapejkhpjibaic).

### For Developers — Local Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/boyonglin/google-maps-extension.git
   cd google-maps-extension
   npm install
   ```

2. Open Chrome → `chrome://extensions/`

3. Toggle **Developer mode** on (top-right)

4. Click **Load unpacked** → select the `Package/` folder

<details>
<summary>📸 Step-by-step screenshots</summary>

1. **Open Browser Extensions** → click "Manage extensions"<br>
   <img src="https://github.com/user-attachments/assets/e311a046-bf94-42dc-9dc1-0bccfd65a5b0" width="300" alt="Manage extensions">

2. **Enable Developer Mode**<br>
   <img src="https://github.com/user-attachments/assets/cb3b89a0-de1b-4eb9-9742-c30a81d0bf8d" width="300" alt="Developer mode">

3. **Load Unpacked** → select the project folder<br>
   <img src="https://github.com/user-attachments/assets/8aaa1b0e-caa1-41a2-b2c0-4ee3ccd35a53" width="600" alt="Load unpacked">

</details>

> After any code change: click **Reload** on the extension card in `chrome://extensions/`, then refresh open tabs.

---

## Configuration

### Keyboard Shortcuts

| Action | Default Shortcut | Mac Shortcut |
|--------|-----------------|--------------|
| Quick Search | `Ctrl+Shift+S` | `⌘+⇧+S` |
| Open Search Bar | `Alt+Shift+S` | `⌥+⇧+S` |
| Auto-attach Links | `Alt+S` | `⌥+S` |
| Quick Directions | `Alt+R` | `⌥+R` |

To customize shortcuts:

<details>
<summary>📸 How to change shortcuts</summary>

1. Go to extensions page → "Manage extensions"<br>
   <img src="https://github.com/user-attachments/assets/15098f34-61ff-4572-9ccd-18e16145c07c" width="300" alt="Manage extensions">

2. Select **Keyboard Shortcuts**<br>
   <img src="https://github.com/user-attachments/assets/53fb340c-f558-408b-a720-63e133df0a80" width="300" alt="Keyboard shortcuts">

3. Click the input field and set your desired key<br>
   <img src="https://github.com/user-attachments/assets/f43d74c4-00d3-4954-be29-10299a8aef5a" width="600" alt="Type the shortcut">

4. *(Optional)* Change scope to "Global" for use outside the browser<br>
   <img src="https://github.com/user-attachments/assets/9adf849e-a0d6-4a30-be01-048c6f3dae94" width="600" alt="Shortcut level">

</details>

### Gemini API Key (for AI Features)

To enable **Place Summary** and **Video Summary**, you need a free Gemini API key:

1. Go to [Google AI Studio](https://aistudio.google.com/) and sign in
2. Agree to the terms of service
3. Click **Create API Key** → select a project
4. Copy the key and paste it into the extension's settings

<details>
<summary>📸 Step-by-step screenshots</summary>

1. **Consent to Terms**<br>
   <img src="https://github.com/user-attachments/assets/1d11ecdb-80eb-474b-a317-57e367640b15" width="300">

2. **Create API Key**<br>
   <img src="https://github.com/user-attachments/assets/513df341-b13b-4c06-a4c4-a4cf2f9a68fb" width="600">

3. **Select a New Project**<br>
   <img src="https://github.com/user-attachments/assets/d6e1c5a2-779e-4cd4-9991-37276ed36e5f" width="300">

4. **Copy Your Key**<br>
   <img src="https://github.com/user-attachments/assets/ab26eef7-4ff1-4a73-8eae-81cb2cbba6ae" width="600">

</details>

---

## Google My Maps Integration

Export your favorites as CSV and import them into Google My Maps to build a personal map:

<details>
<summary>📸 Step-by-step screenshots</summary>

1. **Open My Maps**: Google Maps → "Your places" → "Maps" → "Create Map"<br>
   <img src="https://github.com/user-attachments/assets/4eeed4e8-a8b7-4ce7-a5ec-8439305168d0" width="300">

2. **Create a New Map**<br>
   <img src="https://github.com/user-attachments/assets/08be46cb-b370-4c6f-add7-33f334fbb40d" width="300">

3. **Import** → click "Import"<br>
   <img src="https://github.com/user-attachments/assets/2b1b54c6-b5b2-4f73-bdc0-9750cdbe8a70" width="300">

4. **Choose CSV File** exported from the extension<br>
   <img src="https://github.com/user-attachments/assets/c5f0f043-262f-4611-8b28-4a3247d202b3" width="300">

5. **Select Columns** to position placemarks (default: "name")<br>
   <img src="https://github.com/user-attachments/assets/04450982-6066-4228-b6b4-f04dc1914ac9" width="300">

6. **Done!**<br>
   <img src="https://github.com/user-attachments/assets/d3d1f2fb-360e-4239-b8de-2ebec557ed16" width="300">

</details>

---

## Privacy & Security

| Question | Answer |
|----------|--------|
| Where is data stored? | **Browser-local `localStorage` only** — never leaves your device |
| Does it make network requests? | Only for Gemini API calls (when you use AI features) and ExtPay (payment). No tracking or telemetry on your search data. |
| Can websites see my data? | No. Data is isolated in the extension's storage, inaccessible to page scripts. |
| Can I delete my data? | Yes — delete individual items via the popup, or clear all via browser settings. |

> **Your searches, favorites, and history stay on your device.** The extension only calls external APIs when you explicitly use AI summary features.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Extension framework | Chrome Manifest V3 |
| UI | HTML + Bootstrap 5.3 + SCSS |
| AI | Gemini Flash API (`gemini-flash-latest`) |
| Payment | ExtPay |
| Persistence | `localStorage` |
| Localization | Chrome i18n (en · zh-TW · ja) |
| Testing | Jest + jsdom |

<details>
<summary><strong>📂 Project Structure</strong></summary>

```
.
├── Package/
│   ├── _locales/              # i18n (en, zh_TW, ja)
│   ├── css/                   # Compiled CSS
│   ├── dist/
│   │   ├── components/        # Modular UI components
│   │   ├── hooks/             # Custom hooks
│   │   ├── utils/             # Utility functions
│   │   ├── background.js      # Service worker
│   │   ├── contentScript.js   # Content script
│   │   └── popup.js           # Popup logic
│   ├── images/                # Icons and assets
│   ├── vendor/                # 3rd-party libraries (Bootstrap, etc.)
│   ├── manifest.json          # Extension configuration
│   └── popup.html             # Popup interface
├── scss/                      # SCSS source files
├── tests/                     # Unit tests (Jest)
├── jest.config.js
└── package.json
```

</details>

---

## Debugging & Testing

| Target | How to reach it |
|--------|----------------|
| Background Service Worker | `chrome://extensions/` → The Maps Express → **Service worker** |
| Popup | Right-click extension icon → **Inspect popup** |
| Content scripts | DevTools → Sources → Content scripts |
| localStorage | DevTools → Application → Local Storage |

```bash
npm test              # Run all unit tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

---

## Contributing

PRs and issues are welcome! Please open an issue to discuss significant changes before submitting a PR.

- Bug reports: [open an issue](../../issues)
- Feature requests: [open an issue](../../issues)
- Code contributions: fork → branch → PR

---

## License

[MIT](LICENSE) © 2023–2026 Clancy Lin

---

## References

- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)
- [Chrome Extension 開發與實作 — 羅拉拉](https://ithelp.ithome.com.tw/articles/10186017)
- [Localizing Your Chrome Extension — Shahed Nasser](https://levelup.gitconnected.com/localizing-your-chrome-extension-an-easy-tutorial-b0892e225576)
- [簡單用 Chrome Extension 接 Gemini API — Wolke](https://wolkesau.medium.com/簡單用-chrome-extension-接-gemini-api-下-prompt-就能實作文章摘要工具參加-google-百萬美金挑戰賽-ac2adda60c6f)

---

## Contributors

- Chin-Hsuan Sun
- Michael Wu
