<div align="center">

# The Maps Express：Google マップの AI ファースト拡張機能

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

> **Google マップのワークフローを効率化する** Chrome 拡張機能 — **ショートカット一つ**または右クリックで、場所の検索・ルート案内・お気に入り管理が可能。さらに Gemini による **AI 搭載の場所サマリー**も。
>
> **ワークフローを中断しない。コンテキストの切り替え不要。高速マップ検索。**

---

## デモ

https://youtu.be/xv0tVQAi3qo

---

## 機能一覧

| 機能 | 詳細 |
|------|------|
| **クイック検索** | テキスト選択 + `Ctrl+Shift+S` / `⌘+⇧+S` または右クリック → 即座に Google マップ検索 |
| **検索バー** | `Alt+Shift+S` / `⌥+⇧+S` またはアイコンクリックで開く — ページを離れずに検索 |
| **クイックルート** | 選択テキストを右クリック、または `Alt+R` / `⌥+R` → 即座にルート案内を取得 |
| **検索履歴** | 直近 10 件の検索を自動保存、すぐにアクセス可能 |
| **お気に入りリスト** | お気に入りの場所を保存・インポート・エクスポート（CSV）— Google My Maps 対応 |
| **場所サマリー** | Gemini Flash AI がページ上の場所の要約を自動生成 |
| **動画サマリー** | YouTube 動画内で言及された場所を抽出・要約 |
| **リンク自動付加** | Web ページ上の地名を自動検出し、Google マップリンクを付加 |
| **3 つの UI 言語** | English · 繁體中文 · 日本語 — 自動検出 |
| **ダーク / ライトテーマ** | お好みに合わせたテーマ切り替え |

---

## 仕組み

```
記事を閲覧中 / YouTube 動画を視聴中 / 旅行を計画中
        │
        ▼
地名を選択（またはショートカットキーを押す）
        │
        ├─→ クイック検索  → グループタブで Google マップを開く
        ├─→ クイックルート → Google マップのルート案内を開く
        └─→ 場所サマリー  → Gemini AI が場所の要約を生成
        │
        ▼
検索履歴を自動保存 · ⭐ お気に入りリストに追加
        │
        ▼
お気に入りを CSV でエクスポート → Google My Maps にインポート
        → あらゆる Web サイトから自分だけの地図を作成
```

---

## インストール

### 一般ユーザー — Chrome ウェブストア（推奨）

[Chrome ウェブストア](https://chromewebstore.google.com/detail/lfkhadednlnfhmhagkhapejkhpjibaic) から直接インストールできます。

### 開発者 — ローカルセットアップ

1. リポジトリをクローン：
   ```bash
   git clone https://github.com/boyonglin/google-maps-extension.git
   cd google-maps-extension
   npm install
   ```

2. Chrome を開く → `chrome://extensions/`

3. 右上の **デベロッパーモード** をオンにする

4. **パッケージ化されていない拡張機能を読み込む** → `Package/` フォルダを選択

<details>
<summary>📸 ステップごとのスクリーンショット</summary>

1. **拡張機能ページを開く** → 「拡張機能を管理」をクリック<br>
   <img src="https://github.com/user-attachments/assets/e311a046-bf94-42dc-9dc1-0bccfd65a5b0" width="300" alt="拡張機能を管理">

2. **デベロッパーモードを有効化**<br>
   <img src="https://github.com/user-attachments/assets/cb3b89a0-de1b-4eb9-9742-c30a81d0bf8d" width="300" alt="デベロッパーモード">

3. **パッケージ化されていない拡張機能を読み込む** → プロジェクトフォルダを選択<br>
   <img src="https://github.com/user-attachments/assets/8aaa1b0e-caa1-41a2-b2c0-4ee3ccd35a53" width="600" alt="拡張機能を読み込む">

</details>

> コード変更後：`chrome://extensions/` で拡張機能カードの **再読み込み** をクリックし、開いているタブをリフレッシュしてください。

---

## 設定

### キーボードショートカット

| 操作 | デフォルトショートカット | Mac ショートカット |
|------|----------------------|-------------------|
| クイック検索 | `Ctrl+Shift+S` | `⌘+⇧+S` |
| 検索バーを開く | `Alt+Shift+S` | `⌥+⇧+S` |
| リンク自動付加 | `Alt+S` | `⌥+S` |
| クイックルート | `Alt+R` | `⌥+R` |

ショートカットのカスタマイズ：

<details>
<summary>📸 ショートカットの変更方法</summary>

1. 拡張機能ページ → 「拡張機能を管理」<br>
   <img src="https://github.com/user-attachments/assets/15098f34-61ff-4572-9ccd-18e16145c07c" width="300" alt="拡張機能を管理">

2. **キーボード ショートカット** を選択<br>
   <img src="https://github.com/user-attachments/assets/53fb340c-f558-408b-a720-63e133df0a80" width="300" alt="キーボードショートカット">

3. 入力欄をクリックして希望のキーを設定<br>
   <img src="https://github.com/user-attachments/assets/f43d74c4-00d3-4954-be29-10299a8aef5a" width="600" alt="ショートカットを入力">

4. *（任意）* ブラウザ外でも使えるようにスコープを「グローバル」に変更<br>
   <img src="https://github.com/user-attachments/assets/9adf849e-a0d6-4a30-be01-048c6f3dae94" width="600" alt="ショートカットスコープ">

</details>

### Gemini API キー（AI 機能用）

**場所サマリー** と **動画サマリー** を有効化するには、無料の Gemini API キーが必要です：

1. [Google AI Studio](https://aistudio.google.com/) にアクセスしてサインイン
2. 利用規約に同意
3. **API キーを作成** → プロジェクトを選択
4. キーをコピーして拡張機能の設定に貼り付け

<details>
<summary>📸 ステップごとのスクリーンショット</summary>

1. **利用規約に同意**<br>
   <img src="https://github.com/user-attachments/assets/1d11ecdb-80eb-474b-a317-57e367640b15" width="300">

2. **API キーを作成**<br>
   <img src="https://github.com/user-attachments/assets/513df341-b13b-4c06-a4c4-a4cf2f9a68fb" width="600">

3. **新しいプロジェクトを選択**<br>
   <img src="https://github.com/user-attachments/assets/d6e1c5a2-779e-4cd4-9991-37276ed36e5f" width="300">

4. **キーをコピー**<br>
   <img src="https://github.com/user-attachments/assets/ab26eef7-4ff1-4a73-8eae-81cb2cbba6ae" width="600">

</details>

---

## Google My Maps 連携

お気に入りを CSV でエクスポートし、Google My Maps にインポートしてオリジナル地図を作成：

<details>
<summary>📸 ステップごとのスクリーンショット</summary>

1. **My Maps を開く**：Google マップ →「マイプレイス」→「マイマップ」→「地図を作成」<br>
   <img src="https://github.com/user-attachments/assets/4eeed4e8-a8b7-4ce7-a5ec-8439305168d0" width="300">

2. **新しい地図を作成**<br>
   <img src="https://github.com/user-attachments/assets/08be46cb-b370-4c6f-add7-33f334fbb40d" width="300">

3. **インポート** → 「インポート」をクリック<br>
   <img src="https://github.com/user-attachments/assets/2b1b54c6-b5b2-4f73-bdc0-9750cdbe8a70" width="300">

4. **CSV ファイルを選択** — 拡張機能からエクスポートしたファイル<br>
   <img src="https://github.com/user-attachments/assets/c5f0f043-262f-4611-8b28-4a3247d202b3" width="300">

5. **列を選択** してプレースマークを配置（デフォルト：「name」）<br>
   <img src="https://github.com/user-attachments/assets/04450982-6066-4228-b6b4-f04dc1914ac9" width="300">

6. **完了！**<br>
   <img src="https://github.com/user-attachments/assets/d3d1f2fb-360e-4239-b8de-2ebec557ed16" width="300">

</details>

---

## プライバシーとセキュリティ

| 質問 | 回答 |
|------|------|
| データはどこに保存されますか？ | **ブラウザローカルの `localStorage` のみ** — デバイスから外部に送信されることはありません |
| ネットワークリクエストは発生しますか？ | AI 機能使用時の Gemini API 呼び出しと、ExtPay（決済）のみ。検索データのトラッキングや収集は行いません。 |
| Web サイトが私のデータを見ることはできますか？ | できません。データは拡張機能のストレージに隔離されており、ページスクリプトからはアクセスできません。 |
| データを削除できますか？ | はい — ポップアップから個別に削除するか、ブラウザ設定からすべてクリアできます。 |

> **検索履歴、お気に入り、履歴はすべてお使いのデバイスに保存されます。** 拡張機能がが外部 API を呼び出すのは、AI サマリー機能を明示的に使用した場合のみです。

---

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| 拡張機能フレームワーク | Chrome Manifest V3 |
| UI | HTML + Bootstrap 5.3 + SCSS |
| AI | Gemini Flash API（`gemini-flash-latest`） |
| 決済 | ExtPay |
| データ永続化 | `localStorage` |
| ローカライゼーション | Chrome i18n（en · zh-TW · ja） |
| テスト | Jest + jsdom |

<details>
<summary><strong>📂 プロジェクト構成</strong></summary>

```
.
├── Package/
│   ├── _locales/              # i18n（en、zh_TW、ja）
│   ├── css/                   # コンパイル済み CSS
│   ├── dist/
│   │   ├── components/        # モジュール化された UI コンポーネント
│   │   ├── hooks/             # カスタムフック
│   │   ├── utils/             # ユーティリティ関数
│   │   ├── background.js      # Service Worker
│   │   ├── contentScript.js   # Content Script
│   │   └── popup.js           # ポップアップロジック
│   ├── images/                # アイコンとアセット
│   ├── vendor/                # サードパーティライブラリ（Bootstrap 等）
│   ├── manifest.json          # 拡張機能設定
│   └── popup.html             # ポップアップインターフェース
├── scss/                      # SCSS ソースファイル
├── tests/                     # ユニットテスト（Jest）
├── jest.config.js
└── package.json
```

</details>

---

## デバッグとテスト

| 対象 | アクセス方法 |
|------|------------|
| Background Service Worker | `chrome://extensions/` → The Maps Express → **Service worker** |
| ポップアップ | 拡張機能アイコンを右クリック → **ポップアップを検証** |
| Content Scripts | DevTools → Sources → Content scripts |
| localStorage | DevTools → Application → Local Storage |

```bash
npm test              # 全ユニットテストを実行
npm run test:watch    # ウォッチモード
npm run test:coverage # カバレッジレポート
```

---

## コントリビュート

PR と Issue を歓迎します！PR を提出する前に、大きな変更については Issue で議論してください。

- バグ報告：[Issue を作成](../../../issues)
- 機能リクエスト：[Issue を作成](../../../issues)
- コード貢献：fork → branch → PR

---

## ライセンス

[MIT](../LICENSE) © 2023–2026 Clancy Lin

---

## 参考資料

- [Chrome 拡張機能公式ドキュメント](https://developer.chrome.com/docs/extensions/)
- [Chrome Extension 開發與實作 — 羅拉拉](https://ithelp.ithome.com.tw/articles/10186017)
- [Localizing Your Chrome Extension — Shahed Nasser](https://levelup.gitconnected.com/localizing-your-chrome-extension-an-easy-tutorial-b0892e225576)
- [簡単に Chrome Extension で Gemini API を使う — Wolke](https://wolkesau.medium.com/簡單用-chrome-extension-接-gemini-api-下-prompt-就能實作文章摘要工具參加-google-百萬美金挑戰賽-ac2adda60c6f)

---

## コントリビューター

- Chin-Hsuan Sun
- Michael Wu
