
// ══════════════════════════════════
// PLANS CONFIG
// ══════════════════════════════════
const NBN_PLANS = {
  'momentom':  { tag:'Momentum',  data:'25 Mbps',  price:70  },
  'navigator': { tag:'Navigator', data:'50 Mbps',  price:79  },
  'nbn-fast':  { tag:'Fast',      data:'100 Mbps', price:99  },
  'nbn-ultra': { tag:'Ultra',     data:'250 Mbps', price:129 }
};
// ══════════════════════════════════
// STATE
// ══════════════════════════════════
let nbnState = {
  acctType:     'personal',
  selectedPlan: null,
  modemSize:    1,
  modemChoice:  null,
  ntd:          null,
  asap:         false,
  firstName:    '',
  lastName:     '',
  email:        '',
  dob:          '',
  address:      '',
  installAddr:  '',
  activationDate: '',
  currentStep:  0
};
// ══════════════════════════════════
// SAVE / LOAD
// ══════════════════════════════════
function saveNbnState() {
  localStorage.setItem('foxus_nbn_state', JSON.stringify(nbnState));
}

function loadNbnState() {
  try {
    const saved = localStorage.getItem('foxus_nbn_state');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Only restore if not completed
      if (parsed.currentStep < 5) {
        nbnState = { ...nbnState, ...parsed };
        return true;
      }
    }
  } catch(e) {}
  return false;
}
// ══════════════════════════════════
// INIT
// ══════════════════════════════════
function init() {

  const params = new URLSearchParams(window.location.search);

  const flowParam    = params.get('flow');
  const planParam    = params.get('plan');
  const successParam = params.get('success');
  // ───────────────────────────────
  // Stripe Success Return
  // ───────────────────────────────
  if (
    successParam === '1' ||
    localStorage.getItem('foxus_nbn_done') === '1'
  ) {

    localStorage.removeItem('foxus_nbn_done');

    showSuccessScreen();

    goTo(5);

    // remove success param from URL
    window.history.replaceState(
      {},
      document.title,
      '/signup-nbn'
    );

    return;
  }
  // ───────────────────────────────
  // Direct access protection
  // ───────────────────────────────
  if (!flowParam || !planParam) {

    localStorage.removeItem('foxus_nbn_state');

    window.location.href = '/nbn-internet';

    return;
  }
  // ───────────────────────────────
  // Invalid plan protection
  // ───────────────────────────────
  if (!Object.prototype.hasOwnProperty.call(NBN_PLANS, planParam)) {

    localStorage.removeItem('foxus_nbn_state');

    window.location.href = '/nbn-internet';

    return;
  }
  // ───────────────────────────────
  // Restore existing session
  // ───────────────────────────────
  const restored = loadNbnState();

  if (
    restored &&
    nbnState.currentStep < 5
  ) {

    restoreFormValues();

    updateOrderSummary();

    goTo(nbnState.currentStep || 0);

    return;
  }
  // ───────────────────────────────
  // Fresh signup
  // ───────────────────────────────
  nbnState.selectedPlan = NBN_PLANS[planParam];

  nbnState.currentStep = 0;

  saveNbnState();

  updateOrderSummary();

  goTo(0);
}

function restoreFormValues() {
  // Restore form inputs from saved state
  const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
  set('firstName',   nbnState.firstName);
  set('lastName',    nbnState.lastName);
  set('email',       nbnState.email);
  set('dob',         nbnState.dob);
  set('address',     nbnState.address);
  set('companyName', nbnState.companyName);
  set('installAddr', nbnState.installAddr);
  set('activationDate', nbnState.activationDate);

  // Restore account type
  selectAcct(nbnState.acctType || 'personal');

  // Restore NTD
  if (nbnState.ntd) selectNtd(nbnState.ntd);

  // Restore modem
  if (nbnState.modemChoice) {
    selectModemSize(nbnState.modemSize || 1);
    selectModem(nbnState.modemChoice);
  }

  // Restore ASAP
  if (nbnState.asap) {
    nbnState.asap = false; // reset so toggleAsap flips it
    toggleAsap();
  }
}

// ══════════════════════════════════
// NAVIGATION
// ══════════════════════════════════
function goTo(n) {
  if (n === 4) updateOrderSummary();
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.getElementById('step' + n).classList.add('active');
  nbnState.currentStep = n;
  saveNbnState();
  updateProg(n);
  setTimeout(() => {
    const el = document.getElementById('foxus-nbn');
    if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
  }, 50);
}

function updateProg(n) {
  for (let i = 0; i <= 4; i++) {
    const seg = document.getElementById('s' + i);
    if (!seg) continue;
    seg.className = 'seg' + (i < n ? ' done' : i === n ? ' active' : '');
  }
}

// ══════════════════════════════════
// STEP 0 — ACCOUNT TYPE
// ══════════════════════════════════
function selectAcct(type) {
  nbnState.acctType = type;

  document.getElementById('acct-personal')
    .classList.toggle('selected', type === 'personal');

  document.getElementById('acct-business')
    .classList.toggle('selected', type === 'business');

  document.querySelector('#acct-personal .acct-icon').style.background =
    type === 'personal' ? 'var(--blue)' : '#6B7280';

  document.querySelector('#acct-business .acct-icon').style.background =
    type === 'business' ? 'var(--blue)' : '#6B7280';

  // Toggle fields
  const personalFields = document.getElementById('fields-personal');
  const businessFields = document.getElementById('fields-business');

  if (personalFields && businessFields) {
    personalFields.style.display =
      type === 'personal' ? 'block' : 'none';

    businessFields.style.display =
      type === 'business' ? 'block' : 'none';
  }

  saveNbnState();
}

// ══════════════════════════════════
// STEP 1 — DETAILS
// ══════════════════════════════════
function validateStep1() {
  let valid = true;
  if (nbnState.acctType === 'personal') {
    document.getElementById('fields-personal').style.display = '';
    document.getElementById('fields-business').style.display = 'none';
    const checks = [
      { id:'firstName', v: x => x.trim().length > 0 },
      { id:'lastName',  v: x => x.trim().length > 0 },
      { id:'email',     v: x => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x) },
      { id:'dob',       v: x => x && (Date.now()-new Date(x))/(365.25*24*3600*1000) >= 18 },
      { id:'address',   v: x => x.trim().length > 5 }
    ];
    checks.forEach(c => {
      const inp = document.getElementById(c.id);
      const err = document.getElementById(c.id + '-err');
      const ok  = c.v(inp.value);
      inp.classList.toggle('err', !ok);
      if (err) err.classList.toggle('show', !ok);
      if (!ok) valid = false;
    });
    if (valid) {
      nbnState.firstName = document.getElementById('firstName').value.trim();
      nbnState.lastName  = document.getElementById('lastName').value.trim();
      nbnState.email     = document.getElementById('email').value.trim();
      nbnState.dob       = document.getElementById('dob').value;
      nbnState.address   = document.getElementById('address').value.trim();
    }
  } else {
    document.getElementById('fields-personal').style.display = 'none';
    document.getElementById('fields-business').style.display = '';
    const checks = [
      { id:'companyName', v: x => x.trim().length > 0 },
      { id:'abn',         v: x => x.trim().length > 0 },
      { id:'bizAddress',  v: x => x.trim().length > 5 }
    ];
    checks.forEach(c => {
      const inp = document.getElementById(c.id);
      const err = document.getElementById(c.id + '-err');
      const ok  = c.v(inp.value);
      inp.classList.toggle('err', !ok);
      if (err) err.classList.toggle('show', !ok);
      if (!ok) valid = false;
    });
    if (valid) {
      nbnState.firstName   = document.getElementById('companyName').value.trim();
      nbnState.companyName = document.getElementById('companyName').value.trim();
      nbnState.email       = '';
    }
  }
  if (valid) { saveNbnState(); goTo(2); }
}

// ══════════════════════════════════
// STEP 2 — NBN SETUP
// ══════════════════════════════════
function toggleAsap() {
  nbnState.asap = !nbnState.asap;
  const btn = document.getElementById('asap-btn');
  const inp = document.getElementById('activationDate');
  if (nbnState.asap) {
    btn.classList.add('active');
    inp.value = '';
    inp.disabled = true;
    inp.style.opacity = '.4';
    nbnState.activationDate = 'ASAP';
  } else {
    btn.classList.remove('active');
    inp.disabled = false;
    inp.style.opacity = '1';
    nbnState.activationDate = '';
  }
  saveNbnState();
}

function selectModemSize(n) {
  nbnState.modemSize   = n;
  nbnState.modemChoice = null;
  document.getElementById('tog-1').classList.toggle('active', n === 1);
  document.getElementById('tog-3').classList.toggle('active', n === 3);
  document.getElementById('modem-card-1').style.display = n === 1 ? 'flex' : 'none';
  document.getElementById('modem-card-3').style.display = n === 3 ? 'flex' : 'none';
  document.getElementById('byo-info').style.display     = 'none';
  updateModemBtns();
  updateOrderSummary();
  saveNbnState();
}

function selectModem(choice) {
  nbnState.modemChoice = choice;
  updateModemBtns();
  updateOrderSummary();
  saveNbnState();
  if (choice === 'byo') {
    document.getElementById('byo-modal').classList.add('show');
  } else {
    document.getElementById('byo-info').style.display = 'none';
  }
}

function updateModemBtns() {
  const isFoxus = nbnState.modemChoice === 'foxus';
  const isByo   = nbnState.modemChoice === 'byo';
  ['1','3'].forEach(s => {
    const a = document.getElementById('btn-add-' + s);
    const b = document.getElementById('btn-byo-' + s);
    if (a) a.classList.toggle('selected', isFoxus);
    if (b) b.classList.toggle('selected', isByo);
  });
}

function closeBYOModal() {
  document.getElementById('byo-modal').classList.remove('show');
  document.getElementById('byo-info').style.display = 'block';
}

function validateStep2() {
  let valid = true;
  const addr = document.getElementById('installAddr').value.trim();
  if (!addr) {
    document.getElementById('installAddr').classList.add('err');
    document.getElementById('installAddr-err').classList.add('show');
    valid = false;
  } else {
    document.getElementById('installAddr').classList.remove('err');
    document.getElementById('installAddr-err').classList.remove('show');
    nbnState.installAddr = addr;
  }
  const date = document.getElementById('activationDate').value;
  if (!nbnState.asap && !date) {
    document.getElementById('activationDate-err').classList.add('show');
    valid = false;
  } else {
    document.getElementById('activationDate-err').classList.remove('show');
    if (date) nbnState.activationDate = date;
  }
  if (!nbnState.modemChoice) {
    document.getElementById('s2-err').textContent = 'Please select a modem option to continue.';
    document.getElementById('s2-err').classList.add('show');
    valid = false;
  } else {
    document.getElementById('s2-err').classList.remove('show');
  }
  if (valid) { saveNbnState(); goTo(3); }
}

function getModemPrice() {

  if (nbnState.modemChoice !== 'foxus') {
    return 0;
  }

  return nbnState.modemSize === 3
    ? 399
    : 199;
}

// ══════════════════════════════════
// STEP 3 — NTD
// ══════════════════════════════════
function selectNtd(val) {
  nbnState.ntd = val;
  ['yes','no','unsure'].forEach(v => {
    document.getElementById('ntd-' + v).classList.toggle('selected', v === val);
  });
  document.getElementById('s3-err').classList.remove('show');
  saveNbnState();
}

function validateStep3() {
  if (!nbnState.ntd) {
    document.getElementById('s3-err').textContent = 'Please select an option.';
    document.getElementById('s3-err').classList.add('show');
    return;
  }
  goTo(4);
}

// ══════════════════════════════════
// ORDER SUMMARY
// ══════════════════════════════════
function updateOrderSummary() {
  if (!nbnState.selectedPlan) return;
  const p = nbnState.selectedPlan;
  const modemPrice = nbnState.modemChoice === 'foxus' ? (nbnState.modemSize === 3 ? 399 : 199) : 0;
  const total = p.price + modemPrice;

  document.getElementById('ord-plan').textContent   = p.tag;
  document.getElementById('ord-detail').textContent = p.data + ' download';
  document.getElementById('ord-price').textContent  = '$' + p.price + '.00';
  document.getElementById('ord-gst').textContent    = '$' + (total / 11).toFixed(2);
  document.getElementById('ord-total').textContent  = '$' + total + '.00';
  document.getElementById('pay-txt').textContent    = 'Pay $' + total + ' & activate';

  const modemLine = document.getElementById('ord-modem-line');
  if (nbnState.modemChoice === 'foxus') {
    modemLine.style.display = 'flex';
    document.getElementById('ord-modem-label').textContent = 'TP-Link Deco (' + nbnState.modemSize + ' device)';
    document.getElementById('ord-modem-price').textContent = '$' + modemPrice;
  } else {
    modemLine.style.display = 'none';
  }
}

// ══════════════════════════════════
// PAYMENT — same Make.com hook as mobile
// ══════════════════════════════════
async function processPayment() {
const btn = document.getElementById('pay-btn');

btn.disabled = true;
btn.innerHTML =
'<span style="opacity:.7">Redirecting to payment...</span>';

try {


const p = nbnState.selectedPlan;

const modemPrice =
  nbnState.modemChoice === 'foxus'
    ? (nbnState.modemSize === 3 ? 399 : 199)
    : 0;

const total = p.price + modemPrice;

const payload = {
  flow: 'nbn',

  // customer
  email: nbnState.email,
  phone: nbnState.phone || '',
  acctType: nbnState.acctType,

  // plan
  planName: p.tag + ' NBN',
  planSpeed: p.data,
  planPrice: Number(p.price),

  // modem
  modemChoice: nbnState.modemChoice,
  modemSize: nbnState.modemSize,
  modemPrice: Number(modemPrice),
  totalPrice: total,
  stripeAmount: total * 100,

  // service
  installAddress: nbnState.installAddr,
  activationDate: nbnState.asap
    ? null
    : nbnState.activationDate,
  asap: nbnState.asap,
  ntd: nbnState.ntd,

  // customer details
  firstName: nbnState.firstName || '',
  lastName: nbnState.lastName || '',

  // debugging
  source: 'webflow-nbn-signup'
};

console.log('Sending payload:', payload);

const response = await fetch(
  'https://hook.eu1.make.com/9cjwqioh6l38gidsf3spbl98aqm8f5pe',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  }
);

const data = await response.json();

console.log('Stripe response:', data);

if (data.url) {
  localStorage.setItem('foxus_nbn_done', '1');
  saveNbnState();

  window.location.href = data.url;
  return;
}

throw new Error('No checkout URL returned');


} catch (err) {


console.error(err);

btn.disabled = false;

btn.innerHTML = `
  <span id="pay-txt">Pay & activate</span>
  <svg width="14" height="14" fill="none" stroke="currentColor"
  stroke-width="2.5" viewBox="0 0 24 24">
    <line x1="5" y1="12" x2="19" y2="12"></line>
    <polyline points="12 5 19 12 12 19"></polyline>
  </svg>
`;

document.getElementById('s4-err').textContent =
  'Payment failed. Please try again.';

document.getElementById('s4-err').classList.add('show');

}
}


// ══════════════════════════════════
// SUCCESS
// ══════════════════════════════════
function showSuccessScreen() {

  const name = nbnState.firstName || 'there';

  const el = document.getElementById('success-title');

  if (el) {
    el.textContent = `You're all set, ${name}!`;
  }

  localStorage.removeItem('foxus_nbn_state');
  localStorage.removeItem('foxus_nbn_done');
}
// ══════════════════════════════════
// RUN
// ══════════════════════════════════
init();
