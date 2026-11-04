import { createFileRoute } from "@tanstack/react-router";

const SCRIPT = String.raw`(function(){
  try {
    var cur = document.currentScript;
    var src = cur && cur.src ? cur.src : window.location.href;
    var u = new URL(src, window.location.href);
    var ws = u.searchParams.get('w') || (cur && cur.getAttribute('data-workspace'));
    if (!ws) { console.warn('[nebula-funnel] faltando ?w=WORKSPACE_ID'); return; }
    var origin = u.origin;
    var fnl = u.searchParams.get('f') || (cur && cur.getAttribute('data-funnel')) || '';
    var endpoint = origin + '/api/public/tracker-event/' + ws + (fnl ? ('?f=' + encodeURIComponent(fnl)) : '');
    var firstStep = (cur && cur.getAttribute('data-step')) || 'chegou';
    var autoForward = cur ? cur.getAttribute('data-forward') !== 'false' : true;
    var auto = !!(cur && cur.getAttribute('data-auto') === 'true');
    var autoFirst = (cur && cur.getAttribute('data-step')) || 'chegou';
    var autoEngage = (cur && cur.getAttribute('data-auto-engage')) || 'engajou';
    var autoCheckout = (cur && cur.getAttribute('data-auto-checkout')) || 'checkout';
    var SS = 'trkly:fsid', ST = 'trkly:fsid:last', SC = 'trkly:fsid:click', SU = 'trkly:futm', SD = 'trkly:fsent:v2';
    var SESSION_TIMEOUT = 30 * 60 * 1000;
    var pending = {};

    // Sinais de automatizado que o user-agent não revela (pré-carregador do
    // Meta/Instagram usa o navegador in-app real): webdriver, headless, sem
    // idiomas/plugins. Se qualquer um bater, marcamos bot=1 em todos os eventos.
    var BOT = false;
    try {
      if (navigator.webdriver) BOT = true;
      if (!BOT && /HeadlessChrome|PhantomJS|JsDom/i.test(navigator.userAgent || '')) BOT = true;
      if (!BOT && !(navigator.languages && navigator.languages.length)) BOT = true;
      if (!BOT && window.outerWidth === 0 && window.outerHeight === 0) BOT = true;
      if (!BOT && !window.Notification && !('ontouchstart' in window) && !window.matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints === 0 && /Mobile|Android|iPhone/i.test(navigator.userAgent || '')) BOT = true;
    } catch(e) {}

    // Pré-carregador do Meta/Instagram executa o JS e dispara as etapas sozinho,
    // sem nenhum toque/clique. Só consideramos humano depois de interação real.
    var INTERACTED = false;
    function markInteracted(){ INTERACTED = true; }
    try {
      ['pointerdown','touchstart','keydown','scroll'].forEach(function(ev){
        window.addEventListener(ev, markInteracted, { passive: true, once: true });
      });
    } catch(e) {}

    function store(k, v) { try { localStorage.setItem(k, v); } catch(e) {} }
    function read(k) { try { return localStorage.getItem(k); } catch(e) { return null; } }

    function currentParams() { return new URLSearchParams(window.location.search); }

    function sessionId() {
      var params = currentParams();
      // cid costuma ser um identificador fixo de campanha/criativo. Usá-lo como
      // sessão agrupava visitantes diferentes no mesmo acesso.
      // No TikTok, 'src' carrega o site de veiculação (__CSITE__), não a sessão.
      var tiktok = !!params.get('ttclid');
      var fromUrl = params.get('sessionId') || (tiktok ? null : params.get('src')) || params.get('click_id') || params.get('xcod');
      var now = Date.now();
      if (fromUrl) { store(SS, fromUrl); store(ST, String(now)); return fromUrl; }
      var id = read(SS);
      var last = Number(read(ST) || 0);
      var click = params.get('fbclid') || params.get('ttclid') || params.get('gclid') || '';
      var previousClick = read(SC) || '';
      if (!id || !last || now - last > SESSION_TIMEOUT || (click && previousClick && click !== previousClick)) {
        id = 'F' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        store(SS, id);
      }
      if (click) store(SC, click);
      store(ST, String(now));
      return id;
    }

    function utms() {
      var stored = {};
      try { stored = JSON.parse(read(SU) || '{}'); } catch(e) {}
      var out = {};
      var params = currentParams();
      ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(function(k){
        var v = params.get(k) || stored[k];
        if (v) out[k] = v;
      });
      // TikTok: mapeia os parâmetros do gestor para UTMs quando não vierem UTMs.
      if (params.get('ttclid')) {
        if (!params.get('utm_source')) out.utm_source = 'tiktok';
        if (!params.get('utm_medium')) out.utm_medium = params.get('sku') || 'tiktok_ads';
        if (!params.get('utm_campaign') && params.get('search')) out.utm_campaign = params.get('search');
        if (!params.get('utm_content') && params.get('adname')) out.utm_content = params.get('adname');
        if (!params.get('utm_term') && params.get('src')) out.utm_term = params.get('src');
      }
      store(SU, JSON.stringify(out));
      return out;
    }

    function sentSet() {
      try { return JSON.parse(read(SD) || '{}'); } catch(e) { return {}; }
    }

    function markSent(key) {
      var sent = sentSet();
      sent[key] = 1;
      store(SD, JSON.stringify(sent));
      delete pending[key];
    }

    function pixelFallback(payload, key) {
      try {
        var q = new URLSearchParams();
        if (fnl) q.set('f', fnl);
        for (var k in payload) {
          if (payload[k] !== null && payload[k] !== undefined) q.set(k, String(payload[k]));
        }
        var img = new Image();
        img.onload = function(){ markSent(key); };
        img.onerror = function(){ delete pending[key]; };
        img.src = origin + '/api/public/tracker-event/' + ws + '?' + q.toString();
      } catch(e) { delete pending[key]; }
    }

    function deliver(payload, key) {
      var raw = JSON.stringify(payload);
      try {
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: raw,
          keepalive: true,
          mode: 'cors',
          credentials: 'omit'
        }).then(function(res){
          if (res.ok) markSent(key);
          else pixelFallback(payload, key);
        }).catch(function(){ pixelFallback(payload, key); });
      } catch(e) { pixelFallback(payload, key); }
    }

    var sid = sessionId();

    function step(name, extra) {
      if (!name) return;
      store(ST, String(Date.now()));
      var key = sid + '|' + name;
      var sent = sentSet();
      if (sent[key] || pending[key]) return;
      pending[key] = 1;

      var payload = { step: String(name), sessionId: sid, f: fnl || undefined, ts: new Date().toISOString(), referrer: document.referrer || null, bot: (BOT || !INTERACTED) ? 1 : undefined };
      var m = utms();
      for (var k in m) payload[k] = m[k];
      if (extra) for (var j in extra) payload[j] = extra[j];

      deliver(payload, key);
    }

    // Encaminha a sessão para o checkout/typebot (mantém a atribuição entre domínios)
    function decorateUrl(href) {
      var l = new URL(href, window.location.href);
      if (!l.searchParams.get('src')) l.searchParams.set('src', sid);
      if (!l.searchParams.get('sessionId')) l.searchParams.set('sessionId', sid);
      if (!l.searchParams.get('xcod')) l.searchParams.set('xcod', sid);
      var m = utms();
      for (var k in m) if (!l.searchParams.get(k)) l.searchParams.set(k, m[k]);
      return l.toString();
    }

    function decorateAnchor(a) {
      try {
        if (!a || !a.getAttribute) return;
        if (a.getAttribute('data-funnel-forward') === 'false') return;
        var href = a.getAttribute('href') || '';
        if (!/^https?:/i.test(href)) return;
        var l = new URL(href, window.location.href);
        if (l.origin === window.location.origin && a.getAttribute('data-funnel-forward') !== 'true') return;
        a.setAttribute('href', decorateUrl(href));
      } catch(e) {}
    }

    function forwardLinks() {
      if (!autoForward) return;
      var links = document.querySelectorAll('a[href]');
      for (var i = 0; i < links.length; i++) decorateAnchor(links[i]);
    }

    // links criados depois (Typebot, SPA, popups) + navegações via JS
    function watchLinks() {
      if (!autoForward) return;
      try {
        var mo = new MutationObserver(function(){ forwardLinks(); });
        mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
      } catch(e) {}
      // decora no exato momento do clique (cobre href trocado por JS)
      ['pointerdown','mousedown','click','auxclick','touchstart'].forEach(function(evt){
        document.addEventListener(evt, function(ev){
          var el = ev.target;
          while (el && el !== document.body) {
            if (el.tagName === 'A') { decorateAnchor(el); return; }
            el = el.parentNode;
          }
        }, true);
      });
      try {
        var openOrig = window.open;
        window.open = function(url){
          var args = Array.prototype.slice.call(arguments);
          if (typeof url === 'string' && /^https?:/i.test(url)) { try { args[0] = decorateUrl(url); } catch(e) {} }
          return openOrig.apply(window, args);
        };
      } catch(e) {}
      try {
        var assignOrig = window.location.assign.bind(window.location);
        var replaceOrig = window.location.replace.bind(window.location);
        window.location.assign = function(url){ try { url = decorateUrl(url); } catch(e) {} return assignOrig(url); };
        window.location.replace = function(url){ try { url = decorateUrl(url); } catch(e) {} return replaceOrig(url); };
      } catch(e) {}
    }


    function bindClicks() {
      document.addEventListener('click', function(ev){
        var el = ev.target;
        while (el && el !== document.body) {
          if (el.getAttribute && el.getAttribute('data-funnel-step')) {
            step(el.getAttribute('data-funnel-step'), { amount: el.getAttribute('data-funnel-amount') || undefined });
            return;
          }
          el = el.parentNode;
        }
      }, true);

      document.addEventListener('submit', function(ev){
        var f = ev.target;
        if (f && f.getAttribute && f.getAttribute('data-funnel-submit')) step(f.getAttribute('data-funnel-submit'));
      }, true);
    }

    function bindViews() {
      var nodes = document.querySelectorAll('[data-funnel-view]');
      if (!nodes.length) return;
      if (!window.IntersectionObserver) {
        for (var i = 0; i < nodes.length; i++) step(nodes[i].getAttribute('data-funnel-view'));
        return;
      }
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(en){
          if (en.isIntersecting) { step(en.target.getAttribute('data-funnel-view')); io.unobserve(en.target); }
        });
      }, { threshold: 0.4 });
      for (var n = 0; n < nodes.length; n++) io.observe(nodes[n]);
    }

    function bindAuto() {
      if (!auto) return;
      var engaged = false;
      function engage() { if (engaged) return; engaged = true; step(autoEngage); }
      try {
        window.addEventListener('scroll', function(){
          if (window.pageYOffset > Math.max(200, window.innerHeight * 0.35)) engage();
        }, { passive: true });
      } catch(e) {}
      document.addEventListener('click', function(ev){
        engage();
        var el = ev.target;
        while (el && el !== document.body) {
          if (el.tagName === 'A' && el.getAttribute && el.getAttribute('href')) {
            try {
              var l = new URL(el.getAttribute('href'), window.location.href);
              if (l.origin !== window.location.origin) step(autoCheckout);
            } catch(e) {}
            return;
          }
          el = el.parentNode;
        }
      }, true);
      document.addEventListener('submit', function(){ engage(); }, true);
    }

    function boot() {
      forwardLinks();
      watchLinks();

      bindClicks();
      bindViews();
      bindAuto();
      if (auto) step(autoFirst);
      else if (firstStep && firstStep !== 'none') step(firstStep);
    }

    window.trkFunnel = {
      step: step,
      sessionId: function(){ return sid; },
      params: function(){ var m = utms(); m.sessionId = sid; return m; },
      url: function(base){
        try {
          var l = new URL(base, window.location.href);
          l.searchParams.set('src', sid);
          l.searchParams.set('sessionId', sid);
          var m = utms();
          for (var k in m) l.searchParams.set(k, m[k]);
          return l.toString();
        } catch(e) { return base; }
      }
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  } catch(e) { /* nunca quebrar a página do cliente */ }
})();`;

export const Route = createFileRoute("/funnel-tracker.js")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" },
        }),
      GET: async () =>
        new Response(SCRIPT, {
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "no-cache, max-age=0, must-revalidate",
            "Access-Control-Allow-Origin": "*",
          },
        }),
    },
  },
});
