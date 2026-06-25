(function () {
  const btnSim = document.getElementById('run-sim');
  const btnReset = document.getElementById('reset-sim');
  const timeline = document.getElementById('flow-timeline');
  if (!btnSim || !timeline) return;

  const STEPS = [
    { node: 'app-mobile', delay: 0,    text: '<span class="ts">12:04:01.220</span> <span class="info">→</span> App envia POST /v1/propostas/simular { valor: 8500, parcelas: 60 }', edge: null },
    { node: 'edge',       delay: 120,  text: '<span class="ts">12:04:01.342</span> <span class="info">→</span> Worker auth-gateway valida JWT (kid=2026-q2)', edge: 'app-mobile→edge' },
    { node: 'kv',         delay: 220,  text: '<span class="ts">12:04:01.398</span> <span class="warn">⚡</span> KV lookup margem:srv:42 → <b>MISS</b>', edge: 'edge→kv' },
    { node: 'neon',       delay: 320,  text: '<span class="ts">12:04:01.512</span> <span class="info">→</span> Neon SELECT v_servidor_margem (read replica GRU) — 14ms', edge: 'edge→neon' },
    { node: 'prefeituras',delay: 460,  text: '<span class="ts">12:04:01.701</span> <span class="info">→</span> Cache de folha sincronizado às 02:00 → margem R$ 1.480,32', edge: 'edge→prefeituras' },
    { node: 'bancos',     delay: 620,  text: '<span class="ts">12:04:01.940</span> <span class="info">→</span> Fan-out para 4 bancos parceiros (paralelo, timeout 1.2s)', edge: 'edge→bancos' },
    { node: 'bancos',     delay: 820,  text: '<span class="ts">12:04:02.310</span> <span class="ok">✓</span> 4/4 respostas — melhor taxa: 1,72% a.m. (Banco Y)', edge: null },
    { node: 'kv',         delay: 980,  text: '<span class="ts">12:04:02.420</span> <span class="ok">✓</span> KV SET propostas:cache:srv:42:hash (TTL 90s)', edge: 'edge→kv' },
    { node: 'firebase',   delay: 1120, text: '<span class="ts">12:04:02.580</span> <span class="info">→</span> Push opcional: "3 ofertas prontas para você"', edge: 'edge→firebase' },
    { node: 'sentry',     delay: 1240, text: '<span class="ts">12:04:02.612</span> <span class="ok">✓</span> Trace enviado — duração total 1392ms', edge: 'edge→sentry' },
    { node: 'app-mobile', delay: 1400, text: '<span class="ts">12:04:02.620</span> <span class="ok">✓</span> 200 OK — payload normalizado entregue ao app', edge: 'edge→app-mobile' }
  ];

  const EDGE_MAP = {
    'app-mobile→edge': 'e-app-edge',
    'edge→kv':         'e-edge-kv',
    'edge→neon':       'e-edge-neon',
    'edge→prefeituras':'e-edge-pref',
    'edge→bancos':     'e-edge-bancos',
    'edge→firebase':   'e-edge-firebase',
    'edge→sentry':     'e-edge-sentry',
    'edge→app-mobile': 'e-app-edge'
  };

  let running = false;
  const timers = [];

  function clearTimers() { timers.forEach(clearTimeout); timers.length = 0; }
  function clearActive() {
    document.querySelectorAll('.arch-node.is-active').forEach(n => n.classList.remove('is-active'));
    document.querySelectorAll('.arch-edge.flow-active').forEach(e => e.classList.remove('flow-active'));
  }
  function reset() {
    running = false; clearTimers(); clearActive();
    timeline.innerHTML = '';
    btnSim.disabled = false;
    btnSim.textContent = '▶ Simular fluxo';
  }

  function activate(nodeId, edgeKey) {
    const node = document.querySelector(`.arch-node[data-node="${nodeId}"]`);
    if (node) {
      node.classList.add('is-active');
      timers.push(setTimeout(() => node.classList.remove('is-active'), 900));
    }
    if (edgeKey) {
      const id = EDGE_MAP[edgeKey];
      const edge = id ? document.getElementById(id) : null;
      if (edge) {
        edge.classList.add('flow-active');
        timers.push(setTimeout(() => edge.classList.remove('flow-active'), 1200));
      }
    }
  }

  function run() {
    if (running) return;
    running = true;
    btnSim.disabled = true;
    btnSim.textContent = '⏵ Em execução...';
    timeline.innerHTML = '';
    STEPS.forEach((s) => {
      timers.push(setTimeout(() => {
        activate(s.node, s.edge);
        const line = document.createElement('div');
        line.className = 'line';
        line.innerHTML = s.text;
        timeline.appendChild(line);
        requestAnimationFrame(() => line.classList.add('show'));
        timeline.scrollTop = timeline.scrollHeight;
      }, s.delay));
    });
    timers.push(setTimeout(() => {
      running = false;
      btnSim.disabled = false;
      btnSim.textContent = '▶ Simular novamente';
    }, 1600));
  }

  btnSim.addEventListener('click', run);
  if (btnReset) btnReset.addEventListener('click', reset);
})();
