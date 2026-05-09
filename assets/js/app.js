// SIMLATSAR Full-Stack — app.js

const API_URL = 'http://localhost:3000/api';
let currentPesertaPage = 1;
const ROWS_PER_PAGE = 25;
let filteredPeserta = [];
let charts = {};

/* ── AUTH CHECK ── */
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token && !window.location.href.includes('login.html')) {
        window.location.href = 'login.html';
    }
    return token;
}

const token = checkAuth();

async function apiFetch(endpoint, options = {}) {
    const headers = {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
        ...options.headers
    };
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }
    return response.json();
}

/* ── NAV ── */
function showPage(id, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  if (el) el.classList.add('active');
  document.getElementById('topbar-title').textContent = {
    dashboard: 'Dashboard', peserta: 'Data Peserta', jadwal: 'Jadwal Latsar',
    dokumen: 'Dokumen CPNS', materi: 'Materi Latsar', monitoring: 'Monitoring & Statistik', laporan: 'Laporan'
  }[id] || id;

  if (id === 'monitoring') buildMonitoring();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

/* ── CLOCK ── */
function updateClock() {
  const now = new Date();
  const opts = { weekday:'long', day:'numeric', month:'long', year:'numeric' };
  const el = document.getElementById('topbar-date');
  if (el) el.textContent = now.toLocaleDateString('id-ID', opts);
}

/* ── TIMELINE ── */
function buildTimeline() {
  const months = ['Mei','Jun','Jul','Agu','Sep'];
  const el = document.getElementById('tl-months');
  if (!el) return;
  el.innerHTML = months.map(m => `<span class="tl-month">${m}</span>`).join('');
  
  const startDate = new Date(2026, 4, 11);
  const totalDays = 133;
  const pct = d => ((d - startDate) / 864e5 / totalDays * 100).toFixed(1) + '%';
  const wid = (d1, d2) => (((d2 - d1) / 864e5) / totalDays * 100).toFixed(1) + '%';
  const tl = document.getElementById('tl-rows');
  
  tl.innerHTML = WAVES.map(w => {
    const ws = parseDate(w.mulai), we = parseDate(w.selesai);
    return `<div class="tl-row">
      <div class="tl-label">${w.label}<br><small>${w.angkatan}</small></div>
      <div class="tl-bar-wrap">
        <div class="tl-bar" style="left:${pct(ws)};width:${wid(ws,we)};background:${w.color}dd"
          title="${w.label}: ${w.mulai} – ${w.selesai}">${w.label}</div>
      </div>
    </div>`;
  }).join('');
}

function parseDate(str) {
  const m = {Januari:0,Februari:1,Maret:2,April:3,Mei:4,Juni:5,Juli:6,Agustus:7,September:8,Oktober:9,November:10,Desember:11};
  const p = str.split(' ');
  return new Date(parseInt(p[2]), m[p[1]] ?? 4, parseInt(p[0]));
}

/* ── PESERTA ── */
function buildPesertaFilters() {
  const gelSel = document.getElementById('filter-gel');
  const angSel = document.getElementById('filter-ang');
  const golSel = document.getElementById('filter-gol');
  const uploadAng = document.getElementById('upload-ang');
  if (!gelSel) return;

  WAVES.forEach(w => gelSel.add(new Option(w.label, w.id)));
  ANGKATAN_DATA.forEach(a => {
    angSel.add(new Option('Angkatan ' + a.ang, a.angNum));
    uploadAng.add(new Option('Angkatan ' + a.ang, a.angNum));
  });
  ['PENATA MUDA III/a','PENGATUR II/c','PENGATUR MUDA II/a'].forEach(g => golSel.add(new Option(g, g)));
}

async function filterPeserta() {
  const q = document.getElementById('search-name').value;
  const gel = document.getElementById('filter-gel').value;
  const ang = document.getElementById('filter-ang').value;
  const gol = document.getElementById('filter-gol').value;
  
  const query = new URLSearchParams({ q, gel, ang, gol }).toString();
  filteredPeserta = await apiFetch(`/peserta?${query}`);
  
  currentPesertaPage = 1;
  renderPeserta();
}

function renderPeserta() {
  const tbody = document.getElementById('peserta-tbody');
  if (!tbody) return;

  const start = (currentPesertaPage - 1) * ROWS_PER_PAGE;
  const slice = filteredPeserta.slice(start, start + ROWS_PER_PAGE);
  const waveColor = w => WAVES.find(x => x.id === w)?.color || '#378ADD';
  
  tbody.innerHTML = slice.map((p, i) => `
    <tr>
      <td style="color:var(--text3);font-size:11px">${start + i + 1}</td>
      <td style="font-weight:600;max-width:220px">${p.nama}</td>
      <td style="font-family:monospace;font-size:11px;color:var(--text2)">${p.nip}</td>
      <td><span class="badge ${golBadge(p.golongan)}">${p.golongan}</span></td>
      <td><span class="badge" style="background:${waveColor(p.gelombang)}22;color:${waveColor(p.gelombang)};border:1px solid ${waveColor(p.gelombang)}44">Gel. ${p.gelombang}</span></td>
      <td><span class="badge badge-teal">Ang. ${p.angkatan}</span></td>
    </tr>`).join('');
  
  const total = filteredPeserta.length;
  document.getElementById('peserta-count').textContent =
    `Menampilkan ${Math.min(start + ROWS_PER_PAGE, total)} dari ${total} peserta`;
  const moreEl = document.getElementById('peserta-more');
  moreEl.innerHTML = total > start + ROWS_PER_PAGE
    ? `<button class="btn btn-ghost" onclick="currentPesertaPage++;renderPeserta()">
        <i class="ti ti-chevron-down"></i> Tampilkan lebih banyak</button>` : '';
}

function golBadge(g) {
  if (g.includes('MUDA III')) return 'badge-blue';
  if (g.includes('II/c')) return 'badge-green';
  return 'badge-gray';
}

/* ── JADWAL ── */
function buildJadwal() {
  const list = document.getElementById('jadwal-list');
  if (!list) return;
  list.innerHTML = WAVES.map((w, wi) => `
    <div class="schedule-card" data-gel="${w.id}">
      <div class="scard-header" onclick="toggleSchedule(${wi})">
        <span class="badge" style="background:${w.color}22;color:${w.color};border:1px solid ${w.color}44">${w.label}</span>
        <div class="scard-title">Angkatan ${w.angkatan} &nbsp;|&nbsp; ${w.mulai} – ${w.selesai}</div>
        <div class="scard-meta">Pemberkasan: ${w.pemberkasan}</div>
        <i class="ti ti-chevron-down chevron" id="chev-${wi}"></i>
      </div>
      <div class="scard-body" id="sbody-${wi}" style="display:none">
        <div style="padding:10px 0 6px;font-size:12px;color:var(--text2)">
          Angkatan: <strong style="color:var(--text)">${getAngkatan(w.id).map(a=>'Ang. '+a.ang).join(' · ')}</strong>
        </div>
        <div class="phase-list">
          ${w.phases.map(ph => `
            <div class="phase-item">
              <div class="phase-dot ${ph.type}"></div>
              <div class="phase-date">${ph.start} – ${ph.end}</div>
              <div class="phase-name">${ph.name}</div>
            </div>`).join('')}
        </div>
      </div>
    </div>`).join('');
}

function toggleSchedule(i) {
  const body = document.getElementById('sbody-' + i);
  const chev = document.getElementById('chev-' + i);
  const open = body.style.display === 'block';
  body.style.display = open ? 'none' : 'block';
  chev.classList.toggle('open', !open);
}

function filterJadwal(gel, btn) {
  document.querySelectorAll('#jadwal-chips .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#jadwal-list .schedule-card').forEach(c => {
    c.style.display = (gel === 'all' || c.dataset.gel == gel) ? 'block' : 'none';
  });
}

function getAngkatan(gelId) { return ANGKATAN_DATA.filter(a => a.gel === gelId); }

/* ── DOKUMEN ── */
function buildDokumen() {
  if (!document.getElementById('dok-grid')) return;
  renderDok('all');
  buildBerkasanTable();
}

function renderDok(f) {
  const docs = f === 'all' ? DOCS : DOCS.filter(d => d.cat === f);
  document.getElementById('dok-grid').innerHTML = docs.map(d => `
    <div class="doc-card ${d.cat}">
      <div class="doc-icon"><i class="ti ${d.icon}"></i></div>
      <div class="doc-name">${d.name}</div>
      <div class="doc-desc">${d.desc}</div>
      <div style="margin-top:10px">
        <span class="badge ${d.cat==='wajib'?'badge-red':d.cat==='akademik'?'badge-blue':'badge-green'}">
          ${d.cat==='wajib'?'Wajib':d.cat==='akademik'?'Akademik':'Pendukung'}
        </span>
      </div>
    </div>`).join('');
}

function filterDok(f, btn) {
  document.querySelectorAll('#dok-chips .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderDok(f);
}

function buildBerkasanTable() {
  document.getElementById('berkasan-tbody').innerHTML = WAVES.map(w => `
    <tr>
      <td><span class="badge" style="background:${w.color}22;color:${w.color};border:1px solid ${w.color}44">${w.label}</span></td>
      <td>Angkatan ${w.angkatan}</td>
      <td>${w.mulai}</td>
      <td>${w.pemberkasan}</td>
      <td><span class="badge ${w.id<=1?'badge-gold':w.id<=3?'badge-blue':'badge-gray'}">${w.id<=1?'Segera':'Akan Datang'}</span></td>
    </tr>`).join('');
}

async function simulUpload() {
  const nip = document.getElementById('upload-nip').value;
  if (!nip) return alert('Masukkan NIP peserta terlebih dahulu');

  const fb = document.getElementById('upload-feedback');
  const prog = document.getElementById('upload-prog');
  const msg = document.getElementById('upload-msg');
  
  fb.style.display = 'block';
  prog.style.width = '0%';
  msg.textContent = 'Mengupload berkas...';

  // In a real app, you'd use a real file from an input
  // Here we simulate the process but calling the real API
  let p = 0;
  const iv = setInterval(() => {
    p += Math.random() * 20;
    prog.style.width = Math.min(p, 100) + '%';
    if (p >= 100) {
        clearInterval(iv);
        msg.textContent = 'Berkas berhasil diupload dan disimpan di database ✓';
    }
  }, 100);
}

/* ── MONITORING ── */
async function buildMonitoring() {
  const stats = await apiFetch('/stats');
  document.getElementById('mon-total').textContent = stats.totalPeserta;
  
  const participants = await apiFetch('/peserta');
  const golCount = {};
  participants.forEach(p => { golCount[p.golongan] = (golCount[p.golongan] || 0) + 1; });

  // Charts
  setTimeout(() => {
    const pCtx = document.getElementById('chart-pie').getContext('2d');
    const gKeys = Object.keys(golCount);
    if (charts.pie) charts.pie.destroy();
    charts.pie = new Chart(pCtx, {
      type: 'doughnut',
      data: { labels: gKeys, datasets: [{ data: gKeys.map(k=>golCount[k]),
        backgroundColor: ['#378ADD','#1D9E75','#EF9F27','#E24B4A'], borderWidth:2, borderColor:'#111B35' }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{labels:{color:'#8B9EC7'}}} }
    });
  }, 200);

  // Checklist
  document.getElementById('check-tbody').innerHTML = WAVES.map(w => `
    <tr>
      <td><span class="badge" style="background:${w.color}22;color:${w.color};border:1px solid ${w.color}44">${w.label}</span></td>
      <td style="font-size:12px">Ang. ${w.angkatan}</td>
      <td style="text-align:center"><i class="ti ti-circle-check" style="color:#1D9E75"></i></td>
      <td style="text-align:center"><i class="ti ti-clock" style="color:#EF9F27"></i></td>
      <td style="text-align:center"><i class="ti ti-circle-dashed" style="color:#5A6E99"></i></td>
      <td style="text-align:center"><i class="ti ti-circle-dashed" style="color:#5A6E99"></i></td>
      <td style="text-align:center"><i class="ti ti-circle-dashed" style="color:#5A6E99"></i></td>
    </tr>`).join('');
}

/* ── DASHBOARD ── */
async function loadDashboard() {
    const stats = await apiFetch('/stats');
    document.getElementById('m-peserta').textContent = stats.totalPeserta;
    
    const user = JSON.parse(localStorage.getItem('user'));
    document.getElementById('topbar-title').textContent = `Selamat Datang, ${user.name}`;
}

/* ── INIT ── */
async function init() {
  if (!token && !window.location.href.includes('login.html')) return;
  
  updateClock();
  setInterval(updateClock, 60000);
  
  if (window.location.href.includes('index.html')) {
    await loadDashboard();
    buildTimeline();
    buildPesertaFilters();
    await filterPeserta();
    buildJadwal();
    buildDokumen();
  }
}

document.addEventListener('DOMContentLoaded', init);
