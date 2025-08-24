(function () {
  const root = document.documentElement;
  const toggleId = 'themeToggle';

  function apply(theme) {
    root.dataset.theme = theme;
  }

  function systemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function initToggle(theme) {
    const toggle = document.getElementById(toggleId);
    if (!toggle) return;
    toggle.checked = theme === 'dark';
    toggle.addEventListener('change', () => {
      const next = toggle.checked ? 'dark' : 'light';
      apply(next);
      chrome.storage.sync.set({ theme: next });
    });
  }

  function init() {
    chrome.storage.sync.get('theme', (data) => {
      const theme = data.theme || systemTheme();
      apply(theme);
      initToggle(theme);
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      chrome.storage.sync.get('theme', (data) => {
        if (!data.theme) {
          apply(e.matches ? 'dark' : 'light');
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
