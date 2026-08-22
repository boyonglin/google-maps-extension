# The Maps Express v1.17.0 data-flow audit

Last audited: 2026-08-22

## Single purpose

The Maps Express helps users find, organize, and open locations from the active webpage in Google Maps, with optional Gemini-assisted extraction and summaries.

## Data flow

| Data                                                                          | Trigger/source                                         | Local storage                                                                                                | External destination                                                                         | Retention                                        |
| ----------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Search text or highlighted place                                              | Search box, shortcut, or context menu                  | Search history in `chrome.storage.local` unless Incognito Mode is enabled                                    | Included in a Google Maps URL when the user searches                                         | User-configurable 1–100 items; 10 by default     |
| Starting address and destination                                              | User settings and highlighted text                     | `startAddr` in `chrome.storage.local`                                                                        | Included in a Google Maps directions URL when requested                                      | Until reset or extension data is cleared         |
| Favorites and optional clues                                                  | User saves/imports places                              | `favoriteList` in `chrome.storage.local`                                                                     | Sent to Gemini only when the user runs Tidy; exported to a local CSV only on explicit export | Until deleted or extension data is cleared       |
| Current page title and visible text                                           | User runs Place Summary or Auto-attach                 | Not stored as raw page content                                                                               | Google Gemini API over HTTPS                                                                 | Request-only; Gemini's own retention rules apply |
| YouTube title and description                                                 | User runs normal Place Summary on a YouTube watch page | Not stored as raw page content                                                                               | Google Gemini API over HTTPS                                                                 | Request-only; Gemini's own retention rules apply |
| Canonical YouTube video URL                                                   | User enables Video Summary and runs summary            | Not stored after the request                                                                                 | Google Gemini API over HTTPS                                                                 | Request-only; Gemini's own retention rules apply |
| AI result                                                                     | Gemini response                                        | `summaryList` and `timestamp` in `chrome.storage.local` unless Incognito Mode is enabled                     | Not retransmitted except when the user saves or organizes a result                           | Up to 24 hours or until cleared                  |
| Gemini API key                                                                | User enters it                                         | Encrypted value plus local AES key in `chrome.storage.local`; positive-verification hash cached for 24 hours | Google Gemini API in an HTTPS request header                                                 | Until reset or extension data is cleared         |
| Theme, language, popup size, history limit, feature toggles, onboarding state | User settings and UI state                             | `chrome.storage.local` and extension `localStorage` for language cache                                       | None                                                                                         | Until reset or extension data is cleared         |
| ExtensionPay identifier and purchase/trial state                              | Install and premium actions                            | ExtensionPay uses extension local/sync storage                                                               | `extensionpay.com` over HTTPS                                                                | Per ExtensionPay and Chrome sync behavior        |
| Ordinary web-request metadata                                                 | User opens a help, feedback, privacy, support, or API-key link | None                                                                                                         | The selected Figma Sites, Notion, GitHub, Chrome Web Store, Fillout, or Google AI Studio page | Per destination site's policy                    |

Raw page context is capped at 60,000 characters before it can be sent to Gemini. Normal YouTube summary reads only the video's title and description, not comments, recommendations, or unrelated video cards.

## Permissions

| Permission                                    | Why it is required                                                                                                             | Minimization                                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `activeTab`                                   | Read or modify only the current page after the user clicks the extension, invokes a shortcut, or chooses a context-menu action | Replaces the former persistent `<all_urls>` content script |
| `scripting`                                   | Inject the in-page UI and page helper after an explicit user action                                                            | No background or automatic all-sites injection             |
| `contextMenus`                                | Search or request directions for user-highlighted text                                                                         | Selection-only menu items                                  |
| `storage`                                     | Keep user settings, local lists, encrypted API key, summary cache, and ExtensionPay state                                      | No developer backend                                       |
| `tabGroups`                                   | Group multiple Google Maps tabs when the user opens a list                                                                     | Used only for the explicit open-list action                |
| `https://generativelanguage.googleapis.com/*` | Verify the user's Gemini key and run user-requested AI features                                                                | Only Gemini API host retained                              |
| `https://extensionpay.com/*`                  | Purchase, trial, restore, and entitlement checks                                                                               | Only ExtensionPay host retained                            |

Removed in v1.17.0: persistent `<all_urls>` content scripts, the YouTube host permission used only for a duration estimate, and the Google Analytics host permission.

## Remote code, CSP, and packaged artifacts

- Manifest V3 service worker and extension pages execute only files packaged under `Package/`.
- No remote `<script>` tags, `eval`, `new Function`, remote WebAssembly, or fetched-code execution are permitted.
- `content_security_policy.extension_pages` is `script-src 'self'; object-src 'none'`.
- Bootstrap, fonts, the browser polyfill, and ExtensionPay client code are bundled locally.
- Remote responses from Gemini and ExtensionPay are treated as data, not executable code.
- `npm run audit:extension` checks the manifest, locale parity, referenced files, network hosts, CSP, and common remote-code patterns before release.
