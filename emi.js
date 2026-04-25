// File: emi.js — EMI Calculator logic for FinanceKit Pro (MOST IMPORTANT PAGE)
// Handles: loan type presets, EMI formula, pie chart, year-wise bar chart,
// amortization table, extra payment calculator, tab switcher, FAQ accordion

'use strict';

/* =========================================================
   CHART.JS GLOBAL DEFAULTS
   ========================================================= */
if (typeof Chart !== 'undefined') {
  Chart.defaults.font.family = 'Sora, sans-serif';
}

/* =========================================================
   LOAN PRESETS
   Pre-filled default values for each loan type tab
   ========================================================= */
const LOAN_PRESETS = {
  home:      { principal: 5000000,  rate: 8.5,  tenure: 20,  mode: 'years',  title: 'Home Loan Details' },
  car:       { principal: 1500000,  rate: 10.5, tenure: 5,   mode: 'years',  title: 'Car Loan Details' },
  personal:  { principal: 500000,   rate: 14.0, tenure: 36,  mode: 'months', title: 'Personal Loan Details' },
  education: { principal: 800000,   rate: 9.0,  tenure: 84,  mode: 'months', title: 'Education Loan Details' }
};

/* =========================================================
   STATE
   ========================================================= */
let currentTab      = 'home';
let emiTenureMode   = 'years';   // 'months' | 'years'
let emiAllRows      = [];         // Full amortization data
let emiExpanded     = false;      // Whether table is fully shown
let lastEMI         = 0;
let lastMonths      = 0;
let lastRate        = 0;
let lastPrincipal   = 0;

/* =========================================================
   TAB SWITCHER
   ========================================================= */

/**
 * switchTab — Activates a loan type tab and applies preset values.
 * @param {string} type - 'home' | 'car' | 'personal' | 'education'
 */
function switchTab(type) {
  currentTab = type;

  // Update tab button states
  ['home','car','personal','education'].forEach(t => {
    const btn = document.getElementById('tab-' + t);
    if (btn) {
      btn.classList.toggle('active', t === type);
      btn.setAttribute('aria-selected', t === type ? 'true' : 'false');
    }
  });

  applyPreset(type);
}

/**
 * applyPreset — Fills input fields with LOAN_PRESETS values for given type.
 * @param {string} type - Loan type key
 */
function applyPreset(type) {
  const preset = LOAN_PRESETS[type];
  if (!preset) return;

  // Set tenure mode first (affects slider range)
  setEMITenureMode(preset.mode);

  // Set principal
  const amountSlider = document.getElementById('emi-amount-slider');
  const amountInput  = document.getElementById('emi-amount-input');
  if (amountSlider) amountSlider.value = preset.principal;
  if (amountInput)  amountInput.value  = preset.principal;
  updateAmountDisplay();

  // Set rate
  const rateSlider = document.getElementById('emi-rate-slider');
  const rateInput  = document.getElementById('emi-rate-input');
  if (rateSlider) rateSlider.value = preset.rate;
  if (rateInput)  rateInput.value  = preset.rate;

  // Set tenure
  const tenureSlider = document.getElementById('emi-tenure-slider');
  const tenureInput  = document.getElementById('emi-tenure-input');
  if (tenureSlider) tenureSlider.value = preset.tenure;
  if (tenureInput)  tenureInput.value  = preset.tenure;

  // Update section title
  const title = document.getElementById('emi-input-title');
  if (title) title.textContent = preset.title;

  updateEMITenureDisplay();
  calculateEMI();
}

/* =========================================================
   TENURE MODE TOGGLE
   ========================================================= */

/**
 * setEMITenureMode — Switches slider between months and years.
 * @param {string} mode - 'months' | 'years'
 */
function setEMITenureMode(mode) {
  emiTenureMode = mode;
  const slider = document.getElementById('emi-tenure-slider');
  const input  = document.getElementById('emi-tenure-input');
  const monthsBtn = document.getElementById('emi-tenure-months-btn');
  const yearsBtn  = document.getElementById('emi-tenure-years-btn');

  if (mode === 'months') {
    if (slider) { slider.max = 360; slider.min = 1; slider.step = 1; }
    if (input)  { input.max  = 360; input.min = 1; }
    if (monthsBtn) monthsBtn.classList.add('active');
    if (yearsBtn)  yearsBtn.classList.remove('active');
  } else {
    if (slider) { slider.max = 30; slider.min = 1; slider.step = 1; }
    if (input)  { input.max  = 30; input.min = 1; }
    if (monthsBtn) monthsBtn.classList.remove('active');
    if (yearsBtn)  yearsBtn.classList.add('active');
  }
  updateEMITenureDisplay();
}

/**
 * updateEMITenureDisplay — Shows the equivalent tenure in the other unit.
 */
function updateEMITenureDisplay() {
  const display = document.getElementById('emi-tenure-display');
  const val = parseInt(document.getElementById('emi-tenure-input')?.value) || 0;
  if (!display) return;

  if (emiTenureMode === 'years') {
    display.textContent = '= ' + (val * 12) + ' Months';
  } else {
    const years  = Math.floor(val / 12);
    const months = val % 12;
    let text = '= ';
    if (years > 0)  text += years + ' Year' + (years > 1 ? 's' : '');
    if (months > 0) text += (years > 0 ? ' ' : '') + months + ' Month' + (months > 1 ? 's' : '');
    display.textContent = text || '= 0 Months';
  }
}

/**
 * updateAmountDisplay — Shows formatted principal amount below the slider.
 */
function updateAmountDisplay() {
  const display = document.getElementById('emi-amount-display');
  const val = parseFloat(document.getElementById('emi-amount-input')?.value) || 0;
  if (display && typeof formatPKR === 'function') {
    display.textContent = '₨ ' + formatPKR(val);
  }
}

/* =========================================================
   MAIN EMI CALCULATION
   ========================================================= */

/**
 * calculateEMI — Reads inputs, computes EMI, and updates all UI sections.
 * Formula: EMI = P × r × (1+r)^N / ((1+r)^N - 1)
 */
function calculateEMI() {
  const P = parseFloat(document.getElementById('emi-amount-input')?.value) || 0;
  const annualRate = parseFloat(document.getElementById('emi-rate-input')?.value) || 0;
  let tenureVal = parseInt(document.getElementById('emi-tenure-input')?.value) || 0;
  const N = emiTenureMode === 'years' ? tenureVal * 12 : tenureVal;

  if (P <= 0 || N <= 0) return;

  const r = annualRate / 12 / 100;

  let EMI;
  if (r === 0) {
    EMI = P / N;
  } else {
    const factor = Math.pow(1 + r, N);
    EMI = (P * r * factor) / (factor - 1);
  }

  const totalPayment  = EMI * N;
  const totalInterest = totalPayment - P;

  // Save state for extra payment calculator
  lastEMI       = EMI;
  lastMonths    = N;
  lastRate      = r;
  lastPrincipal = P;

  displayEMIResults(EMI, totalPayment, totalInterest, P, N);
  renderEMIPieChart(P, totalInterest);

  // Build yearly breakdown for bar chart
  const yearlyData = buildYearlyData(P, r, N, EMI);
  renderBarChart(yearlyData);

  renderEMIAmortizationTable(P, r, N, EMI);
  calculateWithExtraPayment();
}

/* =========================================================
   DISPLAY EMI RESULTS
   ========================================================= */

/**
 * displayEMIResults — Updates result elements with animated numbers.
 */
function displayEMIResults(emi, total, interest, principal, months) {
  const emiEl       = document.getElementById('emi-display');
  const subEl       = document.getElementById('emi-sub');
  const principalEl = document.getElementById('emi-principal-display');
  const interestEl  = document.getElementById('emi-interest-display');
  const totalEl     = document.getElementById('emi-total-display');
  const principalPctEl = document.getElementById('emi-principal-pct');
  const interestPctEl  = document.getElementById('emi-interest-pct');

  if (typeof animateCounter === 'function') {
    animateCounter(emiEl, emi, 800, '₨ ', '');
    animateCounter(principalEl, principal, 600, '₨ ', '');
    animateCounter(interestEl, interest, 700, '₨ ', '');
    animateCounter(totalEl, total, 800, '₨ ', '');
  } else {
    const fmt = n => typeof formatPKR === 'function' ? formatPKR(Math.round(n)) : Math.round(n).toLocaleString();
    if (emiEl)       emiEl.textContent       = '₨ ' + fmt(emi);
    if (principalEl) principalEl.textContent = '₨ ' + fmt(principal);
    if (interestEl)  interestEl.textContent  = '₨ ' + fmt(interest);
    if (totalEl)     totalEl.textContent     = '₨ ' + fmt(total);
  }

  if (subEl) subEl.textContent = `for ${months} months`;

  if (principalPctEl && interestPctEl && total > 0) {
    principalPctEl.textContent = ((principal / total) * 100).toFixed(1) + '%';
    interestPctEl.textContent  = ((interest  / total) * 100).toFixed(1) + '%';
  }
}

/* =========================================================
   PIE CHART
   ========================================================= */

/**
 * renderEMIPieChart — Creates Chart.js doughnut chart for principal vs interest.
 */
function renderEMIPieChart(principal, interest) {
  const canvas = document.getElementById('emi-pie-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  if (window.emiPieChart) { window.emiPieChart.destroy(); window.emiPieChart = null; }

  window.emiPieChart = new Chart(canvas, {
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
          labels: { padding: 20, font: { size: 13, weight: '600' }, usePointStyle: true }
        },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              const val = ctx.raw;
              const tot = ctx.dataset.data.reduce((a,b) => a+b, 0);
              const pct = ((val/tot)*100).toFixed(1);
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
   YEAR-WISE BREAKDOWN (for bar chart)
   ========================================================= */

/**
 * buildYearlyData — Aggregates monthly amortization into yearly totals.
 * @param {number} P - Principal
 * @param {number} r - Monthly rate
 * @param {number} N - Total months
 * @param {number} EMI - Monthly payment
 * @returns {Array} [{year, principalPaid, interestPaid}, ...]
 */
function buildYearlyData(P, r, N, EMI) {
  let balance = P;
  const yearlyData = [];
  let yearPrincipal = 0;
  let yearInterest  = 0;
  let yearNum = 1;

  for (let month = 1; month <= N; month++) {
    const interestPaid  = balance * r;
    const principalPaid = Math.min(EMI - interestPaid, balance);
    balance = Math.max(balance - principalPaid, 0);

    yearPrincipal += principalPaid;
    yearInterest  += interestPaid;

    // End of year or end of loan
    if (month % 12 === 0 || month === N || balance < 0.01) {
      yearlyData.push({
        year: yearNum,
        principalPaid: Math.round(yearPrincipal),
        interestPaid:  Math.round(yearInterest)
      });
      yearNum++;
      yearPrincipal = 0;
      yearInterest  = 0;
    }

    if (balance < 0.01) break;
  }

  return yearlyData;
}

/* =========================================================
   BAR CHART
   ========================================================= */

/**
 * renderBarChart — Creates Chart.js grouped bar chart for yearly breakdown.
 * @param {Array} yearlyData - From buildYearlyData()
 */
function renderBarChart(yearlyData) {
  const canvas = document.getElementById('emi-bar-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  if (window.emiBarChart) { window.emiBarChart.destroy(); window.emiBarChart = null; }

  const labels    = yearlyData.map(d => 'Year ' + d.year);
  const principal = yearlyData.map(d => d.principalPaid);
  const interest  = yearlyData.map(d => d.interestPaid);

  window.emiBarChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Principal Paid',
          data: principal,
          backgroundColor: 'rgba(27,58,107,0.85)',
          borderColor: '#1B3A6B',
          borderWidth: 1,
          borderRadius: 4
        },
        {
          label: 'Interest Paid',
          data: interest,
          backgroundColor: 'rgba(244,167,50,0.85)',
          borderColor: '#F4A732',
          borderWidth: 1,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: {
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: {
            font: { size: 11 },
            callback: val => {
              if (val >= 10000000) return '₨' + (val/10000000).toFixed(1) + 'Cr';
              if (val >= 100000)   return '₨' + (val/100000).toFixed(1) + 'L';
              if (val >= 1000)     return '₨' + (val/1000).toFixed(0) + 'K';
              return '₨' + val;
            }
          }
        }
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { padding: 20, font: { size: 12, weight: '600' }, usePointStyle: true }
        },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              const fmt = typeof formatPKR === 'function' ? formatPKR(ctx.raw) : ctx.raw.toLocaleString();
              return ` ${ctx.dataset.label}: ₨ ${fmt}`;
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
 * renderEMIAmortizationTable — Generates and displays amortization schedule.
 */
function renderEMIAmortizationTable(P, r, N, EMI) {
  const section = document.getElementById('emi-amort-section');
  const tbody   = document.getElementById('emi-amort-tbody');
  if (!section || !tbody) return;

  section.style.display = 'block';
  emiAllRows = [];
  let balance = P;

  for (let month = 1; month <= N; month++) {
    const interestPaid  = balance * r;
    const principalPaid = Math.min(EMI - interestPaid, balance);
    const closing = Math.max(balance - principalPaid, 0);

    emiAllRows.push({ month, opening: balance, emi: EMI, principal: principalPaid, interest: interestPaid, closing });
    balance = closing;
    if (balance < 0.01) break;
  }

  renderEMITableRows(false);
  emiExpanded = false;
  const btn = document.getElementById('emi-amort-toggle-btn');
  if (btn) btn.textContent = emiAllRows.length > 24 ? 'Show All Months' : '';
}

function renderEMITableRows(showAll) {
  const tbody = document.getElementById('emi-amort-tbody');
  if (!tbody) return;
  const rows = showAll ? emiAllRows : emiAllRows.slice(0, 24);
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

function toggleEMIAmortization() {
  emiExpanded = !emiExpanded;
  renderEMITableRows(emiExpanded);
  const btn = document.getElementById('emi-amort-toggle-btn');
  if (btn) btn.textContent = emiExpanded ? 'Show Less' : 'Show All Months';
}

/* =========================================================
   EXTRA PAYMENT CALCULATOR
   Shows how much time/interest is saved by paying extra each month
   ========================================================= */

/**
 * calculateWithExtraPayment — Simulates loan with (EMI + extra) payment.
 * Compares against original tenure to find months/interest saved.
 */
function calculateWithExtraPayment() {
  const extraInput = document.getElementById('extra-payment');
  const extra = parseFloat(extraInput?.value) || 0;

  const monthsSavedEl    = document.getElementById('extra-months-saved');
  const interestSavedEl  = document.getElementById('extra-interest-saved');
  const newMonthsEl      = document.getElementById('extra-new-months');

  if (!lastEMI || !lastPrincipal) {
    if (monthsSavedEl)   monthsSavedEl.textContent   = '—';
    if (interestSavedEl) interestSavedEl.textContent = '—';
    if (newMonthsEl)     newMonthsEl.textContent     = '—';
    return;
  }

  if (extra <= 0) {
    if (monthsSavedEl)   monthsSavedEl.textContent   = '0 months';
    if (interestSavedEl) interestSavedEl.textContent = '₨ 0';
    if (newMonthsEl)     newMonthsEl.textContent     = lastMonths + ' mo';
    return;
  }

  const newPayment = lastEMI + extra;
  let balance = lastPrincipal;
  let newTotalInterest = 0;
  let newMonths = 0;
  const MAX_MONTHS = lastMonths + 10; // Safety cap

  while (balance > 0.01 && newMonths < MAX_MONTHS) {
    const interestCharge = balance * lastRate;
    const principalCharge = Math.min(newPayment - interestCharge, balance);
    if (principalCharge <= 0) break; // Extra payment doesn't cover interest
    newTotalInterest += interestCharge;
    balance -= principalCharge;
    newMonths++;
  }

  const originalTotalInterest = (lastEMI * lastMonths) - lastPrincipal;
  const monthsSaved    = lastMonths - newMonths;
  const interestSaved  = Math.max(originalTotalInterest - newTotalInterest, 0);

  const fmt = n => typeof formatPKR === 'function' ? formatPKR(Math.round(n)) : Math.round(n).toLocaleString();

  if (monthsSavedEl)   monthsSavedEl.textContent   = monthsSaved + ' months';
  if (interestSavedEl) interestSavedEl.textContent = '₨ ' + fmt(interestSaved);
  if (newMonthsEl)     newMonthsEl.textContent     = newMonths + ' months';
}

/* =========================================================
   FAQ ACCORDION
   ========================================================= */

/**
 * toggleEMIFAQ — Opens/closes FAQ accordion items.
 * @param {HTMLElement} questionEl - Clicked .faq-question element
 */
function toggleEMIFAQ(questionEl) {
  const item = questionEl.parentElement;
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(el => el.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
}

/* =========================================================
   SLIDER ↔ INPUT SYNC
   ========================================================= */

/**
 * syncEMIInputs — Keeps a slider and input in sync; calls calculateEMI on change.
 */
function syncEMIInputs(sliderId, inputId, onChange) {
  const slider = document.getElementById(sliderId);
  const input  = document.getElementById(inputId);
  if (!slider || !input) return;

  slider.addEventListener('input', () => {
    input.value = slider.value;
    if (onChange) onChange();
    calculateEMI();
  });

  input.addEventListener('input', () => {
    let val = parseFloat(input.value) || 0;
    val = Math.max(parseFloat(slider.min), Math.min(parseFloat(slider.max), val));
    slider.value = val;
    if (onChange) onChange();
    calculateEMI();
  });
}

/* =========================================================
   INIT
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  // Sync all slider pairs
  syncEMIInputs('emi-amount-slider',  'emi-amount-input',  updateAmountDisplay);
  syncEMIInputs('emi-rate-slider',    'emi-rate-input',    null);
  syncEMIInputs('emi-tenure-slider',  'emi-tenure-input',  updateEMITenureDisplay);

  // Apply default preset (Home Loan)
  applyPreset('home');
});