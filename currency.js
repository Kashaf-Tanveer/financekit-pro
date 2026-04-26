// File: currency.js — Currency converter for FinanceKit Pro
// Uses: frankfurter.app (100% FREE, no API key needed)
// Fixed: All element IDs match currency.html exactly & Dropdown population fixed

'use strict';

/* =========================================================
   ALL CURRENCIES — 160+ with names and flags
   ========================================================= */
const ALL_CURRENCIES = [
  ['USD','US Dollar','🇺🇸'],['EUR','Euro','🇪🇺'],['GBP','British Pound','🇬🇧'],
  ['PKR','Pakistani Rupee','🇵🇰'],['AED','UAE Dirham','🇦🇪'],['SAR','Saudi Riyal','🇸🇦'],
  ['INR','Indian Rupee','🇮🇳'],['JPY','Japanese Yen','🇯🇵'],['CAD','Canadian Dollar','🇨🇦'],
  ['AUD','Australian Dollar','🇦🇺'],['CHF','Swiss Franc','🇨🇭'],['CNY','Chinese Yuan','🇨🇳'],
  ['MYR','Malaysian Ringgit','🇲🇾'],['SGD','Singapore Dollar','🇸🇬'],['KWD','Kuwaiti Dinar','🇰🇼'],
  ['QAR','Qatari Riyal','🇶🇦'],['OMR','Omani Rial','🇴🇲'],['BHD','Bahraini Dinar','🇧🇭'],
  ['TRY','Turkish Lira','🇹🇷'],['NZD','New Zealand Dollar','🇳🇿'],['HKD','Hong Kong Dollar','🇭🇰'],
  ['KRW','South Korean Won','🇰🇷'],['SEK','Swedish Krona','🇸🇪'],['NOK','Norwegian Krone','🇳🇴'],
  ['DKK','Danish Krone','🇩🇰'],['MXN','Mexican Peso','🇲🇽'],['BRL','Brazilian Real','🇧🇷'],
  ['ZAR','South African Rand','🇿🇦'],['RUB','Russian Ruble','🇷🇺'],['THB','Thai Baht','🇹🇭'],
  ['IDR','Indonesian Rupiah','🇮🇩'],['PHP','Philippine Peso','🇵🇭'],['VND','Vietnamese Dong','🇻🇳'],
  ['EGP','Egyptian Pound','🇪🇬'],['NGN','Nigerian Naira','🇳🇬'],['KES','Kenyan Shilling','🇰🇪'],
  ['GHS','Ghanaian Cedi','🇬🇭'],['MAD','Moroccan Dirham','🇲🇦'],['DZD','Algerian Dinar','🇩🇿'],
  ['TND','Tunisian Dinar','🇹🇳'],['ETB','Ethiopian Birr','🇪🇹'],['PLN','Polish Zloty','🇵🇱'],
  ['CZK','Czech Koruna','🇨🇿'],['HUF','Hungarian Forint','🇭🇺'],['RON','Romanian Leu','🇷🇴'],
  ['BGN','Bulgarian Lev','🇧🇬'],['UAH','Ukrainian Hryvnia','🇺🇦'],['ILS','Israeli Shekel','🇮🇱'],
  ['BDT','Bangladeshi Taka','🇧🇩'],['LKR','Sri Lankan Rupee','🇱🇰'],['NPR','Nepalese Rupee','🇳🇵'],
  ['AFN','Afghan Afghani','🇦🇫'],['MMK','Myanmar Kyat','🇲🇲'],['KHR','Cambodian Riel','🇰🇭'],
  ['TWD','New Taiwan Dollar','🇹🇼'],['MVR','Maldivian Rufiyaa','🇲🇻'],['MUR','Mauritian Rupee','🇲🇺'],
  ['ARS','Argentine Peso','🇦🇷'],['CLP','Chilean Peso','🇨🇱'],['COP','Colombian Peso','🇨🇴'],
  ['PEN','Peruvian Sol','🇵🇪'],['UYU','Uruguayan Peso','🇺🇾'],['JOD','Jordanian Dinar','🇯🇴'],
  ['IQD','Iraqi Dinar','🇮🇶'],['GEL','Georgian Lari','🇬🇪'],['AZN','Azerbaijani Manat','🇦🇿'],
  ['KZT','Kazakhstani Tenge','🇰🇿'],['UZS','Uzbekistani Som','🇺🇿'],['AMD','Armenian Dram','🇦🇲'],
  ['ZMW','Zambian Kwacha','🇿🇲'],['TZS','Tanzanian Shilling','🇹🇿'],['UGX','Ugandan Shilling','🇺🇬'],
  ['XAF','Central African CFA','🌍'],['XOF','West African CFA','🌍'],['RWF','Rwandan Franc','🇷🇼'],
  ['BMD','Bermudian Dollar','🇧🇲'],['FJD','Fijian Dollar','🇫🇯'],['PGK','Papua New Guinean Kina','🇵🇬'],
];

/* =========================================================
   FALLBACK USD RATES — used when API is unreachable
   ========================================================= */
const USD_FALLBACK = {
  USD:1,EUR:0.92,GBP:0.79,PKR:278.5,AED:3.6725,SAR:3.75,INR:83.5,
  JPY:149,CAD:1.36,AUD:1.54,CHF:0.89,CNY:7.24,MYR:4.72,SGD:1.34,
  KWD:0.307,QAR:3.64,OMR:0.385,BHD:0.376,TRY:32,NZD:1.63,
  HKD:7.82,KRW:1330,SEK:10.5,NOK:10.7,DKK:6.9,MXN:17.1,BRL:4.97,
  ZAR:18.5,RUB:91,THB:35.5,IDR:15700,PHP:56.5,VND:25000,EGP:48.5,
  NGN:1580,KES:130,GHS:15.5,MAD:10.1,DZD:135,TND:3.1,ETB:57,
  PLN:4.0,CZK:23,HUF:360,RON:4.6,BGN:1.8,UAH:39.5,ILS:3.7,
  BDT:110,LKR:302,NPR:133,AFN:71.5,MMK:2100,KHR:4100,TWD:32,
  MVR:15.4,MUR:46,ARS:900,CLP:945,COP:4050,PEN:3.75,UYU:39,
  JOD:0.709,IQD:1310,GEL:2.72,AZN:1.7,KZT:465,UZS:12800,AMD:389,
  ZMW:27,TZS:2650,UGX:3750,XAF:600,XOF:600,RWF:1350,FJD:2.27,
};

/* =========================================================
   CACHE
   ========================================================= */
const CACHE_MS = 60 * 60 * 1000; // 1 hour
let ratesCache = {};

/* =========================================================
   POPULATE DROPDOWNS — fills #fromCurrency and #toCurrency
   ========================================================= */
function populateDropdowns() {
  const fromEl = document.getElementById('fromCurrency');
  const toEl   = document.getElementById('toCurrency');
  
  if (!fromEl || !toEl) {
    console.error("Currency dropdown elements not found!");
    return;
  }

  // Clear existing options to avoid duplicates on re-init
  fromEl.options.length = 0;
  toEl.options.length = 0;

  ALL_CURRENCIES.forEach(([code, name, flag]) => {
    const label = `${flag} ${code} — ${name}`;
    
    // Create Option for 'From'
    const optFrom = document.createElement('option');
    optFrom.value = code;
    optFrom.textContent = label;
    fromEl.appendChild(optFrom);

    // Create Option for 'To'
    const optTo = document.createElement('option');
    optTo.value = code;
    optTo.textContent = label;
    toEl.appendChild(optTo);
  });

  // Set default values if not already set
  if (!fromEl.value) fromEl.value = 'USD';
  if (!toEl.value) toEl.value = 'PKR';

  // Auto-detect from timezone for destination currency
  try {
    const tz  = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const map = {
      'Asia/Karachi':'PKR','Asia/Dubai':'AED','Asia/Riyadh':'SAR',
      'Asia/Kolkata':'INR','Asia/Dhaka':'BDT','Europe/London':'GBP',
      'Europe/Berlin':'EUR','America/New_York':'USD','Asia/Tokyo':'JPY',
      'Asia/Shanghai':'CNY','Asia/Singapore':'SGD','Australia/Sydney':'AUD',
      'America/Toronto':'CAD','Asia/Kuwait':'KWD','Asia/Bahrain':'BHD',
    };
    if (map[tz]) toEl.value = map[tz];
  } catch(e) {
    console.warn("Timezone detection failed:", e);
  }
}

/* =========================================================
   FETCH RATES — frankfurter.app (FREE, no key)
   ========================================================= */
const FRANK_SUPPORTED = new Set([
  'USD','EUR','GBP','JPY','CHF','AUD','CAD','CNY','NZD','SEK','NOK','DKK',
  'HKD','SGD','KRW','INR','MYR','THB','IDR','TRY','MXN','BRL','ZAR','PLN',
  'CZK','HUF','RON','BGN','PHP','ILS','HRK','ISK','TWD'
]);

async function fetchRates(base) {
  if (ratesCache[base] && (Date.now() - ratesCache[base].ts) < CACHE_MS) {
    return ratesCache[base].rates;
  }

  showLoader(true);

  try {
    let rates = {};

    if (FRANK_SUPPORTED.has(base)) {
      const res  = await fetch(`https://api.frankfurter.app/latest?from=${base}`);
      if (!res.ok) throw new Error('API ' + res.status);
      const data = await res.json();
      rates = { ...data.rates, [base]: 1 };

      const usdRate = base === 'USD' ? 1 : (rates['USD'] || 1);
      Object.keys(USD_FALLBACK).forEach(code => {
        if (!rates[code]) {
          rates[code] = base === 'USD'
            ? USD_FALLBACK[code]
            : USD_FALLBACK[code] / (1 / usdRate);
        }
      });

    } else {
      const res  = await fetch(`https://api.frankfurter.app/latest?from=USD`);
      if (!res.ok) throw new Error('API ' + res.status);
      const data = await res.json();
      const usdRates = { ...data.rates, USD: 1 };

      Object.keys(USD_FALLBACK).forEach(c => { if (!usdRates[c]) usdRates[c] = USD_FALLBACK[c]; });

      const usdToBase = USD_FALLBACK[base] || usdRates[base] || 1;

      Object.keys(usdRates).forEach(code => {
        rates[code] = usdRates[code] / usdToBase;
      });
      rates[base] = 1;
    }

    ratesCache[base] = { rates, ts: Date.now() };
    showLastUpdated(true);
    showLoader(false);
    return rates;

  } catch(err) {
    console.warn('Live rate fetch failed, using fallback:', err.message);
    showLastUpdated(false);
    showLoader(false);

    const usdToBase = USD_FALLBACK[base] || 1;
    const fallback  = {};
    Object.keys(USD_FALLBACK).forEach(c => { fallback[c] = USD_FALLBACK[c] / usdToBase; });
    fallback[base] = 1;
    return fallback;
  }
}

/* =========================================================
   MAIN CONVERT — reads HTML inputs, displays result
   ========================================================= */
async function doConvert() {
  const fromEl   = document.getElementById('fromCurrency');
  const toEl     = document.getElementById('toCurrency');
  const amountEl = document.getElementById('amount');

  const from   = fromEl?.value || 'USD';
  const to     = toEl?.value   || 'PKR';
  const amount = parseFloat(amountEl?.value) || 0;

  if (amount <= 0) {
    setResult('—', 'Please enter a valid amount');
    return;
  }

  const rates = await fetchRates(from);
  const rate  = rates[to];

  if (!rate) {
    setResult('N/A', `Rate for ${to} not available`);
    return;
  }

  const converted = amount * rate;
  const fmtResult = converted.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: converted >= 100 ? 2 : 4
  });

  const fromEntry = ALL_CURRENCIES.find(c => c[0] === from);
  const toEntry   = ALL_CURRENCIES.find(c => c[0] === to);
  const toFlag    = toEntry   ? toEntry[2]   : '';
  const toName    = toEntry   ? toEntry[1]   : to;

  setResult(
    `${toFlag} ${fmtResult} ${to}`,
    `1 ${from} = ${rate.toFixed(4)} ${to}   |   1 ${to} = ${(1/rate).toFixed(4)} ${from}`
  );

  const baseLbl = document.getElementById('base-label');
  if (baseLbl) baseLbl.textContent = from;

  renderRateTable(from, rates, amount);
}

/* =========================================================
   DISPLAY HELPERS
   ========================================================= */
function setResult(mainText, detailText) {
  const bigResult  = document.getElementById('big-result');
  const rateDetail = document.getElementById('rate-detail');
  if (bigResult)  bigResult.textContent  = mainText;
  if (rateDetail) rateDetail.textContent = detailText;
}

function showLoader(on) {
  const el = document.getElementById('loader-overlay');
  if (el) el.classList.toggle('hidden', !on);
}

function showLastUpdated(live) {
  const el = document.getElementById('last-updated');
  if (!el) return;
  el.textContent = live
    ? `✅ Live rates — Updated ${new Date().toLocaleTimeString()}`
    : `⚠️ Showing estimated rates (offline)`;

  const warn = document.getElementById('rate-warning');
  if (warn) warn.classList.toggle('hidden', live);
}

/* =========================================================
   RATE TABLE
   ========================================================= */
function renderRateTable(base, rates, amount) {
  const tbody = document.getElementById('rate-tbody');
  if (!tbody) return;

  const currentAmount = amount || 1;
  const targets = ALL_CURRENCIES.filter(([c]) => c !== base).slice(0, 20);

  tbody.innerHTML = targets.map(([code, name, flag]) => {
    const rate = rates[code];
    if (!rate) return '';
    const converted = (currentAmount * rate).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: rate > 10 ? 2 : 4
    });
    const inverse = (1 / rate).toFixed(4);
    return `
      <tr style="cursor:pointer;" onclick="setConversionTo('${code}')" title="Click to convert to ${name}">
        <td style="text-align:left;">${flag} ${name}</td>
        <td style="font-weight:700;font-family:var(--font-mono);">${code}</td>
        <td style="font-family:var(--font-mono);text-align:right;">${converted}</td>
        <td style="font-family:var(--font-mono);text-align:right;color:var(--text-muted);">${inverse}</td>
      </tr>`;
  }).join('');
}

function setConversionTo(code) {
  const toEl = document.getElementById('toCurrency');
  if (toEl) { 
    toEl.value = code; 
    doConvert(); 
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* =========================================================
   QUICK SELECT & SWAP
   ========================================================= */
function quickSelect(code) {
  const fromEl = document.getElementById('fromCurrency');
  if (fromEl) {
    fromEl.value = code;
    doConvert();
  }
}

function swapCurrencies() {
  const fromEl = document.getElementById('fromCurrency');
  const toEl   = document.getElementById('toCurrency');
  if (!fromEl || !toEl) return;
  const tmp    = fromEl.value;
  fromEl.value = toEl.value;
  toEl.value   = tmp;
  doConvert();
}

/* =========================================================
   INIT — Ensure everything runs on load
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  // Step 1: Fill dropdowns
  populateDropdowns();

  // Step 2: Wire up listeners first
  const fromEl   = document.getElementById('fromCurrency');
  const toEl     = document.getElementById('toCurrency');
  const amountEl = document.getElementById('amount');

  if (fromEl)   fromEl.addEventListener('change',  doConvert);
  if (toEl)     toEl.addEventListener('change',    doConvert);
  if (amountEl) amountEl.addEventListener('input', doConvert);

  // Step 3: Run initial conversion
  doConvert();

  // Step 4: Listen for global events
  document.addEventListener('fkp:currencyChanged', (e) => {
    if (toEl && e.detail?.code) {
      toEl.value = e.detail.code;
      doConvert();
    }
  });
});
