# Update the app.js to add global currency selector support
cat > /home/claude/financekit/app.js << 'APPJS'
// File: app.js — Shared utility functions for FinanceKit Pro
// Handles: theme toggle, number formatting, counter animation, toast notifications,
// mobile nav, active nav, and GLOBAL CURRENCY SELECTOR (site-wide currency display)

'use strict';

/* =========================================================
   GLOBAL CURRENCY CONFIG
   User selects preferred currency on homepage — all pages reflect it
   ========================================================= */

/** Supported display currencies with symbols and conversion hints */
const DISPLAY_CURRENCIES = {
  PKR: { symbol: '₨', name: 'Pakistani Rupee', flag: '🇵🇰' },
  USD: { symbol: '$',  name: 'US Dollar',        flag: '🇺🇸' },
  EUR: { symbol: '€',  name: 'Euro',             flag: '🇪🇺' },
  GBP: { symbol: '£',  name: 'British Pound',    flag: '🇬🇧' },
  AED: { symbol: 'د.إ', name: 'UAE Dirham',       flag: '🇦🇪' },
  SAR: { symbol: '﷼',  name: 'Saudi Riyal',      flag: '🇸🇦' },
  CAD: { symbol: 'C$', name: 'Canadian Dollar',  flag: '🇨🇦' },
  AUD: { symbol: 'A$', name: 'Australian Dollar',flag: '🇦🇺' },
  INR: { symbol: '₹',  name: 'Indian Rupee',     flag: '🇮🇳' },
  JPY: { symbol: '¥',  name: 'Japanese Yen',     flag: '🇯🇵' },
};

/** Get currently selected display currency (default PKR) */
function getDisplayCurrency() {
  return localStorage.getItem('fkp-display-currency') || 'PKR';
}

/** Get symbol for currently selected currency */
function getCurrencySymbol() {
  const code = getDisplayCurrency();
  return DISPLAY_CURRENCIES[code]?.symbol || '₨';
}

/** Set display currency and refresh page displays */
function setDisplayCurrency(code) {
  if (!DISPLAY_CURRENCIES[code]) return;
  localStorage.setItem('fkp-display-currency', code);
  localStorage.setItem('fkp-display-rate-base', code);
  updateCurrencySelectorUI(code);
  // Trigger recalculation on pages that need it
  if (typeof calculateEMI === 'function')  calculateEMI();
  if (typeof calculateLoan === 'function') calculateLoan();
  if (typeof showToast === 'function') {
    const cur = DISPLAY_CURRENCIES[code];
    showToast(`${cur.flag} Displaying in ${cur.name} (${code})`, 'info');
  }
}

/** Render the currency selector dropdown in header */
function initCurrencySelector() {
  const sel = document.getElementById('global-currency-select');
  if (!sel) return;
  const current = getDisplayCurrency();
  Object.entries(DISPLAY_CURRENCIES).forEach(([code, info]) => {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = `${info.flag} ${code}`;
    if (code === current) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', () => setDisplayCurrency(sel.value));
}

/** Update all currency selector UIs to show current selection */
function updateCurrencySelectorUI(code) {
  document.querySelectorAll('#global-currency-select').forEach(el => {
    el.value = code;
  });
}

/* =========================================================
   THEME TOGGLE
   ========================================================= */

function initTheme() {
  const saved = localStorage.getItem('fkp-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateToggleIcon(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('fkp-theme', next);
  updateToggleIcon(next);
}

function updateToggleIcon(theme) {
  const knob = document.querySelector('.toggle-knob');
  if (knob) knob.textContent = theme === 'dark' ? '☾' : '☀';
}

/* =========================================================
   NUMBER FORMATTING
   ========================================================= */

/**
 * formatPKR — Pakistani/Indian comma format: 1,50,000
 */
function formatPKR(number) {
  if (isNaN(number) || number === null) return '0';
  const num = Math.round(number);
  const str = num.toString();
  if (str.length <= 3) return str;
  const lastThree = str.slice(-3);
  const rest = str.slice(0, -3);
  const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return formatted + ',' + lastThree;
}

/**
 * formatNum — Format with current display currency symbol
 */
function formatNum(number) {
  const code = getDisplayCurrency();
  const sym = getCurrencySymbol();
  if (isNaN(number)) return sym + '0';
  // PKR and INR use desi format, others use international
  if (code === 'PKR' || code === 'INR') {
    return sym + ' ' + formatPKR(Math.round(number));
  }
  return sym + ' ' + Math.round(number).toLocaleString('en-US');
}

function formatCurrency(number, symbol = '₨', decimals = 2) {
  if (isNaN(number)) return symbol + '0.00';
  return symbol + ' ' + number.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/* =========================================================
   ANIMATED COUNTER
   ========================================================= */

function animateCounter(element, targetValue, duration = 800, prefix = '', suffix = '', usePKR = true) {
  if (!element) return;
  const startTime = performance.now();

  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = targetValue * eased;
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
   ========================================================= */

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
   MOBILE NAV
   ========================================================= */

function initMobileNav() {
  const hamburger = document.querySelector('.hamburger');
  const mobileNav = document.querySelector('.mobile-nav');
  if (!hamburger || !mobileNav) return;

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    mobileNav.classList.toggle('open');
  });

  mobileNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileNav.classList.remove('open');
    });
  });

  document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !mobileNav.contains(e.target)) {
      hamburger.classList.remove('open');
      mobileNav.classList.remove('open');
    }
  });
}

/* =========================================================
   ACTIVE NAV
   ========================================================= */

function setActiveNav() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-nav a').forEach(link => {
    const linkPage = link.getAttribute('href');
    if (linkPage === currentPage || (currentPage === '' && linkPage === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

/* =========================================================
   INIT
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initMobileNav();
  setActiveNav();
  initCurrencySelector();

  const toggleBtn = document.querySelector('.theme-toggle');
  if (toggleBtn) toggleBtn.addEventListener('click', toggleTheme);
});
APPJS
echo "app.js updated"
