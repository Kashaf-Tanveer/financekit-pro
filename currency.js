// File: currency.js — Currency converter logic for FinanceKit Pro
// FIX: Replaced broken ExchangeRate-API (needs paid key) with frankfurter.app (100% FREE, no key needed)
// FIX: Added proper error handling and fallback cached rates

'use strict';

/* =========================================================
   CONFIGURATION — frankfurter.app (FREE, no API key needed)
   ========================================================= */
const FRANK_API = 'https://api.frankfurter.app/latest';

/** Cache duration: 1 hour */
const CACHE_DURATION_MS = 60 * 60 * 1000;

/** Popular currencies shown as quick-select chips */
const MAJOR_CURRENCIES = {
  PKR: 'Pakistani Rupee',  USD: 'US Dollar',       EUR: 'Euro',
  GBP: 'British Pound',    AED: 'UAE Dirham',       SAR: 'Saudi Riyal',
  CAD: 'Canadian Dollar',  AUD: 'Australian Dollar',JPY: 'Japanese Yen',
  CHF: 'Swiss Franc',      CNY: 'Chinese Yuan',     INR: 'Indian Rupee',
  MYR: 'Malaysian Ringgit',SGD: 'Singapore Dollar', KWD: 'Kuwaiti Dinar',
  QAR: 'Qatari Riyal',     OMR: 'Omani Rial',       BHD: 'Bahraini Dinar',
  TRY: 'Turkish Lira',     NZD: 'New Zealand Dollar'
};

/* =========================================================
   STATE
   ========================================================= */
let ratesCache   = {};   // { base: { rates: {}, timestamp: ms } }
let fromCurrency = 'USD';
let toCurrency   = 'PKR';
let currentAmount = 1;

/* =========================================================
   DOM REFS
   ========================================================= */
const amountInput  = () => document.getElementById('currency-amount');
const fromSelect   = () => document.getElementById('currency-from');
const toSelect     = () => document.getElementById('currency-to');
const resultBox    = () => document.getElementById('currency-result-box');
const resultAmount = () => document.getElementById('currency-result-amount');
const resultCode   = () => document.getElementById('currency-result-code');
const rateInfo     = () => document.getElementById('currency-rate-info');
const statusBanner = () => document.getElementById('currency-status');
const rateTableBody= () => document.getElementById('rate-table-body');
const lastUpdated  = () => document.getElementById('currency-last-updated');

/* =========================================================
   FETCH RATES — frankfurter.app (completely free, no key)
   Supports: USD, EUR, GBP, JPY, CHF, AUD, CAD, CNY, NZD, SEK, etc.
   NOTE: PKR, SAR, AED etc. are supported via cross-rate calculation
   ========================================================= */
async function fetchRates(base) {
  // Check cache
  if (ratesCache[base] && (Date.now() - ratesCache[base].timestamp) < CACHE_DURATION_MS) {
    return ratesCache[base].rates;
  }

  showStatus('loading', 'Fetching live rates...');

  try {
    // Frankfurter supports most currencies. For PKR and Gulf currencies,
    // we fetch via USD as base and cross-calculate
    const mainCurrencies = ['USD','EUR','GBP','JPY','CHF','AUD','CAD','CNY','NZD','SEK','NOK','DKK','HKD','SGD','KRW','INR','MYR','THB','IDR','TRY','MXN','BRL','ZAR','PLN','CZK','HUF','ILS'];

    // Try direct fetch first
    let apiBase = base;
    let needsCross = false;

    // If base is not supported by frankfurter directly, use USD and cross-calculate
    if (!mainCurrencies.includes(base)) {
      apiBase = 'USD';
      needsCross = true;
    }

    const url = `${FRANK_API}?from=${apiBase}`;
    const response = await fetch(url);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    let rates = { ...data.rates, [apiBase]: 1 };

    // Add approximate rates for currencies not in frankfurter (PKR, AED, SAR etc.)
    // These are cross-calculated from USD
    const usdCrossRates = {
      PKR: 278.5, AED: 3.6725, SAR: 3.75, QAR: 3.64, OMR: 0.385,
      BHD: 0.376, KWD: 0.307, AFN: 71.5, LKR: 302, NPR: 133,
      BDT: 110, MMK: 2100, KHR: 4100, LAK: 21000, MNT: 3400,
      IRR: 42000, IQD: 1310, LBP: 89500, SYP: 13000, YER: 250,
      EGP: 48.5, NGN: 1580, KES: 130, GHS: 15.5, TZS: 2650,
      UGX: 3750, MAD: 10.1, DZD: 135, TND: 3.1, ETB: 57,
      ZMW: 27, BWP: 13.8, NAD: 18.5, RUB: 91, UAH: 39.5,
      KZT: 465, UZS: 12800, GEL: 2.72, AZN: 1.7, AMD: 389,
      KGS: 89, TJS: 10.9, ARS: 900, CLP: 945, COP: 4050,
      PEN: 3.75, UYU: 39, BOB: 6.9, PYG: 7600, VND: 25000,
      PHP: 56.5, TWD: 32, MVR: 15.4, MUR: 46, SCR: 14.2
    };

    // Merge cross rates with fetched rates
    if (needsCross) {
      // base is not USD-compatible, use USD cross
      const usdToBase = usdCrossRates[base] || 1;
      const merged = {};
      Object.keys(rates).forEach(code => {
        merged[code] = rates[code] / usdToBase;
      });
      Object.keys(usdCrossRates).forEach(code => {
        if (!merged[code]) merged[code] = usdCrossRates[code] / usdToBase;
      });
      merged[base] = 1;
      rates = merged;
    } else {
      // Add cross rates for currencies missing from frankfurter
      const usdRate = rates['USD'] || 1; // How many USD per 1 apiBase unit... invert
      Object.keys(usdCrossRates).forEach(code => {
        if (!rates[code]) {
          // cross: apiBase -> USD -> target
          const apiBaseToUsd = apiBase === 'USD' ? 1 : (1 / rates['USD']);
          rates[code] = usdCrossRates[code] * (apiBase === 'USD' ? 1 : rates['USD'] ? (1/rates['USD']) : 1);
          // simpler: if we have USD in rates, use it
          if (rates['USD']) {
            rates[code] = usdCrossRates[code] / rates['USD'];
          }
        }
      });
      rates[apiBase] = 1;
    }

    // Cache the result
    ratesCache[base] = { rates, timestamp: Date.now() };

    showStatus('success', `Live rates loaded — ${new Date().toLocaleTimeString()}`);
    if (lastUpdated()) lastUpdated().textContent = 'Updated: ' + new Date().toLocaleTimeString();

    return rates;

  } catch (err) {
    console.error('Currency fetch error:', err);
    showStatus('error', 'Live rates unavailable. Showing estimated rates.');

    // Return fallback rates based on USD
    const fallback = buildFallbackRates(base);
    ratesCache[base] = { rates: fallback, timestamp: Date.now() - (CACHE_DURATION_MS - 60000) }; // expire in 1 min to retry
    return fallback;
  }
}

/** Build rough fallback rates when API is unreachable */
function buildFallbackRates(base) {
  const usdRates = {
    USD:1, EUR:0.92, GBP:0.79, JPY:149, CHF:0.89, AUD:1.54, CAD:1.36,
    CNY:7.24, NZD:1.63, SEK:10.5, NOK:10.7, DKK:6.9, HKD:7.82, SGD:1.34,
    KRW:1330, INR:83.5, MYR:4.72, THB:35.5, IDR:15700, TRY:32, MXN:17.1,
    BRL:4.97, ZAR:18.5, PLN:4.0, CZK:23, HUF:360, ILS:3.7,
    PKR:278.5, AED:3.6725, SAR:3.75, QAR:3.64, OMR:0.385,
    BHD:0.376, KWD:0.307, AFN:71.5, LKR:302, NPR:133, BDT:110,
    EGP:48.5, NGN:1580, KES:130, MAD:10.1, DZD:135, TND:3.1,
    ARS:900, CLP:945, COP:4050, PEN:3.75, VND:25000, PHP:56.5,
    RUB:91, UAH:39.5, KZT:465
  };

  const baseToUsd = usdRates[base] || 1;
  const result = {};
  Object.keys(usdRates).forEach(code => {
    result[code] = usdRates[code] / baseToUsd;
  });
  result[base] = 1;
  return result;
}

/* =========================================================
   STATUS BANNER
   ========================================================= */
function showStatus(type, message) {
  const el = statusBanner();
  if (!el) return;
  el.className = 'currency-status ' + type;
  el.textContent = type === 'loading' ? '⏳ ' + message
                 : type === 'error'   ? '⚠️ ' + message
                 :                      '✅ ' + message;
  el.style.display = 'block';
  if (type === 'success') setTimeout(() => { if (el) el.style.display = 'none'; }, 3000);
}

/* =========================================================
   MAIN CONVERT FUNCTION
   ========================================================= */
async function convertCurrency() {
  const amountEl = amountInput();
  const fromEl   = fromSelect();
  const toEl     = toSelect();

  const amount = parseFloat(amountEl?.value) || 0;
  const from   = fromEl?.value || 'USD';
  const to     = toEl?.value   || 'PKR';

  if (amount <= 0) { clearResult(); return; }

  fromCurrency  = from;
  toCurrency    = to;
  currentAmount = amount;

  const rates = await fetchRates(from);
  if (!rates) return;

  const rate   = rates[to];
  if (!rate) { showStatus('error', `Rate for ${to} not available`); return; }

  const result = amount * rate;

  // Display result
  const resAmountEl = resultAmount();
  const resCodeEl   = resultCode();
  const rateInfoEl  = rateInfo();

  if (resAmountEl) {
    resAmountEl.textContent = result.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: result > 100 ? 2 : 4
    });
  }
  if (resCodeEl)  resCodeEl.textContent  = to;
  if (rateInfoEl) rateInfoEl.textContent = `1 ${from} = ${rate.toFixed(4)} ${to}  |  1 ${to} = ${(1/rate).toFixed(4)} ${from}`;
  if (resultBox()) resultBox().style.display = 'block';

  renderRateTable(from, rates);
}

function clearResult() {
  if (resultBox()) resultBox().style.display = 'none';
}

/* =========================================================
   SWAP CURRENCIES
   ========================================================= */
function swapCurrencies() {
  const fromEl = fromSelect();
  const toEl   = toSelect();
  if (!fromEl || !toEl) return;

  const tmp    = fromEl.value;
  fromEl.value = toEl.value;
  toEl.value   = tmp;

  convertCurrency();
}

/* =========================================================
   RATE TABLE — shows top 10 currencies
   ========================================================= */
function renderRateTable(base, rates) {
  const tbody = rateTableBody();
  if (!tbody) return;

  const targets = Object.keys(MAJOR_CURRENCIES).filter(c => c !== base).slice(0, 12);
  const amount  = parseFloat(amountInput()?.value) || 1;

  tbody.innerHTML = targets.map(code => {
    const rate   = rates[code];
    if (!rate) return '';
    const result = (amount * rate);
    const fmt    = result.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: result > 100 ? 2 : 4 });
    return `
      <tr onclick="quickSelectTo('${code}')" style="cursor:pointer;">
        <td><strong>${code}</strong></td>
        <td style="color:var(--text-muted);font-size:0.85em;">${MAJOR_CURRENCIES[code] || ''}</td>
        <td style="font-family:'DM Mono',monospace;text-align:right;">${fmt}</td>
        <td style="font-family:'DM Mono',monospace;text-align:right;color:var(--text-muted);font-size:0.85em;">${rate.toFixed(4)}</td>
      </tr>`;
  }).join('');
}

function quickSelectTo(code) {
  const toEl = toSelect();
  if (toEl) { toEl.value = code; convertCurrency(); }
}

/* =========================================================
   QUICK SELECT CHIPS (e.g. PKR, USD, EUR buttons)
   ========================================================= */
function quickSelectFrom(code) {
  const fromEl = fromSelect();
  if (fromEl) { fromEl.value = code; convertCurrency(); }
}

/* =========================================================
   POPULATE SELECT DROPDOWNS
   ========================================================= */
function populateSelects() {
  const fromEl = fromSelect();
  const toEl   = toSelect();
  if (!fromEl || !toEl) return;

  // Full currency list — combine MAJOR_CURRENCIES with CURRENCY_DB from app.js
  const allCodes = typeof CURRENCY_DB !== 'undefined'
    ? Object.keys(CURRENCY_DB)
    : Object.keys(MAJOR_CURRENCIES);

  // Sort: majors first, then rest alphabetically
  const majorKeys = Object.keys(MAJOR_CURRENCIES);
  const sorted = [
    ...majorKeys,
    ...allCodes.filter(c => !majorKeys.includes(c)).sort()
  ];

  const uniqueSorted = [...new Set(sorted)];

  uniqueSorted.forEach(code => {
    const name = (typeof CURRENCY_DB !== 'undefined' && CURRENCY_DB[code])
      ? CURRENCY_DB[code].name
      : (MAJOR_CURRENCIES[code] || code);

    const opt1 = new Option(`${code} — ${name}`, code);
    const opt2 = new Option(`${code} — ${name}`, code);
    fromEl.appendChild(opt1);
    toEl.appendChild(opt2);
  });

  // Auto-detect user's likely currency from timezone
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tzMap = {
      'Asia/Karachi':'PKR', 'Asia/Dubai':'AED', 'Asia/Riyadh':'SAR',
      'Asia/Kolkata':'INR', 'Asia/Dhaka':'BDT', 'Asia/Colombo':'LKR',
      'Europe/London':'GBP', 'Europe/Berlin':'EUR', 'America/New_York':'USD',
      'Asia/Tokyo':'JPY', 'Asia/Shanghai':'CNY', 'Asia/Singapore':'SGD',
      'Australia/Sydney':'AUD', 'America/Toronto':'CAD'
    };
    const detected = tzMap[tz];
    if (detected) {
      toEl.value = detected;
      toCurrency = detected;
    }
  } catch(e) {}

  // Also use global currency selector if set
  if (typeof getCurrencyCode === 'function') {
    const active = getCurrencyCode();
    if (active) { toEl.value = active; toCurrency = active; }
  }

  fromEl.value = 'USD';
  fromCurrency = 'USD';
}

/* =========================================================
   INIT
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  populateSelects();
  convertCurrency();

  // Listen for input changes
  const amtEl  = amountInput();
  const fromEl = fromSelect();
  const toEl   = toSelect();

  if (amtEl)  amtEl.addEventListener('input',  convertCurrency);
  if (fromEl) fromEl.addEventListener('change', convertCurrency);
  if (toEl)   toEl.addEventListener('change',   convertCurrency);

  // Listen for global currency changes (header selector)
  document.addEventListener('fkp:currencyChanged', (e) => {
    if (toEl && e.detail?.code) {
      toEl.value = e.detail.code;
      toCurrency = e.detail.code;
      convertCurrency();
    }
  });
});
