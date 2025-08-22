'use strict';

const $ = (q) => document.querySelector(q);
const $$ = (q) => Array.from(document.querySelectorAll(q));

(function initTabs() {
  const tabs = [
    { btn: '#tabbtn-list', panel: '#tab-list' },
    { btn: '#tabbtn-browse', panel: '#tab-browse' },
    { btn: '#tabbtn-notif', panel: '#tab-notif' },
    { btn: '#tabbtn-safety', panel: '#tab-safety' },
    { btn: '#tabbtn-dash', panel: '#tab-dash' },
    { btn: '#tabbtn-events', panel: '#tab-events' },
    { btn: '#tabbtn-admin', panel: '#tab-admin' },
  ];
  tabs.forEach(t => {
    const b = $(t.btn), p = $(t.panel);
    if (!b || !p) return;
    b.addEventListener('click', () => {
      tabs.forEach(t2 => {
        const bb = $(t2.btn), pp = $(t2.panel);
        if (bb && pp) {
          bb.setAttribute('aria-selected', 'false');
          pp.classList.remove('active');
        }
      });
      b.setAttribute('aria-selected', 'true');
      p.classList.add('active');
    });
  });
})();


function toast(msg) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 2500);
}


function logAudit(action, by, details) {
  const rec = { ts: new Date().toISOString().replace('T', ' ').slice(0, 16), action, by, details };
  const arr = JSON.parse(localStorage.getItem('audit') || '[]'); arr.unshift(rec);
  localStorage.setItem('audit', JSON.stringify(arr));
  renderAudit();
}
function renderAudit() {
  const body = $('#audit'); if (!body) return;
  body.innerHTML = '';
  const arr = JSON.parse(localStorage.getItem('audit') || '[]');
  arr.slice(0, 100).forEach(a => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${a.ts}</td><td>${a.action}</td><td>${a.by}</td><td class="muted">${a.details}</td>`;
    body.appendChild(tr);
  });
}

/* ========= Listing Form ========= */
(function initListingForm() {
  const form = $('#listForm');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const src = $('#source').value.trim();
    const item = $('#item').value.trim();
    const qty = $('#quantity').value.trim();
    const loc = $('#location').value.trim();
    const safe = parseInt($('#safe').value, 10);
    const winHrs = parseInt($('#window').value, 10);
    const pack = $('#pack').value;
    const notes = $('#notes').value.trim();

    const id = 'LS-' + String(Math.floor(Math.random() * 100000)).padStart(5, '0');
    const start = new Date();
    const end = new Date(start.getTime() + winHrs * 3600 * 1000);

    const row = document.createElement('tr');
    row.setAttribute('data-id', id);
    row.setAttribute('data-end', end.toISOString().slice(0, 16));
    row.innerHTML = `
      <td><span class="pill">${id}</span></td>
      <td>${item}</td>
      <td>${qty}</td>
      <td>${src}</td>
      <td>${loc}</td>
      <td><span class="chip tag-ok">Safe ${safe}h</span></td>
      <td><span class="muted">${start.toISOString().slice(0, 16).replace('T', ' ')}</span></td>
      <td><span class="muted">${end.toISOString().slice(0, 16).replace('T', ' ')}</span></td>
      <td>
        <div class="inline-list">
          <button class="ghost" onclick="reserve('${id}')">Reserve</button>
          <button class="primary" onclick="view('${id}')">Details</button>
        </div>
      </td>`;
    const body = $('#listingsBody');
    if (body) body.prepend(row);

    logAudit('LIST_CREATE', src, `${item} — ${qty} @ ${loc} (safe ${safe}h, window ${winHrs}h; ${pack}; ${notes})`);
    toast('Listing published: ' + id);
    form.reset();
    computeKPIs();
    renderExpiryPreview();
  });
})();

/* ========= Filters & Sorting ========= */
(function initFilters() {
  const search = $('#search');
  const filterSafe = $('#filterSafe');
  const sortSel = $('#sort');
  if (search) search.addEventListener('input', applyFilters);
  if (filterSafe) filterSafe.addEventListener('change', applyFilters);
  if (sortSel) sortSel.addEventListener('change', applyFilters);
})();

function parseQty(q) {
  const num = parseFloat(q);
  return isNaN(num) ? 0 : num;
}

function applyFilters() {
  const q = ($('#search')?.value || '').toLowerCase();
  const sel = $('#filterSafe')?.value || 'all';
  const rows = $$('#listingsBody tr');
  rows.forEach(r => {
    const text = r.textContent.toLowerCase();
    const okSel = (sel === 'all') || text.includes('safe ' + sel + 'h');
    const okQuery = q === '' || text.includes(q);
    r.style.display = (okSel && okQuery) ? '' : 'none';
  });
  const sortVal = $('#sort')?.value || 'endAsc';
  const tbody = $('#listingsBody');
  const arr = rows.filter(r => r.style.display !== 'none');
  arr.sort((a, b) => {
    if (sortVal === 'endAsc' || sortVal === 'endDesc') {
      const ta = a.getAttribute('data-end'), tb = b.getAttribute('data-end');
      return sortVal === 'endAsc' ? ta.localeCompare(tb) : tb.localeCompare(ta);
    } else if (sortVal === 'qtyAsc' || sortVal === 'qtyDesc') {
      const qa = parseQty(a.children[2].innerText), qb = parseQty(b.children[2].innerText);
      return sortVal === 'qtyAsc' ? qa - qb : qb - qa;
    }
    return 0;
  });
  arr.forEach(r => tbody && tbody.appendChild(r));
}

/* ========= Reserve & Details ========= */
function reserve(id) {
  toast('Reserved listing ' + id + ' (demo)');
  logAudit('RESERVE', 'User', 'Reserved ' + id);
}

function view(id) {
  const row = $(`#listingsBody tr[data-id="${id}"]`);
  if (!row) return;
  const cells = Array.from(row.children).map(td => td.textContent.trim());
  const body = $('#detailBody');
  if (body) {
    body.innerHTML = `
      <div class="grid">
        <div><strong>Item:</strong> ${cells[1]}</div>
        <div><strong>Quantity:</strong> ${cells[2]}</div>
        <div><strong>Source:</strong> ${cells[3]}</div>
        <div><strong>Location:</strong> ${cells[4]}</div>
        <div><strong>Safety:</strong> ${cells[5]}</div>
        <div><strong>Start:</strong> ${cells[6]}</div>
        <div><strong>End:</strong> ${cells[7]}</div>
      </div>`;
  }
  openModal();
}

function openModal() { const m = $('#detailModal'); if (m) m.style.display = 'flex'; }
function closeModal() { const m = $('#detailModal'); if (m) m.style.display = 'none'; }
window.closeModal = closeModal;

/* ========= Notification Preferences ========= */
(function initNotifForm() {
  const form = $('#notifForm');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      role: $('#role').value, org: $('#org').value, prefItem: $('#prefItem').value,
      radius: $('#radius').value, channels: Array.from($('#channels').selectedOptions).map(o => o.value),
      quiet: $('#quiet').value, push: $('#enablePush').checked
    };
    localStorage.setItem('notifPrefs', JSON.stringify(data));
    toast('Notification preferences saved');
    logAudit('NOTIF_PREF_SAVE', data.role, JSON.stringify(data));
  });
})();

/* ========= Alerts (demo) ========= */
const demoAlerts = [
  { msg: 'Veg Biryani 40 plates @ North Hostel (Safe 4h)', time: '2m ago' },
  { msg: 'Idli + Chutney 60 pcs @ Main Canteen (Safe 3h)', time: '15m ago' },
  { msg: 'Fruit Salad 12 bowls @ Faculty Lounge (Safe 2h)', time: '28m ago' },
];
function renderAlerts() {
  const wrap = $('#alerts'); if (!wrap) return;
  wrap.innerHTML = '';
  demoAlerts.forEach(a => {
    const d = document.createElement('div');
    d.className = 'notif';
    d.innerHTML = `<strong>${a.msg}</strong><div class="muted">${a.time}</div>`;
    wrap.appendChild(d);
  });
}

/* ========= Expiry Preview ========= */
function renderExpiryPreview() {
  const soon = [];
  const now = new Date();
  $$('#listingsBody tr').forEach(r => {
    const end = new Date(r.getAttribute('data-end'));
    const mins = (end - now) / 60000;
    if (mins < 30 && mins > 0) {
      soon.push({
        id: r.getAttribute('data-id'),
        item: r.children[1].innerText,
        left: Math.round(mins)
      });
    }
  });
  const wrap = $('#expiryList'); if (!wrap) return;
  wrap.innerHTML = '';
  if (soon.length === 0) {
    wrap.innerHTML = '<div class="muted">No items expiring in the next 30 minutes.</div>';
    return;
  }
  soon.sort((a, b) => a.left - b.left).forEach(s => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<strong>${s.item}</strong> — <span class="warning">${s.left} min left</span> <span class="muted">(${s.id})</span>`;
    wrap.appendChild(card);
  });
}

/* ========= Auto-Expire ========= */
setInterval(() => {
  const autoChk = $('#autoExpire');
  if (autoChk && !autoChk.checked) return;
  const now = new Date().toISOString().slice(0, 16);
  $$('#listingsBody tr').forEach(r => {
    const end = r.getAttribute('data-end');
    if (end <= now) r.remove();
  });
  renderExpiryPreview();
  computeKPIs();
}, 30 * 1000);

/* ========= KPIs ========= */
function computeKPIs() {
  let kg = 0;
  $$('#listingsBody tr').forEach(r => {
    const q = r.children[2].innerText.toLowerCase();
    let val = 0;
    if (q.includes('kg')) val = parseFloat(q);
    else if (q.includes('plate')) val = parseFloat(q) * 0.4;
    else if (q.includes('bowl')) val = parseFloat(q) * 0.3;
    else if (q.includes('pc')) val = parseFloat(q) * 0.15;
    else if (q.includes('l')) val = parseFloat(q) * 1.0;
    else val = parseFloat(q) || 0.3;
    kg += isNaN(val) ? 0 : val;
  });
  const people = Math.round(kg / 0.6);
  const co2 = kg * 0.48;
  const water = kg * 1500;

  const setText = (sel, text) => { const el = $(sel); if (el) el.textContent = text; };
  setText('#kpiSavedKg', kg.toFixed(1) + ' kg');
  setText('#kpiPeople', people.toLocaleString());
  setText('#kpiCO2', Math.round(co2).toLocaleString() + ' kg CO₂e');
}

/* ========= Charts ========= */
function buildCharts() {
  const ctx1 = document.getElementById('chartWeekly');
  if (ctx1 && window.Chart) {
    new Chart(ctx1, {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{ label: 'kg saved', data: [22, 30, 28, 45, 34, 52, 49] }]
      },
      options: { responsive: true, plugins: { legend: { display: true } } }
    });
  }
  const ctx2 = document.getElementById('chartSource');
  if (ctx2 && window.Chart) {
    new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: ['Main Canteen', 'Hostels', 'Events', 'Faculty Lounge', 'Sports Complex'],
        datasets: [{ label: 'kg saved', data: [320, 280, 190, 90, 60] }]
      },
      options: { responsive: true, plugins: { legend: { display: true } } }
    });
  }
}

/* ========= Events ========= */
function seedEvents() {
  const samples = [
    { name: 'Tech Symposium', venue: 'Auditorium', start: addH(-2), end: addH(1) },
    { name: 'Sports Meet', venue: 'Ground', start: addH(-6), end: addH(-2) },
    { name: 'Alumni Lunch', venue: 'Guest House', start: addH(24), end: addH(28) },
  ];
  localStorage.setItem('events', JSON.stringify(samples));
  renderEvents();
  toast('Seeded demo events');
}
function addH(h) { return new Date(Date.now() + h * 3600 * 1000).toISOString().slice(0, 16); }
function renderEvents() {
  const wrap = $('#events'); if (!wrap) return;
  wrap.innerHTML = '';
  const ev = JSON.parse(localStorage.getItem('events') || '[]');
  ev.forEach(e => {
    const d = document.createElement('div');
    d.className = 'card';
    d.innerHTML = `<strong>${e.name}</strong> — ${e.venue}<br/><span class="muted">${e.start.replace('T', ' ')} → ${e.end.replace('T', ' ')}</span>`;
    wrap.appendChild(d);
  });
}
window.seedEvents = seedEvents;

/* ========= Users & Zones ========= */
function seedUsers() {
  const users = [
    { name: 'Canteen Ops', role: 'Canteen', contact: 'canteen@campus.edu' },
    { name: 'North Hostel Mess', role: 'Hostel', contact: 'north@hostel' },
    { name: 'FoodShare NGO', role: 'NGO', contact: 'ngo@foodshare.org' },
    { name: 'Student Council', role: 'Student', contact: 'council@campus.edu' },
  ];
  localStorage.setItem('users', JSON.stringify(users));
  renderUsers();
  toast('Seeded demo users');
}
function renderUsers() {
  const wrap = $('#users'); if (!wrap) return;
  wrap.innerHTML = '';
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  if (users.length === 0) { wrap.innerHTML = '<div class="muted">No users yet.</div>'; return; }
  users.forEach(u => {
    const d = document.createElement('div');
    d.className = 'card';
    d.innerHTML = `<strong>${u.name}</strong> <span class="pill">${u.role}</span><br/><span class="muted">${u.contact}</span>`;
    wrap.appendChild(d);
  });
}
window.seedUsers = seedUsers;

(function initZones() {
  const form = $('#zoneForm'); if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const z = { name: $('#zoneName').value, desc: $('#zoneDesc').value };
    const zones = JSON.parse(localStorage.getItem('zones') || '[]'); zones.push(z);
    localStorage.setItem('zones', JSON.stringify(zones));
    renderZones(); form.reset(); toast('Zone added');
  });
})();

function renderZones() {
  const wrap = $('#zones'); if (!wrap) return;
  wrap.innerHTML = '';
  const zones = JSON.parse(localStorage.getItem('zones') || '[]');
  if (zones.length === 0) { wrap.innerHTML = '<div class="muted">No zones yet.</div>'; return; }
  zones.forEach(z => {
    const d = document.createElement('div'); d.className = 'card';
    d.innerHTML = `<strong>${z.name}</strong><br/><span class="muted">${z.desc}</span>`;
    wrap.appendChild(d);
  });
}

/* ========= Initial Hydration ========= */
function hydrateInitial() {
  computeKPIs();
}

/* ========= Auto-run on load ========= */
window.addEventListener('DOMContentLoaded', () => {
  renderAlerts();
  buildCharts();
  renderEvents();
  renderUsers();
  renderZones();
  renderAudit();
  hydrateInitial();
  renderExpiryPreview();
  setInterval(renderExpiryPreview, 60 * 1000);
});

// Expose functions for inline buttons
window.reserve = reserve;
window.view = view;
window.openModal = openModal;
window.applyFilters = applyFilters;
window.computeKPIs = computeKPIs;
window.renderExpiryPreview = renderExpiryPreview;
window.renderAudit = renderAudit;
window.renderZones = renderZones;
window.renderUsers = renderUsers;
window.renderEvents = renderEvents;
window.toast = toast;
/* ===== Login System ===== */
(function initLogin() {
  const screen = document.getElementById('loginScreen');
  const form = document.getElementById('loginForm');
  const guestBtn = document.getElementById('guestBtn');

  if (!screen || !form) return;

  // If already "logged in" (saved in localStorage), skip login screen
  if (localStorage.getItem('userLoggedIn')) {
    screen.style.display = 'none';
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPass').value.trim();

    if (email && pass) {
      localStorage.setItem('userLoggedIn', email);
      screen.style.display = 'none';
      toast('Welcome back, ' + email.split('@')[0] + '!');
      logAudit('LOGIN', email, 'User logged in');
    } else {
      toast('Please enter valid credentials');
    }
  });

  guestBtn.addEventListener('click', () => {
    localStorage.setItem('userLoggedIn', 'Guest');
    screen.style.display = 'none';
    toast('Continuing as Guest');
    logAudit('LOGIN', 'Guest', 'Guest access');
  });
})();
/* ===== Login System ===== */
(function initLogin() {
  const screen = document.getElementById('loginScreen');
  const form = document.getElementById('loginForm');
  const guestBtn = document.getElementById('guestBtn');

  if (!screen || !form) return;

  // If already "logged in" (saved in localStorage), skip login screen
  if (localStorage.getItem('userLoggedIn')) {
    screen.style.display = 'none';
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPass').value.trim();

    if (email && pass) {
      localStorage.setItem('userLoggedIn', email);
      screen.style.display = 'none';
      toast('Welcome back, ' + email.split('@')[0] + '!');
      logAudit('LOGIN', email, 'User logged in');
    } else {
      toast('Please enter valid credentials');
    }
  });

  guestBtn.addEventListener('click', () => {
    localStorage.setItem('userLoggedIn', 'Guest');
    screen.style.display = 'none';
    toast('Continuing as Guest');
    logAudit('LOGIN', 'Guest', 'Guest access');
  });
})();


//..................................................
// import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// // Handle login form
// (function initLogin(){
//   const screen = document.getElementById('loginScreen');
//   const form = document.getElementById('loginForm');
//   const guestBtn = document.getElementById('guestBtn');

//   if (!screen || !form) return;

//   form.addEventListener('submit', async (e) => {
//     e.preventDefault();
//     const email = document.getElementById('loginEmail').value.trim();
//     const pass = document.getElementById('loginPass').value.trim();

//     try {
//       const cred = await signInWithEmailAndPassword(auth, email, pass);
//       screen.style.display = 'none';
//       toast('Welcome back, ' + cred.user.email);
//       logAudit('LOGIN', email, 'Firebase Auth success');
//     } catch (err) {
//       toast('Login failed: ' + err.message);
//     }
//   });

//   guestBtn.addEventListener('click', () => {
//     screen.style.display = 'none';
//     toast('Continuing as Guest');
//     logAudit('LOGIN', 'Guest', 'Guest access');
//   });
// })();

// // Handle logout
// async function logoutUser() {
//   await signOut(auth);
//   localStorage.clear();
//   location.reload();
// }
// window.logoutUser = logoutUser;
//...................................................................................
// document.getElementById('signupBtn').addEventListener('click', async () => {
//   const email = document.getElementById('loginEmail').value.trim();
//   const pass = document.getElementById('loginPass').value.trim();

//   try {
//     const cred = await createUserWithEmailAndPassword(auth, email, pass);
//     toast('Account created for ' + cred.user.email);
//     logAudit('REGISTER', email, 'New user registered');
//     document.getElementById('loginScreen').style.display = 'none';
//   } catch (err) {
//     toast('Signup failed: ' + err.message);
//   }
// });
