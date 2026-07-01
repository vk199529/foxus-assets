// ══════════════════════════════════
// PLANS
// ══════════════════════════════════
const MOBILE_PLANS = {
  'stay-connected': { tag:'Stay Connected', data:'29 GB', price:29 },
  'everyday':       { tag:'Everyday',       data:'32 GB', price:35 },
  'work-play':      { tag:'Work & Play',    data:'90 GB', price:45 },
  'indulge':        { tag:'Indulge',        data:'150 GB', price:55 }
};

// ══════════════════════════════════
// STATE
// ══════════════════════════════════
function getDefaultMobileState() {
  return {
    acctType: 'personal',

    selectedPlan: null,

    portNumber: 'yes',
    currentCarrier: '',

    simType: 'physical',

    activationDate: '',
    asap: false,

    phone: '',
    countryCode: '+61',

    firstName: '',
    lastName: '',
    email: '',
    dob: '',
    address: '',

    companyName: '',
    tradingName: '',
    bizEmail: '',
    bizPhone: '',
    abn: '',
    dobBiz: '',
    bizAddress: '',

    currentStep: 0
  };
}

let mState = getDefaultMobileState();


let kycPollTimer  = null;
let kycVerId      = null;

// ══════════════════════════════════
// SAVE / LOAD
// ══════════════════════════════════
function saveState() {
  localStorage.setItem('foxus_mobile_state', JSON.stringify(mState));
}

function loadState() {
  try {
    const saved = localStorage.getItem('foxus_mobile_state');
    if (saved) {

    const p = JSON.parse(saved);

    mState = {
        ...getDefaultMobileState(),
        ...p
    };

    return true;
}
  } catch(e) {}
  return false;
}

// ══════════════════════════════════
// INIT
// ══════════════════════════════════
function init() {

  const params = new URLSearchParams(window.location.search);

  const planParam = params.get('plan');
  const success = params.get('success');

  // Stripe Success
  if (
      success === '1' ||
      localStorage.getItem('foxus_mobile_done') === '1'
  ) {

      localStorage.removeItem('foxus_mobile_done');

      showSuccess();

      goTo(6);

      setTimeout(() => {
          localStorage.removeItem('foxus_mobile_state');
          mState = getDefaultMobileState();

          window.location.href = "/mobile-plan";
      }, 4000);

      window.history.replaceState(
          {},
          document.title,
          "/signup-mobile"
      );

      return;
  }

  // Invalid plan
  if (!planParam || !MOBILE_PLANS[planParam]) {

      localStorage.removeItem("foxus_mobile_state");

      window.location.href = "/mobile-plan";

      return;
  }

  // Restore existing session
  const restored = loadState();
  if (!mState.selectedPlan && MOBILE_PLANS[planParam]) {
    mState.selectedPlan = MOBILE_PLANS[planParam];
}

saveState();

  if (
      restored &&
      mState.currentStep < 6
  ) {

      restoreFormValues();

      updateOrderSummary();

      goTo(mState.currentStep || 0);

      return;
  }

  // Fresh signup
  mState.selectedPlan = MOBILE_PLANS[planParam];

  mState.currentStep = 0;

  saveState();

  updateOrderSummary();

  goTo(0);

}

function restoreFormValues() {

    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el && val) el.value = val;
    };

    // Personal
    set('firstName', mState.firstName);
    set('lastName', mState.lastName);
    set('email', mState.email);
    set('dob', mState.dob);
    set('phone1', mState.phone);
    set('address', mState.address);

    // Business
    set('companyName', mState.companyName);
    set('tradingName', mState.tradingName);
    set('abn', mState.abn);
    set('dobBiz', mState.dobBiz);
    set('bizEmail', mState.email);
    set('bizPhone', mState.phone);
    set('bizAddress', mState.address);

    // Other
    set('currentCarrier', mState.currentCarrier);

    if (!mState.asap) {
        set('activationDate', mState.activationDate);
    }

    selectAcct(mState.acctType || 'personal');
    selectPort(mState.portNumber || 'yes');
    selectSim(mState.simType || 'physical');

    if (mState.asap) {
        mState.asap = false;
        toggleAsap();
    }
}

// ══════════════════════════════════
// NAVIGATION
// ══════════════════════════════════
function goTo(n) {
  if (n === 5) updateOrderSummary();
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.getElementById('step' + n).classList.add('active');
  mState.currentStep = n;
  saveState();
  updateProg(n);
  setTimeout(() => {
    const el = document.getElementById('foxus-mobile');
    if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
  }, 50);
}

function updateProg(n) {
  for (let i = 0; i <= 5; i++) {
    const seg = document.getElementById('s' + i);
    if (!seg) continue;
    seg.className = 'seg' + (i < n ? ' done' : i === n ? ' active' : '');
  }
}

// ══════════════════════════════════
// STEP 0 — ACCOUNT TYPE
// ══════════════════════════════════
function selectAcct(type) {
  mState.acctType = type;
  document.getElementById('acct-personal').classList.toggle('selected', type === 'personal');
  document.getElementById('acct-business').classList.toggle('selected', type === 'business');
  document.querySelector('#acct-personal .acct-icon').style.background = type === 'personal' ? 'var(--blue)' : '#E5E5E5';
  document.querySelector('#acct-business .acct-icon').style.background = type === 'business' ? 'var(--blue)' : '#E5E5E5';
  document.getElementById('fields-personal').style.display = type === 'personal' ? '' : 'none';
  document.getElementById('fields-business').style.display = type === 'business' ? '' : 'none';
  saveState();
}

// ══════════════════════════════════
// STEP 1 — DETAILS VALIDATION
// ══════════════════════════════════
function validateStep1() {

    let valid = true;

    if (mState.acctType === 'personal') {

        const checks = [
            { id:'firstName', v:x=>x.trim().length>0 },
            { id:'lastName',  v:x=>x.trim().length>0 },
            { id:'email',     v:x=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x) },
            { id:'dob',       v:x=>x && (Date.now()-new Date(x))/(365.25*24*3600*1000)>=18 },
            { id:'phone1',    v:x=>x.trim().length>0 },
            { id:'address',   v:x=>x.trim().length>5 }
        ];

        checks.forEach(c=>{

            const inp=document.getElementById(c.id);
            const err=document.getElementById(c.id+'-err');

            const ok=c.v(inp.value);

            inp.classList.toggle('err',!ok);

            if(err) err.classList.toggle('show',!ok);

            if(!ok) valid=false;

        });

        if(valid){

            mState.firstName=document.getElementById('firstName').value.trim();
            mState.lastName=document.getElementById('lastName').value.trim();

            mState.email=document.getElementById('email').value.trim();
            mState.phone=document.getElementById('phone1').value.trim();

            mState.dob=document.getElementById('dob').value;
            mState.address=document.getElementById('address').value.trim();

            // Clear business data
            mState.companyName='';
            mState.tradingName='';
            mState.abn='';
            mState.dobBiz='';

        }

    } else {

        const checks = [
            { id:'companyName', v:x=>x.trim().length>0 },
            { id:'abn',         v:x=>x.trim().length>0 },
            { id:'bizEmail',    v:x=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x) },
            { id:'bizPhone',    v:x=>x.trim().length>0 },
            { id:'dobBiz',      v:x=>x && (Date.now()-new Date(x))/(365.25*24*3600*1000)>=18 },
            { id:'bizAddress',  v:x=>x.trim().length>5 }
        ];

        checks.forEach(c=>{

            const inp=document.getElementById(c.id);
            const err=document.getElementById(c.id+'-err');

            const ok=c.v(inp.value);

            inp.classList.toggle('err',!ok);

            if(err) err.classList.toggle('show',!ok);

            if(!ok) valid=false;

        });

        if(valid){

            // Company details
            mState.companyName=document.getElementById('companyName').value.trim();
            mState.tradingName=document.getElementById('tradingName').value.trim();
            mState.abn=document.getElementById('abn').value.trim();

            // Personal fields remain blank
            mState.firstName='';
            mState.lastName='';

            // Shared fields
            mState.email=document.getElementById('bizEmail').value.trim();
            mState.phone=document.getElementById('bizPhone').value.trim();

            mState.dobBiz=document.getElementById('dobBiz').value;
            mState.address=document.getElementById('bizAddress').value.trim();

            // Clear personal DOB
            mState.dob='';

        }

    }

    if(valid){

        saveState();

        goTo(2);

    }

}

// ══════════════════════════════════
// STEP 2 — MOBILE DETAILS
// ══════════════════════════════════
function selectPort(val) {
  mState.portNumber = val;
  document.getElementById('port-yes').classList.toggle('selected', val === 'yes');
  document.getElementById('port-no').classList.toggle('selected', val === 'no');
  document.getElementById('carrier-group').style.display = val === 'yes' ? '' : 'none';
  saveState();
}

function selectSim(val) {
  mState.simType = val;
  document.getElementById('sim-physical').classList.toggle('selected', val === 'physical');
  document.getElementById('sim-esim').classList.toggle('selected', val === 'esim');
  saveState();
}

function toggleAsap() {
  mState.asap = !mState.asap;
  const btn = document.getElementById('asap-btn');
  const inp = document.getElementById('activationDate');
  if (mState.asap) {
    btn.classList.add('active');
    inp.value = '';
    inp.disabled = true;
    inp.style.opacity = '.4';
    mState.activationDate = 'ASAP';
  } else {
    btn.classList.remove('active');
    inp.disabled = false;
    inp.style.opacity = '1';
    mState.activationDate = '';
  }
  saveState();
}

function validateStep2() {
  let valid = true;
  const date = document.getElementById('activationDate').value;
  if (!mState.asap && !date) {
    document.getElementById('activationDate-err').classList.add('show');
    valid = false;
  } else {
    document.getElementById('activationDate-err').classList.remove('show');
    if (date) mState.activationDate = date;
  }
  if (mState.portNumber === 'yes') {
    mState.currentCarrier = document.getElementById('currentCarrier').value.trim();
  }
  if (valid) { saveState(); goTo(3); }
}

// ══════════════════════════════════
// STEP 3 — OTP via Twilio/Make.com
// ══════════════════════════════════
async function sendOtp() {
  const phone = document.getElementById('phoneNumber').value.trim();
  const errEl = document.getElementById('phone-err');
  const inp   = document.getElementById('phoneNumber');

  // Validate — must not be empty
  if (!phone) {
    inp.classList.add('err');
    errEl.textContent = 'Please enter your mobile number.';
    errEl.classList.add('show');
    return;
  }

  // Validate format — accept +61, +91, 04xx or any international +XX format
  const cleaned = phone.replace(/\s/g, '');
  const isAU    = /^(\+61|0)[4-5]\d{8}$/.test(cleaned);
  const isIN    = /^\+91[6-9]\d{9}$/.test(cleaned);
  const isIntl  = /^\+\d{7,15}$/.test(cleaned);

  if (!isAU && !isIN && !isIntl) {
    inp.classList.add('err');
    errEl.textContent = 'Please enter a valid number. e.g. +61 412 345 678 or +91 98765 43210';
    errEl.classList.add('show');
    return;
  }

  inp.classList.remove('err');
  errEl.classList.remove('show');

  // Disable button while sending
  const btn = document.getElementById('send-otp-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span style="opacity:.7">Sending...</span>'; }

  try {
    const res  = await fetch("https://hook.eu1.make.com/3rgtnkjfl6urr2tgg5r69xly6w3orx3t", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('otp-sent-to').textContent = 'Code sent to ' + phone;
      document.getElementById('otp-box').style.display  = 'block';
      document.getElementById('otp-nav').style.display  = 'block';
      document.getElementById('verify-back').style.display  = 'none';
      if (btn) { btn.disabled = false; btn.innerHTML = 'Resend code'; }
      document.getElementById('otp0').focus();
      mState.phone = phone;
      saveState();
    } else {
      if (btn) { btn.disabled = false; btn.innerHTML = 'Next <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>'; }
      errEl.textContent = 'Could not send code. Please check your number and try again.';
      errEl.classList.add('show');
    }
  } catch(e) {
    console.error(e);
    if (btn) { btn.disabled = false; btn.innerHTML = 'Next <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>'; }
    errEl.textContent = 'Could not send code. Please try again.';
    errEl.classList.add('show');
  }
}

function otpIn(i) { const v = document.getElementById('otp'+i).value; if(v && i<5) document.getElementById('otp'+(i+1)).focus(); }
function otpKey(e,i) { if(e.key==='Backspace' && !document.getElementById('otp'+i).value && i>0) document.getElementById('otp'+(i-1)).focus(); }

async function verifyOtp() {
  const code  = [0,1,2,3,4,5].map(i => document.getElementById('otp'+i).value).join('');
  const errEl = document.getElementById('s3-err');
  if (code.length < 6) { errEl.textContent='Enter the 6-digit code.'; errEl.classList.add('show'); return; }
  try {
    const res  = await fetch("https://hook.eu1.make.com/m4j7618543m7ljsj1k8ymvxdvjsr9wzn", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: mState.phone, code })
    });
    const data = await res.json();
    if (data.success) { errEl.classList.remove('show'); goTo(4); }
    else { errEl.textContent='Incorrect code. Try again.'; errEl.classList.add('show'); }
  } catch(e) { errEl.textContent='Verification failed. Try again.'; errEl.classList.add('show'); }
}

// ══════════════════════════════════
// STEP 4 — KYC (Stripe Identity)
// ══════════════════════════════════
function selectKyc(type) {
  document.querySelectorAll('.kyc-option').forEach(el => el.classList.remove('selected'));
  document.getElementById('kyc-' + type).classList.add('selected');
}

async function startKyc() {
  const btn = document.querySelector('#kyc-btn-group .btn-next');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span style="opacity:.7">Starting...</span>'; }

  try {
    const res  = await fetch("https://hook.eu1.make.com/4llc5cxsvs73lrnu533elyj8ogohkm3y", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ return_url: 'https://verify.stripe.com/success' })
    });
    const data = await res.json();

    kycVerId = data.id;
    console.log('KYC session:', kycVerId);

    if (data.url) {
      saveState();
      window.open(data.url, '_blank');

      if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Next <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
      }

      // Show waiting UI
      document.getElementById('kyc-options').style.display = 'none';
      document.getElementById('kyc-btn-group').style.display = 'none';
      document.getElementById('kyc-waiting').classList.add('show');

      // Poll
      window.addEventListener('focus', onKycFocus);
      kycPollTimer = setInterval(checkKycStatus, 3000);
    }
  } catch(e) {
    console.error(e);
    if (btn) { btn.disabled = false; btn.innerHTML = 'Next <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>'; }
    document.getElementById('s4-err').textContent = 'Unable to start verification. Please try again.';
    document.getElementById('s4-err').classList.add('show');
  }
}

function onKycFocus() { setTimeout(checkKycStatus, 800); }

async function checkKycStatus() {
  try {
    const res  = await fetch("https://hook.eu1.make.com/ulmemio3o92nmljzm1t52rohg4dymoek", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verification_id: kycVerId })
    });
    const text = await res.text();
    console.log('KYC status:', text);
    if (text === 'true') {
      window.removeEventListener('focus', onKycFocus);
      if (kycPollTimer) { clearInterval(kycPollTimer); kycPollTimer = null; }
      goTo(5);
    }
  } catch(e) { console.error('KYC poll error:', e); }
}

// ══════════════════════════════════
// ORDER SUMMARY
// ══════════════════════════════════
function updateOrderSummary() {
  if (!mState.selectedPlan) return;
  const p = mState.selectedPlan;
  document.getElementById('ord-plan').textContent   = p.tag;
  document.getElementById('ord-detail').textContent = p.data + ' on 5G';
  document.getElementById('ord-price').textContent  = '$' + p.price + '.00';
  document.getElementById('ord-gst').textContent    = '$' + (p.price / 11).toFixed(2);
  document.getElementById('ord-total').textContent  = '$' + p.price + '.00';
  document.getElementById('pay-txt').textContent    = 'Pay $' + p.price + ' & activate';
}

// ══════════════════════════════════
// PAYMENT
// ══════════════════════════════════
async function processPayment() {
  const btn = document.getElementById('pay-btn');
  btn.disabled = true;
  btn.innerHTML = '<span style="opacity:.7">Redirecting to payment...</span>';

  try {
    const p = mState.selectedPlan;
    const payload = {
      flow:      'mobile',

      email:     mState.email,
      phone:     mState.phone || mState.phone1 || '',
      phone1:    mState.phone1 || '',
      acctType:  mState.acctType,

      firstName: mState.firstName || '',
      lastName:  mState.lastName  || '',


      planName:      p.tag,
      price:     p.price,
      stripeAmount: p.price * 100,
      simType:   mState.simType,
      portNumber: mState.portNumber,
      currentCarrier: mState.currentCarrier || '',
      activationDate: mState.asap ? null : mState.activationDate,
      asap:      mState.asap,
    
      address:   mState.address   || '',
      source:    'webflow-mobile-signup'
    };

    console.log('Payment payload:', payload);

    const res  = await fetch("https://hook.eu1.make.com/9cjwqioh6l38gidsf3spbl98aqm8f5pe", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log('Stripe response:', data);

    if (data.url) {
      localStorage.setItem('foxus_mobile_done', '1');
      saveState();
      window.location.href = data.url;
    } else {
      throw new Error('No checkout URL');
    }
  } catch(e) {
    console.error(e);
    btn.disabled = false;
    btn.innerHTML = '<span id="pay-txt">Pay & activate</span> <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
    document.getElementById('s5-err').textContent = 'Payment failed. Please try again.';
    document.getElementById('s5-err').classList.add('show');
  }
}

// ══════════════════════════════════
// SUCCESS
// ══════════════════════════════════
function showSuccess() {
  const name = mState.firstName || 'there';
  const el   = document.getElementById('success-title');
  if (el) el.textContent = 'You\'re all set, ' + name + '!';
  localStorage.removeItem('foxus_mobile_state');
  localStorage.removeItem('foxus_mobile_done');
}

// ══════════════════════════════════
// RUN
// ══════════════════════════════════
init();

