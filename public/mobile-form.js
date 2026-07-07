// ══════════════════════════════════
// PLANS
// ══════════════════════════════════
const MOBILE_PLANS = {
  "stay-connected": {
    tag: "Stay Connected",
    data: "25 GB",
    price: 25,
    network: "5G",
    description: "For light users covering calls, texts & occasional data",
    features: [
      "Unlimited calls & texts in Australia",
      "Unlimited calls & SMS to 15 countries",
      "Data Vault: save up to 500 GB unused data",
      "eSIM or SIM, activate online",
      "VoLTE & Wi-Fi calling supported"
    ]
  },

  "everyday": {
    tag: "Everyday",
    data: "32 GB",
    price: 35,
    network: "5G",
    description: "Great for streaming, browsing & daily use",
    features: [
      "Unlimited talk & text in Australia",
      "Unlimited calls & SMS to 15 countries",
      "Data Vault: save up to 500 GB unused data",
      "eSIM or SIM, activate online",
      "VoLTE & Wi-Fi calling supported"
    ]
  },

  "work-play": {
    tag: "Work & Play",
    data: "90 GB",
    price: 45,
    network: "5G",
    description: "Ideal for heavy data users & international calling",
    features: [
      "Unlimited Australian & international calls & texts",
      "Data Vault: save up to 500 GB unused data",
      "eSIM or SIM, activate online",
      "VoLTE & Wi-Fi calling supported"
    ]
  },

  "indulge": {
    tag: "Indulge",
    data: "150 GB",
    price: 55,
    network: "5G & 4G",
    description: "Perfect for power users who stream, work & game on the go",
    features: [
      "Unlimited Australian & international calls & texts",
      "Data Vault: save up to 500 GB unused data",
      "eSIM or SIM, activate online",
      "VoLTE & Wi-Fi calling supported"
    ]
  }
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

    currentStep: 0,

    kycType: 'licence',
    kycVerId: '',
    kycVerified: false,
  };
}

let mState = getDefaultMobileState();


let kycPollTimer  = null;
let kycVerId      = null;

// ══════════════════════════════════
// SAVE / LOAD
// ══════════════════════════════════
function saveState() {
      console.trace("SAVE STATE CALLED");
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

    const planParam = params.get("plan");
    const success = params.get("success");

    // ==========================
    // Stripe Success
    // ==========================
    if (
    success === "1" ||
    localStorage.getItem("foxus_mobile_done") === "1"
      ) {

            // remove success flag immediately
            localStorage.removeItem("foxus_mobile_done");

            // DON'T save state anymore
            mState = getDefaultMobileState();

            document
                .querySelectorAll(".step")
                .forEach(s => s.classList.remove("active"));

            document
                .getElementById("step6")
                .classList.add("active");

            updateProg(6);

            showSuccess();

            window.history.replaceState(
                {},
                document.title,
                "/signup-mobile"
            );

            return;
        }

    // ==========================
    // Invalid Plan
    // ==========================
    if (!planParam || !MOBILE_PLANS[planParam]) {

        localStorage.removeItem("foxus_mobile_state");
        localStorage.removeItem("foxus_mobile_done");

        window.location.replace("/mobile-plan");

        return;
    }

    // ==========================
    // Restore Previous Session
    // ==========================
    const restored = loadState();

    // Restore selected plan if missing
    // if (!mState.selectedPlan) {
    //     mState.selectedPlan = MOBILE_PLANS[planParam];
    // }
    mState.selectedPlan = MOBILE_PLANS[planParam];

    if (
        restored &&
        mState.currentStep < 6
    ) {

        restoreFormValues();

        updateOrderSummary();

        goTo(mState.currentStep || 0);

        return;
    }

    // ==========================
    // Fresh Signup
    // ==========================
    mState = getDefaultMobileState();

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
    set('address', mState.address);

    // Business
    set('companyName', mState.companyName);
    set('tradingName', mState.tradingName);
    set('abn', mState.abn);
    set('dobBiz', mState.dobBiz);
    set('bizEmail', mState.email);
    set('bizAddress', mState.address);

    // Other
    set('currentCarrier', mState.currentCarrier);

    if (!mState.asap) {
        set('activationDate', mState.activationDate);
    }

    selectAcct(mState.acctType || 'personal', false);
    selectPort(mState.portNumber || 'yes');
    selectSim(mState.simType || 'physical');

    if (mState.asap) {
        mState.asap = false;
        toggleAsap();
    }

    if (
    mState.currentStep === 4 &&
    mState.kycVerId &&
    !mState.kycVerified
      ) {

          kycVerId = mState.kycVerId;

          document.getElementById("kyc-options").style.display = "none";
          document.getElementById("kyc-btn-group").style.display = "none";
          document.getElementById("kyc-waiting").classList.add("show");

          window.addEventListener("focus", onKycFocus);

          kycPollTimer = setInterval(checkKycStatus, 3000);
      }
}

// ══════════════════════════════════
// NAVIGATION
// ══════════════════════════════════
function goTo(n) {

    if (mState.currentStep === 4 && n !== 4) {
        stopKycPolling();
    }

    if (n === 5) {
        updateOrderSummary();
    }

    document.querySelectorAll(".step")
        .forEach(s => s.classList.remove("active"));

    document
        .getElementById("step" + n)
        .classList.add("active");

    mState.currentStep = n;

    // SUCCESS SCREEN NEVER SAVES
    if (n !== 6) {
        saveState();
    }

    updateProg(n);

    setTimeout(() => {

        const el = document.getElementById("foxus-mobile");

        if (el) {
            el.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }

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
function selectAcct(type, save = true) {
  mState.acctType = type;
  document.getElementById('acct-personal').classList.toggle('selected', type === 'personal');
  document.getElementById('acct-business').classList.toggle('selected', type === 'business');
  document.querySelector('#acct-personal .acct-icon').style.background = type === 'personal' ? 'var(--blue)' : '#E5E5E5';
  document.querySelector('#acct-business .acct-icon').style.background = type === 'business' ? 'var(--blue)' : '#E5E5E5';
  document.getElementById('fields-personal').style.display = type === 'personal' ? '' : 'none';
  document.getElementById('fields-business').style.display = type === 'business' ? '' : 'none';
   if (save) saveState();
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

    // Clear previous errors
    inp.classList.remove('err');
    errEl.classList.remove('show');

    if (!phone) {
        inp.classList.add('err');
        errEl.textContent = 'Please enter your mobile number.';
        errEl.classList.add('show');
        return;
    }

    // Remove spaces, brackets and dashes
    const raw = phone.replace(/\D/g, "");

    let formattedPhone = "";

    // Already international
    if (phone.startsWith("+")) {

        if (/^\+\d{7,15}$/.test(phone.replace(/\s/g, ""))) {

            formattedPhone = phone.replace(/\s/g, "");

        }

    }
    // Australia with leading 0
    else if (raw.length === 10 && raw.startsWith("04")) {

        formattedPhone = "+61" + raw.substring(1);

    }
    // Australia without leading 0
    else if (raw.length === 9 && raw.startsWith("4")) {

        formattedPhone = "+61" + raw;

    }
    // India local
    else if (raw.length === 10 && /^[6-9]/.test(raw)) {

        formattedPhone = "+91" + raw;

    }
    else {

        inp.classList.add('err');

        errEl.textContent =
            'Please enter a valid Australian or Indian mobile number.';

        errEl.classList.add('show');

        return;
    }

    // Save formatted number
    mState.phone = formattedPhone;
    saveState();

    const btn = document.getElementById('send-otp-btn');

    btn.disabled = true;
    btn.innerHTML = '<span style="opacity:.7">Sending...</span>';

    try {

        const res = await fetch(
            "https://hook.eu1.make.com/3rgtnkjfl6urr2tgg5r69xly6w3orx3t",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    phone: formattedPhone
                })
            }
        );

        const data = await res.json();

        if (data.success) {

            document.getElementById('otp-sent-to').textContent =
                'Code sent to ' + formattedPhone;

            document.getElementById('otp-box').style.display = 'block';
            document.getElementById('otp-nav').style.display = 'block';
            document.getElementById('verify-back').style.display = 'none';

            // Clear previous OTP
            for (let i = 0; i < 6; i++) {
                document.getElementById('otp' + i).value = '';
            }

            document.getElementById('otp0').focus();

            btn.disabled = false;
            btn.innerHTML = 'Resend code';

        } else {

            btn.disabled = false;

            btn.innerHTML = `
                Next
                <svg width="14" height="14" fill="none" stroke="currentColor"
                stroke-width="2.5" viewBox="0 0 24 24">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
            `;

            errEl.textContent =
                'Could not send code. Please check your number and try again.';

            errEl.classList.add('show');
        }

    } catch (e) {

        console.error(e);

        btn.disabled = false;

        btn.innerHTML = `
            Next
            <svg width="14" height="14" fill="none" stroke="currentColor"
            stroke-width="2.5" viewBox="0 0 24 24">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
        `;

        errEl.textContent =
            'Could not send code. Please try again.';

        errEl.classList.add('show');
    }
}

// OTP Navigation
function otpIn(i) {

    const v = document.getElementById('otp' + i).value;

    if (v && i < 5) {
        document.getElementById('otp' + (i + 1)).focus();
    }

}

function otpKey(e, i) {

    if (
        e.key === 'Backspace' &&
        !document.getElementById('otp' + i).value &&
        i > 0
    ) {
        document.getElementById('otp' + (i - 1)).focus();
    }

}

// Verify OTP
async function verifyOtp() {

    const code = [0,1,2,3,4,5]
        .map(i => document.getElementById('otp' + i).value)
        .join('');

    const errEl = document.getElementById('s3-err');

    errEl.classList.remove('show');

    if (code.length < 6) {

        errEl.textContent = 'Enter the 6-digit code.';
        errEl.classList.add('show');

        return;
    }

    const btn = document.querySelector('#otp-nav .btn-next');

    btn.disabled = true;
    btn.innerHTML = 'Verifying...';

    try {

        const res = await fetch(
            "https://hook.eu1.make.com/m4j7618543m7ljsj1k8ymvxdvjsr9wzn",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    phone: mState.phone,
                    code: code
                })
            }
        );

        const data = await res.json();

        if (data.success) {

            errEl.classList.remove('show');

            goTo(4);

            return;
        }

        btn.disabled = false;

        btn.innerHTML = `
            Verify &amp; continue
            <svg width="14" height="14" fill="none" stroke="currentColor"
            stroke-width="2.5" viewBox="0 0 24 24">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
        `;

        errEl.textContent = 'Incorrect code. Try again.';
        errEl.classList.add('show');

    } catch (e) {

        console.error(e);

        btn.disabled = false;

        btn.innerHTML = `
            Verify &amp; continue
            <svg width="14" height="14" fill="none" stroke="currentColor"
            stroke-width="2.5" viewBox="0 0 24 24">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
        `;

        errEl.textContent = 'Verification failed. Please try again.';
        errEl.classList.add('show');

    }

}

// ══════════════════════════════════
// STEP 4 — KYC (Stripe Identity)
// ══════════════════════════════════

function selectKyc(type) {

    mState.kycType = type;

    document.querySelectorAll('.kyc-option')
        .forEach(el => el.classList.remove('selected'));

    document
        .getElementById('kyc-' + type)
        .classList.add('selected');

    saveState();
}

async function startKyc() {

    const btn = document.querySelector('#kyc-btn-group .btn-next');

    btn.disabled = true;
    btn.innerHTML = '<span style="opacity:.7">Starting...</span>';

    try {

        const response = await fetch(
            "https://hook.eu1.make.com/4llc5cxsvs73lrnu533elyj8ogohkm3y",
            {
                method: "POST",
                headers: {
                    "Content-Type":"application/json"
                },
                body: JSON.stringify({

                    verification_type: mState.kycType || "licence",

                    return_url:
                    "https://verify.stripe.com/success"

                })
            }
        );

        const data = await response.json();

        

        if (!data.url || !data.id)
            throw new Error("Invalid KYC response");

        // Save verification session
        kycVerId = data.id;

        mState.kycVerId = data.id;

        saveState();

        // Open Stripe
        const popup = window.open(data.url,"_blank");

        if (!popup) {

            throw new Error("Popup blocked");

        }

        // Show waiting screen

        document.getElementById("kyc-options").style.display = "none";

        document.getElementById("kyc-btn-group").style.display = "none";

        document.getElementById("kyc-waiting").classList.add("show");

        btn.disabled = false;

        btn.innerHTML = `
            Next
            <svg width="14" height="14" fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            viewBox="0 0 24 24">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
        `;

        window.addEventListener("focus", onKycFocus);

        kycPollTimer = setInterval(checkKycStatus,3000);

    }
    catch(err){

        console.error(err);

        btn.disabled = false;

        btn.innerHTML = `
            Next
            <svg width="14" height="14"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            viewBox="0 0 24 24">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
        `;

        document.getElementById("s4-err").textContent =
        err.message === "Popup blocked"
        ? "Popup blocked. Please allow popups and try again."
        : "Unable to start verification. Please try again.";

        document.getElementById("s4-err")
            .classList.add("show");

    }

}

function onKycFocus(){

    setTimeout(checkKycStatus,1000);

}

async function checkKycStatus(){

    if(!mState.kycVerId)
        return;

    try{

        const response = await fetch(
            "https://hook.eu1.make.com/ulmemio3o92nmljzm1t52rohg4dymoek",
            {
                method:"POST",
                headers:{
                    "Content-Type":"application/json"
                },
                body:JSON.stringify({
                    verification_id:mState.kycVerId
                })
            }
        );

        const text = await response.text();

      

        if(text.trim().toLowerCase()==="true"){

            stopKycPolling();

            mState.kycVerified = true;

            saveState();

            goTo(5);

        }

    }
    catch(e){

        console.error(e);

    }

}

function stopKycPolling(){

    if(kycPollTimer){

        clearInterval(kycPollTimer);

        kycPollTimer=null;

    }

    window.removeEventListener("focus",onKycFocus);

}

// ══════════════════════════════════
// ORDER SUMMARY
// ══════════════════════════════════
function updateOrderSummary() {

    if (!mState.selectedPlan) return;

    const p = mState.selectedPlan;

    const total = Number(p.price);

    const gst = Number((total / 11).toFixed(2));

    

    document.getElementById("ord-plan").textContent = p.tag;

    document.getElementById("ord-detail").textContent =
        `${p.data} on ${p.network}`;

    document.getElementById("ord-price").textContent =
        `$${p.price.toFixed(2)}`;

    document.getElementById("ord-gst").textContent =
    `$${gst.toFixed(2)}`;

    document.getElementById("ord-total").textContent =
    `$${total.toFixed(2)}`;

    document.getElementById("pay-txt").textContent =
        `Pay $${total.toFixed(2)} & Activate`;

}

// ══════════════════════════════════
// PAYMENT
// ══════════════════════════════════
async function processPayment() {

    const consent = document.getElementById("paymentConsent");

if (!consent.checked) {

    document.getElementById("consent-err").textContent =
        "Please accept the payment authorisation.";

    document.getElementById("consent-err").classList.add("show");

    return;
}

document.getElementById("consent-err").classList.remove("show");

  const btn = document.getElementById('pay-btn');
  btn.disabled = true;
  btn.innerHTML = '<span style="opacity:.7">Redirecting to payment...</span>';

  

  try {
    const p = mState.selectedPlan;
    // const gst = Number((p.price * 0.10).toFixed(2));

    //  const total = Number((p.price + gst).toFixed(2));
    const total = Number(p.price);

    const gst = Number((total / 11).toFixed(2));

     const payload = {

    flow: "mobile",

    
    acctType: mState.acctType,

    email: mState.email,

    phone: mState.phone || "",

    firstName: mState.firstName || "",

    lastName: mState.lastName || "",

    companyName: mState.companyName || "",

    tradingName: mState.tradingName || "",

    abn: mState.abn || "",

    dob:
        mState.acctType === "business"
        ? mState.dobBiz
        : mState.dob,

    
    address:
        mState.acctType === "business"
        ? mState.bizAddress
        : mState.address,

    
    planName: p.tag,

    planData: p.data,

    planPrice: Number(p.price),

    gst: gst,

    // totalPrice: Number(p.price),

    totalPrice: total,

    // stripeAmount: Number(p.price) * 100,

    stripeAmount: Math.round(total * 100),

    
    simType: mState.simType,

    
    portNumber: mState.portNumber,

    currentCarrier: mState.currentCarrier || "",

  
    activationDate:
        mState.asap
        ? null
        : mState.activationDate,

    asap: mState.asap,
    kycType:
    mState.kycType === "licence"
        ? "Driver Licence"
        : mState.kycType === "passport"
        ? "Passport"
        : "Medicare Card",

    
    source: "webflow-mobile-signup"

};

  

    const res  = await fetch("https://hook.eu1.make.com/9cjwqioh6l38gidsf3spbl98aqm8f5pe", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    

    if (data.url) {

    saveState();

    localStorage.setItem("foxus_mobile_done", "1");

    window.location.href = data.url;

    return;
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

    const name = mState.firstName || mState.companyName || "there";

    const el = document.getElementById("success-title");

    if (el) {
        el.textContent = `You're all set, ${name}!`;
    }

    // Remove everything immediately
    localStorage.removeItem("foxus_mobile_state");
    localStorage.removeItem("foxus_mobile_done");

    mState = getDefaultMobileState();

    // setTimeout(() => {

    //     window.location.replace("/mobile-plan");

    // }, 4000);

}
// ══════════════════════════════════
// RUN
// ══════════════════════════════════
init();

// Payment Consent
const consent = document.getElementById("paymentConsent");

if (consent) {

    consent.addEventListener("change", function () {

        document.getElementById("consent-err").classList.remove("show");

        const btn = document.getElementById("pay-btn");

        btn.disabled = false;

        btn.innerHTML = `
            <span id="pay-txt">${document.getElementById("pay-txt").textContent}</span>
            <svg width="14" height="14" fill="none" stroke="currentColor"
            stroke-width="2.5" viewBox="0 0 24 24">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
        `;

    });

}
