(function () {
  const NODES = {
    'app-mobile': {
      title: 'App Mobile — Servidor',
      tag: 'CLIENTE',
      desc: 'Aplicação React Native com Expo + TypeScript. Comunica via REST com a edge (Cloudflare Workers). Cache local de respostas frequentes (margem, propostas).',
      tech: ['React Native', 'Expo', 'TypeScript', 'AsyncStorage', 'React Query'],
      payload: 'POST /v1/auth/login → { jwt, refresh, expiresIn }'
    },
    'web-admin': {
      title: 'Painel Averbadora',
      tag: 'CLIENTE',
      desc: 'Dashboard web para a averbadora: monitora operações, gerencia bancos, prefeituras, servidores, logs e vitrine de banners.',
      tech: ['React', 'Vite', 'TanStack Table', 'Recharts'],
      payload: 'GET /v1/admin/metrics?range=7d'
    },
    'edge': {
      title: 'Cloudflare Pages + Workers',
      tag: 'EDGE / ORQUESTRADOR',
      desc: 'Camada de entrada (load balancer geográfico, auth gateway, rate-limit, transformação de requests). Roteia para Workers especializados por domínio (auth, propostas, contratos, webhook).',
      tech: ['Cloudflare Workers', 'Pages', 'Hono / itty-router', 'Wrangler'],
      payload: 'cf-ray: 8f3a... | colo: GRU | cache-status: HIT'
    },
    'kv': {
      title: 'Cloudflare KV',
      tag: 'CACHE',
      desc: 'Cache distribuído de leitura frequente: margens consignáveis (TTL 5min), catálogos de bancos, configurações de prefeituras.',
      tech: ['Cloudflare KV', 'TTL strategies', 'Stale-while-revalidate'],
      payload: 'kv:get servidor:42:margem → cached 187s ago'
    },
    'r2': {
      title: 'Cloudflare R2',
      tag: 'STORAGE',
      desc: 'Armazenamento de arquivos: contratos assinados (PDF), comprovantes, anexos de propostas, banners da Vitrine. URLs pré-assinadas com TTL curto.',
      tech: ['Cloudflare R2', 'Presigned URLs', 'S3-compatible API'],
      payload: 'r2://contratos/2026/06/CTR-9821.pdf (TTL 600s)'
    },
    'neon': {
      title: 'PostgreSQL — Neon',
      tag: 'BANCO DE DADOS',
      desc: 'Postgres serverless com branching. Schemas separados por domínio: identidade, propostas, contratos, auditoria. Read replicas regionais.',
      tech: ['PostgreSQL 16', 'Neon', 'Drizzle ORM', 'Migrations'],
      payload: 'SELECT margem FROM v_servidor_margem WHERE id=$1'
    },
    'bancos': {
      title: 'Web Services — Bancos',
      tag: 'INTEGRAÇÕES',
      desc: 'Integração REST com bancos parceiros: cotação, criação de proposta, callback de assinatura, portabilidade. Retry com backoff e circuit breaker.',
      tech: ['REST', 'OAuth2', 'mTLS', 'Circuit breaker'],
      payload: 'POST {banco}/propostas → 202 Accepted (assíncrono)'
    },
    'prefeituras': {
      title: 'Sistemas de Prefeituras',
      tag: 'INTEGRAÇÕES',
      desc: 'Ponte com folhas municipais: validação de matrícula, base de salário, margem disponível. Cache agressivo (atualização noturna via cron).',
      tech: ['SOAP / REST', 'VPN dedicada', 'ETL noturno'],
      payload: 'GET /folha/{matricula}/margem-disponivel'
    },
    'firebase': {
      title: 'Firebase + Expo Push',
      tag: 'PUSH',
      desc: 'Disparo de notificações: proposta aprovada, contrato assinado, oferta de portabilidade. FCM para Android, APNs via Expo para iOS.',
      tech: ['FCM', 'Expo Notifications', 'Topics & device tokens'],
      payload: 'expo.push({ to, title, data }) → ticket id'
    },
    'sentry': {
      title: 'Sentry + Analytics',
      tag: 'OBSERVABILIDADE',
      desc: 'Tracking de erros, performance (Web Vitals), tracing distribuído entre Workers e o app. Analytics agregado em dashboard interno.',
      tech: ['Sentry', 'Cloudflare Analytics', 'OpenTelemetry'],
      payload: 'trace: 4f2... → worker.proposta.simular (143ms)'
    },
    'cron': {
      title: 'Crons — Workers Triggers',
      tag: 'AUTOMAÇÃO',
      desc: 'Jobs programáticos: reconciliação noturna com prefeituras, expiração de propostas, recálculo de margens, envio de dicas financeiras.',
      tech: ['Cron Triggers', 'Durable Objects (quando necessário)'],
      payload: '0 2 * * * → cron.reconciliar.prefeituras'
    },
    'webhook': {
      title: 'Webhooks — Callbacks',
      tag: 'AUTOMAÇÃO',
      desc: 'Recebe callbacks dos bancos (status de proposta, assinatura, averbação). Valida assinatura HMAC, deduplica, enfileira para processamento.',
      tech: ['HMAC verification', 'Idempotency keys', 'Queues'],
      payload: 'POST /webhook/banco/{id} → 200 OK (idempotent)'
    }
  };

  const backdrop = document.getElementById('arch-modal');
  if (!backdrop) return;
  const $title = backdrop.querySelector('[data-modal-title]');
  const $tag = backdrop.querySelector('[data-modal-tag]');
  const $desc = backdrop.querySelector('[data-modal-desc]');
  const $tech = backdrop.querySelector('[data-modal-tech]');
  const $payload = backdrop.querySelector('[data-modal-payload]');

  function open(id) {
    const n = NODES[id];
    if (!n) return;
    $title.textContent = n.title;
    $tag.textContent = n.tag;
    $desc.textContent = n.desc;
    $tech.innerHTML = n.tech.map(t => `<li>${t}</li>`).join('');
    $payload.textContent = n.payload;
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop || e.target.closest('[data-modal-close]')) close();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  document.querySelectorAll('.arch-node').forEach(n => {
    n.addEventListener('click', () => open(n.dataset.node));
    n.setAttribute('tabindex', '0');
    n.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(n.dataset.node); }
    });
  });
})();
