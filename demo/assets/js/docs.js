(function () {
  const LANG_KEY = 'pb-docs-lang';
  const initialLang = localStorage.getItem(LANG_KEY) || 'curl';

  function setLang(lang) {
    document.querySelectorAll('.code-block').forEach(block => {
      block.querySelectorAll('.code-tabs button[data-lang]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
      });
      block.querySelectorAll('.code-pane').forEach(pane => {
        pane.classList.toggle('active', pane.dataset.lang === lang);
      });
    });
    localStorage.setItem(LANG_KEY, lang);
  }
  setLang(initialLang);

  document.addEventListener('click', (e) => {
    const tab = e.target.closest('.code-tabs button[data-lang]');
    if (tab) { setLang(tab.dataset.lang); return; }

    const copy = e.target.closest('.copy-btn');
    if (copy) {
      const block = copy.closest('.code-block');
      const active = block.querySelector('.code-pane.active pre');
      if (!active) return;
      const text = active.innerText;
      const done = () => {
        copy.classList.add('copied');
        const orig = copy.dataset.label || copy.textContent;
        copy.dataset.label = orig;
        copy.textContent = '✓ Copiado';
        showToast('Código copiado para a área de transferência');
        setTimeout(() => { copy.classList.remove('copied'); copy.textContent = orig; }, 1600);
      };
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(done).catch(() => fallback(text, done));
      } else {
        fallback(text, done);
      }
      return;
    }

    const respHead = e.target.closest('.response-head');
    if (respHead) {
      respHead.parentElement.classList.toggle('open');
      return;
    }

    const sideToggle = e.target.closest('[data-docs-sidebar-toggle]');
    if (sideToggle) {
      document.querySelector('.docs-sidebar').classList.toggle('open');
    }
  });

  function fallback(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) {}
    document.body.removeChild(ta);
  }

  let toastEl;
  function showToast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast success';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.remove('show'), 1800);
  }

  const sectionIds = Array.from(document.querySelectorAll('.endpoint[id], .doc-section[id]')).map(el => el.id);
  const links = new Map();
  document.querySelectorAll('.docs-sidebar a[href^="#"]').forEach(a => {
    links.set(a.getAttribute('href').slice(1), a);
  });

  function spy() {
    let current = sectionIds[0];
    const offset = 120;
    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (!el) continue;
      const top = el.getBoundingClientRect().top;
      if (top - offset <= 0) current = id;
    }
    links.forEach((a, id) => a.classList.toggle('active', id === current));
  }
  let raf = 0;
  window.addEventListener('scroll', () => {
    if (raf) return;
    raf = requestAnimationFrame(() => { spy(); raf = 0; });
  }, { passive: true });
  spy();
})();
