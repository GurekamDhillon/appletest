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
  ordersBody.innerHTML = '';
  ordersEmpty.hidden = orders.length > 0;
  for (const order of orders) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(order.orderRef)}</td>
      <td>${escapeHtml(order.client)}</td>
      <td><span class="badge badge-${order.stage}">${STAGE_LABELS[order.stage] ?? order.stage}</span></td>
      <td>${escapeHtml(order.notes ?? '')}</td>
    `;
    ordersBody.appendChild(row);
  }
}

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

function renderRequests(requests) {
  requestsBody.innerHTML = '';
  requestsEmpty.hidden = requests.length > 0;
  for (const r of requests) {
    const row = document.createElement('tr');
    const typeLabel = REQUEST_TYPE_LABELS[r.type] ?? r.type;
    const label = r.vehicleLabel ? `${typeLabel} (${escapeHtml(r.vehicleLabel)})` : typeLabel;
    row.innerHTML = `
      <td>${label}</td>
      <td>${r.dueDate ? escapeHtml(r.dueDate) : '—'}</td>
      <td>${escapeHtml(r.note ?? '')}</td>
      <td><span class="badge badge-${r.status}">${r.status === 'open' ? 'Open' : 'Fulfilled'}</span></td>
    `;
    requestsBody.appendChild(row);
  }
}

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
