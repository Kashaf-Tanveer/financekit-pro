// File: currency.js — Currency converter logic for FinanceKit Pro
// Handles: live API fetch, localStorage caching (1hr), conversion, rate table rendering

'use strict';

/* =========================================================
   CONFIGURATION
   ========================================================= */

/**
 * Replace 'YOUR_API_KEY_HERE' with your free key from https://www.exchangerate-api.com
 * Free tier: 1,500 requests/month — with 1hr caching this is plenty.
 */
const API_KEY = 'YOUR_API_KEY_HERE';
const API_BASE = 'https://v6.exchangerate-api.com/v6/' + API_KEY + '/latest/';

/** Cache duration: 1 hour in milliseconds */
const CACHE_DURATION_MS = 60 * 60 * 1000;

/** Major currencies with display names */
const MAJOR_CURRENCIES = {
  PKR: 'Pakistani Rupee',
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  AED: 'UAE Dirham',
  SAR: 'Saudi Riyal',
  CAD: 'Canadian Dollar',
  AUD: 'Australian Dollar',
  JPY: 'Japanese Yen',
  CHF: 'Swiss Franc',
  CNY: 'Chinese Yuan',
  INR: 'Indian Rupee',
  MYR: 'Malaysian Ringgit',
  SGD: 'Singapore Dollar',
  KWD: 'Kuwaiti Dinar',
  QAR: 'Qatari Riyal',
  OMR: 'Omani Rial',
  BHD: 'Bahraini Dinar',
  TRY: 'Turkish Lira',
  NZD: 'New Zealand Dollar',
};

/** Full names for ALL currencies */
const CURRENCY_NAMES = {
  PKR: 'Pakistani Rupee',        USD: 'US Dollar',               EUR: 'Euro',
  GBP: 'British Pound',          AED: 'UAE Dirham',              SAR: 'Saudi Riyal',
  CAD: 'Canadian Dollar',        AUD: 'Australian Dollar',       JPY: 'Japanese Yen',
  CHF: 'Swiss Franc',            CNY: 'Chinese Yuan',            INR: 'Indian Rupee',
  MYR: 'Malaysian Ringgit',      SGD: 'Singapore Dollar',        KWD: 'Kuwaiti Dinar',
  QAR: 'Qatari Riyal',           OMR: 'Omani Rial',              BHD: 'Bahraini Dinar',
  TRY: 'Turkish Lira',           NZD: 'New Zealand Dollar',
  AFN: 'Afghan Afghani',         ALL: 'Albanian Lek',            AMD: 'Armenian Dram',
  ANG: 'Netherlands Antillean Guilder', AOA: 'Angolan Kwanza',   ARS: 'Argentine Peso',
  AWG: 'Aruban Florin',          AZN: 'Azerbaijani Manat',       BAM: 'Bosnia-Herzegovina Mark',
  BBD: 'Barbadian Dollar',       BDT: 'Bangladeshi Taka',        BGN: 'Bulgarian Lev',
  BIF: 'Burundian Franc',        BMD: 'Bermudian Dollar',        BND: 'Brunei Dollar',
  BOB: 'Bolivian Boliviano',     BRL: 'Brazilian Real',          BSD: 'Bahamian Dollar',
  BTN: 'Bhutanese Ngultrum',     BWP: 'Botswanan Pula',          BYN: 'Belarusian Ruble',
  BZD: 'Belize Dollar',          CDF: 'Congolese Franc',         CLP: 'Chilean Peso',
  COP: 'Colombian Peso',         CRC: 'Costa Rican Colón',       CUP: 'Cuban Peso',
  CVE: 'Cape Verdean Escudo',    CZK: 'Czech Koruna',            DJF: 'Djiboutian Franc',
  DKK: 'Danish Krone',           DOP: 'Dominican Peso',          DZD: 'Algerian Dinar',
  EGP: 'Egyptian Pound',         ERN: 'Eritrean Nakfa',          ETB: 'Ethiopian Birr',
  FJD: 'Fijian Dollar',          FKP: 'Falkland Islands Pound',  FOK: 'Faroese Króna',
  GEL: 'Georgian Lari',          GGP: 'Guernsey Pound',          GHS: 'Ghanaian Cedi',
  GIP: 'Gibraltar Pound',        GMD: 'Gambian Dalasi',          GNF: 'Guinean Franc',
  GTQ: 'Guatemalan Quetzal',     GYD: 'Guyanese Dollar',         HKD: 'Hong Kong Dollar',
  HNL: 'Honduran Lempira',       HRK: 'Croatian Kuna',           HTG: 'Haitian Gourde',
  HUF: 'Hungarian Forint',       IDR: 'Indonesian Rupiah',       ILS: 'Israeli Shekel',
  IMP: 'Isle of Man Pound',      IQD: 'Iraqi Dinar',             IRR: 'Iranian Rial',
  ISK: 'Icelandic Króna',        JEP: 'Jersey Pound',            JMD: 'Jamaican Dollar',
  JOD: 'Jordanian Dinar',        KES: 'Kenyan Shilling',         KGS: 'Kyrgyzstani Som',
  KHR: 'Cambodian Riel',         KID: 'Kiribati Dollar',         KMF: 'Comorian Franc',
  KRW: 'South Korean Won',       KYD: 'Cayman Islands Dollar',   KZT: 'Kazakhstani Tenge',
  LAK: 'Laotian Kip',            LBP: 'Lebanese Pound',          LKR: 'Sri Lankan Rupee',
  LRD: 'Liberian Dollar',        LSL: 'Lesotho Loti',            LYD: 'Libyan Dinar',
  MAD: 'Moroccan Dirham',        MDL: 'Moldovan Leu',            MGA: 'Malagasy Ariary',
  MKD: 'Macedonian Denar',       MMK: 'Myanmar Kyat',            MNT: 'Mongolian Tögrög',
  MOP: 'Macanese Pataca',        MRU: 'Mauritanian Ouguiya',     MUR: 'Mauritian Rupee',
  MVR: 'Maldivian Rufiyaa',      MWK: 'Malawian Kwacha',         MXN: 'Mexican Peso',
  MZN: 'Mozambican Metical',     NAD: 'Namibian Dollar',         NGN: 'Nigerian Naira',
  NIO: 'Nicaraguan Córdoba',     NOK: 'Norwegian Krone',         NPR: 'Nepalese Rupee',
  PGK: 'Papua New Guinean Kina', PHP: 'Philippine Peso',         PLN: 'Polish Złoty',
  PYG: 'Paraguayan Guaraní',     RON: 'Romanian Leu',            RSD: 'Serbian Dinar',
  RUB: 'Russian Ruble',          RWF: 'Rwandan Franc',           SBD: 'Solomon Islands Dollar',
  SCR: 'Seychellois Rupee',      SDG: 'Sudanese Pound',          SEK: 'Swedish Krona',
  SHP: 'Saint Helena Pound',     SLL: 'Sierra Leonean Leone',    SOS: 'Somali Shilling',
  SRD: 'Surinamese Dollar',      SSP: 'South Sudanese Pound',    STN: 'São Tomé & Príncipe Dobra',
  SYP: 'Syrian Pound',           SZL: 'Swazi Lilangeni',         THB: 'Thai Baht',
  TJS: 'Tajikistani Somoni',     TMT: 'Turkmenistani Manat',     TND: 'Tunisian Dinar',
  TOP: 'Tongan Paʻanga',         TTD: 'Trinidad & Tobago Dollar',TVD: 'Tuvaluan Dollar',
  TWD: 'New Taiwan Dollar',      TZS: 'Tanzanian Shilling',      UAH: 'Ukrainian Hryvnia',
  UGX: 'Ugandan Shilling',       UYU: 'Uruguayan Peso',          UZS: 'Uzbekistani Som',
  VES: 'Venezuelan Bolívar',     VND: 'Vietnamese Đồng',         VUV: 'Vanuatu Vatu',
  WST: 'Samoan Tālā',            XAF: 'Central African CFA Franc',XCD: 'East Caribbean Dollar',
  XDR: 'Special Drawing Rights', XOF: 'West African CFA Franc',  XPF: 'CFP Franc',
  YER: 'Yemeni Rial',            ZAR: 'South African Rand',      ZMW: 'Zambian Kwacha',
  ZWL: 'Zimbabwean Dollar',
};

/** All currency codes for dropdowns — major first, then alphabetical */
const ALL_CURRENCIES = [
  'PKR','USD','EUR','GBP','AED','SAR','CAD','AUD','JPY','CHF',
  'CNY','INR','MYR','SGD','KWD','QAR','OMR','BHD','TRY','NZD',
  'AFN','ALL','AMD','ANG','AOA','ARS','AWG','AZN','BAM','BBD',
  'BDT','BGN','BIF','BMD','BND','BOB','BRL','BSD','BTN','BWP',
  'BYN','BZD','CDF','CLP','COP','CRC','CUP','CVE','CZK','DJF',
  'DKK','DOP','DZD','EGP','ERN','ETB','FJD','FKP','FOK','GEL',
  'GGP','GHS','GIP','GMD','GNF','GTQ','GYD','HKD','HNL','HRK',
  'HTG','HUF','IDR','ILS','IMP','IQD','IRR','ISK','JEP','JMD',
  'JOD','KES','KGS','KHR','KID','KMF','KRW','KYD','KZT','LAK',
  'LBP','LKR','LRD','LSL','LYD','MAD','MDL','MGA','MKD','MMK',
  'MNT','MOP','MRU','MUR','MVR','MWK','MXN','MZN','NAD','NGN',
  'NIO','NOK','NPR','PGK','PHP','PLN','PYG','RON','RSD','RUB',
  'RWF','SBD','SCR','SDG','SEK','SHP','SLL','SOS','SRD','SSP',
  'STN','SYP','SZL','THB','TJS','TMT','TND','TOP','TTD','TVD',
  'TWD','TZS','UAH','UGX','UYU','UZS','VES','VND','VUV','WST',
  'XAF','XCD','XDR','XOF','XPF','YER','ZAR','ZMW','ZWL'
];

/* =========================================================
   STATE
   ========================================================= */
let currentRates = null; // { base, rates: {}, timestamp }

/* =========================================================
   POPULATE DROPDOWNS
   ========================================================= */

/**
 * populateDropdowns — Fills both from/to select elements with currency options.
 * Default: From = USD, To = PKR
 */
function populateDropdowns() {
  const fromEl = document.getElementById('fromCurrency');
  const toEl   = document.getElementById('toCurrency');
  if (!fromEl || !toEl) return;

  ALL_CURRENCIES.forEach(code => {
    const fullName = CURRENCY_NAMES[code] || code;
    const label = `${code} — ${fullName}`;

    const optFrom = document.createElement('option');
    optFrom.value = code;
    optFrom.textContent = label;
    if (code === 'USD') optFrom.selected = true;
    fromEl.appendChild(optFrom);

    const optTo = document.createElement('option');
    optTo.value = code;
    optTo.textContent = label;
    if (code === 'PKR') optTo.selected = true;
    toEl.appendChild(optTo);
  });
}

/* =========================================================
   FETCH RATES
   Checks localStorage cache first; falls back to API
   ========================================================= */

/**
 * fetchRates — Gets exchange rates for the given base currency.
 * Uses 1-hour localStorage cache to avoid API limit hits.
 * @param {string} baseCurrency - ISO 4217 code e.g. 'USD'
 */
async function fetchRates(baseCurrency) {
  const cacheKey = 'fkp-rates-' + baseCurrency;

  // 1. Check cache
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey));
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION_MS)) {
      currentRates = cached;
      renderRateTable(cached.rates, baseCurrency);
      convertCurrency();
      updateLastUpdated(cached.timestamp);
      return;
    }
  } catch (e) { /* Invalid cache — proceed to fetch */ }

  // 2. Show loader
  showLoader(true);

  // 3. Fetch from API
  try {
    const url = API_BASE + baseCurrency;
    const resp = await fetch(url);
    const data = await resp.json();

    if (data.result !== 'success') throw new Error('API error: ' + data['error-type']);

    const cacheEntry = {
      base: baseCurrency,
      rates: data.conversion_rates,
      timestamp: Date.now()
    };

    // Save to localStorage
    try { localStorage.setItem(cacheKey, JSON.stringify(cacheEntry)); } catch(e) {}

    currentRates = cacheEntry;
    renderRateTable(cacheEntry.rates, baseCurrency);
    convertCurrency();
    updateLastUpdated(cacheEntry.timestamp);
    hideWarning();
    if (typeof showToast === 'function') showToast('Live rates loaded ✓', 'success');

  } catch (err) {
    // 4. API failed — try any cached version regardless of age
    console.error('Currency API error:', err);
    try {
      const stale = JSON.parse(localStorage.getItem(cacheKey));
      if (stale) {
        currentRates = stale;
        renderRateTable(stale.rates, baseCurrency);
        convertCurrency();
        showWarning(stale.timestamp);
        if (typeof showToast === 'function') showToast('Using cached rates (offline)', 'error');
        return;
      }
    } catch(e2) {}

    // No cache at all — try fallback static rates
    useFallbackRates(baseCurrency);
  } finally {
    showLoader(false);
  }
}

/**
 * useFallbackRates — Uses approximate hardcoded rates when API is unavailable.
 * These are approximate and should be replaced ASAP by live data.
 * @param {string} base
 */
function useFallbackRates(base) {
  // Approximate USD-based rates (2024 estimates)
  const usdRates = {
    USD:1, PKR:278.5, EUR:0.92, GBP:0.79, AED:3.67, SAR:3.75,
    CAD:1.36, AUD:1.52, JPY:149.5, CHF:0.89, CNY:7.24, INR:83.1,
    MYR:4.72, SGD:1.34, KWD:0.31, QAR:3.64, OMR:0.38, BHD:0.38,
    TRY:30.4, NZD:1.63
  };

  // If base is not USD, convert
  const baseUSD = usdRates[base] || 1;
  const rates = {};
  for (const [code, rate] of Object.entries(usdRates)) {
    rates[code] = parseFloat((rate / baseUSD).toFixed(6));
  }

  currentRates = { base, rates, timestamp: Date.now() - CACHE_DURATION_MS };
  renderRateTable(rates, base);
  convertCurrency();
  showWarning(null);
}

/* =========================================================
   CONVERT CURRENCY
   ========================================================= */

/**
 * convertCurrency — Reads inputs and displays the converted result.
 * Formula: result = amount × (toRate / fromRate)
 * Since we fetch rates with fromCurrency as base, fromRate = 1.
 */
function convertCurrency() {
  const amountEl = document.getElementById('amount');
  const toEl     = document.getElementById('toCurrency');
  const resultEl = document.getElementById('big-result');
  const detailEl = document.getElementById('rate-detail');

  if (!amountEl || !toEl || !resultEl) return;

  const amount = parseFloat(amountEl.value) || 0;
  const toCurrency = toEl.value;
  const fromCurrency = document.getElementById('fromCurrency')?.value || 'USD';

  if (!currentRates || !currentRates.rates) {
    resultEl.textContent = '—';
    return;
  }

  const rates = currentRates.rates;
  const fromRate = rates[fromCurrency] || 1;
  const toRate   = rates[toCurrency]   || 1;

  // Convert: if rates are based on currentRates.base
  let result;
  if (currentRates.base === fromCurrency) {
    result = amount * toRate;
  } else {
    // Cross-rate via base
    const amountInBase = amount / fromRate;
    result = amountInBase * toRate;
  }

  const formatted = result.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  resultEl.textContent = formatted + ' ' + toCurrency;

  // Rate detail
  const oneUnit = (toRate / fromRate).toFixed(4);
  if (detailEl) {
    detailEl.textContent = `1 ${fromCurrency} = ${oneUnit} ${toCurrency}`;
  }

  // Update base label in rate table header
  const baseLabel = document.getElementById('base-label');
  if (baseLabel) baseLabel.textContent = fromCurrency;
}

/* =========================================================
   SWAP CURRENCIES
   ========================================================= */

/**
 * swapCurrencies — Swaps the from/to dropdown values and re-converts.
 */
function swapCurrencies() {
  const fromEl = document.getElementById('fromCurrency');
  const toEl   = document.getElementById('toCurrency');
  if (!fromEl || !toEl) return;

  const temp = fromEl.value;
  fromEl.value = toEl.value;
  toEl.value   = temp;

  fetchRates(fromEl.value);
}

/**
 * quickSelect — Sets fromCurrency dropdown to given code and refetches.
 * @param {string} code - Currency code e.g. 'PKR'
 */
function quickSelect(code) {
  const fromEl = document.getElementById('fromCurrency');
  if (fromEl) fromEl.value = code;

  // Update active state on quick buttons
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.includes(code));
  });

  fetchRates(code);
}

/* =========================================================
   RENDER RATE TABLE
   ========================================================= */

/**
 * renderRateTable — Generates HTML table rows for major currencies.
 * Highlights the currently selected to-currency.
 * @param {object} rates - { CODE: rate, ... }
 * @param {string} base - Base currency code
 */
function renderRateTable(rates, base) {
  const tbody   = document.getElementById('rate-tbody');
  const toCurr  = document.getElementById('toCurrency')?.value;
  if (!tbody) return;

  const displayCurrencies = Object.keys(MAJOR_CURRENCIES);
  const rows = displayCurrencies
    .filter(code => code !== base && rates[code])
    .map(code => {
      const rate = rates[code];
      const name = MAJOR_CURRENCIES[code] || code;
      const isSelected = code === toCurr;
      const inverse = (1 / rate).toFixed(4);
      return `
        <tr style="${isSelected ? 'background:rgba(27,58,107,0.06);font-weight:600;' : ''}">
          <td style="text-align:left;">${name}</td>
          <td style="text-align:right;">${code}</td>
          <td style="text-align:right;">${rate.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:4})}</td>
          <td style="text-align:right;color:var(--text-muted);font-size:0.82rem;">1 ${code} = ${inverse} ${base}</td>
        </tr>
      `;
    });

  tbody.innerHTML = rows.join('') || '<tr><td colspan="4" style="text-align:center;padding:1rem;color:var(--text-muted);">No rate data available</td></tr>';
}

/* =========================================================
   UI HELPERS
   ========================================================= */

function showLoader(show) {
  const el = document.getElementById('loader-overlay');
  if (el) el.classList.toggle('hidden', !show);
}

function showWarning(timestamp) {
  const el   = document.getElementById('rate-warning');
  const date = document.getElementById('cache-date');
  if (el) el.classList.remove('hidden');
  if (date && timestamp) {
    date.textContent = new Date(timestamp).toLocaleString();
  } else if (date) {
    date.textContent = 'unknown date';
  }
}

function hideWarning() {
  const el = document.getElementById('rate-warning');
  if (el) el.classList.add('hidden');
}

function updateLastUpdated(timestamp) {
  const el = document.getElementById('last-updated');
  if (el) el.textContent = 'Last updated: ' + new Date(timestamp).toLocaleTimeString();
}

/* =========================================================
   EVENT LISTENERS
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  populateDropdowns();

  const amountEl   = document.getElementById('amount');
  const fromEl     = document.getElementById('fromCurrency');
  const toEl       = document.getElementById('toCurrency');

  // Auto-convert on amount change
  if (amountEl) amountEl.addEventListener('input', convertCurrency);

  // Re-fetch when from currency changes
  if (fromEl) fromEl.addEventListener('change', () => {
    fetchRates(fromEl.value);
    // Update quick buttons
    document.querySelectorAll('.quick-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.includes(fromEl.value));
    });
  });

  // Re-convert when to currency changes (no need to re-fetch, rates already loaded)
  if (toEl) toEl.addEventListener('change', () => {
    convertCurrency();
    renderRateTable(currentRates?.rates || {}, fromEl?.value || 'USD');
  });

  // Initial fetch
  fetchRates('USD');
});