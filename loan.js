// File: loan.js — Loan calculator logic for FinanceKit Pro
// FIX: All ₨ hardcoded symbols replaced with getCurrencySymbol()
// FIX: Listens to fkp:currencyChanged event to re-render on currency switch

'use strict';

if (typeof Chart !== 'undefined') {
  Chart.defaults.font.family = 'Sora, sans-serif';
}

/* =========================================================
   HELPER — Dynamic currency symbol
   ========================================================= */
function loanSym() {
  return (typeof getCurrencySymbol === 'function') ? getCurrencySymbol() : '₨';
}
function loanFmt(n) {
  const formatted = (typeof formatPKR === 'function') ? formatPKR(Math.round(n)) : Math.round(n).toLocaleString();
  return loanSym() + ' ' + formatted;
}

/* =========================================================
   STATE
   ========================================================= */
window.allRows  = [];
let amortExpanded = false;
let tenureMode    = 'months';

/* =========================================================
   MAIN CALCULATION
   Formula: EMI = P x r x (1+r)^N / ((1+r)^N - 1)
   ========================================================= */
function calculateLoan() {
  const P          = parseFloat(document.getElementById('loan-amount-input')?.value) || 0;
  const annualRate = parseFloat(document.getElementById('loan-rate-input')?.value)   || 0;
  let   N          = parseInt(document.getElementById('loan-tenure-input')?.value)   || 0;

  if (tenureMode === 'years') N = N * 12;

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

  displayResults(EMI, totalPayment, totalInterest, P);
  renderPieChart(P, totalInterest);
  renderAmortizationTable(P, r, N, EMI);
  updateTenureDisplay();
}

/* =========================================================
   DISPLAY RESULTS — dynamic currency symbol
   ========================================================= */
function displayResults(emi, total, interest, principal) {
  const sym    = loanSym();
  const prefix = sym + ' ';

  const emiEl       = document.getElementById('loan-emi-display');
  const subEl       = document.getElementById('loan-emi-sub');
  const principalEl = document.getElementById('loan-principal-display');
  const interestEl  = document.getElementById('loan-interest-display');
  const totalEl     = document.getElementById('loan-total-display');
  const pctEl       = document.getElementById('loan-interest-pct');

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
   PIE CHART — dynamic symbol in tooltips
   ========================================================= */
function renderPieChart(principal, interest) {
  const canvas = document.getElementById('loan-pie-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  if (window.loanChart) { window.loanChart.destroy(); window.loanChart = null; }

  const sym = loanSym();

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
        legend: { position: 'bottom', labels: { padding: 20, font: { size: 13, family: 'Sora, sans-serif', weight: '600' }, usePointStyle: true } },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val   = context.raw;
              const total = context.dataset.data.reduce((a,b) => a+b, 0);
              const pct   = ((val / total) * 100).toFixed(1);
              const fmt   = (typeof formatPKR === 'function') ? formatPKR(val) : val.toLocaleString();
              return ` ${sym} ${fmt} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

/* =========================================================
   AMORTIZATION TABLE — dynamic symbol
   ========================================================= */
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

    window.allRows.push({ month, opening: balance, emi: EMI, principal: principalPaid, interest: interestPaid, closing: closingBalance });
    balance = closingBalance;
    if (balance < 0.01) break;
  }

  renderTableRows(false);
  amortExpanded = false;
  const btn = document.getElementById('amort-toggle-btn');
  if (btn) btn.textContent = window.allRows.length > 24 ? 'Show All Months' : '';
}

function renderTableRows(showAll) {
  const tbody = document.getElementById('amort-tbody');
  if (!tbody) return;

  const sym  = loanSym();
  const rows = showAll ? window.allRows : window.allRows.slice(0, 24);
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

function toggleAmortizationTable() {
  amortExpanded = !amortExpanded;
  renderTableRows(amortExpanded);
  const btn = document.getElementById('amort-toggle-btn');
  if (btn) btn.textContent = amortExpanded ? 'Show Less' : 'Show All Months';
}

/* =========================================================
   TENURE MODE
   ========================================================= */
function setTenureMode(mode) {
  tenureMode = mode;
  const slider    = document.getElementById('loan-tenure-slider');
  const input     = document.getElementById('loan-tenure-input');
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
   SLIDER SYNC
   ========================================================= */
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
function toggleFAQ(questionEl) {
  const item   = questionEl.parentElement;
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(el => el.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
}

/* =========================================================
   INIT
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  syncInputs('loan-amount-slider',  'loan-amount-input');
  syncInputs('loan-rate-slider',    'loan-rate-input');
  syncInputs('loan-tenure-slider',  'loan-tenure-input');

  calculateLoan();

  // LISTEN for currency change from header selector
  document.addEventListener('fkp:currencyChanged', () => {
    calculateLoan();
  });
});
