// File: emi.js — EMI Calculator logic for FinanceKit Pro
// FIX: All ₨ hardcoded symbols replaced with getCurrencySymbol()
// FIX: Listens to fkp:currencyChanged event to re-render on currency switch

'use strict';

if (typeof Chart !== 'undefined') {
  Chart.defaults.font.family = 'Sora, sans-serif';
}

/* =========================================================
   HELPER — Get active symbol (falls back to ₨ if app.js not loaded)
   ========================================================= */
function emiFmt(n) {
  const sym = (typeof getCurrencySymbol === 'function') ? getCurrencySymbol() : '₨';
  const formatted = (typeof formatPKR === 'function') ? formatPKR(Math.round(n)) : Math.round(n).toLocaleString();
  return sym + ' ' + formatted;
}

/* =========================================================
   LOAN PRESETS
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
let currentTab    = 'home';
let emiTenureMode = 'years';
let emiAllRows    = [];
let emiExpanded   = false;
let lastEMI       = 0;
let lastMonths    = 0;
let lastRate      = 0;
let lastPrincipal = 0;

/* =========================================================
   TAB SWITCHER
   ========================================================= */
function switchTab(type) {
  currentTab = type;
  ['home','car','personal','education'].forEach(t => {
    const btn = document.getElementById('tab-' + t);
    if (btn) {
      btn.classList.toggle('active', t === type);
      btn.setAttribute('aria-selected', t === type ? 'true' : 'false');
    }
  });
  applyPreset(type);
}

function applyPreset(type) {
  const preset = LOAN_PRESETS[type];
  if (!preset) return;

  setEMITenureMode(preset.mode);

  const amountSlider = document.getElementById('emi-amount-slider');
  const amountInput  = document.getElementById('emi-amount-input');
  if (amountSlider) amountSlider.value = preset.principal;
  if (amountInput)  amountInput.value  = preset.principal;
  updateAmountDisplay();

  const rateSlider = document.getElementById('emi-rate-slider');
  const rateInput  = document.getElementById('emi-rate-input');
  if (rateSlider) rateSlider.value = preset.rate;
  if (rateInput)  rateInput.value  = preset.rate;

  const tenureSlider = document.getElementById('emi-tenure-slider');
  const tenureInput  = document.getElementById('emi-tenure-input');
  if (tenureSlider) tenureSlider.value = preset.tenure;
  if (tenureInput)  tenureInput.value  = preset.tenure;

  const title = document.getElementById('emi-input-title');
  if (title) title.textContent = preset.title;

  updateEMITenureDisplay();
  calculateEMI();
}

/* =========================================================
   TENURE MODE
   ========================================================= */
function setEMITenureMode(mode) {
  emiTenureMode = mode;
  const slider    = document.getElementById('emi-tenure-slider');
  const input     = document.getElementById('emi-tenure-input');
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

function updateAmountDisplay() {
  const display = document.getElementById('emi-amount-display');
  const val = parseFloat(document.getElementById('emi-amount-input')?.value) || 0;
  if (display) display.textContent = emiFmt(val);
}

/* =========================================================
   MAIN EMI CALCULATION
   ========================================================= */
function calculateEMI() {
  const P = parseFloat(document.getElementById('emi-amount-input')?.value) || 0;
  const annualRate = parseFloat(document.getElementById('emi-rate-input')?.value) || 0;
  const tenureVal  = parseInt(document.getElementById('emi-tenure-input')?.value) || 0;
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

  lastEMI       = EMI;
  lastMonths    = N;
  lastRate      = r;
  lastPrincipal = P;

  displayEMIResults(EMI, totalPayment, totalInterest, P, N);
  renderEMIPieChart(P, totalInterest);
  const yearlyData = buildYearlyData(P, r, N, EMI);
  renderBarChart(yearlyData);
  renderEMIAmortizationTable(P, r, N, EMI);
  calculateWithExtraPayment();
}

/* =========================================================
   DISPLAY RESULTS — uses getCurrencySymbol() dynamically
   ========================================================= */
function displayEMIResults(emi, total, interest, principal, months) {
  const sym = (typeof getCurrencySymbol === 'function') ? getCurrencySymbol() : '₨';
  const prefix = sym + ' ';

  const emiEl          = document.getElementById('emi-display');
  const subEl          = document.getElementById('emi-sub');
  const principalEl    = document.getElementById('emi-principal-display');
  const interestEl     = document.getElementById('emi-interest-display');
  const totalEl        = document.getElementById('emi-total-display');
  const principalPctEl = document.getElementById('emi-principal-pct');
  const interestPctEl  = document.getElementById('emi-interest-pct');

  if (typeof animateCounter === 'function') {
    animateCounter(emiEl,       emi,       800, prefix, '');
    animateCounter(principalEl, principal, 600, prefix, '');
    animateCounter(interestEl,  interest,  700, prefix, '');
    animateCounter(totalEl,     total,     800, prefix, '');
  } else {
    const fmt = n => (typeof formatPKR === 'function') ? formatPKR(Math.round(n)) : Math.round(n).toLocaleString();
    if (emiEl)       emiEl.textContent       = prefix + fmt(emi);
    if (principalEl) principalEl.textContent = prefix + fmt(principal);
    if (interestEl)  interestEl.textContent  = prefix + fmt(interest);
    if (totalEl)     totalEl.textContent     = prefix + fmt(total);
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
function renderEMIPieChart(principal, interest) {
  const canvas = document.getElementById('emi-pie-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  if (window.emiPieChart) { window.emiPieChart.destroy(); window.emiPieChart = null; }

  const sym = (typeof getCurrencySymbol === 'function') ? getCurrencySymbol() : '₨';

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
        legend: { position: 'bottom', labels: { padding: 20, font: { size: 13, weight: '600' }, usePointStyle: true } },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              const val = ctx.raw;
              const tot = ctx.dataset.data.reduce((a,b) => a+b, 0);
              const pct = ((val/tot)*100).toFixed(1);
              const fmt = (typeof formatPKR === 'function') ? formatPKR(val) : val.toLocaleString();
              return ` ${sym} ${fmt} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

/* =========================================================
   YEARLY DATA
   ========================================================= */
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

    if (month % 12 === 0 || month === N || balance < 0.01) {
      yearlyData.push({ year: yearNum, principalPaid: Math.round(yearPrincipal), interestPaid: Math.round(yearInterest) });
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
function renderBarChart(yearlyData) {
  const canvas = document.getElementById('emi-bar-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  if (window.emiBarChart) { window.emiBarChart.destroy(); window.emiBarChart = null; }

  const sym    = (typeof getCurrencySymbol === 'function') ? getCurrencySymbol() : '₨';
  const labels    = yearlyData.map(d => 'Year ' + d.year);
  const principal = yearlyData.map(d => d.principalPaid);
  const interest  = yearlyData.map(d => d.interestPaid);

  window.emiBarChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Principal Paid', data: principal, backgroundColor: 'rgba(27,58,107,0.85)', borderColor: '#1B3A6B', borderWidth: 1, borderRadius: 4 },
        { label: 'Interest Paid',  data: interest,  backgroundColor: 'rgba(244,167,50,0.85)', borderColor: '#F4A732', borderWidth: 1, borderRadius: 4 }
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
              if (val >= 10000000) return sym + (val/10000000).toFixed(1) + 'Cr';
              if (val >= 100000)   return sym + (val/100000).toFixed(1) + 'L';
              if (val >= 1000)     return sym + (val/1000).toFixed(0) + 'K';
              return sym + val;
            }
          }
        }
      },
      plugins: {
        legend: { position: 'bottom', labels: { padding: 20, font: { size: 12, weight: '600' }, usePointStyle: true } },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              const fmt = (typeof formatPKR === 'function') ? formatPKR(ctx.raw) : ctx.raw.toLocaleString();
              return ` ${ctx.dataset.label}: ${sym} ${fmt}`;
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
  const sym  = (typeof getCurrencySymbol === 'function') ? getCurrencySymbol() : '₨';
  const rows = showAll ? emiAllRows : emiAllRows.slice(0, 24);
  const fmt  = n => (typeof formatPKR === 'function') ? formatPKR(Math.round(n)) : Math.round(n).toLocaleString();

  tbody.innerHTML = rows.map(row => `
    <tr>
      <td>${row.month}</td>
      <td>${sym} ${fmt(row.opening)}</td>
      <td>${sym} ${fmt(row.emi)}</td>
      <td style="color:var(--success);">${sym} ${fmt(row.principal)}</td>
      <td style="color:var(--danger);">${sym} ${fmt(row.interest)}</td>
      <td>${sym} ${fmt(row.closing)}</td>
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
   ========================================================= */
function calculateWithExtraPayment() {
  const extraInput = document.getElementById('extra-payment');
  const extra = parseFloat(extraInput?.value) || 0;
  const sym   = (typeof getCurrencySymbol === 'function') ? getCurrencySymbol() : '₨';
  const fmt   = n => (typeof formatPKR === 'function') ? formatPKR(Math.round(n)) : Math.round(n).toLocaleString();

  const monthsSavedEl   = document.getElementById('extra-months-saved');
  const interestSavedEl = document.getElementById('extra-interest-saved');
  const newMonthsEl     = document.getElementById('extra-new-months');

  if (!lastEMI || !lastPrincipal) {
    if (monthsSavedEl)   monthsSavedEl.textContent   = '—';
    if (interestSavedEl) interestSavedEl.textContent = '—';
    if (newMonthsEl)     newMonthsEl.textContent     = '—';
    return;
  }

  if (extra <= 0) {
    if (monthsSavedEl)   monthsSavedEl.textContent   = '0 months';
    if (interestSavedEl) interestSavedEl.textContent = sym + ' 0';
    if (newMonthsEl)     newMonthsEl.textContent     = lastMonths + ' mo';
    return;
  }

  const newPayment = lastEMI + extra;
  let balance = lastPrincipal;
  let newTotalInterest = 0;
  let newMonths = 0;
  const MAX_MONTHS = lastMonths + 10;

  while (balance > 0.01 && newMonths < MAX_MONTHS) {
    const interestCharge  = balance * lastRate;
    const principalCharge = Math.min(newPayment - interestCharge, balance);
    if (principalCharge <= 0) break;
    newTotalInterest += interestCharge;
    balance -= principalCharge;
    newMonths++;
  }

  const originalTotalInterest = (lastEMI * lastMonths) - lastPrincipal;
  const monthsSaved   = lastMonths - newMonths;
  const interestSaved = Math.max(originalTotalInterest - newTotalInterest, 0);

  if (monthsSavedEl)   monthsSavedEl.textContent   = monthsSaved + ' months';
  if (interestSavedEl) interestSavedEl.textContent = sym + ' ' + fmt(interestSaved);
  if (newMonthsEl)     newMonthsEl.textContent     = newMonths + ' months';
}

/* =========================================================
   FAQ ACCORDION
   ========================================================= */
function toggleEMIFAQ(questionEl) {
  const item   = questionEl.parentElement;
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(el => el.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
}

/* =========================================================
   SLIDER SYNC
   ========================================================= */
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
  syncEMIInputs('emi-amount-slider',  'emi-amount-input',  updateAmountDisplay);
  syncEMIInputs('emi-rate-slider',    'emi-rate-input',    null);
  syncEMIInputs('emi-tenure-slider',  'emi-tenure-input',  updateEMITenureDisplay);

  applyPreset('home');

  // LISTEN for currency change from header selector
  document.addEventListener('fkp:currencyChanged', () => {
    updateAmountDisplay();
    calculateEMI();
  });
});
