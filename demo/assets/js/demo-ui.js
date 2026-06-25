(function () {
  const tpl = document.getElementById('screens-tpl');
  if (tpl) {
    document.querySelectorAll('.phone-mock .screens').forEach(host => {
      host.appendChild(tpl.content.cloneNode(true));
    });
  }
  document.querySelectorAll('.phone-mock').forEach(setupPhone);

  function setupPhone(phone) {
    const screens = phone.querySelectorAll('.screen');
    const tabs = phone.querySelectorAll('.phone-tabbar .tab');
    const isClean = phone.classList.contains('clean');

    function go(target) {
      screens.forEach(s => s.classList.remove('active'));
      const next = phone.querySelector('.screen-' + target);
      if (next) next.classList.add('active');
      tabs.forEach(t => t.classList.remove('active'));
      const tab = phone.querySelector('.phone-tabbar [data-nav="' + target + '"]');
      if (tab) tab.classList.add('active');
      const body = next && next.querySelector('.phone-body');
      if (body) body.scrollTop = 0;
    }

    phone.addEventListener('click', (e) => {
      const navEl = e.target.closest('[data-nav]');
      if (!navEl || !phone.contains(navEl)) return;
      go(navEl.dataset.nav);
    });

    setupSim(phone, isClean);
    setupContractsTabs(phone);
    setupAccountOptions(phone);
    setupToggle(phone);
  }

  function setupSim(phone, isClean) {
    const slider = phone.querySelector('[data-sim-slider]');
    const fill = phone.querySelector('[data-sim-fill]');
    const knob = phone.querySelector('[data-sim-knob]');
    const valEl = phone.querySelector('[data-sim-val]');
    const parcEl = phone.querySelector('[data-sim-parcela]');
    const totalEl = phone.querySelector('[data-sim-total]');
    const parcBtns = phone.querySelectorAll('[data-sim-parcels] button');
    if (!slider) return;

    const state = { valor: 8500, parcelas: 36, taxa: 0.0179, min: 500, max: 12280 };

    function fmt(v) {
      return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    function recalc() {
      const i = state.taxa;
      const n = state.parcelas;
      const p = state.valor * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
      if (valEl) valEl.textContent = 'R$ ' + fmt(state.valor);
      if (parcEl) parcEl.textContent = 'R$ ' + fmt(p);
      if (totalEl) totalEl.textContent = 'R$ ' + fmt(p * n);
    }
    function setPos(pct) {
      if (fill) fill.style.width = pct + '%';
      if (knob) knob.style.left = pct + '%';
    }
    function moveTo(clientX) {
      const r = slider.getBoundingClientRect();
      const x = Math.max(0, Math.min(r.width, clientX - r.left));
      const pct = x / r.width;
      state.valor = Math.max(state.min, Math.round((state.min + pct * (state.max - state.min)) / 100) * 100);
      setPos(((state.valor - state.min) / (state.max - state.min)) * 100);
      recalc();
    }
    let dragging = false;
    slider.addEventListener('pointerdown', (e) => {
      dragging = true;
      slider.setPointerCapture(e.pointerId);
      moveTo(e.clientX);
      e.stopPropagation();
    });
    slider.addEventListener('pointermove', (e) => { if (dragging) { moveTo(e.clientX); e.stopPropagation(); } });
    slider.addEventListener('pointerup', () => { dragging = false; });
    slider.addEventListener('pointercancel', () => { dragging = false; });

    parcBtns.forEach(b => b.addEventListener('click', (e) => {
      e.stopPropagation();
      parcBtns.forEach(o => o.classList.remove('active'));
      b.classList.add('active');
      state.parcelas = parseInt(b.dataset.n, 10);
      recalc();
    }));

    setPos(((state.valor - state.min) / (state.max - state.min)) * 100);
    recalc();
  }

  function setupContractsTabs(phone) {
    const tabs = phone.querySelectorAll('[data-c-tabs] button');
    tabs.forEach(b => b.addEventListener('click', (e) => {
      e.stopPropagation();
      tabs.forEach(o => o.classList.remove('active'));
      b.classList.add('active');
    }));
  }

  function setupAccountOptions(phone) {
    const group = phone.querySelectorAll('[data-acc-group] .acc-option');
    group.forEach(o => o.addEventListener('click', (e) => {
      e.stopPropagation();
      group.forEach(g => g.classList.remove('selected'));
      o.classList.add('selected');
    }));
  }

  function setupToggle(phone) {
    phone.querySelectorAll('[data-toggle]').forEach(t => {
      t.addEventListener('click', (e) => {
        e.stopPropagation();
        t.classList.toggle('on');
      });
    });
  }
})();
