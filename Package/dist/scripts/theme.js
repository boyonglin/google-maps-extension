(function() {
  const THEME_KEY = 'theme';
  const toggle = document.getElementById('themeToggle');

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (toggle) {
      toggle.checked = theme === 'dark';
    }
  }

  function init() {
    chrome.storage.sync.get(THEME_KEY, (data) => {
      const stored = data[THEME_KEY];
      if (stored === 'light' || stored === 'dark') {
        applyTheme(stored);
      } else {
        const osPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(osPrefersDark ? 'dark' : 'light');
      }
    });
  }

  init();

  if (toggle) {
    toggle.addEventListener('change', () => {
      const theme = toggle.checked ? 'dark' : 'light';
      applyTheme(theme);
      chrome.storage.sync.set({ [THEME_KEY]: theme });
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[THEME_KEY]) {
      applyTheme(changes[THEME_KEY].newValue);
    }
  });
})();
