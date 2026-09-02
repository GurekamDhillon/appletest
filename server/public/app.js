const STAGE_LABELS = {
  requested: 'Requested',
  printed: 'Printed',
  collected: 'Collected',
  delivered: 'Delivered',
  pod_submitted: 'POD Submitted',
};

const REQUEST_TYPE_LABELS = {
  flha: 'FLHA',
  vehicle_inspection: 'Vehicle Inspection',
  office_inspection: 'Office Inspection',
  receiving: 'Receiving / Packing Slip',
};

const loginScreen = document.getElementById('login-screen');
const dashboard = document.getElementById('dashboard');
const loginCode = document.getElementById('login-code');
const loginError = document.getElementById('login-error');
const loginButton = document.getElementById('login-button');

const orderRef = document.getElementById('order-ref');
const orderClient = document.getElementById('order-client');
const orderNotes = document.getElementById('order-notes');
const createButton = document.getElementById('create-button');
const createError = document.getElementById('create-error');

const ordersBody = document.getElementById('orders-body');
const ordersEmpty = document.getElementById('orders-empty');

const requestType = document.getElementById('request-type');
const requestVehicle = document.getElementById('request-vehicle');
const requestDue = document.getElementById('request-due');
const requestNote = document.getElementById('request-note');
const requestButton = document.getElementById('request-button');
const requestError = document.getElementById('request-error');
const requestsBody = document.getElementById('requests-body');
const requestsEmpty = document.getElementById('requests-empty');

let pollHandle = null;
let latestOrders = [];
let latestRequests = [];
const expandedOrders = new Set();

function refreshAll() {
  refreshOrders();
  refreshRequests();
}

function showDashboard() {
  loginScreen.hidden = true;
  dashboard.hidden = false;
  refreshAll();
  if (!pollHandle) {
    pollHandle = setInterval(refreshAll, 30000);
  }
}

function showLogin(message) {
  dashboard.hidden = true;
  loginScreen.hidden = false;
  if (pollHandle) {
    clearInterval(pollHandle);
    pollHandle = null;
  }
  if (message) {
    loginError.textContent = message;
    loginError.hidden = false;
  }
}

async function attemptLogin() {
  loginError.hidden = true;
  const code = loginCode.value.trim();
  if (!code) return;
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (res.ok) {
    showDashboard();
  } else {
    loginError.textContent = 'Incorrect access code.';
    loginError.hidden = false;
  }
}

loginButton.addEventListener('click', attemptLogin);
loginCode.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') attemptLogin();
});

async function refreshOrders() {
  const res = await fetch('/api/orders');
  if (res.status === 401) {
    showLogin();
    return;
  }
  const orders = await res.json();
  renderOrders(orders);
}

function renderOrders(orders) {
  latestOrders = orders;
  ordersBody.innerHTML = '';
  ordersEmpty.hidden = orders.length > 0;
  for (const order of orders) {
    const row = document.createElement('tr');
    if (order.cancelled) row.className = 'row-cancelled';
    const stageBadge = order.cancelled
      ? `<span class="badge badge-cancelled">Cancelled</span>`
      : `<span class="badge badge-${order.stage}">${STAGE_LABELS[order.stage] ?? order.stage}</span>`;
    row.innerHTML = `
      <td>${escapeHtml(order.orderRef)}</td>
      <td>${escapeHtml(order.client)}</td>
      <td>${stageBadge}</td>
      <td>${escapeHtml(order.notes ?? '')}</td>
      <td><button class="link-button" data-action="toggle-order" data-id="${order.id}">${expandedOrders.has(order.id) ? 'Hide' : 'Details'}</button></td>
    `;
    ordersBody.appendChild(row);

    if (expandedOrders.has(order.id)) {
      ordersBody.appendChild(renderOrderDetailRow(order));
    }
  }
}

function renderOrderDetailRow(order) {
  const row = document.createElement('tr');
  row.className = 'detail-row';
  const history = order.stageHistory
    .map((t) => `<div>${STAGE_LABELS[t.stage] ?? t.stage} — ${new Date(t.at).toLocaleString()}</div>`)
    .join('');
  const pod = order.podPhotoUri
    ? `<a href="${order.podPhotoUri}" target="_blank" rel="noopener"><img class="pod-thumb" src="${order.podPhotoUri}" alt="Proof of delivery" /></a>`
    : `<span style="color: var(--muted); font-size: 13px;">No proof of delivery yet.</span>`;
  row.innerHTML = `
    <td colspan="5">
      <div class="detail-grid">
        <div>
          <strong style="font-size: 13px;">Stage history</strong>
          <div class="stage-history">${history}</div>
        </div>
        <div>
          <strong style="font-size: 13px;">Proof of delivery</strong>
          <div>${pod}</div>
        </div>
        <div>
          <strong style="font-size: 13px;">Notes</strong>
          <textarea data-notes-for="${order.id}">${escapeHtml(order.notes ?? '')}</textarea>
        </div>
        <div class="detail-actions">
          <button class="link-button" data-action="save-notes" data-id="${order.id}">Save Notes</button>
          <button class="link-button danger" data-action="toggle-cancel-order" data-id="${order.id}">
            ${order.cancelled ? 'Restore Order' : 'Cancel Order'}
          </button>
        </div>
      </div>
    </td>
  `;
  return row;
}

ordersBody.addEventListener('click', async (e) => {
  const button = e.target.closest('button[data-action]');
  if (!button) return;
  const id = button.dataset.id;
  const order = latestOrders.find((o) => o.id === id);

  if (button.dataset.action === 'toggle-order') {
    if (expandedOrders.has(id)) expandedOrders.delete(id);
    else expandedOrders.add(id);
    renderOrders(latestOrders);
    return;
  }

  if (button.dataset.action === 'save-notes') {
    const textarea = ordersBody.querySelector(`textarea[data-notes-for="${id}"]`);
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: textarea.value.trim() || undefined }),
    });
    if (res.status === 401) return showLogin();
    await refreshOrders();
    return;
  }

  if (button.dataset.action === 'toggle-cancel-order') {
    const res = await fetch(`/api/orders/${id}/cancel`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancelled: !(order && order.cancelled) }),
    });
    if (res.status === 401) return showLogin();
    await refreshOrders();
  }
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

createButton.addEventListener('click', async () => {
  createError.hidden = true;
  const ref = orderRef.value.trim();
  const client = orderClient.value.trim();
  const notes = orderNotes.value.trim();
  if (!ref || !client) {
    createError.textContent = 'Order reference and client are required.';
    createError.hidden = false;
    return;
  }
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderRef: ref, client, notes: notes || undefined }),
  });
  if (res.status === 401) {
    showLogin();
    return;
  }
  if (!res.ok) {
    createError.textContent = 'Failed to add order.';
    createError.hidden = false;
    return;
  }
  orderRef.value = '';
  orderClient.value = '';
  orderNotes.value = '';
  refreshOrders();
});

async function refreshRequests() {
  const res = await fetch('/api/requests');
  if (res.status === 401) {
    showLogin();
    return;
  }
  const requests = await res.json();
  renderRequests(requests);
}

const REQUEST_STATUS_LABELS = { open: 'Open', fulfilled: 'Fulfilled', cancelled: 'Cancelled' };

function renderRequests(requests) {
  latestRequests = requests;
  requestsBody.innerHTML = '';
  requestsEmpty.hidden = requests.length > 0;
  for (const r of requests) {
    const row = document.createElement('tr');
    if (r.status === 'cancelled') row.className = 'row-cancelled';
    const typeLabel = REQUEST_TYPE_LABELS[r.type] ?? r.type;
    const label = r.vehicleLabel ? `${typeLabel} (${escapeHtml(r.vehicleLabel)})` : typeLabel;
    const action =
      r.status === 'open'
        ? `<button class="link-button danger" data-action="cancel-request" data-id="${r.id}">Cancel</button>`
        : '';
    row.innerHTML = `
      <td>${label}</td>
      <td>${r.dueDate ? escapeHtml(r.dueDate) : '—'}</td>
      <td>${escapeHtml(r.note ?? '')}</td>
      <td><span class="badge badge-${r.status}">${REQUEST_STATUS_LABELS[r.status] ?? r.status}</span></td>
      <td>${action}</td>
    `;
    requestsBody.appendChild(row);
  }
}

requestsBody.addEventListener('click', async (e) => {
  const button = e.target.closest('button[data-action="cancel-request"]');
  if (!button) return;
  const res = await fetch(`/api/requests/${button.dataset.id}/cancel`, { method: 'PATCH' });
  if (res.status === 401) return showLogin();
  await refreshRequests();
});

requestButton.addEventListener('click', async () => {
  requestError.hidden = true;
  const type = requestType.value;
  const vehicleLabel = requestVehicle.value.trim();
  const dueDate = requestDue.value;
  const note = requestNote.value.trim();

  const res = await fetch('/api/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type,
      vehicleLabel: vehicleLabel || undefined,
      dueDate: dueDate || undefined,
      note: note || undefined,
    }),
  });
  if (res.status === 401) {
    showLogin();
    return;
  }
  if (!res.ok) {
    requestError.textContent = 'Failed to create request.';
    requestError.hidden = false;
    return;
  }
  requestVehicle.value = '';
  requestDue.value = '';
  requestNote.value = '';
  refreshRequests();
});

// On load, probe whether we already have a valid session cookie.
(async function init() {
  const res = await fetch('/api/orders');
  if (res.ok) {
    showDashboard();
  } else {
    showLogin();
  }
})();
