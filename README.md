<div align="center">
  <img src="Package/images/icon-48.png" alt="The Maps Express Logo" width="48" />
  <h1>The Maps Express</h1>
  <p>Speed up your search flow to Google Maps!</p>
  <p><em>Navigate places effortlessly with The Maps Express, experiencing rapid AI-integrated summaries or a single search key combination for minimal workflow disruption.</em></p>
  <p>
    <a href="https://chromewebstore.google.com/detail/lfkhadednlnfhmhagkhapejkhpjibaic">
      <img src="https://img.shields.io/badge/Google_chrome-4285F4?style=for-the-badge&logo=Google-chrome&logoColor=white" alt="Chrome Web Store" />
    </a>&nbsp;&nbsp;
    <a href="https://clancylin.gumroad.com/l/place-summary">
      <img src="https://img.shields.io/badge/GUMROAD-36a9ae?style=for-the-badge&logo=gumroad&logoColor=white" alt="Gumroad" />
    </a>
  </p>
</div>

---

## 🚀 Introduction

The Maps Express is a browser extension designed to streamline your interaction with Google Maps. Whether you're browsing articles, watching videos, or planning a trip, this tool helps you quickly search for locations, get directions, and manage your favorite places with minimal interruption to your workflow. With features like quick search shortcuts, AI-powered summaries, and seamless integration with Google My Maps, The Maps Express is the perfect companion for any avid map user.

## ✨ Features

### Action Features

- **Quick Search**: Use shortcuts (`Ctrl+Shift+S` / `⌘+⇧+S`) or right-click on highlighted text to perform a quick search.
- **Search Bar**: Open the extension's search bar with a shortcut (`Alt+Shift+S` / `⌥+⇧+S`) or by clicking the extension icon.
- **Quick Directions**: Get directions instantly by right-clicking on highlighted text (`Alt+R` / `⌥+R`).

### Database Features

- **Search History**: Automatically saves your last 10 searches for quick access.
- **Favorites List**: Save your favorite locations and import or export them as a CSV file.
- **Delete Mode**: Easily manage and delete items from your history and favorites.

### AI-Powered Features

- **Place Summary**: Use the Gemini API to get AI-powered summaries of locations on the current page.
- **Video Summary**: Summarize locations mentioned in videos, using the same AI-powered summary feature.
- **Auto-attach Map Links**: Automatically detect and attach Google Maps links to place names on web pages.

---

## 🎬 Usage Demo

Check out our video demonstration on YouTube to see The Maps Express in action:
[https://youtu.be/xv0tVQAi3qo](https://youtu.be/xv0tVQAi3qo)

---

## 🛠️ Installation and Setup

### From the Chrome Web Store (Recommended)

The easiest way to get started is to install The Maps Express directly from the [Chrome Web Store](https://chromewebstore.google.com/detail/lfkhadednlnfhmhagkhapejkhpjibaic).

### Local Development Setup

If you want to develop and test your own version locally, follow these steps:

1.  **Open Browser Extensions**: Navigate to your browser's extensions page and click "Manage extensions".<br>
    <img src="https://github.com/boyonglin/google-maps-extension/assets/56038738/117902e8-d4ac-4208-9f81-37f35489954f" style="border-radius: 8px" width="320" alt="Manage extensions">

2.  **Enable Developer Mode**: Toggle on "Developer mode".<br>
    <img src="https://github.com/boyonglin/google-maps-extension/assets/56038738/56922b20-cae3-48c1-bb3e-810cf09e9df9" style="border-radius: 8px" width="320" alt="Developer mode">

3.  **Load Unpacked Extension**: Click "Load unpacked" and select the cloned project folder to complete the installation.<br>
    <img src="https://github.com/boyonglin/google-maps-extension/assets/56038738/358c9c2c-4698-402d-a141-451fabcc3913" style="border-radius: 8px" width="800" alt="Load unpacked">

---

## ⚙️ Configuration

### Keyboard Shortcuts

To customize the default shortcuts:

1.  **Open Extensions Page**: Go to the browser extensions page and click "Manage extensions".<br>
    <img src="https://github.com/boyonglin/google-maps-extension/assets/56038738/117902e8-d4ac-4208-9f81-37f35489954f" style="border-radius: 8px" width="300" alt="Manage extensions">

2.  **Select Keyboard Shortcuts**:<br>
    <img src="https://github.com/boyonglin/google-maps-extension/assets/56038738/783c9cbc-4e9f-4818-b075-e0da69efacf0" style="border-radius: 8px" width="300" alt="Keyboard shortcuts">

3.  **Set Your Shortcut**: Click the input field and type your desired key combination.<br>
    <img src="https://github.com/boyonglin/google-maps-extension/assets/56038738/248921af-ee7e-42af-ab2b-080bf03190b0" style="border-radius: 8px" width="600" alt="Type the shortcut">

4.  **Set to Global (Optional)**: Change the shortcut scope to "Global" if you want to use it outside of the browser window.<br>
    <img src="https://github.com/boyonglin/google-maps-extension/assets/56038738/295e0d03-7a85-4851-8037-1ac574f1b99d" style="border-radius: 8px" width="600" alt="Shortcut level">

### Gemini API for AI Features

To enable the Place Summary and Video Summary features, you'll need a Gemini API key:

1.  **Sign in to Google AI Studio**: Go to [Google AI Studio](https://aistudio.google.com/) and sign in.
2.  **Consent to Terms**: Agree to the legal notice to continue.<br>
    <img src="https://github.com/user-attachments/assets/1d11ecdb-80eb-474b-a317-57e367640b15" width="300">

3.  **Create API Key**:<br>
    <img src="https://github.com/user-attachments/assets/c429aad2-6402-49a6-aa8d-7775ec24da69" width="600">

4.  **Create API Key in a New Project**:<br>
    <img src="https://github.com/user-attachments/assets/7041ef34-8968-40e8-9940-8b4ba87c0b00" width="300">

5.  **Copy Your Key**: Copy the generated API key and paste it into the extension's settings.<br>
    <img src="https://github.com/user-attachments/assets/0d87e72b-5864-4076-b3a4-fea5e09c9dde" width="600">

---

## 🗺️ How to Use with Google My Maps

You can export your favorite places as a CSV file and import them into Google My Maps:

1.  **Open My Maps**: In Google Maps, go to "Your places" > "Maps" and click "Create Map".<br>
    <img src="https://github.com/user-attachments/assets/4eeed4e8-a8b7-4ce7-a5ec-8439305168d0" width="300">

2.  **Create a New Map**:<br>
    <img src="https://github.com/user-attachments/assets/08be46cb-b370-4c6f-add7-33f334fbb40d" width="300">

3.  **Import Data**: Click the "Import" button.<br>
    <img src="https://github.com/user-attachments/assets/2b1b54c6-b5b2-4f73-bdc0-9750cdbe8a70" width="300">

4.  **Choose CSV File**: Select the CSV file you exported from the extension.<br>
    <img src="https://github.com/user-attachments/assets/c5f0f043-262f-4611-8b28-4a3247d202b3" width="300">

5.  **Select Columns**: Choose the columns to position your placemarks (default is "name").<br>
    <img src="https://github.com/user-attachments/assets/04450982-6066-4228-b6b4-f04dc1914ac9" width="300">

6.  **Finish**: Complete the import process.<br>
    <img src="https://github.com/user-attachments/assets/d3d1f2fb-360e-4239-b8de-2ebec557ed16" width="300">

---

## 🛠️ Tech Stack

-   **Manifest V3**
-   **TypeScript** (Type checking and IntelliSense)
-   **Bootstrap 5.3.0**
-   **Gemini 2.0 Flash**
-   **ExtPay** (Payment Gateway)
-   **localStorage**
-   **HTML iframe**
-   **i18n** (Localization)

---

## 💻 Development

### TypeScript Support

This project includes TypeScript support for better developer experience and AI-powered code suggestions. See [TYPESCRIPT.md](TYPESCRIPT.md) for detailed documentation.

**Key Features:**
- Type checking for JavaScript code
- IntelliSense for Chrome APIs
- Enhanced GitHub Copilot suggestions
- JSDoc annotations for better documentation

**Run type checks:**
```bash
npm run type-check
```

### Testing

Run tests with Jest:
```bash
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage
```

---

## 📂 Project Structure

```
.
├── _locales/               # Localization files (en, zh_TW, ja)
├── dist/
│   ├── scripts/            # Functional scripts (popup.js)
│   ├── components/         # Modular scripts (background.js)
│   ├── popup.js            # Main script
│   ├── background.js       # Event handling and browser interaction
│   ├── contentScript.js    # Accessing webpage content
│   ├── inject.js           # Injecting iframe into the webpage
│   ├── ejectLite.js        # Ejecting iframe from the webpage
│   └── checkStatus.js      # Checking the status of the iframe
├── scss/                   # Style sources
├── images/                 # Extension icons and demo assets
├── vendor/                 # 3rd-party libraries
├── popup.html              # HTML for the popup interface
└── manifest.json           # Configuration file for the extension
```

---

## 🤝 Contributing

Contributions are welcome! If you have ideas for new features, improvements, or bug fixes, please open an issue to discuss it first. If you'd like to contribute code, please fork the repository and submit a pull request.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 📚 References

-   [Extensions - Chrome for Developers](https://developer.chrome.com/docs/extensions/)
-   [Chrome Extension 開發與實作 - 羅拉拉](https://ithelp.ithome.com.tw/articles/10186017)
-   [Localizing Your Chrome Extension - Shahed Nasser](https://levelup.gitconnected.com/localizing-your-chrome-extension-an-easy-tutorial-b0892e225576)
-   [簡單用 Chrome Extension 接 Gemini API - Wolke](https://wolkesau.medium.com/簡單用-chrome-extension-接-gemini-api-下-prompt-就能實作文章摘要工具參加-google-百萬美金挑戰賽-ac2adda60c6f)
-   [Prism - Redline Tool](https://chromewebstore.google.com/detail/prism-redline-tool/hkbhjllliedcceblibllaodamehmbfgm)

---

## ✨ Contributors

-   Chin-Hsuan Sun
-   Michael Wu