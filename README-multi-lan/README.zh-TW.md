<div align="center">

# The Maps Express：Google 地圖的 AI 快捷擴充功能

**A Shortcut to Google Maps, but Rich and Beautiful.**

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/lfkhadednlnfhmhagkhapejkhpjibaic?label=Chrome%20Web%20Store)](https://chromewebstore.google.com/detail/lfkhadednlnfhmhagkhapejkhpjibaic)
[![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/lfkhadednlnfhmhagkhapejkhpjibaic)](https://chromewebstore.google.com/detail/lfkhadednlnfhmhagkhapejkhpjibaic)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](../LICENSE)
[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/)
[![Gemini](https://img.shields.io/badge/Gemini_Flash_(latest)-supported-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](../../../issues)

🌐 [English](../README.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md)

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

> 一款 Chrome 擴充功能，讓你**大幅簡化 Google 地圖的操作流程** — 只需**一個快捷鍵**或右鍵選單，即可搜尋地點、取得路線、管理收藏，還能透過 Gemini 獲得 **AI 地點摘要**。
>
> **不中斷工作流程。不需切換視窗。快速搜尋地圖。**

---

## 示範影片

https://youtu.be/xv0tVQAi3qo

---

## 功能一覽

| 功能 | 說明 |
|------|------|
| **快速搜尋** | 選取文字 + `Ctrl+Shift+S` / `⌘+⇧+S` 或右鍵選單 → 立即搜尋 Google 地圖 |
| **搜尋列** | 透過 `Alt+Shift+S` / `⌥+⇧+S` 或點擊圖示開啟 — 不離開當前頁面即可搜尋 |
| **快速路線** | 右鍵點擊選取文字或按 `Alt+R` / `⌥+R` → 立即取得導航路線 |
| **搜尋歷史** | 自動儲存最近 10 筆搜尋紀錄，方便快速存取 |
| **收藏清單** | 儲存、匯入、匯出收藏地點為 CSV — 可搭配 Google My Maps 使用 |
| **地點摘要** | 透過 Gemini Flash AI 為頁面上的地點自動生成摘要 |
| **影片摘要** | 擷取並摘要 YouTube 影片中提到的地點資訊 |
| **自動附加連結** | 自動偵測網頁中的地名並附加 Google 地圖連結 |
| **3 種介面語言** | English · 繁體中文 · 日本語 — 自動偵測 |
| **深色 / 淺色主題** | 依使用者偏好切換主題 |

---

## 運作方式

```
你正在瀏覽文章 / 觀看 YouTube 影片 / 規劃旅行
        │
        ▼
選取地名（或按下快捷鍵）
        │
        ├─→ 快速搜尋    → 在分組標籤中開啟 Google 地圖
        ├─→ 快速路線    → 開啟 Google 地圖導航
        └─→ 地點摘要    → Gemini AI 生成地點摘要
        │
        ▼
搜尋歷史自動儲存 · ⭐ 加入收藏清單
        │
        ▼
匯出收藏為 CSV → 匯入 Google My Maps
        → 從任何網站建立你的私人地圖
```

---

## 安裝方式

### 一般使用者 — Chrome 線上應用程式商店（推薦）

直接從 [Chrome 線上應用程式商店](https://chromewebstore.google.com/detail/lfkhadednlnfhmhagkhapejkhpjibaic) 安裝。

### 開發者 — 本地開發設定

1. 複製專案：
   ```bash
   git clone https://github.com/boyonglin/google-maps-extension.git
   cd google-maps-extension
   npm install
   ```

2. 開啟 Chrome → `chrome://extensions/`

3. 開啟右上角的**開發者模式**

4. 點擊**載入未封裝項目** → 選擇 `Package/` 資料夾

<details>
<summary>📸 步驟截圖</summary>

1. **開啟擴充功能頁面** → 點擊「管理擴充功能」<br>
   <img src="https://github.com/user-attachments/assets/e311a046-bf94-42dc-9dc1-0bccfd65a5b0" width="300" alt="管理擴充功能">

2. **啟用開發者模式**<br>
   <img src="https://github.com/user-attachments/assets/cb3b89a0-de1b-4eb9-9742-c30a81d0bf8d" width="300" alt="開發者模式">

3. **載入未封裝項目** → 選擇專案資料夾<br>
   <img src="https://github.com/user-attachments/assets/8aaa1b0e-caa1-41a2-b2c0-4ee3ccd35a53" width="600" alt="載入未封裝項目">

</details>

> 每次修改程式碼後：在 `chrome://extensions/` 中點擊**重新載入**，然後重新整理已開啟的分頁。

---

## 設定

### 鍵盤快捷鍵

| 操作 | 預設快捷鍵 | Mac 快捷鍵 |
|------|-----------|-----------|
| 快速搜尋 | `Ctrl+Shift+S` | `⌘+⇧+S` |
| 開啟搜尋列 | `Alt+Shift+S` | `⌥+⇧+S` |
| 自動附加連結 | `Alt+S` | `⌥+S` |
| 快速路線 | `Alt+R` | `⌥+R` |

自訂快捷鍵：

<details>
<summary>📸 如何變更快捷鍵</summary>

1. 前往擴充功能頁面 → 「管理擴充功能」<br>
   <img src="https://github.com/user-attachments/assets/15098f34-61ff-4572-9ccd-18e16145c07c" width="300" alt="管理擴充功能">

2. 選擇**鍵盤快捷鍵**<br>
   <img src="https://github.com/user-attachments/assets/53fb340c-f558-408b-a720-63e133df0a80" width="300" alt="鍵盤快捷鍵">

3. 點擊輸入欄位並設定你想要的按鍵<br>
   <img src="https://github.com/user-attachments/assets/f43d74c4-00d3-4954-be29-10299a8aef5a" width="600" alt="輸入快捷鍵">

4. *（選用）* 將範圍改為「全域」以在瀏覽器外使用<br>
   <img src="https://github.com/user-attachments/assets/9adf849e-a0d6-4a30-be01-048c6f3dae94" width="600" alt="快捷鍵範圍">

</details>

### Gemini API 金鑰（AI 功能用）

啟用**地點摘要**和**影片摘要**功能，需要一組免費的 Gemini API 金鑰：

1. 前往 [Google AI Studio](https://aistudio.google.com/) 並登入
2. 同意服務條款
3. 點擊**建立 API 金鑰** → 選擇一個專案
4. 複製金鑰並貼到擴充功能的設定頁面

<details>
<summary>📸 步驟截圖</summary>

1. **同意條款**<br>
   <img src="https://github.com/user-attachments/assets/1d11ecdb-80eb-474b-a317-57e367640b15" width="300">

2. **建立 API 金鑰**<br>
   <img src="https://github.com/user-attachments/assets/513df341-b13b-4c06-a4c4-a4cf2f9a68fb" width="600">

3. **選擇新專案**<br>
   <img src="https://github.com/user-attachments/assets/d6e1c5a2-779e-4cd4-9991-37276ed36e5f" width="300">

4. **複製金鑰**<br>
   <img src="https://github.com/user-attachments/assets/ab26eef7-4ff1-4a73-8eae-81cb2cbba6ae" width="600">

</details>

---

## Google My Maps 整合

將收藏匯出為 CSV 並匯入 Google My Maps，建立你的私人地圖：

<details>
<summary>📸 步驟截圖</summary>

1. **開啟 My Maps**：Google 地圖 → 「你的地點」→「地圖」→「建立地圖」<br>
   <img src="https://github.com/user-attachments/assets/4eeed4e8-a8b7-4ce7-a5ec-8439305168d0" width="300">

2. **建立新地圖**<br>
   <img src="https://github.com/user-attachments/assets/08be46cb-b370-4c6f-add7-33f334fbb40d" width="300">

3. **匯入** → 點擊「匯入」<br>
   <img src="https://github.com/user-attachments/assets/2b1b54c6-b5b2-4f73-bdc0-9750cdbe8a70" width="300">

4. **選擇 CSV 檔案** — 從擴充功能匯出的檔案<br>
   <img src="https://github.com/user-attachments/assets/c5f0f043-262f-4611-8b28-4a3247d202b3" width="300">

5. **選擇欄位**以定位地標（預設為「name」）<br>
   <img src="https://github.com/user-attachments/assets/04450982-6066-4228-b6b4-f04dc1914ac9" width="300">

6. **完成！**<br>
   <img src="https://github.com/user-attachments/assets/d3d1f2fb-360e-4239-b8de-2ebec557ed16" width="300">

</details>

---

## 隱私權與安全性

| 問題 | 回答 |
|------|------|
| 資料儲存在哪裡？ | **僅存在瀏覽器本地的 `localStorage`** — 永遠不會離開你的裝置 |
| 會發出網路請求嗎？ | 僅在使用 AI 功能時呼叫 Gemini API，以及 ExtPay（付款）。不會追蹤或蒐集你的搜尋資料。 |
| 網站能看到我的資料嗎？ | 不能。資料隔離在擴充功能的儲存空間中，網頁腳本無法存取。 |
| 我可以刪除資料嗎？ | 可以 — 透過 popup 刪除個別項目，或透過瀏覽器設定清除全部。 |

> **你的搜尋紀錄、收藏和歷史都留在你的裝置上。** 擴充功能僅在你明確使用 AI 摘要功能時才會呼叫外部 API。

---

## 技術架構

| 層級 | 技術 |
|------|------|
| 擴充功能框架 | Chrome Manifest V3 |
| UI | HTML + Bootstrap 5.3 + SCSS |
| AI | Gemini Flash API（`gemini-flash-latest`） |
| 付款 | ExtPay |
| 資料儲存 | `localStorage` |
| 在地化 | Chrome i18n（en · zh-TW · ja） |
| 測試 | Jest + jsdom |

<details>
<summary><strong>📂 專案結構</strong></summary>

```
.
├── Package/
│   ├── _locales/              # i18n（en、zh_TW、ja）
│   ├── css/                   # 編譯後的 CSS
│   ├── dist/
│   │   ├── components/        # 模組化 UI 元件
│   │   ├── hooks/             # 自訂 hooks
│   │   ├── utils/             # 工具函式
│   │   ├── background.js      # Service Worker
│   │   ├── contentScript.js   # Content Script
│   │   └── popup.js           # Popup 邏輯
│   ├── images/                # 圖示與素材
│   ├── vendor/                # 第三方程式庫（Bootstrap 等）
│   ├── manifest.json          # 擴充功能設定
│   └── popup.html             # Popup 介面
├── scss/                      # SCSS 原始檔
├── tests/                     # 單元測試（Jest）
├── jest.config.js
└── package.json
```

</details>

---

## 除錯與測試

| 目標 | 開啟方式 |
|------|---------|
| Background Service Worker | `chrome://extensions/` → The Maps Express → **Service worker** |
| Popup | 右鍵點擊擴充功能圖示 → **檢查彈出式視窗** |
| Content Scripts | DevTools → Sources → Content scripts |
| localStorage | DevTools → Application → Local Storage |

```bash
npm test              # 執行所有單元測試
npm run test:watch    # 監聽模式
npm run test:coverage # 覆蓋率報告
```

---

## 貢獻

歡迎 PR 和 Issue！提交 PR 前，請先開 Issue 討論重大變更。

- 回報問題：[開一個 Issue](../../../issues)
- 功能建議：[開一個 Issue](../../../issues)
- 貢獻程式碼：fork → branch → PR

---

## 授權條款

[MIT](../LICENSE) © 2023–2026 Clancy Lin

---

## 參考資料

- [Chrome 擴充功能官方文件](https://developer.chrome.com/docs/extensions/)
- [Chrome Extension 開發與實作 — 羅拉拉](https://ithelp.ithome.com.tw/articles/10186017)
- [Localizing Your Chrome Extension — Shahed Nasser](https://levelup.gitconnected.com/localizing-your-chrome-extension-an-easy-tutorial-b0892e225576)
- [簡單用 Chrome Extension 接 Gemini API — Wolke](https://wolkesau.medium.com/簡單用-chrome-extension-接-gemini-api-下-prompt-就能實作文章摘要工具參加-google-百萬美金挑戰賽-ac2adda60c6f)

---

## 貢獻者

- Chin-Hsuan Sun
- Michael Wu
