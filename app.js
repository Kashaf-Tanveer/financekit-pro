// File: app.js — Shared utility functions for FinanceKit Pro
// Handles: theme toggle, number formatting, counter animation, toast notifications,
// mobile nav, and active nav link highlighting.

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
   INIT — Run all shared utilities on DOM ready
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initMobileNav();
  setActiveNav();

  // Attach theme toggle button click
  const toggleBtn = document.querySelector('.theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleTheme);
  }
});