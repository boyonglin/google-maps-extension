# Chrome Web Store v1.17.0 release checklist

This checklist deliberately stops before publishing or submitting for review.

## Repository and package

- [ ] Review the v1.17.0 diff and confirm product wording.
- [ ] Run `npm ci` with Node 22 or later.
- [ ] Run `npm run verify`.
- [ ] Load `Package/` unpacked in Chrome and complete the manual scenarios below.
- [ ] Create the upload ZIP from the **contents** of `Package/`, so `manifest.json` is at the ZIP root.
- [ ] Inspect the ZIP and confirm it contains no `node_modules`, tests, Git metadata, secrets, or analytics files.

## Manual Chrome scenarios

- [ ] Clicking the toolbar icon opens and closes the in-page UI on ordinary HTTP and HTTPS pages.
- [ ] The toolbar action, Quick Search, Quick Directions, and Auto-attach still work after a page reload.
- [ ] Restricted pages such as `chrome://extensions` fail cleanly without injecting.
- [ ] Search history, favorites, import/export, list grouping, settings, and dark mode work.
- [ ] Place Summary shows the data disclosure before the action and succeeds with a valid Gemini key.
- [ ] Normal YouTube Place Summary uses the title/description; Video Summary uses the canonical video URL.
- [ ] Auto-attach and Tidy show their disclosure and work when entitled.
- [ ] Clearing history and summaries, Incognito Mode, API-key reset, purchase, and restore work.
- [ ] Test English, Traditional Chinese, and Japanese UI text at narrow and tall popup sizes.

## Public privacy policy

- [ ] Push `PrivacyPolicy_en.html` to the public repository.
- [ ] Publish it at a stable HTTPS URL that works without login. GitHub Pages is recommended; the repository file URL is an interim fallback.
- [ ] Open the public URL in a private browser window and verify the August 22, 2026 text is visible.
- [ ] In Developer Dashboard → Store listing / Privacy, replace the current PrivacyPolicies.com URL with the verified URL.
- [ ] Keep the extension footer Privacy link and Dashboard URL pointed at the same policy.

## Developer Dashboard → Privacy practices

Use this single-purpose statement:

> Helps users find, organize, and open locations from the active webpage in Google Maps, with optional Gemini-assisted extraction and summaries.

Use these permission justifications:

- `activeTab`: Accesses only the current page after the user clicks the extension, invokes a shortcut, or chooses a context-menu action, so it can show the in-page UI and run a requested page feature.
- `scripting`: Injects the packaged in-page UI and helper only after an explicit user action; the extension no longer runs on every site by default.
- `contextMenus`: Adds selection-only actions to search Google Maps or request directions.
- `storage`: Stores user settings, history, favorites, encrypted Gemini key, 24-hour summary cache, and ExtensionPay state.
- `tabGroups`: Groups Google Maps tabs only when the user opens multiple saved locations.
- Gemini host: Verifies the user's key and sends only data required for a user-requested AI feature.
- ExtensionPay host: Performs purchase, trial, restore, and entitlement checks.

Review and select every data category the Dashboard presents that covers the following actual handling:

- Authentication information: Gemini API key and ExtensionPay identifier.
- Website content: current-page title and relevant visible text; YouTube title/description or video URL.
- User activity / browsing activity: active-page access, search history, and user-invoked location actions.
- Personally identifiable information: a user-entered starting address may be a personal address.
- User-generated content: saved/imported location names, clues, and lists if the Dashboard offers this category.
- Financial/payment information: select it only if the Dashboard defines ExtensionPay entitlement/purchase state as financial information; The Maps Express does not receive full card details.

Certify only statements that remain true after the final manual review: no sale, no unrelated transfer, no personalized advertising, no credit/lending use, and compliance with Limited Use.

## Store listing

- [ ] Remove the Gemini 1.5 Flash claim and fixed `15 RPM / 1,500 RPD / 1M TPM` quota text.
- [ ] State that Gemini availability, rate limits, price, and data treatment depend on the user's Google project and current Google terms.
- [ ] Add this disclosure near the AI feature description:

  > When you run an AI feature, relevant current-page text, a selected YouTube video URL, or saved location names are sent securely to Google Gemini using your API key.

- [ ] State that the extension uses temporary active-tab access after user action and does not run on every site by default.
- [ ] Keep screenshots and promotional media consistent with v1.17.0 UI and the three supported locales.
- [ ] Upload the ZIP and review the permission-diff warning before saving the draft.
- [ ] Do not submit until the privacy URL, listing, Privacy practices, test evidence, and unpacked manual review all match.

## Gemini terms decision before submission

Google's Gemini API Additional Terms effective March 23, 2026 currently state that users must be at least 18, use the API for professional or business purposes, and use only paid services when an API client is made available in the EEA, Switzerland, or the United Kingdom. They also state that unpaid-service input and output may be used for product improvement and processed by human reviewers.

- [ ] Decide whether The Maps Express will require paid Gemini projects for every user, limit availability/audience to fit these terms, or obtain legal/product advice on another compliant design.
- [ ] Make the store listing and onboarding state the chosen audience, age, region, and billing requirements.
- [ ] Do not claim that Gemini content is never read by humans; keep the unpaid-service warning visible unless the product technically enforces paid-service use.

## Gemini model decision

v1.17.0 currently retains `gemini-flash-lite-latest` to avoid changing summary behavior during the compliance release. Google's model documentation says `latest` aliases can be hot-swapped, while a specific stable model is the safer production choice.

- [ ] Decide whether to keep automatic model upgrades or pin and separately test a named stable model before submission.
