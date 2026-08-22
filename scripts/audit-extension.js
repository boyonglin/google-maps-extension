#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const packageDir = path.join(root, "Package");
const manifestPath = path.join(packageDir, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function sameValues(actual = [], expected = []) {
  return [...actual].sort().join("\n") === [...expected].sort().join("\n");
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function requirePackagedFile(relativePath, label) {
  check(fs.existsSync(path.join(packageDir, relativePath)), `${label} is missing: ${relativePath}`);
}

check(manifest.manifest_version === 3, "manifest_version must be 3");
check(manifest.version === "1.17.0", "manifest version must be 1.17.0");
check(!manifest.content_scripts, "persistent content_scripts must not be present");
check(
  sameValues(manifest.permissions, [
    "activeTab",
    "contextMenus",
    "scripting",
    "storage",
    "tabGroups",
  ]),
  "permissions differ from the audited minimum set"
);
check(
  sameValues(manifest.host_permissions, [
    "https://extensionpay.com/*",
    "https://generativelanguage.googleapis.com/*",
  ]),
  "host_permissions differ from the audited Gemini and ExtensionPay hosts"
);
check(
  manifest.content_security_policy?.extension_pages === "script-src 'self'; object-src 'none'",
  "extension page CSP must allow only packaged scripts and no objects"
);

for (const resourceGroup of manifest.web_accessible_resources || []) {
  check(
    !resourceGroup.matches?.includes("<all_urls>"),
    "web accessible resources must not match <all_urls>"
  );
  for (const resource of resourceGroup.resources || []) {
    requirePackagedFile(resource, "web accessible resource");
  }
}

requirePackagedFile(manifest.background?.service_worker, "service worker");
for (const iconPath of Object.values(manifest.icons || {})) {
  requirePackagedFile(iconPath, "extension icon");
}
for (const iconPath of Object.values(manifest.action?.default_icon || {})) {
  requirePackagedFile(iconPath, "action icon");
}
if (manifest.action?.default_popup) {
  requirePackagedFile(manifest.action.default_popup, "action popup");
}

const localeDirectories = fs
  .readdirSync(path.join(packageDir, "_locales"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
const localeKeys = localeDirectories.map((locale) => {
  const messages = JSON.parse(
    fs.readFileSync(path.join(packageDir, "_locales", locale, "messages.json"), "utf8")
  );
  return { locale, keys: Object.keys(messages).sort() };
});
const canonicalKeys = localeKeys[0]?.keys || [];
for (const { locale, keys } of localeKeys.slice(1)) {
  check(sameValues(keys, canonicalKeys), `locale keys are out of sync: ${locale}`);
}

const scannedFiles = walk(packageDir).filter((file) => /\.(?:html|js)$/i.test(file));
const forbiddenPatterns = [
  [/<script\b[^>]*\bsrc\s*=\s*["']https?:\/\//i, "remote script tag"],
  [/\beval\s*\(/, "eval call"],
  [/\bnew\s+Function\s*\(/, "Function constructor"],
  [/\bWebAssembly\b/, "WebAssembly execution"],
  [/\bimportScripts\s*\(\s*["']https?:\/\//, "remote importScripts call"],
  [/\bimport\s*\(\s*["']https?:\/\//, "remote dynamic import"],
  [/google-analytics\.com|GA_MEASUREMENT_ID|GA_API_SECRET/, "removed analytics code"],
  [/AIza[0-9A-Za-z_-]{30,}/, "hard-coded Google API key"],
];

for (const file of scannedFiles) {
  const content = fs.readFileSync(file, "utf8");
  for (const [pattern, label] of forbiddenPatterns) {
    check(!pattern.test(content), `${label} found in ${path.relative(root, file)}`);
  }
}

const packagedPaths = walk(packageDir).map((file) => path.relative(packageDir, file));
check(
  !packagedPaths.some((file) => /(^|[\\/])node_modules([\\/]|$)/.test(file)),
  "node_modules found in Package"
);
check(
  !packagedPaths.some((file) => /(^|[\\/])tests?([\\/]|$)/.test(file)),
  "tests found in Package"
);
check(
  !packagedPaths.some((file) => /(^|[\\/])\.git([\\/]|$)/.test(file)),
  "Git metadata found in Package"
);

if (failures.length) {
  console.error("Extension audit failed:\n- " + failures.join("\n- "));
  process.exitCode = 1;
} else {
  console.log(
    `Extension audit passed (${packagedPaths.length} packaged files, ${localeKeys.length} locales).`
  );
}
