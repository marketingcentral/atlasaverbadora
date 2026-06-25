(function () {
  const KEY = 'pb-theme';
  const root = document.documentElement;
  const saved = localStorage.getItem(KEY);
  const initial = saved || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  root.setAttribute('data-theme', initial);

  function setTheme(t) {
    root.setAttribute('data-theme', t);
    localStorage.setItem(KEY, t);
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-theme-toggle]');
    if (!btn) return;
    const cur = root.getAttribute('data-theme');
    setTheme(cur === 'dark' ? 'light' : 'dark');
  });
})();
