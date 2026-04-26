// File: app.js — Shared utility functions for FinanceKit Pro
// Handles: theme toggle, number formatting, counter animation, toast notifications,
// mobile nav, active nav link highlighting, and GLOBAL CURRENCY SELECTOR.

'use strict';

/* =========================================================
   THEME TOGGLE
   Reads preference from localStorage and applies data-theme
   ========================================================= */

/**
 * initTheme — Run on page load to apply saved theme preference.
 * Reads 'fkp-theme' from localStorage; defaults to 'light'.
 */
function initTheme() {
  const saved = localStorage.getItem('fkp-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateToggleIcon(saved);
}

/**
 * toggleTheme — Flips between light and dark mode.
 * Saves new preference to localStorage.
 */
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('fkp-theme', next);
  updateToggleIcon(next);
}

/**
 * updateToggleIcon — Updates the moon/sun icon inside the toggle knob.
 * @param {string} theme - 'light' or 'dark'
 */
function updateToggleIcon(theme) {
  const knob = document.querySelector('.toggle-knob');
  if (knob) knob.textContent = theme === 'dark' ? '☾' : '☀';
}

/* =========================================================
   NUMBER FORMATTING
   ========================================================= */

/**
 * formatPKR — Formats a number using Pakistani/Indian comma style.
 * Example: 150000 → "1,50,000"
 * @param {number} number - The number to format
 * @returns {string} Formatted string
 */
function formatPKR(number) {
  if (isNaN(number) || number === null) return '0';
  const num = Math.round(number);
  const str = num.toString();
  if (str.length <= 3) return str;
  // Last 3 digits, then groups of 2
  const lastThree = str.slice(-3);
  const rest = str.slice(0, -3);
  const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return formatted + ',' + lastThree;
}

/**
 * formatCurrency — Formats a number with a currency symbol.
 * @param {number} number - The amount
 * @param {string} symbol - Currency symbol e.g. '₨', '$', '€'
 * @param {number} decimals - Decimal places (default 2)
 * @returns {string} Formatted currency string
 */
function formatCurrency(number, symbol = '₨', decimals = 2) {
  if (isNaN(number)) return symbol + '0.00';
  return symbol + ' ' + number.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * formatMoney — Formats a number with the ACTIVE currency symbol.
 * Uses South Asian style (1,23,456) for PKR/INR/NPR/LKR/BDT.
 * Uses international style (1,234,567) for all other currencies.
 * This is the PRIMARY formatting function — use this on all pages.
 * @param {number} amount
 * @param {string|null} overrideCode - Force a specific currency code
 * @returns {string} e.g. "$ 1,234" or "₨ 1,23,456"
 */
function formatMoney(amount, overrideCode = null) {
  const cur = overrideCode
    ? { code: overrideCode, ...CURRENCY_DB[overrideCode] }
    : getActiveCurrency();
  if (!cur || isNaN(amount)) return (cur?.symbol || '$') + ' 0';
  const rounded = Math.round(amount);
  const southAsian = ['PKR', 'INR', 'NPR', 'LKR', 'BDT'].includes(cur.code);
  const formatted = southAsian
    ? formatPKR(rounded)
    : rounded.toLocaleString('en-US');
  return cur.symbol + ' ' + formatted;
}

/* =========================================================
   ANIMATED COUNTER
   Smoothly counts from 0 to target value
   ========================================================= */

/**
 * animateCounter — Animates a DOM element's text from 0 to targetValue.
 * @param {HTMLElement} element - The element to update
 * @param {number} targetValue - Final value to count to
 * @param {number} duration - Animation duration in ms (default 800)
 * @param {string} prefix - Text before number e.g. '₨ '
 * @param {string} suffix - Text after number e.g. '/mo'
 * @param {boolean} usePKR - Use Pakistani comma formatting
 */
function animateCounter(element, targetValue, duration = 800, prefix = '', suffix = '', usePKR = true) {
  if (!element) return;
  const startTime = performance.now();
  const startValue = 0;

  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = startValue + (targetValue - startValue) * eased;

    const formatted = usePKR ? formatPKR(Math.round(current)) : Math.round(current).toLocaleString();
    element.textContent = prefix + formatted + suffix;

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      const finalFormatted = usePKR ? formatPKR(Math.round(targetValue)) : Math.round(targetValue).toLocaleString();
      element.textContent = prefix + finalFormatted + suffix;
    }
  }

  requestAnimationFrame(step);
}

/* =========================================================
   TOAST NOTIFICATIONS
   Shows a bottom-right popup for 3 seconds
   ========================================================= */

/**
 * showToast — Displays a toast notification message.
 * @param {string} message - Text to display
 * @param {string} type - 'success' | 'error' | 'info'
 * @param {number} duration - How long to show in ms (default 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(110%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* =========================================================
   MOBILE NAV HAMBURGER
   Toggles mobile nav open/close
   ========================================================= */

/**
 * initMobileNav — Attaches click listener to hamburger button.
 * Toggles .open class on both hamburger and mobile-nav elements.
 */
function initMobileNav() {
  const hamburger = document.querySelector('.hamburger');
  const mobileNav = document.querySelector('.mobile-nav');
  if (!hamburger || !mobileNav) return;

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    mobileNav.classList.toggle('open');
  });

  // Close nav when any link is clicked
  mobileNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileNav.classList.remove('open');
    });
  });

  // Close nav when clicking outside
  document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !mobileNav.contains(e.target)) {
      hamburger.classList.remove('open');
      mobileNav.classList.remove('open');
    }
  });
}

/* =========================================================
   ACTIVE NAV LINK
   Highlights the current page link in header nav
   ========================================================= */

/**
 * setActiveNav — Adds .active class to the nav link matching current page.
 * Compares href against window.location.pathname.
 */
function setActiveNav() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const allNavLinks = document.querySelectorAll('.nav-links a, .mobile-nav a');

  allNavLinks.forEach(link => {
    const linkPage = link.getAttribute('href');
    if (linkPage === currentPage || (currentPage === '' && linkPage === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

/* =========================================================
   GLOBAL CURRENCY SYSTEM
   User selects preferred currency from header dropdown.
   All pages (EMI, Loan, Calculator) listen to 'fkp:currencyChanged'
   and instantly re-render their numbers with the new symbol.
   Currency choice is saved to localStorage — persists across pages.
   ========================================================= */

/**
 * CURRENCY_DB — 170 currencies with name, symbol, flag emoji.
 */
const CURRENCY_DB = {
  USD:{name:'US Dollar',symbol:'$',flag:'🇺🇸'},
  EUR:{name:'Euro',symbol:'€',flag:'🇪🇺'},
  GBP:{name:'British Pound',symbol:'£',flag:'🇬🇧'},
  PKR:{name:'Pakistani Rupee',symbol:'₨',flag:'🇵🇰'},
  INR:{name:'Indian Rupee',symbol:'₹',flag:'🇮🇳'},
  AED:{name:'UAE Dirham',symbol:'د.إ',flag:'🇦🇪'},
  SAR:{name:'Saudi Riyal',symbol:'﷼',flag:'🇸🇦'},
  CAD:{name:'Canadian Dollar',symbol:'CA$',flag:'🇨🇦'},
  AUD:{name:'Australian Dollar',symbol:'A$',flag:'🇦🇺'},
  JPY:{name:'Japanese Yen',symbol:'¥',flag:'🇯🇵'},
  CHF:{name:'Swiss Franc',symbol:'Fr',flag:'🇨🇭'},
  CNY:{name:'Chinese Yuan',symbol:'¥',flag:'🇨🇳'},
  MYR:{name:'Malaysian Ringgit',symbol:'RM',flag:'🇲🇾'},
  SGD:{name:'Singapore Dollar',symbol:'S$',flag:'🇸🇬'},
  KWD:{name:'Kuwaiti Dinar',symbol:'KD',flag:'🇰🇼'},
  QAR:{name:'Qatari Riyal',symbol:'QR',flag:'🇶🇦'},
  OMR:{name:'Omani Rial',symbol:'OMR',flag:'🇴🇲'},
  BHD:{name:'Bahraini Dinar',symbol:'BD',flag:'🇧🇭'},
  TRY:{name:'Turkish Lira',symbol:'₺',flag:'🇹🇷'},
  NZD:{name:'New Zealand Dollar',symbol:'NZ$',flag:'🇳🇿'},
  HKD:{name:'Hong Kong Dollar',symbol:'HK$',flag:'🇭🇰'},
  KRW:{name:'South Korean Won',symbol:'₩',flag:'🇰🇷'},
  SEK:{name:'Swedish Krona',symbol:'kr',flag:'🇸🇪'},
  NOK:{name:'Norwegian Krone',symbol:'kr',flag:'🇳🇴'},
  DKK:{name:'Danish Krone',symbol:'kr',flag:'🇩🇰'},
  MXN:{name:'Mexican Peso',symbol:'$',flag:'🇲🇽'},
  BRL:{name:'Brazilian Real',symbol:'R$',flag:'🇧🇷'},
  ZAR:{name:'South African Rand',symbol:'R',flag:'🇿🇦'},
  RUB:{name:'Russian Ruble',symbol:'₽',flag:'🇷🇺'},
  THB:{name:'Thai Baht',symbol:'฿',flag:'🇹🇭'},
  IDR:{name:'Indonesian Rupiah',symbol:'Rp',flag:'🇮🇩'},
  PHP:{name:'Philippine Peso',symbol:'₱',flag:'🇵🇭'},
  VND:{name:'Vietnamese Đồng',symbol:'₫',flag:'🇻🇳'},
  EGP:{name:'Egyptian Pound',symbol:'E£',flag:'🇪🇬'},
  NGN:{name:'Nigerian Naira',symbol:'₦',flag:'🇳🇬'},
  KES:{name:'Kenyan Shilling',symbol:'KSh',flag:'🇰🇪'},
  GHS:{name:'Ghanaian Cedi',symbol:'₵',flag:'🇬🇭'},
  TZS:{name:'Tanzanian Shilling',symbol:'TSh',flag:'🇹🇿'},
  UGX:{name:'Ugandan Shilling',symbol:'USh',flag:'🇺🇬'},
  MAD:{name:'Moroccan Dirham',symbol:'MAD',flag:'🇲🇦'},
  DZD:{name:'Algerian Dinar',symbol:'DA',flag:'🇩🇿'},
  TND:{name:'Tunisian Dinar',symbol:'DT',flag:'🇹🇳'},
  LYD:{name:'Libyan Dinar',symbol:'LD',flag:'🇱🇾'},
  ETB:{name:'Ethiopian Birr',symbol:'Br',flag:'🇪🇹'},
  PLN:{name:'Polish Złoty',symbol:'zł',flag:'🇵🇱'},
  CZK:{name:'Czech Koruna',symbol:'Kč',flag:'🇨🇿'},
  HUF:{name:'Hungarian Forint',symbol:'Ft',flag:'🇭🇺'},
  RON:{name:'Romanian Leu',symbol:'lei',flag:'🇷🇴'},
  BGN:{name:'Bulgarian Lev',symbol:'лв',flag:'🇧🇬'},
  HRK:{name:'Croatian Kuna',symbol:'kn',flag:'🇭🇷'},
  RSD:{name:'Serbian Dinar',symbol:'din',flag:'🇷🇸'},
  UAH:{name:'Ukrainian Hryvnia',symbol:'₴',flag:'🇺🇦'},
  ISK:{name:'Icelandic Króna',symbol:'kr',flag:'🇮🇸'},
  ILS:{name:'Israeli Shekel',symbol:'₪',flag:'🇮🇱'},
  JOD:{name:'Jordanian Dinar',symbol:'JD',flag:'🇯🇴'},
  IQD:{name:'Iraqi Dinar',symbol:'IQD',flag:'🇮🇶'},
  LBP:{name:'Lebanese Pound',symbol:'L£',flag:'🇱🇧'},
  AFN:{name:'Afghan Afghani',symbol:'؋',flag:'🇦🇫'},
  BDT:{name:'Bangladeshi Taka',symbol:'৳',flag:'🇧🇩'},
  LKR:{name:'Sri Lankan Rupee',symbol:'₨',flag:'🇱🇰'},
  NPR:{name:'Nepalese Rupee',symbol:'₨',flag:'🇳🇵'},
  MMK:{name:'Myanmar Kyat',symbol:'K',flag:'🇲🇲'},
  KHR:{name:'Cambodian Riel',symbol:'៛',flag:'🇰🇭'},
  MNT:{name:'Mongolian Tögrög',symbol:'₮',flag:'🇲🇳'},
  TWD:{name:'New Taiwan Dollar',symbol:'NT$',flag:'🇹🇼'},
  MVR:{name:'Maldivian Rufiyaa',symbol:'Rf',flag:'🇲🇻'},
  MUR:{name:'Mauritian Rupee',symbol:'₨',flag:'🇲🇺'},
  ZMW:{name:'Zambian Kwacha',symbol:'ZK',flag:'🇿🇲'},
  BWP:{name:'Botswanan Pula',symbol:'P',flag:'🇧🇼'},
  NAD:{name:'Namibian Dollar',symbol:'N$',flag:'🇳🇦'},
  MWK:{name:'Malawian Kwacha',symbol:'MK',flag:'🇲🇼'},
  MZN:{name:'Mozambican Metical',symbol:'MT',flag:'🇲🇿'},
  AOA:{name:'Angolan Kwanza',symbol:'Kz',flag:'🇦🇴'},
  RWF:{name:'Rwandan Franc',symbol:'RF',flag:'🇷🇼'},
  GEL:{name:'Georgian Lari',symbol:'₾',flag:'🇬🇪'},
  AZN:{name:'Azerbaijani Manat',symbol:'₼',flag:'🇦🇿'},
  AMD:{name:'Armenian Dram',symbol:'֏',flag:'🇦🇲'},
  KZT:{name:'Kazakhstani Tenge',symbol:'₸',flag:'🇰🇿'},
  UZS:{name:'Uzbekistani Som',symbol:"so'm",flag:'🇺🇿'},
  TJS:{name:'Tajikistani Somoni',symbol:'SM',flag:'🇹🇯'},
  TMT:{name:'Turkmenistani Manat',symbol:'T',flag:'🇹🇲'},
  KGS:{name:'Kyrgyzstani Som',symbol:'с',flag:'🇰🇬'},
  BYN:{name:'Belarusian Ruble',symbol:'Br',flag:'🇧🇾'},
  MDL:{name:'Moldovan Leu',symbol:'L',flag:'🇲🇩'},
  ALL:{name:'Albanian Lek',symbol:'L',flag:'🇦🇱'},
  MKD:{name:'Macedonian Denar',symbol:'ден',flag:'🇲🇰'},
  BAM:{name:'Bosnia-Herzegovina Mark',symbol:'KM',flag:'🇧🇦'},
  ARS:{name:'Argentine Peso',symbol:'$',flag:'🇦🇷'},
  CLP:{name:'Chilean Peso',symbol:'$',flag:'🇨🇱'},
  COP:{name:'Colombian Peso',symbol:'$',flag:'🇨🇴'},
  PEN:{name:'Peruvian Sol',symbol:'S/',flag:'🇵🇪'},
  UYU:{name:'Uruguayan Peso',symbol:'$U',flag:'🇺🇾'},
  BOB:{name:'Bolivian Boliviano',symbol:'Bs.',flag:'🇧🇴'},
  PYG:{name:'Paraguayan Guaraní',symbol:'₲',flag:'🇵🇾'},
  GYD:{name:'Guyanese Dollar',symbol:'G$',flag:'🇬🇾'},
  SRD:{name:'Surinamese Dollar',symbol:'$',flag:'🇸🇷'},
  TTD:{name:'Trinidad & Tobago Dollar',symbol:'TT$',flag:'🇹🇹'},
  JMD:{name:'Jamaican Dollar',symbol:'J$',flag:'🇯🇲'},
  BBD:{name:'Barbadian Dollar',symbol:'Bds$',flag:'🇧🇧'},
  BSD:{name:'Bahamian Dollar',symbol:'B$',flag:'🇧🇸'},
  BZD:{name:'Belize Dollar',symbol:'BZ$',flag:'🇧🇿'},
  GTQ:{name:'Guatemalan Quetzal',symbol:'Q',flag:'🇬🇹'},
  HNL:{name:'Honduran Lempira',symbol:'L',flag:'🇭🇳'},
  NIO:{name:'Nicaraguan Córdoba',symbol:'C$',flag:'🇳🇮'},
  CRC:{name:'Costa Rican Colón',symbol:'₡',flag:'🇨🇷'},
  DOP:{name:'Dominican Peso',symbol:'RD$',flag:'🇩🇴'},
  CUP:{name:'Cuban Peso',symbol:'$',flag:'🇨🇺'},
  HTG:{name:'Haitian Gourde',symbol:'G',flag:'🇭🇹'},
  PGK:{name:'Papua New Guinean Kina',symbol:'K',flag:'🇵🇬'},
  FJD:{name:'Fijian Dollar',symbol:'FJ$',flag:'🇫🇯'},
  SBD:{name:'Solomon Islands Dollar',symbol:'SI$',flag:'🇸🇧'},
  VUV:{name:'Vanuatu Vatu',symbol:'VT',flag:'🇻🇺'},
  WST:{name:'Samoan Tālā',symbol:'T',flag:'🇼🇸'},
  TOP:{name:"Tongan Pa'anga",symbol:'T$',flag:'🇹🇴'},
  IRR:{name:'Iranian Rial',symbol:'﷼',flag:'🇮🇷'},
  YER:{name:'Yemeni Rial',symbol:'﷼',flag:'🇾🇪'},
  SYP:{name:'Syrian Pound',symbol:'S£',flag:'🇸🇾'},
  FKP:{name:'Falkland Islands Pound',symbol:'£',flag:'🇫🇰'},
  GIP:{name:'Gibraltar Pound',symbol:'£',flag:'🇬🇮'},
  SHP:{name:'Saint Helena Pound',symbol:'£',flag:'🇸🇭'},
  IMP:{name:'Isle of Man Pound',symbol:'£',flag:'🇮🇲'},
  BMD:{name:'Bermudian Dollar',symbol:'BD$',flag:'🇧🇲'},
  KYD:{name:'Cayman Islands Dollar',symbol:'CI$',flag:'🇰🇾'},
  XAF:{name:'Central African CFA Franc',symbol:'FCFA',flag:'🌍'},
  XOF:{name:'West African CFA Franc',symbol:'CFA',flag:'🌍'},
  XCD:{name:'East Caribbean Dollar',symbol:'EC$',flag:'🌎'},
  XPF:{name:'CFP Franc',symbol:'Fr',flag:'🌏'},
  MGA:{name:'Malagasy Ariary',symbol:'Ar',flag:'🇲🇬'},
  MRU:{name:'Mauritanian Ouguiya',symbol:'UM',flag:'🇲🇷'},
  KMF:{name:'Comorian Franc',symbol:'CF',flag:'🇰🇲'},
  SSP:{name:'South Sudanese Pound',symbol:'SS£',flag:'🇸🇸'},
  SDG:{name:'Sudanese Pound',symbol:'SD',flag:'🇸🇩'},
  CVE:{name:'Cape Verdean Escudo',symbol:'$',flag:'🇨🇻'},
  STN:{name:'São Tomé Dobra',symbol:'Db',flag:'🇸🇹'},
  AWG:{name:'Aruban Florin',symbol:'Afl',flag:'🇦🇼'},
  ANG:{name:'Netherlands Antillean Guilder',symbol:'NAf',flag:'🇨🇼'},
  BTN:{name:'Bhutanese Ngultrum',symbol:'Nu',flag:'🇧🇹'},
  BND:{name:'Brunei Dollar',symbol:'B$',flag:'🇧🇳'},
  LAK:{name:'Laotian Kip',symbol:'₭',flag:'🇱🇦'},
  MOP:{name:'Macanese Pataca',symbol:'P',flag:'🇲🇴'},
  SCR:{name:'Seychellois Rupee',symbol:'₨',flag:'🇸🇨'},
  ZWL:{name:'Zimbabwean Dollar',symbol:'Z$',flag:'🇿🇼'},
  SZL:{name:'Swazi Lilangeni',symbol:'L',flag:'🇸🇿'},
  LSL:{name:'Lesotho Loti',symbol:'L',flag:'🇱🇸'},
  ERN:{name:'Eritrean Nakfa',symbol:'Nkf',flag:'🇪🇷'},
  GMD:{name:'Gambian Dalasi',symbol:'D',flag:'🇬🇲'},
  GNF:{name:'Guinean Franc',symbol:'Fr',flag:'🇬🇳'},
  SLL:{name:'Sierra Leonean Leone',symbol:'Le',flag:'🇸🇱'},
  LRD:{name:'Liberian Dollar',symbol:'L$',flag:'🇱🇷'},
  BIF:{name:'Burundian Franc',symbol:'Fr',flag:'🇧🇮'},
  DJF:{name:'Djiboutian Franc',symbol:'Fr',flag:'🇩🇯'},
  SOS:{name:'Somali Shilling',symbol:'Sh',flag:'🇸🇴'},
  CDF:{name:'Congolese Franc',symbol:'FC',flag:'🇨🇩'},
};

/** Popular currencies — shown first in selector dropdown */
const POPULAR_CURRENCIES = [
  'USD','EUR','GBP','PKR','INR','AED','SAR','CAD','AUD','JPY',
  'CHF','CNY','MYR','SGD','KWD','QAR','BHD','OMR','TRY','NZD',
  'HKD','KRW','SEK','NOK','DKK','MXN','BRL','ZAR','THB','IDR'
];

/**
 * getActiveCurrency — Returns current currency object from localStorage.
 * Defaults to PKR if nothing saved.
 * @returns {{ code, name, symbol, flag }}
 */
function getActiveCurrency() {
  try {
    const saved = localStorage.getItem('fkp-currency');
    if (saved && CURRENCY_DB[saved]) return { code: saved, ...CURRENCY_DB[saved] };
  } catch(e) {}
  return { code: 'PKR', ...CURRENCY_DB['PKR'] };
}

/**
 * getCurrencySymbol — Returns just the symbol for the active currency.
 * Used by EMI/Loan/Calculator pages to prefix numbers.
 * @returns {string} e.g. '$', '₨', '€'
 */
function getCurrencySymbol() {
  return getActiveCurrency().symbol;
}

/**
 * getCurrencyCode — Returns the active currency ISO code.
 * @returns {string} e.g. 'PKR'
 */
function getCurrencyCode() {
  return getActiveCurrency().code;
}

/**
 * setActiveCurrency — Saves chosen currency and fires 'fkp:currencyChanged'.
 * Every page listens for this event and re-renders its numbers instantly.
 * @param {string} code - ISO 4217 currency code
 */
function setActiveCurrency(code) {
  if (!CURRENCY_DB[code]) return;
  try { localStorage.setItem('fkp-currency', code); } catch(e) {}
  document.dispatchEvent(new CustomEvent('fkp:currencyChanged', {
    detail: { code, ...CURRENCY_DB[code] }
  }));
}

/* ─── Currency Selector Dropdown ─────────────────────────── */

/**
 * renderCurrencyList — Fills the dropdown list filtered by a search query.
 * Shows "Popular" section first, then "All currencies" alphabetically.
 * @param {string} query - Search string (code, name, or symbol)
 */
function renderCurrencyList(query) {
  const list = document.getElementById('fkp-cur-list');
  if (!list) return;

  const active = getActiveCurrency();
  const q = query.toLowerCase().trim();

  // Popular first, then alphabetical — deduplicated
  const allCodes = [
    ...POPULAR_CURRENCIES,
    ...Object.keys(CURRENCY_DB).filter(c => !POPULAR_CURRENCIES.includes(c)).sort()
  ];
  const uniqueCodes = [...new Set(allCodes)].filter(c => CURRENCY_DB[c]);

  const filtered = uniqueCodes.filter(code => {
    if (!q) return true;
    const c = CURRENCY_DB[code];
    return code.toLowerCase().includes(q) ||
           c.name.toLowerCase().includes(q) ||
           c.symbol.toLowerCase().includes(q);
  });

  if (!filtered.length) {
    list.innerHTML = '<div style="padding:1rem;text-align:center;color:var(--text-muted);font-size:.85rem;">No results found</div>';
    return;
  }

  let html = '';
  let didPopDivider = false;
  let didAllDivider = false;

  filtered.forEach(code => {
    const c = CURRENCY_DB[code];
    const isPopular = POPULAR_CURRENCIES.includes(code);
    const isActive  = code === active.code;

    if (!q) {
      if (isPopular && !didPopDivider) {
        html += `<div class="fkp-cur-divider">⭐ Popular</div>`;
        didPopDivider = true;
      }
      if (!isPopular && !didAllDivider) {
        html += `<div class="fkp-cur-divider">All currencies</div>`;
        didAllDivider = true;
      }
    }

    html += `
      <button class="fkp-cur-item${isActive ? ' active' : ''}"
              onclick="fkpSelectCurrency('${code}')" title="${c.name}">
        <span class="fkp-cur-flag">${c.flag}</span>
        <span class="fkp-cur-info">
          <span class="fkp-cur-code">${code}</span>
          <span class="fkp-cur-name">${c.name}</span>
        </span>
        <span class="fkp-cur-sym">${c.symbol}</span>
        ${isActive ? '<span class="fkp-cur-check">✓</span>' : ''}
      </button>`;
  });

  list.innerHTML = html;
}

/**
 * fkpSelectCurrency — Called when user clicks a currency item.
 * Updates the header button display, closes dropdown, fires event.
 * @param {string} code
 */
function fkpSelectCurrency(code) {
  setActiveCurrency(code);
  const c = CURRENCY_DB[code];

  // Update button display
  const flagEl = document.getElementById('fkp-cur-flag');
  const codeEl = document.getElementById('fkp-cur-code-btn');
  if (flagEl) flagEl.textContent = c.flag;
  if (codeEl) codeEl.textContent = code;

  // Close dropdown
  const dropdown = document.getElementById('fkp-cur-dropdown');
  const wrap     = document.getElementById('fkp-cur-wrap');
  if (dropdown) dropdown.classList.remove('open');
  if (wrap) wrap.classList.remove('open');

  showToast(`${c.flag} ${c.name} selected`, 'success', 2000);
}

/**
 * mountCurrencySelector — Builds and injects the currency picker widget
 * into any element with id="fkp-cur-mount" in the page header.
 * Called once automatically on DOMContentLoaded.
 */
function mountCurrencySelector() {
  const mount = document.getElementById('fkp-cur-mount');
  if (!mount) return;

  const cur = getActiveCurrency();

  mount.innerHTML = `
    <div class="fkp-cur-wrap" id="fkp-cur-wrap">
      <button class="fkp-cur-btn" id="fkp-cur-btn"
              aria-label="Select currency" title="Change display currency">
        <span class="fkp-cur-flag" id="fkp-cur-flag">${cur.flag}</span>
        <span class="fkp-cur-code-btn" id="fkp-cur-code-btn">${cur.code}</span>
        <svg class="fkp-cur-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div class="fkp-cur-dropdown" id="fkp-cur-dropdown">
        <div class="fkp-cur-search-wrap">
          <span class="fkp-cur-search-icon">🔍</span>
          <input type="text" class="fkp-cur-search" id="fkp-cur-search"
                 placeholder="Search currency or country..."
                 autocomplete="off" spellcheck="false">
        </div>
        <div class="fkp-cur-list" id="fkp-cur-list"></div>
      </div>
    </div>`;

  // Wire up toggle button
  const btn      = document.getElementById('fkp-cur-btn');
  const dropdown = document.getElementById('fkp-cur-dropdown');
  const wrap     = document.getElementById('fkp-cur-wrap');
  const search   = document.getElementById('fkp-cur-search');

  btn.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = dropdown.classList.contains('open');
    dropdown.classList.toggle('open', !isOpen);
    wrap.classList.toggle('open', !isOpen);
    if (!isOpen) {
      renderCurrencyList('');
      setTimeout(() => { if (search) search.focus(); }, 60);
    }
  });

  // Live search filter
  search.addEventListener('input', () => renderCurrencyList(search.value));
  search.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      dropdown.classList.remove('open');
      wrap.classList.remove('open');
    }
  });

  // Close when clicking outside
  document.addEventListener('click', e => {
    const w = document.getElementById('fkp-cur-wrap');
    if (w && !w.contains(e.target)) {
      const dd = document.getElementById('fkp-cur-dropdown');
      if (dd) dd.classList.remove('open');
      w.classList.remove('open');
    }
  });
}

/* =========================================================
   INIT — Run all shared utilities on DOM ready
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initMobileNav();
  setActiveNav();
  mountCurrencySelector();

  // Attach theme toggle button click
  const toggleBtn = document.querySelector('.theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleTheme);
  }
});
