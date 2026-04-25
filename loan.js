// File: loan.js — Loan calculator logic for FinanceKit Pro
// Handles: EMI formula, result display, Chart.js pie chart, amortization table, FAQ accordion, slider sync

'use strict';

/* =========================================================
   CHART.JS GLOBAL DEFAULTS
   ========================================================= */
if (typeof Chart !== 'undefined') {
  Chart.defaults.font.family = 'Sora, sans-serif';
}

/* =========================================================
   STATE
   ========================================================= */

/** Stores all amortization rows (for "Show All" toggle) */
window.allRows = [];

/** Whether amortization table is fully expanded */
let amortExpanded = false;

/** Current tenure mode */
let tenureMode = 'months'; // 'months' | 'years'

/* =========================================================
   MAIN CALCULATION
   ========================================================= */

/**
 * calculateLoan — Reads input values and runs the full EMI calculation.
 * Formula: EMI = P × r × (1+r)^N / ((1+r)^N - 1)
 * If rate = 0: EMI = P / N (simple division)
 */
function calculateLoan() {
  const P = parseFloat(document.getElementById('loan-amount-input')?.value) || 0;
  const annualRate = parseFloat(document.getElementById('loan-rate-input')?.value) || 0;
  let N = parseInt(document.getElementById('loan-tenure-input')?.value) || 0;

  // Convert years to months if needed
  if (tenureMode === 'years') N = N * 12;

  if (P <= 0 || N <= 0) return;

  const r = annualRate / 12 / 100; // Monthly interest rate

  let EMI;
  if (r === 0) {
    EMI = P / N;
  } else {
    const factor = Math.pow(1 + r, N);
    EMI = (P * r * factor) / (factor - 1);
  }

  const totalPayment  = EMI * N;
  const totalInterest = totalPayment - P;

  displayResults(EMI, totalPayment, totalInterest, P);
  renderPieChart(P, totalInterest);
  renderAmortizationTable(P, r, N, EMI);
  updateTenureDisplay();
}

/* =========================================================
   DISPLAY RESULTS
   Uses animateCounter from app.js for smooth number counting
   ========================================================= */

/**
 * displayResults — Updates all result elements with animated values.
 * @param {number} emi - Monthly EMI amount
 * @param {number} total - Total amount payable
 * @param {number} interest - Total interest payable
 * @param {number} principal - Original principal
 */
function displayResults(emi, total, interest, principal) {
  const emiEl       = document.getElementById('loan-emi-display');
  const subEl       = document.getElementById('loan-emi-sub');
  const principalEl = document.getElementById('loan-principal-display');
  const interestEl  = document.getElementById('loan-interest-display');
  const totalEl     = document.getElementById('loan-total-display');
  const pctEl       = document.getElementById('loan-interest-pct');

  if (typeof animateCounter === 'function') {
    animateCounter(emiEl, emi, 800, '₨ ', '');
    animateCounter(principalEl, principal, 600, '₨ ', '');
    animateCounter(interestEl, interest, 700, '₨ ', '');
    animateCounter(totalEl, total, 800, '₨ ', '');
  } else {
    if (emiEl)       emiEl.textContent       = '₨ ' + formatPKR(Math.round(emi));
    if (principalEl) principalEl.textContent = '₨ ' + formatPKR(Math.round(principal));
    if (interestEl)  interestEl.textContent  = '₨ ' + formatPKR(Math.round(interest));
    if (totalEl)     totalEl.textContent     = '₨ ' + formatPKR(Math.round(total));
  }

  if (subEl) {
    const tenure = parseInt(document.getElementById('loan-tenure-input')?.value) || 0;
    const months = tenureMode === 'years' ? tenure * 12 : tenure;
    subEl.textContent = `for ${months} months`;
  }

  if (pctEl) {
    const pct = total > 0 ? ((interest / total) * 100).toFixed(1) : '0';
    pctEl.textContent = pct + '%';
  }
}

/* =========================================================
   PIE CHART
   Chart.js Doughnut — Principal vs Interest
   ========================================================= */

/**
 * renderPieChart — Creates or updates the doughnut chart.
 * Stores chart instance in window.loanChart to allow destroy/recreate.
 * @param {number} principal
 * @param {number} interest
 */
function renderPieChart(principal, interest) {
  const canvas = document.getElementById('loan-pie-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  // Destroy existing chart to avoid canvas reuse error
  if (window.loanChart) {
    window.loanChart.destroy();
    window.loanChart = null;
  }

  window.loanChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Principal', 'Interest'],
      datasets: [{
        data: [Math.round(principal), Math.round(interest)],
        backgroundColor: ['#1B3A6B', '#F4A732'],
        borderColor: ['#122950', '#E09520'],
        borderWidth: 2,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            font: { size: 13, family: 'Sora, sans-serif', weight: '600' },
            usePointStyle: true
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val = context.raw;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const pct = ((val / total) * 100).toFixed(1);
              const fmt = typeof formatPKR === 'function' ? formatPKR(val) : val.toLocaleString();
              return ` ₨ ${fmt} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

/* =========================================================
   AMORTIZATION TABLE
   ========================================================= */

/**
 * renderAmortizationTable — Generates full amortization schedule.
 * Shows first 24 rows; stores all in window.allRows for "Show All".
 * @param {number} P - Principal
 * @param {number} r - Monthly interest rate
 * @param {number} N - Number of months
 * @param {number} EMI - Monthly payment
 */
function renderAmortizationTable(P, r, N, EMI) {
  const section = document.getElementById('amort-section');
  const tbody   = document.getElementById('amort-tbody');
  if (!section || !tbody) return;

  section.style.display = 'block';
  window.allRows = [];
  let balance = P;

  for (let month = 1; month <= N; month++) {
    const interestPaid  = balance * r;
    const principalPaid = Math.min(EMI - interestPaid, balance);
    const closingBalance = Math.max(balance - principalPaid, 0);

    window.allRows.push({
      month,
      opening: balance,
      emi: EMI,
      principal: principalPaid,
      interest: interestPaid,
      closing: closingBalance
    });

    balance = closingBalance;
    if (balance < 0.01) break;
  }

  renderTableRows(false); // Show first 24
  amortExpanded = false;
  const btn = document.getElementById('amort-toggle-btn');
  if (btn) btn.textContent = window.allRows.length > 24 ? 'Show All Months' : '';
}

/**
 * renderTableRows — Renders either first 24 rows or all rows.
 * @param {boolean} showAll - Whether to show all rows
 */
function renderTableRows(showAll) {
  const tbody = document.getElementById('amort-tbody');
  if (!tbody) return;

  const rows = showAll ? window.allRows : window.allRows.slice(0, 24);
  const fmt  = n => typeof formatPKR === 'function' ? formatPKR(Math.round(n)) : Math.round(n).toLocaleString();

  tbody.innerHTML = rows.map(row => `
    <tr>
      <td>${row.month}</td>
      <td>₨ ${fmt(row.opening)}</td>
      <td>₨ ${fmt(row.emi)}</td>
      <td style="color:var(--success);">₨ ${fmt(row.principal)}</td>
      <td style="color:var(--danger);">₨ ${fmt(row.interest)}</td>
      <td>₨ ${fmt(row.closing)}</td>
    </tr>
  `).join('');
}

/**
 * toggleAmortizationTable — Shows/hides rows beyond 24.
 * Changes button text accordingly.
 */
function toggleAmortizationTable() {
  amortExpanded = !amortExpanded;
  renderTableRows(amortExpanded);

  const btn = document.getElementById('amort-toggle-btn');
  if (btn) btn.textContent = amortExpanded ? 'Show Less' : 'Show All Months';
}

/* =========================================================
   TENURE MODE TOGGLE
   ========================================================= */

/**
 * setTenureMode — Switches slider/input between months and years.
 * Recalculates loan after switching.
 * @param {string} mode - 'months' | 'years'
 */
function setTenureMode(mode) {
  tenureMode = mode;
  const slider = document.getElementById('loan-tenure-slider');
  const input  = document.getElementById('loan-tenure-input');
  const monthsBtn = document.getElementById('tenure-months-btn');
  const yearsBtn  = document.getElementById('tenure-years-btn');

  if (mode === 'months') {
    if (slider) { slider.max = 360; slider.step = 1; }
    if (input)  { input.max  = 360; input.min = 1; }
    if (monthsBtn) monthsBtn.classList.add('active');
    if (yearsBtn)  yearsBtn.classList.remove('active');
  } else {
    if (slider) { slider.max = 30; slider.step = 1; slider.value = Math.ceil((slider.value || 60) / 12); }
    if (input)  { input.max  = 30; input.value = Math.ceil((input.value || 60) / 12); }
    if (monthsBtn) monthsBtn.classList.remove('active');
    if (yearsBtn)  yearsBtn.classList.add('active');
  }
  updateTenureDisplay();
  calculateLoan();
}

/**
 * updateTenureDisplay — Shows helpful "= X Years" or "= X Months" text below slider.
 */
function updateTenureDisplay() {
  const display = document.getElementById('tenure-display');
  const val = parseInt(document.getElementById('loan-tenure-input')?.value) || 0;
  if (!display) return;

  if (tenureMode === 'months') {
    const years  = Math.floor(val / 12);
    const months = val % 12;
    let text = '= ';
    if (years > 0)  text += years + ' Year' + (years > 1 ? 's' : '');
    if (months > 0) text += (years > 0 ? ' ' : '') + months + ' Month' + (months > 1 ? 's' : '');
    display.textContent = text || '= 0 Months';
  } else {
    display.textContent = '= ' + (val * 12) + ' Months';
  }
}

/* =========================================================
   SLIDER ↔ INPUT SYNC
   ========================================================= */

/**
 * syncInputs — Keeps a slider and number input in sync.
 * When either changes, both update and loan is recalculated.
 * @param {string} sliderId
 * @param {string} inputId
 */
function syncInputs(sliderId, inputId) {
  const slider = document.getElementById(sliderId);
  const input  = document.getElementById(inputId);
  if (!slider || !input) return;

  slider.addEventListener('input', () => {
    input.value = slider.value;
    if (sliderId === 'loan-tenure-slider') updateTenureDisplay();
    calculateLoan();
  });

  input.addEventListener('input', () => {
    // Clamp to slider bounds
    let val = parseFloat(input.value) || 0;
    val = Math.max(parseFloat(slider.min), Math.min(parseFloat(slider.max), val));
    slider.value = val;
    if (sliderId === 'loan-tenure-slider') updateTenureDisplay();
    calculateLoan();
  });
}

/* =========================================================
   FAQ ACCORDION
   ========================================================= */

/**
 * toggleFAQ — Toggles the open state of an FAQ item.
 * CSS handles the height animation via max-height transition.
 * @param {HTMLElement} questionEl - The clicked .faq-question div
 */
function toggleFAQ(questionEl) {
  const item = questionEl.parentElement;
  const isOpen = item.classList.contains('open');

  // Close all others
  document.querySelectorAll('.faq-item.open').forEach(el => el.classList.remove('open'));

  // Toggle current
  if (!isOpen) item.classList.add('open');
}

/* =========================================================
   INIT
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  // Sync all slider pairs
  syncInputs('loan-amount-slider', 'loan-amount-input');
  syncInputs('loan-rate-slider',   'loan-rate-input');
  syncInputs('loan-tenure-slider', 'loan-tenure-input');

  // Initial calculation
  calculateLoan();
});