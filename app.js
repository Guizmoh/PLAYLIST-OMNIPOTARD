/* Playlist — lecteur + notes + commentaires horodatés
   Aucune compilation nécessaire : HTML/CSS/JS pur, prêt pour GitHub Pages. */
(() => {
"use strict";

const CFG = Object.assign({
  siteTitle: "Playlist", artist: "", intro: "",
  supabaseUrl: "", supabaseAnonKey: "",
  githubRepo: "", githubBranch: "main", musicFolder: "music"
}, window.PLAYLIST_CONFIG || {});

const AUDIO_EXT = ["mp3", "wav", "ogg", "m4a", "flac", "aac"];
const IMAGE_EXT = ["jpg", "jpeg", "png", "webp", "gif", "svg"];

/* ---------------- Petits outils ---------------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};
function fmt(sec) {
  if (sec == null || !isFinite(sec)) return "0:00";
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60;
  return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(s).padStart(2, "0");
}
function ago(date) {
  const d = (new Date(date) - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
  const steps = [[60, "second"], [3600, "minute", 60], [86400, "hour", 3600], [604800, "day", 86400], [2629800, "week", 604800], [31557600, "month", 2629800], [Infinity, "year", 31557600]];
  for (const [lim, unit, div = 1] of steps) if (Math.abs(d) < lim) return rtf.format(Math.round(d / div), unit);
}
const slug = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const baseName = p => decodeURIComponent(p.split("/").pop()).replace(/\.[^.]+$/, "");
const ext = p => (p.split(".").pop() || "").toLowerCase();
const prettify = s => { s = s.replace(/[_-]+/g, " ").trim(); return s.charAt(0).toUpperCase() + s.slice(1); };
function hashColor(str) {
  const palette = ["#e4613a", "#2f8a8a", "#8a6bd1", "#d9a13b", "#4f86c6", "#c45a8c", "#5a9d5a", "#b8735a"];
  let h = 0; for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
}
let toastTimer;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

const I = {
  play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4.2" height="14" rx="1.3"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.3"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/></svg>',
  chat: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm1 4.5V12l3.5 2.1-.9 1.5L11 13V7.5z"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15.4 5.4L14 4l-8 8 8 8 1.4-1.4L8.8 12z"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M18 16a3 3 0 0 0-2.4 1.2l-6.7-3.4a3 3 0 0 0 0-1.6l6.7-3.4A3 3 0 1 0 15 7l-6.7 3.4a3 3 0 1 0 0 3.2L15 17a3 3 0 1 0 3-1z"/></svg>',
  note: '<svg viewBox="0 0 24 24"><path d="M9 4v11.2A3.5 3.5 0 1 0 11 18V8h6V4z"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20.5l-1.3-1.2C5.6 14.7 2.5 11.9 2.5 8.4 2.5 5.6 4.7 3.5 7.4 3.5c1.6 0 3.1.7 4.1 1.9 1-1.2 2.5-1.9 4.1-1.9 2.7 0 4.9 2.1 4.9 4.9 0 3.5-3.1 6.3-8.2 10.9z"/></svg>',
  grip: '<svg viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.7"/><circle cx="15" cy="6" r="1.7"/><circle cx="9" cy="12" r="1.7"/><circle cx="15" cy="12" r="1.7"/><circle cx="9" cy="18" r="1.7"/><circle cx="15" cy="18" r="1.7"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M12 7l-7 7 1.4 1.4L12 9.8l5.6 5.6L19 14z"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M12 17l7-7-1.4-1.4L12 14.2 6.4 8.6 5 10z"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M3 5h3v3H3zm5 .5h13v2H8zM3 10.5h3v3H3zm5 .5h13v2H8zM3 16h3v3H3zm5 .5h13v2H8z"/></svg>'
};
const coverHTML = t => t.cover
  ? `<img src="${esc(t.cover)}" alt="" loading="lazy">`
  : `<div class="cover-placeholder">${I.note}</div>`;

/* ---------------- Stockage : Supabase ou local (démo) ---------------- */
const voterId = (() => { let v = ls.get("pl:voter"); if (!v) { v = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)); ls.set("pl:voter", v); } return v; })();

function makeSupabaseStore() {
  const sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);
  const ok = ({ data, error }) => { if (error) throw error; return data; };
  return {
    demo: false,
    async comments(trackId, admin) {
      if (!admin) return [];   // les commentaires ne sont lisibles que par le créateur
      return ok(await sb.rpc("admin_comments", { p_track: trackId || null }));
    },
    async addComment(c) { ok(await sb.from("comments").insert(c)); },
    async deleteComment(id) { ok(await sb.from("comments").delete().eq("id", id)); },
    async stats() {
      const rows = ok(await sb.from("track_stats").select("*")) || [];
      return Object.fromEntries(rows.map(r => [r.track_id, { avg: +r.rating_avg || 0, count: r.rating_count || 0, comments: r.comment_count || 0 }]));
    },
    async rate(trackId, stars) { ok(await sb.rpc("rate_track", { p_track: trackId, p_stars: stars, p_voter: voterId })); },
    async saveRanking(author, ids) { ok(await sb.rpc("save_ranking", { p_voter: voterId, p_author: author || null, p_tracks: ids })); },
    async rankings() { return ok(await sb.rpc("admin_rankings")) || []; },
    async login(email, password) { ok(await sb.auth.signInWithPassword({ email, password })); return this.isAdmin(); },
    async logout() { await sb.auth.signOut(); },
    async isAdmin() {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return false;
      const { data } = await sb.rpc("is_admin");
      return !!data;
    }
  };
}

function makeLocalStore() {
  const K = "pl:demo:comments", R = "pl:demo:ratings";
  const all = () => ls.get(K, []);
  return {
    demo: true,
    async comments(trackId, admin) {
      return all().filter(c => !trackId || c.track_id === trackId)
        .map(c => admin ? c : (({ written_at_position, ...rest }) => rest)(c))
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
    async addComment(c) { ls.set(K, [{ ...c, id: String(Date.now()) + Math.random().toString(36).slice(2, 6), created_at: new Date().toISOString() }, ...all()]); },
    async deleteComment(id) { ls.set(K, all().filter(c => c.id !== id)); },
    async stats() {
      const out = {}, r = ls.get(R, {});
      for (const c of all()) (out[c.track_id] ??= { avg: 0, count: 0, comments: 0 }).comments++;
      for (const [t, votes] of Object.entries(r)) {
        const v = Object.values(votes); const s = (out[t] ??= { avg: 0, count: 0, comments: 0 });
        s.count = v.length; s.avg = v.reduce((a, b) => a + b, 0) / (v.length || 1);
      }
      return out;
    },
    async rate(trackId, stars) { const r = ls.get(R, {}); (r[trackId] ??= {})[voterId] = stars; ls.set(R, r); },
    async saveRanking(author, ids) {
      const r = ls.get("pl:demo:rankings", {});
      r[voterId] = { voter: voterId, author: author || null, track_ids: ids, updated_at: new Date().toISOString() };
      ls.set("pl:demo:rankings", r);
    },
    async rankings() { return Object.values(ls.get("pl:demo:rankings", {})).sort((a, b) => b.updated_at.localeCompare(a.updated_at)); },
    async login() { ls.set("pl:demo:admin", true); return true; },
    async logout() { ls.set("pl:demo:admin", false); },
    async isAdmin() { return !!ls.get("pl:demo:admin", false); }
  };
}

const store = (CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase) ? makeSupabaseStore() : makeLocalStore();

/* ---------------- Morceaux : tracks.json + détection GitHub ---------------- */
function detectRepo() {
  if (CFG.githubRepo) return CFG.githubRepo;
  const h = location.hostname;
  if (!h.endsWith(".github.io")) return null;
  const owner = h.split(".")[0];
  const first = location.pathname.split("/").filter(Boolean)[0];
  return `${owner}/${first && !first.includes(".") ? first : h}`;
}

async function listGithub() {
  const repo = detectRepo(); if (!repo) return [];
  const key = "pl:gh:" + repo, cached = (() => { try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; } })();
  if (cached && Date.now() - cached.t < 5 * 60e3) return cached.files;
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/contents/${CFG.musicFolder}?ref=${CFG.githubBranch}`);
    if (!r.ok) return [];
    const files = (await r.json()).filter(f => f.type === "file").map(f => f.path);
    try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), files })); } catch {}
    return files;
  } catch { return []; }
}

async function loadTracks() {
  let manual = [];
  try { const r = await fetch("tracks.json", { cache: "no-cache" }); if (r.ok) manual = await r.json(); } catch {}
  const ghFiles = await listGithub();
  const images = {};
  for (const p of ghFiles) if (IMAGE_EXT.includes(ext(p))) images[baseName(p).toLowerCase()] = p;

  const seen = new Set(), list = [];
  const add = (t) => {
    const file = t.file; if (!file || seen.has(file)) return;
    seen.add(file);
    const b = baseName(file);
    list.push({
      id: t.id || slug(b) || String(list.length),
      title: t.title || prettify(b),
      artist: t.artist || CFG.artist || "",
      file, cover: t.cover || images[b.toLowerCase()] || null,
      description: t.description || ""
    });
  };
  manual.forEach(add);
  ghFiles.filter(p => AUDIO_EXT.includes(ext(p))).sort().forEach(p => add({ file: p }));
  return list;
}

/* ---------------- État global ---------------- */
const state = { tracks: [], stats: {}, admin: false, current: null, peaks: {}, durations: {} };
const audio = $("#audio");
const byId = id => state.tracks.find(t => t.id === id);

/* ---------------- Lecteur ---------------- */
function playTrack(t, at) {
  if (state.current !== t) {
    state.current = t;
    audio.src = t.file;
    $("#player").hidden = false;
    $("#playerCover").src = t.cover || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='%23213148'/%3E%3Cpath d='M10 6v8.2A2.6 2.6 0 1 0 11.5 16.5V9h4V6z' fill='%235b6f8c'/%3E%3C/svg%3E";
    $("#playerTitle").textContent = t.title;
    $("#playerTitle").href = "#/t/" + t.id;
    $("#playerArtist").textContent = t.artist;
    document.title = t.title + " · " + CFG.siteTitle;
    pcReset(); syncCommentBar();
  }
  if (at != null) {
    if (audio.readyState >= 1) audio.currentTime = at;
    else audio.addEventListener("loadedmetadata", () => { audio.currentTime = at; }, { once: true });
  }
  audio.play().catch(() => {});
}
function toggle(t) {
  if (t && state.current !== t) return playTrack(t);
  audio.paused ? audio.play().catch(() => {}) : audio.pause();
}
const isPlaying = t => state.current === t && !audio.paused;

function syncPlayButtons() {
  $("#playerToggle").innerHTML = audio.paused ? I.play : I.pause;
  $$("[data-play]").forEach(b => {
    const t = byId(b.dataset.play);
    b.innerHTML = isPlaying(t) ? I.pause : I.play;
    b.closest(".card")?.classList.toggle("is-playing", isPlaying(t));
  });
}
function syncProgress() {
  const d = audio.duration || 0, c = audio.currentTime || 0;
  $("#playerFill").style.width = d ? (c / d * 100) + "%" : 0;
  $("#playerCurrent").textContent = fmt(c);
  $("#playerDuration").textContent = fmt(d);
  view.onTime?.();
  pcPaint();
}
["play", "pause", "ended"].forEach(e => audio.addEventListener(e, syncPlayButtons));
["timeupdate", "loadedmetadata", "seeked"].forEach(e => audio.addEventListener(e, syncProgress));
audio.addEventListener("loadedmetadata", () => { if (state.current) state.durations[state.current.id] = audio.duration; });
audio.addEventListener("play", () => { const loop = () => { if (!audio.paused) { view.onTime?.(); requestAnimationFrame(loop); } }; loop(); });
$("#playerToggle").addEventListener("click", () => toggle());
$("#playerBar").addEventListener("click", e => {
  const r = e.currentTarget.getBoundingClientRect();
  if (audio.duration) audio.currentTime = (e.clientX - r.left) / r.width * audio.duration;
});
document.addEventListener("keydown", e => {
  if (e.code === "Space" && state.current && !/INPUT|TEXTAREA|BUTTON/.test(document.activeElement.tagName)) { e.preventDefault(); toggle(); }
});

/* ---------------- Bandeau de commentaire sous le lecteur ----------------
   Visible quand on écoute un morceau sans être sur sa page (ex. depuis l'accueil).
   Même principe que sur la page du morceau : le moment est capturé quand on
   commence à écrire, le timecode est grisé et s'active d'un clic. */
const pc = { locked: false, time: 0, listening: false, active: false };
function pcReset() { Object.assign(pc, { locked: false, time: 0, listening: false, active: false }); const b = $("#pcBody"); if (b) b.value = ""; pcPaint(); }
function pcPaint() {
  const chip = $("#pcChip"); if (!chip) return;
  $("#pcTime").textContent = "à " + fmt(pc.locked ? pc.time : audio.currentTime || 0);
  chip.classList.toggle("on", pc.active);
  chip.setAttribute("aria-pressed", pc.active);
}
function syncCommentBar() {
  const t = state.current;
  const onItsPage = t && location.hash.replace(/\?.*/, "") === "#/t/" + t.id;
  const show = !!t && !onItsPage;
  $("#pcForm").hidden = !show;
  document.body.classList.toggle("has-cbar", show);
}
const pcLock = () => { if (!pc.locked) Object.assign(pc, { locked: true, time: audio.currentTime || 0, listening: (audio.currentTime || 0) > 0 }); };
$("#pcBody").addEventListener("input", e => {
  if (e.target.value.trim()) pcLock();
  else if (!pc.active) pc.locked = false;
  pcPaint();
});
$("#pcChip").addEventListener("click", () => {
  pcLock(); pc.active = !pc.active;
  if (!pc.active && !$("#pcBody").value.trim()) pc.locked = false;   // rien d'écrit : le timecode suit à nouveau la lecture
  pcPaint();
});
$("#pcForm").addEventListener("submit", async e => {
  e.preventDefault();
  const t = state.current, text = $("#pcBody").value.trim();
  if (!t || !text) return;
  const c = {
    track_id: t.id, author: ls.get("pl:name", "") || null, body: text,
    timecode: pc.active ? Math.round(pc.time * 10) / 10 : null,
    written_at_position: pc.listening ? Math.round(pc.time * 10) / 10 : null
  };
  $("#pcSend").disabled = true;
  try {
    await store.addComment(c);
    const mine = ls.get("pl:mycomments", []);
    mine.unshift({ id: "me-" + Date.now(), track_id: c.track_id, author: c.author, body: c.body, timecode: c.timecode, created_at: new Date().toISOString() });
    ls.set("pl:mycomments", mine.slice(0, 300));
    pcReset();
    toast(state.admin ? "Commentaire publié" : "Merci ! Ton commentaire a bien été envoyé");
    state.stats = await store.stats().catch(() => state.stats);
  } catch (err) { console.error(err); toast("Oups, le commentaire n'a pas pu être envoyé"); }
  $("#pcSend").disabled = false;
});

/* Durée d'un morceau sans le lancer */
function getDuration(t) {
  if (state.durations[t.id]) return Promise.resolve(state.durations[t.id]);
  return new Promise(res => {
    const a = new Audio(); a.preload = "metadata"; a.src = t.file;
    a.onloadedmetadata = () => { state.durations[t.id] = a.duration; res(a.duration); };
    a.onerror = () => res(0);
  });
}

/* Forme d'onde (calculée une fois puis gardée en mémoire du navigateur) */
async function getPeaks(t) {
  if (state.peaks[t.id]) return state.peaks[t.id];
  const key = "pl:peaks:" + t.file, cached = ls.get(key);
  if (cached) return (state.peaks[t.id] = cached);
  const buf = await (await fetch(t.file)).arrayBuffer();
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  const data = await new Promise((ok, ko) => { const p = ctx.decodeAudioData(buf, ok, ko); if (p && p.catch) p.catch(() => {}); });
  ctx.close?.();
  const N = 600, ch = [...Array(data.numberOfChannels).keys()].map(i => data.getChannelData(i));
  const len = data.length, step = Math.floor(len / N) || 1, peaks = [];
  for (let i = 0; i < N; i++) {
    let max = 0;
    for (let j = i * step; j < Math.min(len, (i + 1) * step); j += 4)
      for (const c of ch) { const v = Math.abs(c[j]); if (v > max) max = v; }
    peaks.push(max);
  }
  const top = Math.max(...peaks) || 1;
  const norm = peaks.map(p => +(p / top).toFixed(3));
  ls.set(key, norm); state.durations[t.id] = data.duration;
  return (state.peaks[t.id] = norm);
}

function fakePeaks(seed) {
  let x = [...seed].reduce((a, c) => a + c.charCodeAt(0), 7); const out = [];
  for (let i = 0; i < 600; i++) { x = (x * 9301 + 49297) % 233280; out.push(.25 + .5 * (x / 233280) * (0.6 + .4 * Math.sin(i / 30))); }
  return out;
}

function drawWave(canvas, peaks, progress, hover, ghost) {
  const dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w) return;
  if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
  const g = canvas.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
  const css = getComputedStyle(document.documentElement);
  const cPlayed = css.getPropertyValue("--accent").trim(), cRest = css.getPropertyValue("--wave").trim();
  const barW = 3, gap = 2, n = Math.floor(w / (barW + gap));
  for (let i = 0; i < n; i++) {
    const a = Math.floor(i / n * peaks.length), b = Math.max(a + 1, Math.floor((i + 1) / n * peaks.length));
    let p = 0; for (let k = a; k < b; k++) p = Math.max(p, peaks[k]);
    const bh = Math.max(3, p * (h - 6)), x = i * (barW + gap), y = (h - bh) / 2, pos = (i + .5) / n;
    g.globalAlpha = ghost ? .45 : 1;
    g.fillStyle = pos <= progress ? cPlayed : cRest;
    if (hover != null && pos <= hover && pos > progress) { g.fillStyle = cPlayed; g.globalAlpha = .35; }
    g.beginPath(); g.roundRect ? g.roundRect(x, y, barW, bh, 1.5) : g.rect(x, y, barW, bh); g.fill();
  }
  g.globalAlpha = 1;
}

/* ---------------- Routeur ---------------- */
let view = {};
async function route() {
  view.destroy?.(); view = {};
  window.scrollTo(0, 0);
  const h = location.hash.replace(/^#\/?/, "");
  const [path, query] = h.split("?");
  const parts = path.split("/");
  const params = new URLSearchParams(query || "");
  const key = ["admin", "classement", "ajouter"].includes(parts[0]) ? parts[0] : "home";
  $$("#menu a").forEach(a => a.classList.toggle("on", a.dataset.route === key));
  syncCommentBar();
  if (parts[0] === "t" && byId(parts[1])) return renderTrack(byId(parts[1]), params);
  if (parts[0] === "admin") return renderAdmin();
  if (parts[0] === "ajouter") return renderUpload(params);
  renderHome(key === "classement" ? "classement" : null);
}
window.addEventListener("hashchange", route);

/* ---------------- Accueil ---------------- */
function statsHTML(t) {
  const s = state.stats[t.id] || {};
  return `<span class="mini-stats">
    ${s.count ? `<span><span class="star">${I.star}</span>${s.avg.toFixed(1)}</span>` : ""}
    ${state.admin ? `<span>${I.chat}${s.comments || 0}</span>` : ""}</span>`;
}
/* Ordre personnel du visiteur (s'il a fait son classement) */
function orderedTracks() {
  const mine = ls.get("pl:myorder", null);
  if (!mine) return state.tracks;
  const pos = id => { const i = mine.indexOf(id); return i < 0 ? 1e9 : i; };
  return [...state.tracks].sort((a, b) => pos(a.id) - pos(b.id));
}
const feedbackHTML = () => CFG.feedbackNote ? `
  <div class="panel welcome">
    <div class="welcome-icon">${I.heart}</div>
    <div><div class="welcome-title">${esc(CFG.feedbackTitle || "")}</div><p>${esc(CFG.feedbackNote)}</p></div>
  </div>` : "";

function renderHome(scrollToId) {
  document.title = CFG.siteTitle;
  const app = $("#app");
  const tracks = orderedTracks();
  const hasOrder = !!ls.get("pl:myorder", null);
  app.innerHTML = `
    <section class="hero">
      <h1>${esc(CFG.siteTitle)}</h1>
      ${CFG.intro ? `<p>${esc(CFG.intro)}</p>` : ""}
    </section>
    ${feedbackHTML()}
    ${store.demo && state.admin ? `<p class="notice">Mode démo : les commentaires sont enregistrés uniquement dans ce navigateur. Renseigne Supabase dans <code>config.js</code> pour les partager (voir README).</p>` : ""}
    <div class="home-columns${tracks.length > 1 ? "" : " single"}">
    <section class="home-section" id="morceaux">
      <div class="list-bar"><h2>Les morceaux${hasOrder ? `<span class="order-tag">· dans ton ordre de préférence</span>` : ""}</h2></div>
      ${tracks.length ? `<div class="grid">${tracks.map(t => `
        <article class="card">
          <a href="#/t/${esc(t.id)}" class="card-cover">${coverHTML(t)}
            <button class="play-btn" data-play="${esc(t.id)}" aria-label="Lire ${esc(t.title)}">${I.play}</button>
          </a>
          <div class="card-body">
            <a href="#/t/${esc(t.id)}" class="card-title">${esc(t.title)}</a>
            <div class="card-meta"><a href="#/t/${esc(t.id)}" class="card-comment">${I.chat} Commenter</a>${statsHTML(t)}</div>
          </div>
        </article>`).join("")}</div>`
      : `<p class="empty">Aucun morceau pour l'instant. Dépose tes fichiers MP3 ou WAV dans le dossier <b>${esc(CFG.musicFolder)}/</b>.</p>`}
    </section>
    ${tracks.length > 1 ? `<section class="home-section" id="classement">
      <div class="list-bar"><h2>Mon classement</h2></div>
      ${rankingHTML(tracks)}
    </section>` : ""}
    </div>`;
  $$("[data-play]", app).forEach(b => b.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); toggle(byId(b.dataset.play)); }));
  if (tracks.length > 1) setupRanking();
  syncPlayButtons();
  if (scrollToId) requestAnimationFrame(() => $("#" + scrollToId)?.scrollIntoView({ behavior: "smooth", block: "start" }));
}

/* ---------------- Classement (glisser-déposer) ---------------- */
function rankingHTML(tracks) {
  return `<section class="panel rank-panel">
    <p class="rank-help"><b>Aide-moi à choisir lequel terminer et poster en premier !</b> Glisse les morceaux avec la poignée <b>⋮⋮</b> (ou utilise les flèches) dans ton ordre de préférence — ton préféré tout en haut.</p>
    <ol class="rank-list well" id="rankList">${tracks.map(t => `
      <li class="rank-item" data-id="${esc(t.id)}">
        <span class="rank-handle" aria-label="Déplacer ${esc(t.title)}">${I.grip}</span>
        <span class="rank-pos"></span>
        <span class="rank-cover">${coverHTML(t)}</span>
        <a href="#/t/${esc(t.id)}" class="rank-title">${esc(t.title)}<small>${esc(t.artist)}</small></a>
        <span class="rank-arrows"><button data-dir="-1" aria-label="Monter">${I.up}</button><button data-dir="1" aria-label="Descendre">${I.down}</button></span>
      </li>`).join("")}</ol>
    <div class="form-row">
      <input id="rankName" maxlength="40" placeholder="Ton nom (facultatif)" value="${esc(ls.get("pl:name", ""))}">
      <button class="btn ghost" id="rankCancel" type="button">Annuler</button>
      <button class="btn" id="rankSave" type="button">Enregistrer mon classement</button>
    </div>
  </section>`;
}

function setupRanking() {
  const list = $("#rankList");
  const renumber = () => [...list.children].forEach((li, i, all) => {
    li.querySelector(".rank-pos").textContent = i + 1;
    li.querySelector('[data-dir="-1"]').disabled = i === 0;
    li.querySelector('[data-dir="1"]').disabled = i === all.length - 1;
  });
  renumber();

  list.addEventListener("click", e => {
    const b = e.target.closest("[data-dir]"); if (!b) return;
    const li = b.closest(".rank-item");
    if (b.dataset.dir === "-1" && li.previousElementSibling) list.insertBefore(li, li.previousElementSibling);
    if (b.dataset.dir === "1" && li.nextElementSibling) list.insertBefore(li.nextElementSibling, li);
    renumber();
  });

  list.addEventListener("pointerdown", e => {
    const handle = e.target.closest(".rank-handle"); if (!handle) return;
    e.preventDefault();
    const item = handle.closest(".rank-item");
    item.classList.add("dragging");
    handle.setPointerCapture(e.pointerId);
    const move = ev => {
      const others = [...list.children].filter(x => x !== item);
      const before = others.find(x => { const r = x.getBoundingClientRect(); return ev.clientY < r.top + r.height / 2; });
      if (before) { if (item.nextElementSibling !== before) list.insertBefore(item, before); }
      else if (list.lastElementChild !== item) list.appendChild(item);
      renumber();
    };
    const up = () => {
      item.classList.remove("dragging");
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  });

  $("#rankCancel").addEventListener("click", () => renderHome("classement"));
  $("#rankSave").addEventListener("click", async () => {
    const ids = [...list.children].map(li => li.dataset.id);
    const name = $("#rankName").value.trim(); ls.set("pl:name", name);
    $("#rankSave").disabled = true;
    try {
      await store.saveRanking(name, ids);
      ls.set("pl:myorder", ids);
      toast("Classement enregistré, merci !");
      renderHome("morceaux");
    } catch (err) { console.error(err); toast("Le classement n'a pas pu être enregistré"); $("#rankSave").disabled = false; }
  });
}

/* ---------------- Page d'un morceau ---------------- */
function renderTrack(t, params) {
  document.title = t.title + " · " + CFG.siteTitle;
  const app = $("#app");
  const myVote = ls.get("pl:votes", {})[t.id] || 0;
  app.innerHTML = `
    <a href="#/" class="back">${I.back} Tous les morceaux</a>
    <section class="track-layout">
      <div class="panel track-cover-panel"><div class="track-cover">${coverHTML(t)}</div></div>
      <div class="panel track-info">
        <div class="track-head">
          <button class="play-btn big" data-play="${esc(t.id)}" aria-label="Lecture / pause">${I.play}</button>
          <div><h1>${esc(t.title)}</h1><div class="track-artist">${esc(t.artist)}</div></div>
        </div>
        ${t.description ? `<p class="track-desc well">${esc(t.description)}</p>` : ""}
        <div class="track-actions well">
          <div class="rating">
            <div class="stars" id="stars">${[1, 2, 3, 4, 5].map(n => `<button data-n="${n}" class="${n <= myVote ? "on" : ""}" aria-label="${n} étoile${n > 1 ? "s" : ""}">${I.star}</button>`).join("")}</div>
            <span class="rating-text" id="ratingText"></span>
          </div>
          <span class="row-actions">
            ${state.admin ? `<a class="btn ghost share-btn" href="#/ajouter?edit=${encodeURIComponent(t.id)}">✎ Modifier</a>` : ""}
            <button class="btn ghost share-btn" id="share">${I.share} Partager</button>
          </span>
        </div>
      </div>
      <div class="panel wave-panel">
        <div class="well wave-box"><div class="wave" id="wave"><canvas></canvas><div class="wave-markers" id="markers"></div></div></div>
        <div class="wave-times"><span id="wCur">0:00</span><span id="wDur">–:––</span></div>
        ${state.admin ? `<div class="wave-legend"><span><i style="background:var(--accent)"></i>Commentaires avec timecode (public)</span><span><i style="background:var(--teal)"></i>Moment où chaque commentaire a été écrit (visible par toi seul)</span></div>` : ""}
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">${state.admin ? `Commentaires <small id="cCount"></small>` : "Laisser un commentaire"}</h2>
      ${CFG.feedbackNote ? `<p class="crit-note">${I.heart}<span>Critiques constructives bienvenues : sois honnête, je ne me vexerai pas — ça m'aide vraiment à progresser.${state.admin ? "" : ` Ton commentaire m'est envoyé directement, il n'est pas affiché publiquement.`}</span></p>` : ""}
      <form class="comment-form" id="cForm" autocomplete="off">
        <textarea id="cBody" maxlength="2000" placeholder="Qu'en penses-tu ? Points forts, points à améliorer… Écris pendant l'écoute pour réagir à un passage précis." required></textarea>
        <div class="form-row">
          <button type="button" class="tc-chip" id="tcChip" title="Lier le commentaire à ce moment du morceau">${I.clock}<span id="tcLabel">à 0:00</span></button>
          <input id="cName" maxlength="40" placeholder="Ton nom (facultatif)" value="${esc(ls.get("pl:name", ""))}">
          <button class="btn" id="cSend" type="submit">Envoyer</button>
          <span class="tc-hint" id="tcHint">Le moment de l'écoute est capturé quand tu commences à écrire — clique sur le timecode pour l'attacher à ton commentaire.</span>
        </div>
      </form>
      ${state.admin ? `<div class="filters" id="filters">
        <button data-f="all" class="on">Tous</button>
        <button data-f="tc">Par moment</button>
        <button data-f="gen">Généraux</button>
      </div>` : `<h3 class="mine-title" id="mineTitle" hidden>Tes commentaires sur ce morceau</h3>`}
      <ul class="comments" id="cList"></ul>
    </section>`;

  const canvas = $("#wave canvas"), wave = $("#wave");
  let peaks = fakePeaks(t.id), ghost = true, hover = null, duration = state.durations[t.id] || 0, comments = [], filter = "all";

  /* --- forme d'onde --- */
  const progress = () => state.current === t && audio.duration ? audio.currentTime / audio.duration : 0;
  const redraw = () => drawWave(canvas, peaks, progress(), hover, ghost);
  view.onTime = () => {
    redraw();
    if (state.current === t) $("#wCur").textContent = fmt(audio.currentTime);
    if (!tc.active && !tc.locked) updateChip();
  };
  getPeaks(t).then(p => { peaks = p; ghost = false; duration = duration || state.durations[t.id]; redraw(); renderMarkers(); }).catch(() => { ghost = false; redraw(); });
  getDuration(t).then(d => { duration = d; $("#wDur").textContent = fmt(d); renderMarkers(); });
  const onResize = () => redraw(); window.addEventListener("resize", onResize);
  view.destroy = () => window.removeEventListener("resize", onResize);
  requestAnimationFrame(redraw);

  const posFromEvent = e => { const r = wave.getBoundingClientRect(); return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); };
  wave.addEventListener("pointermove", e => { if (e.target.closest(".marker")) return; hover = posFromEvent(e); redraw(); });
  wave.addEventListener("pointerleave", () => { hover = null; redraw(); });
  wave.addEventListener("click", e => {
    if (e.target.closest(".marker")) return;
    const p = posFromEvent(e), d = state.current === t ? audio.duration : duration;
    playTrack(t, d ? p * d : 0);
  });

  /* --- partage --- */
  $("#share").addEventListener("click", async () => {
    const url = location.href.split("?")[0];
    if (navigator.share && matchMedia("(pointer: coarse)").matches) { try { await navigator.share({ title: t.title, url }); } catch {} return; }
    try { await navigator.clipboard.writeText(url); toast("Lien copié !"); } catch { prompt("Copie ce lien :", url); }
  });

  /* --- notes --- */
  const paintRating = () => {
    const s = state.stats[t.id] || {};
    $("#ratingText").innerHTML = s.count ? `<b>${s.avg.toFixed(1)}</b> / 5 · ${s.count} note${s.count > 1 ? "s" : ""}` : "Sois le premier à noter";
  };
  paintRating();
  const stars = $$("#stars button");
  stars.forEach(b => {
    b.addEventListener("mouseenter", () => stars.forEach(x => x.classList.toggle("on", +x.dataset.n <= +b.dataset.n)));
    b.addEventListener("click", async () => {
      const n = +b.dataset.n;
      try {
        await store.rate(t.id, n);
        const v = ls.get("pl:votes", {}); v[t.id] = n; ls.set("pl:votes", v);
        state.stats = await store.stats(); paintRating(); toast("Merci pour ta note !");
      } catch (err) { console.error(err); toast("Impossible d'enregistrer la note"); }
    });
  });
  $("#stars").addEventListener("mouseleave", () => { const v = ls.get("pl:votes", {})[t.id] || 0; stars.forEach(x => x.classList.toggle("on", +x.dataset.n <= v)); });

  /* --- timecode du formulaire ---
     Quand la personne commence à écrire, on capture la position de lecture.
     Le timecode est proposé grisé ; un clic l'active (il sera public).
     La position de l'écoute au moment de l'écriture est toujours envoyée,
     mais seul le créateur peut la voir. */
  const tc = { time: null, listening: false, active: false, locked: false };
  const body = $("#cBody"), chip = $("#tcChip");
  const livePos = () => state.current === t ? audio.currentTime : 0;
  function updateChip() {
    const time = tc.locked ? tc.time : livePos();
    $("#tcLabel").textContent = "à " + fmt(time);
    chip.classList.toggle("on", tc.active);
    chip.setAttribute("aria-pressed", tc.active);
  }
  body.addEventListener("input", () => {
    if (body.value.trim() && !tc.locked) {
      tc.locked = true; tc.listening = state.current === t && audio.currentTime > 0; tc.time = livePos();
    } else if (!body.value.trim() && tc.locked && !tc.active) {
      tc.locked = false;
    }
    updateChip();
  });
  chip.addEventListener("click", () => {
    if (!tc.locked) { tc.locked = true; tc.time = livePos(); tc.listening = state.current === t && audio.currentTime > 0; }
    tc.active = !tc.active;
    if (!tc.active && !body.value.trim()) tc.locked = false;
    updateChip();
  });
  updateChip();

  $("#cForm").addEventListener("submit", async e => {
    e.preventDefault();
    const text = body.value.trim(); if (!text) return;
    const name = $("#cName").value.trim(); ls.set("pl:name", name);
    const writtenAt = tc.locked ? (tc.listening ? tc.time : null) : (state.current === t && audio.currentTime > 0 ? audio.currentTime : null);
    $("#cSend").disabled = true;
    try {
      const c = {
        track_id: t.id, author: name || null, body: text,
        timecode: tc.active ? Math.round(tc.time * 10) / 10 : null,
        written_at_position: writtenAt == null ? null : Math.round(writtenAt * 10) / 10
      };
      await store.addComment(c);
      // Le visiteur garde une copie de ses propres commentaires dans son navigateur
      const mine = ls.get("pl:mycomments", []);
      mine.unshift({ id: "me-" + Date.now(), track_id: c.track_id, author: c.author, body: c.body, timecode: c.timecode, created_at: new Date().toISOString() });
      ls.set("pl:mycomments", mine.slice(0, 300));
      body.value = ""; Object.assign(tc, { time: null, listening: false, active: false, locked: false }); updateChip();
      toast(state.admin ? "Commentaire publié" : "Merci ! Ton commentaire a bien été envoyé");
      await loadComments(); state.stats = await store.stats();
    } catch (err) { console.error(err); toast("Oups, le commentaire n'a pas pu être envoyé"); }
    $("#cSend").disabled = false;
  });
  body.addEventListener("keydown", e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) $("#cForm").requestSubmit(); });

  /* --- liste --- */
  $$("#filters button").forEach(b => b.addEventListener("click", () => {
    filter = b.dataset.f; $$("#filters button").forEach(x => x.classList.toggle("on", x === b)); renderList();
  }));

  function commentHTML(c) {
    const name = c.author || "Anonyme";
    const tcPart = c.timecode != null
      ? `<button class="tc-link" data-seek="${c.timecode}" title="Écouter ce passage">${fmt(c.timecode)}</button>`
      : `<span class="tag-general">Général</span>`;
    let adminPart = "";
    if (state.admin) {
      adminPart = c.written_at_position != null
        ? `<button class="written-at" data-seek="${c.written_at_position}" title="Position de l'écoute quand le commentaire a été écrit">✎ écrit à ${fmt(c.written_at_position)}</button>`
        : `<span class="written-at" title="La personne n'écoutait pas ce morceau en écrivant">✎ écrit hors écoute</span>`;
    }
    return `<li class="comment" id="c-${esc(c.id)}">
      <div class="avatar" style="background:${hashColor(name)}">${esc(name.charAt(0).toUpperCase())}</div>
      <div>
        <div class="comment-head">
          <span class="comment-author">${esc(name)}</span>${tcPart}${adminPart}
          <span class="comment-date">${esc(ago(c.created_at))}</span>
          ${state.admin ? `<span class="comment-tools"><button class="del-btn" data-del="${esc(c.id)}">Supprimer</button></span>` : ""}
        </div>
        <div class="comment-body">${esc(c.body)}</div>
      </div></li>`;
  }

  function renderList() {
    let list = comments;
    if (filter === "tc") list = comments.filter(c => c.timecode != null).sort((a, b) => a.timecode - b.timecode);
    if (filter === "gen") list = comments.filter(c => c.timecode == null);
    const ul = $("#cList");
    if (!state.admin) {
      $("#mineTitle").hidden = !comments.length;
      ul.innerHTML = comments.map(commentHTML).join("");
    } else {
      $("#cCount").textContent = comments.length ? comments.length + "" : "";
      ul.innerHTML = list.length ? list.map(commentHTML).join("") : `<li class="empty">${comments.length ? "Rien dans cette catégorie." : "Aucun commentaire pour l'instant."}</li>`;
    }
    $$("[data-seek]", ul).forEach(b => b.addEventListener("click", () => playTrack(t, +b.dataset.seek)));
    $$("[data-del]", ul).forEach(b => b.addEventListener("click", async () => {
      if (!confirm("Supprimer ce commentaire ?")) return;
      try { await store.deleteComment(b.dataset.del); await loadComments(); toast("Commentaire supprimé"); }
      catch (err) { console.error(err); toast("Suppression impossible : " + (err.message || err)); }
    }));
  }

  function renderMarkers() {
    const box = $("#markers"); if (!box) return;
    if (!duration) { box.innerHTML = ""; return; }
    const items = [];
    if (state.admin) comments.filter(c => c.written_at_position != null).forEach(c => items.push({ c, at: c.written_at_position, cls: "written" }));
    comments.filter(c => c.timecode != null).forEach(c => items.push({ c, at: c.timecode, cls: "" }));
    box.innerHTML = items.map(({ c, at, cls }, i) => {
      const name = c.author || "Anonyme";
      return `<button class="marker ${cls}" data-i="${i}" style="left:${Math.min(100, at / duration * 100)}%;${cls ? "" : `background:${hashColor(name)};color:#fff`}" aria-label="${esc(name)} à ${fmt(at)}">${cls ? "" : esc(name.charAt(0).toUpperCase())}</button>`;
    }).join("");
    $$(".marker", box).forEach(m => {
      const { c, at, cls } = items[+m.dataset.i];
      m.addEventListener("mouseenter", () => {
        const tip = document.createElement("div"); tip.className = "marker-tip"; tip.style.left = m.style.left;
        tip.innerHTML = `<b>${fmt(at)}</b> · ${esc(c.author || "Anonyme")}${cls ? " <i>(écrit ici)</i>" : ""}<br>${esc(c.body.length > 90 ? c.body.slice(0, 90) + "…" : c.body)}`;
        box.appendChild(tip); m._tip = tip;
        $("#c-" + CSS.escape(c.id))?.classList.add("hl");
      });
      m.addEventListener("mouseleave", () => { m._tip?.remove(); $("#c-" + CSS.escape(c.id))?.classList.remove("hl"); });
      m.addEventListener("click", () => {
        playTrack(t, at);
        const el = $("#c-" + CSS.escape(c.id));
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  }

  async function loadComments() {
    // Visiteurs : seulement leurs propres commentaires. Créateur : tous.
    if (!state.admin) { comments = ls.get("pl:mycomments", []).filter(c => c.track_id === t.id); renderList(); renderMarkers(); return; }
    try { comments = await store.comments(t.id, true) || []; }
    catch (err) { console.error(err); comments = []; $("#cList").innerHTML = `<li class="empty">Impossible de charger les commentaires.</li>`; return; }
    renderList(); renderMarkers();
  }
  loadComments();
  syncPlayButtons();
  $$("[data-play]", app).forEach(b => b.addEventListener("click", () => toggle(t)));
  if (params.get("t")) playTrack(t, +params.get("t"));
}

/* ---------------- Espace créateur ---------------- */
async function renderAdmin() {
  document.title = "Espace créateur · " + CFG.siteTitle;
  const app = $("#app");
  if (!state.admin) {
    app.innerHTML = `
      <form class="admin-box" id="loginForm">
        <h1>Espace créateur</h1>
        ${store.demo
          ? `<p>Mode démo (Supabase pas encore configuré) : active simplement le mode créateur sur ce navigateur pour voir à quel moment chaque commentaire a été écrit.</p>
             <button class="btn teal" type="submit">Activer le mode créateur</button>`
          : `<p>Connecte-toi pour voir à quel moment de l'écoute chaque commentaire a été écrit et pour modérer.</p>
             <label for="email">E-mail</label><input id="email" type="email" required autocomplete="username">
             <label for="pw">Mot de passe</label><input id="pw" type="password" required autocomplete="current-password">
             <button class="btn teal" type="submit">Se connecter</button>`}
      </form>`;
    $("#loginForm").addEventListener("submit", async e => {
      e.preventDefault();
      try {
        const ok = await store.login($("#email")?.value, $("#pw")?.value);
        if (!ok) { toast("Ce compte n'est pas créateur"); await store.logout(); return; }
        state.admin = true; syncAdmin(); renderAdmin();
      } catch (err) { console.error(err); toast("Identifiants incorrects"); }
    });
    return;
  }

  const all = await store.comments(null, true).catch(() => []);
  const rankings = await store.rankings().catch(() => []);
  const board = rankingBoard(rankings);
  const s = Object.values(state.stats);
  const votes = s.reduce((a, x) => a + (x.count || 0), 0);
  const avg = votes ? s.reduce((a, x) => a + x.avg * x.count, 0) / votes : 0;
  app.innerHTML = `
    <section class="hero"><h1>Espace créateur</h1><p>Les pastilles <span class="written-at">✎ écrit à…</span> indiquent où en était l'écoute quand la personne a commencé à écrire. Elles ne sont visibles que par toi.</p><p style="margin-top:16px"><a class="btn" href="#/ajouter">+ Ajouter un morceau</a></p></section>
    ${store.demo ? `<p class="notice">Mode démo : rien n'est partagé tant que Supabase n'est pas configuré dans <code>config.js</code>.</p>` : ""}
    <div class="admin-stats">
      <div class="stat"><b>${state.tracks.length}</b><span>morceaux</span></div>
      <div class="stat"><b>${all.length}</b><span>commentaires</span></div>
      <div class="stat"><b>${votes ? avg.toFixed(1) : "–"}</b><span>note moyenne (${votes})</span></div>
    </div>
    <h2 class="section-title">Classement des auditeurs <small>${rankings.length}</small></h2>
    ${rankings.length ? `
      <ol class="board">${board.map((b, i) => `
        <li class="panel"><span class="rank-pos">${i + 1}</span>
          <a href="#/t/${esc(b.id)}" class="rank-title">${esc(b.title)}</a>
          <span class="score" title="Score de préférence"><i style="width:${Math.round(b.score * 100)}%"></i></span>
          <span class="meta">${Math.round(b.score * 100)} % · ${b.firsts}× en 1er</span>
        </li>`).join("")}</ol>
      <div class="rankings-grid">${rankings.map(r => `
        <div class="panel ranking-card">
          <h3>${esc(r.author || "Anonyme")}</h3>
          <span class="comment-date">${esc(ago(r.updated_at))}</span>
          <ol>${r.track_ids.map(id => `<li>${esc(byId(id)?.title || id)}</li>`).join("")}</ol>
        </div>`).join("")}</div>`
    : `<p class="empty">Personne n'a encore classé tes morceaux.</p>`}
    <h2 class="section-title">Derniers commentaires <small>${all.length}</small></h2>
    <ul class="comments">${all.slice(0, 50).map(c => {
      const t = byId(c.track_id), name = c.author || "Anonyme";
      return `<li class="comment"><div class="avatar" style="background:${hashColor(name)}">${esc(name.charAt(0).toUpperCase())}</div><div>
        <div class="comment-head"><span class="comment-author">${esc(name)}</span>
          <span class="comment-date">sur <a href="#/t/${esc(c.track_id)}"><b>${esc(t ? t.title : c.track_id)}</b></a></span>
          ${c.timecode != null ? `<span class="tc-link">${fmt(c.timecode)}</span>` : `<span class="tag-general">Général</span>`}
          ${c.written_at_position != null ? `<span class="written-at">✎ écrit à ${fmt(c.written_at_position)}</span>` : `<span class="written-at">✎ hors écoute</span>`}
          <span class="comment-date">${esc(ago(c.created_at))}</span></div>
        <div class="comment-body">${esc(c.body)}</div></div></li>`;
    }).join("") || `<li class="empty">Aucun commentaire pour l'instant.</li>`}</ul>
    <h2 class="section-title" style="margin-top:28px">Commentaires par morceau</h2>
    <ol class="board">${state.tracks.map(t => {
      const n = all.filter(c => c.track_id === t.id).length;
      return `<li class="panel"><span class="rank-cover">${coverHTML(t)}</span>
        <a href="#/t/${esc(t.id)}" class="rank-title">${esc(t.title)}</a>
        <span></span>
        <a href="#/t/${esc(t.id)}" class="card-comment">${I.chat} ${n} commentaire${n > 1 ? "s" : ""}</a></li>`;
    }).join("")}</ol>
    <p style="margin-top:28px"><button class="btn ghost" id="logout">Quitter le mode créateur</button></p>`;
  $("#logout").addEventListener("click", async () => { await store.logout(); state.admin = false; syncAdmin(); location.hash = "#/"; });
}
/* Classement global : pour chaque liste, le 1er vaut 100 %, le dernier 0 % ; on fait la moyenne. */
function rankingBoard(rankings) {
  const acc = {};
  for (const r of rankings) {
    const ids = r.track_ids.filter(byId), n = ids.length;
    ids.forEach((id, i) => {
      const a = (acc[id] ??= { sum: 0, votes: 0, firsts: 0 });
      a.sum += n > 1 ? 1 - i / (n - 1) : 1; a.votes++; if (i === 0) a.firsts++;
    });
  }
  return state.tracks.map(t => {
    const a = acc[t.id] || { sum: 0, votes: 0, firsts: 0 };
    return { id: t.id, title: t.title, score: a.votes ? a.sum / a.votes : 0, firsts: a.firsts, votes: a.votes };
  }).sort((x, y) => y.score - x.score || y.firsts - x.firsts);
}
function syncAdmin() { $("#adminPill").hidden = !state.admin; $("#menuAdmin").hidden = !state.admin; $("#menuAdd").hidden = !state.admin; }

/* ---------------- Ajouter un morceau (envoi direct sur GitHub) ----------------
   Utilise une clé d'accès GitHub (« fine-grained token ») limitée à ce dépôt,
   gardée uniquement dans le navigateur du créateur. */
const ghRepo = () => CFG.githubRepo || detectRepo();
const ghToken = () => ls.get("pl:ghtoken", "");
async function gh(path, opts = {}) {
  const r = await fetch("https://api.github.com" + path, { cache: "no-store",
    method: opts.method || "GET",
    headers: { Authorization: "Bearer " + ghToken(), Accept: "application/vnd.github+json", ...(opts.body ? { "Content-Type": "application/json" } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  if (!r.ok) { const e = new Error((await r.json().catch(() => ({}))).message || r.statusText); e.status = r.status; throw e; }
  return r.status === 204 ? null : r.json();
}
const fileToBase64 = file => new Promise((ok, ko) => {
  const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(",")[1]); fr.onerror = ko; fr.readAsDataURL(file);
});
async function ghReadTracks() {
  try {
    // lit la liste à la version exacte du dernier commit (évite une copie périmée)
    const ref = await gh(`/repos/${ghRepo()}/git/ref/heads/${CFG.githubBranch}`);
    const f = await gh(`/repos/${ghRepo()}/contents/tracks.json?ref=${ref.object.sha}`);
    const bytes = Uint8Array.from(atob(f.content.replace(/\n/g, "")), c => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes) || "[]");
  } catch (e) { if (e.status === 404) return []; throw e; }
}
/* Un seul commit pour tous les fichiers (ajout ou suppression) */
async function ghCommit(changes, message, onStep = () => {}) {
  const repo = ghRepo(), br = CFG.githubBranch;
  const ref = await gh(`/repos/${repo}/git/ref/heads/${br}`);
  const base = await gh(`/repos/${repo}/git/commits/${ref.object.sha}`);
  const tree = [];
  for (const c of changes) {
    if (c.remove) { tree.push({ path: c.path, mode: "100644", type: "blob", sha: null }); continue; }
    onStep(c.label || c.path);
    const body = c.text != null ? { content: c.text, encoding: "utf-8" } : { content: await fileToBase64(c.file), encoding: "base64" };
    const blob = await gh(`/repos/${repo}/git/blobs`, { method: "POST", body });
    tree.push({ path: c.path, mode: "100644", type: "blob", sha: blob.sha });
  }
  onStep("Enregistrement");
  const t = await gh(`/repos/${repo}/git/trees`, { method: "POST", body: { base_tree: base.tree.sha, tree } });
  const commit = await gh(`/repos/${repo}/git/commits`, { method: "POST", body: { message, tree: t.sha, parents: [ref.object.sha] } });
  await gh(`/repos/${repo}/git/refs/heads/${br}`, { method: "PATCH", body: { sha: commit.sha } });
  try { sessionStorage.removeItem("pl:gh:" + repo); } catch {}
}
const mb = n => (n / 1048576).toFixed(1).replace(".", ",") + " Mo";

function renderUpload(params = new URLSearchParams()) {
  let pendingEdit = params.get("edit");   // ouvert depuis le bouton « Modifier » d'une page morceau
  document.title = "Ajouter un morceau · " + CFG.siteTitle;
  const app = $("#app");
  if (!ghToken()) {
    app.innerHTML = `
      <section class="hero"><h1>Ajouter un morceau</h1><p>Pour envoyer tes morceaux directement depuis cette page, le site a besoin d'une clé d'accès à ton dépôt GitHub. À faire une seule fois par appareil.</p></section>
      <section class="panel token-box" style="max-width:720px;margin-bottom:40px">
        <ol>
          <li>Ouvre <a href="https://github.com/settings/personal-access-tokens/new?name=Playlist%20Omnipotard&description=Ajout%20de%20morceaux%20depuis%20le%20site&expires_in=366&contents=write" target="_blank" rel="noopener">la page de création de clé GitHub</a> (connecté avec ton compte). Le nom, la durée et la permission sont déjà remplis.</li>
          <li>Dans <b>Repository access</b>, choisis <i>Only select repositories</i> puis <b>${esc(ghRepo() || "ton dépôt")}</b>.</li>
          <li>Vérifie que <b>Contents</b> est sur <i>Read and write</i> (sinon, règle-le dans <i>Permissions</i>).</li>
          <li>Clique sur <b>Generate token</b>, copie la clé et colle-la ici. C'est fini, tu n'auras plus à le refaire sur cet appareil.</li>
        </ol>
        <div class="row">
          <input id="tokenInput" type="password" placeholder="github_pat_…" autocomplete="off">
          <button class="btn" id="tokenSave">Enregistrer la clé</button>
        </div>
        <p class="upload-status" id="tokenStatus" style="margin:10px 0 0">La clé reste uniquement dans ce navigateur. N'utilise pas cette page sur un ordinateur partagé.</p>
      </section>`;
    $("#tokenSave").addEventListener("click", async () => {
      const v = $("#tokenInput").value.trim(); if (!v) return;
      ls.set("pl:ghtoken", v);
      const st = $("#tokenStatus"); st.className = "upload-status"; st.textContent = "Vérification…";
      try {
        const r = await gh(`/repos/${ghRepo()}`);
        if (!r.permissions?.push) throw new Error("Cette clé ne peut pas écrire dans le dépôt (permission Contents : Read and write).");
        toast("Clé enregistrée"); renderUpload();
      } catch (e) { ls.set("pl:ghtoken", ""); st.className = "upload-status err"; st.textContent = "Clé refusée : " + e.message; }
    });
    return;
  }

  app.innerHTML = `
    <section class="hero"><h1>Ajouter un morceau</h1><p>Glisse ton son et son image, donne un titre, et c'est en ligne environ une minute après.</p></section>
    <div class="upload-grid">
      <section class="panel" id="formPanel">
        <h2 class="section-title" id="formTitle" style="font-size:18px">Nouveau morceau</h2>
        <label class="dropzone" id="drop">
          ${I.note}<b>Glisse ici ton son et son image</b><small>MP3, WAV, OGG, M4A… + JPG, PNG, WEBP — ou clique pour choisir</small>
          <input type="file" id="fileInput" accept="audio/*,image/*,.wav,.mp3,.flac,.m4a,.ogg" multiple hidden>
        </label>
        <div class="slots">
          <div class="slot-img" id="imgSlot" title="Glisse ou clique pour choisir l'image">Image<br>(facultative)</div>
          <input type="file" id="imgInput" accept="image/*" hidden>
          <div class="fields">
            <div class="audio-file missing" id="audioInfo">${I.note}<span>Aucun son choisi</span></div>
            <label for="upTitle">Titre</label>
            <input id="upTitle" maxlength="120" placeholder="Nom du morceau">
            <label for="upDesc">Description (facultative)</label>
            <textarea id="upDesc" maxlength="500" placeholder="Un mot sur le morceau, ce sur quoi tu veux des retours…"></textarea>
          </div>
        </div>
        <div class="upload-actions">
          <button class="btn" id="upSend">Mettre en ligne</button>
          <button class="btn ghost" id="upReset" type="button">Vider</button>
          <span class="upload-status" id="upStatus"></span>
        </div>
      </section>
      <section class="panel">
        <h2 class="section-title" style="font-size:18px">Morceaux en ligne</h2>
        <ul class="online-list" id="onlineList"><li class="upload-status">Chargement…</li></ul>
        <p style="margin:14px 0 0"><button class="small-link" id="tokenForget">Oublier la clé GitHub sur cet appareil</button></p>
      </section>
    </div>`;

  let audioFile = null, imageFile = null, busy = false;
  let editing = null;   // morceau en cours de modification (entrée de tracks.json), sinon null
  const status = (msg, cls = "") => { const s = $("#upStatus"); s.className = "upload-status " + cls; s.textContent = msg; };
  const isAudio = f => f.type.startsWith("audio/") || AUDIO_EXT.includes(ext(f.name));
  const isImage = f => f.type.startsWith("image/") || IMAGE_EXT.includes(ext(f.name));

  function paint() {
    const ai = $("#audioInfo");
    ai.classList.toggle("missing", !audioFile && !editing);
    ai.innerHTML = audioFile
      ? `${I.note}<span>${esc(audioFile.name)}</span><small>${mb(audioFile.size)}</small>`
      : editing
        ? `${I.note}<span>${esc(baseName(editing.file) + "." + ext(editing.file))}</span><small>son actuel — glisse un fichier pour le remplacer</small>`
        : `${I.note}<span>Aucun son choisi</span>`;
    const slot = $("#imgSlot");
    const src = imageFile ? URL.createObjectURL(imageFile) : editing && editing.cover ? editing.cover : null;
    slot.classList.toggle("filled", !!src);
    slot.innerHTML = src ? `<img alt="" src="${esc(src)}">` : editing ? "Ajouter<br>une image" : "Image<br>(facultative)";
  }
  /* Passe le formulaire en mode « Modifier » (entry) ou « Nouveau morceau » (null) */
  function setMode(entry) {
    editing = entry; audioFile = imageFile = null;
    $("#upTitle").value = entry ? entry.title || prettify(baseName(entry.file)) : "";
    $("#upDesc").value = entry ? entry.description || "" : "";
    $("#formTitle").textContent = entry ? `Modifier « ${entry.title || baseName(entry.file)} »` : "Nouveau morceau";
    $("#upSend").textContent = entry ? "Enregistrer les modifications" : "Mettre en ligne";
    $("#upReset").textContent = entry ? "Annuler" : "Vider";
    $("#drop b").textContent = entry ? "Glisse ici une nouvelle image (ou un nouveau son)" : "Glisse ici ton son et son image";
    status(""); paint();
    if (entry) $("#formPanel").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function take(files) {
    for (const f of files) {
      if (isAudio(f)) {
        audioFile = f;
        if (!$("#upTitle").value.trim()) $("#upTitle").value = prettify(baseName(f.name));
        if (f.size > 95 * 1048576) status("Ce fichier dépasse 95 Mo : GitHub le refusera. Exporte-le en MP3.", "err");
        else if (f.size > 45 * 1048576) status("Fichier lourd : l'envoi peut prendre un moment. Un MP3 320 kbps se chargera plus vite pour tes auditeurs.");
        else status("");
      } else if (isImage(f)) imageFile = f;
    }
    paint();
  }
  const drop = $("#drop");
  ["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", e => take(e.dataTransfer.files));
  $("#fileInput").addEventListener("change", e => take(e.target.files));
  const slot = $("#imgSlot");
  slot.addEventListener("click", () => $("#imgInput").click());
  ["dragenter", "dragover"].forEach(ev => slot.addEventListener(ev, e => { e.preventDefault(); slot.classList.add("over"); }));
  ["dragleave", "drop"].forEach(ev => slot.addEventListener(ev, e => { e.preventDefault(); slot.classList.remove("over"); }));
  slot.addEventListener("drop", e => { const f = [...e.dataTransfer.files].find(isImage); if (f) { imageFile = f; paint(); } });
  $("#imgInput").addEventListener("change", e => { if (e.target.files[0]) { imageFile = e.target.files[0]; paint(); } });
  // empêche le navigateur d'ouvrir un fichier lâché à côté de la zone
  view.destroy = () => { window.removeEventListener("dragover", stop); window.removeEventListener("drop", stop); };
  function stop(e) { e.preventDefault(); }
  window.addEventListener("dragover", stop); window.addEventListener("drop", stop);

  $("#upReset").addEventListener("click", () => setMode(null));
  $("#tokenForget").addEventListener("click", () => { if (confirm("Oublier la clé GitHub sur cet appareil ?")) { ls.set("pl:ghtoken", ""); renderUpload(); } });

  async function loadOnline() {
    const ul = $("#onlineList");
    try {
      const list = await ghReadTracks();
      ul.innerHTML = list.length ? list.map((t, i) => `
        <li><span class="rank-cover">${t.cover ? `<img src="${esc(t.cover)}" alt="">` : `<div class="cover-placeholder">${I.note}</div>`}</span>
          <span class="rank-title">${esc(t.title || baseName(t.file))}<small>${esc(t.file)}</small></span>
          <span class="row-actions"><button class="edit-btn" data-edit="${i}">Modifier</button><button class="del-btn" data-i="${i}">Supprimer</button></span></li>`).join("")
        : `<li class="upload-status" style="display:block;border:0;background:none">Aucun morceau pour l'instant.</li>`;
      $$("[data-edit]", ul).forEach(b => b.addEventListener("click", () => { if (!busy) setMode(list[+b.dataset.edit]); }));
      if (pendingEdit) {
        const e = list.find(x => (x.id || slug(baseName(x.file))) === pendingEdit);
        pendingEdit = null;
        if (e) setMode(e);
      }
      $$("[data-i]", ul).forEach(b => b.addEventListener("click", async () => {
        const t = list[+b.dataset.i];
        if (busy || !confirm(`Supprimer « ${t.title || t.file} » du site ? Le son et son image seront retirés.`)) return;
        busy = true; b.textContent = "…";
        try {
          const rest = list.filter((_, j) => j !== +b.dataset.i);
          const changes = [{ path: "tracks.json", text: JSON.stringify(rest, null, 2) + "\n" }, { path: t.file, remove: true }];
          if (t.cover && t.cover.startsWith(CFG.musicFolder + "/")) changes.push({ path: t.cover, remove: true });
          await ghCommit(changes, `Supprime le morceau « ${t.title || t.file} »`);
          toast("Morceau supprimé (le site se met à jour dans ~1 min)");
          if (editing && editing.file === t.file) setMode(null);
          loadOnline();
        } catch (e) { console.error(e); toast("Suppression impossible : " + e.message); b.textContent = "Supprimer"; }
        busy = false;
      }));
    } catch (e) {
      ul.innerHTML = `<li class="upload-status err" style="display:block;border:0;background:none">Impossible de lire le dépôt : ${esc(e.message)}</li>`;
      if (e.status === 401) { ls.set("pl:ghtoken", ""); toast("Clé GitHub expirée ou invalide"); }
    }
  }
  loadOnline();

  $("#upSend").addEventListener("click", async () => {
    if (busy) return;
    const title = $("#upTitle").value.trim();
    const desc = $("#upDesc").value.trim();
    if (!audioFile && !editing) return status("Ajoute d'abord un fichier son.", "err");
    if (!title) return status("Donne un titre au morceau.", "err");
    if (audioFile && audioFile.size > 95 * 1048576) return status("Fichier trop lourd (plus de 95 Mo).", "err");
    busy = true; $("#upSend").disabled = true;
    try {
      status("Préparation…");
      const list = await ghReadTracks();

      /* --- Modification d'un morceau existant ---
         Le nom de fichier (et donc l'identifiant du morceau) ne change pas :
         les commentaires, notes et classements restent attachés au morceau. */
      if (editing) {
        const idx = list.findIndex(x => x.file === editing.file);
        if (idx < 0) throw new Error("ce morceau n'est plus dans la liste (déjà supprimé ?)");
        const cur = list[idx], changes = [];
        // L'identifiant du morceau est figé (les commentaires y sont rattachés),
        // et chaque nouveau fichier reçoit un nom unique : sinon navigateurs et
        // GitHub continueraient d'afficher l'ancienne image / l'ancien son en cache.
        const id = cur.id || slug(baseName(cur.file));
        const stem = `${CFG.musicFolder}/${id}-${Date.now().toString(36)}`;
        let file = cur.file, cover = cur.cover || null;
        if (audioFile) {
          const p = `${stem}.${ext(audioFile.name) || "mp3"}`;
          changes.push({ path: p, file: audioFile, label: `Envoi du nouveau son (${mb(audioFile.size)})` });
          changes.push({ path: cur.file, remove: true });
          file = p;
        }
        if (imageFile) {
          const p = `${stem}.${ext(imageFile.name) || "jpg"}`;
          changes.push({ path: p, file: imageFile, label: "Envoi de l'image" });
          if (cur.cover && cur.cover.startsWith(CFG.musicFolder + "/")) changes.push({ path: cur.cover, remove: true });
          cover = p;
        }
        list[idx] = { id, file, ...(cover ? { cover } : {}), title, ...(desc ? { description: desc } : {}) };
        changes.push({ path: "tracks.json", text: JSON.stringify(list, null, 2) + "\n", label: "Mise à jour de la liste" });
        await ghCommit(changes, `Modifie le morceau « ${title} »`, s => status(s + "…"));
        if (audioFile) ls.set("pl:peaks:" + file, null);
        setMode(null);
        status(`« ${title} » est modifié ! Le changement apparaîtra sur le site dans environ une minute.`, "ok");
        toast("Morceau modifié");
        loadOnline();
        busy = false; $("#upSend").disabled = false;
        return;
      }

      const used = new Set([...list.flatMap(t => [t.file, t.cover]).filter(Boolean).map(p => baseName(p).toLowerCase()), ...list.map(t => t.id).filter(Boolean)]);
      let name = slug(title) || "morceau", n = 2;
      while (used.has(name)) name = `${slug(title) || "morceau"}-${n++}`;
      const audioPath = `${CFG.musicFolder}/${name}.${ext(audioFile.name) || "mp3"}`;
      const imgPath = imageFile ? `${CFG.musicFolder}/${name}.${ext(imageFile.name) || "jpg"}` : null;
      const entry = { file: audioPath, ...(imgPath ? { cover: imgPath } : {}), title, ...(desc ? { description: desc } : {}) };
      const changes = [{ path: audioPath, file: audioFile, label: `Envoi du son (${mb(audioFile.size)})` }];
      if (imageFile) changes.push({ path: imgPath, file: imageFile, label: "Envoi de l'image" });
      changes.push({ path: "tracks.json", text: JSON.stringify([entry, ...list], null, 2) + "\n", label: "Mise à jour de la liste" });
      await ghCommit(changes, `Ajoute le morceau « ${title} »`, s => status(s + "…"));
      status(`« ${title} » est envoyé ! Il apparaîtra sur le site dans environ une minute.`, "ok");
      toast("Morceau mis en ligne");
      audioFile = imageFile = null; $("#upTitle").value = ""; $("#upDesc").value = ""; paint();
      loadOnline();
    } catch (e) {
      console.error(e);
      status("L'envoi a échoué : " + e.message, "err");
      if (e.status === 401) ls.set("pl:ghtoken", "");
    }
    busy = false; $("#upSend").disabled = false;
  });
}

/* ---------------- Démarrage ---------------- */
(async function init() {
  $("#siteTitle").textContent = CFG.siteTitle;
  const [tracks, stats, admin] = await Promise.all([
    loadTracks(), store.stats().catch(() => ({})), store.isAdmin().catch(() => false)
  ]);
  Object.assign(state, { tracks, stats, admin });
  syncAdmin(); syncPlayButtons();
  route();
})();
})();
