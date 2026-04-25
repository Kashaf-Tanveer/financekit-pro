// File: calculator.js — Scientific calculator logic for FinanceKit Pro
// Handles: expression building, evaluation, history, special functions, keyboard support

'use strict';

/* =========================================================
   STATE
   ========================================================= */

/** Current expression string being built */
let expression = '';

/** Whether the last action was a final calculation (= pressed) */
let justCalculated = false;

/** Calculation history array — persisted to localStorage */
let history = [];

try {
  history = JSON.parse(localStorage.getItem('fkp-calcHistory')) || [];
} catch (e) {
  history = [];
}

/* =========================================================
   DOM REFERENCES
   ========================================================= */
const exprEl   = document.getElementById('calc-expr');
const resultEl = document.getElementById('calc-result');

/* =========================================================
   DISPLAY
   ========================================================= */

/**
 * updateDisplay — Refreshes the calculator screen.
 * Shows current expression above and current input/result below.
 */
function updateDisplay() {
  if (exprEl)   exprEl.textContent   = expression || '';
  if (resultEl) resultEl.textContent = expression || '0';
}

/* =========================================================
   APPEND TO EXPRESSION
   Handles edge cases: consecutive operators, leading decimal, etc.
   ========================================================= */

/**
 * appendToExpression — Adds a value (digit or operator) to the expression.
 * @param {string} value - The character or string to append
 */
function appendToExpression(value) {
  const operators = ['+', '-', '*', '/'];
  const lastChar  = expression.slice(-1);

  // If we just finished a calculation and user types a digit, start fresh
  if (justCalculated && !operators.includes(value)) {
    expression = '';
    justCalculated = false;
  }

  // If we just calculated, allow continuing with an operator
  if (justCalculated && operators.includes(value)) {
    justCalculated = false;
  }

  // Prevent double operators (replace last operator if consecutive)
  if (operators.includes(value) && operators.includes(lastChar)) {
    expression = expression.slice(0, -1) + value;
    updateDisplay();
    return;
  }

  // Prevent leading operator (except minus for negative numbers)
  if (operators.includes(value) && expression === '' && value !== '-') {
    return;
  }

  // Prevent double decimal in the same number segment
  if (value === '.') {
    // Find last segment (split by operators)
    const segments = expression.split(/[\+\-\*\/]/);
    const lastSegment = segments[segments.length - 1];
    if (lastSegment.includes('.')) return;
  }

  // Handle % — convert to division by 100 if at end of expression
  if (value === '%') {
    if (!expression) return;
    expression = '(' + expression + '/100)';
    updateDisplay();
    return;
  }

  expression += value;
  updateDisplay();
}

/* =========================================================
   CALCULATE
   Evaluates the expression safely using Function constructor
   ========================================================= */

/**
 * calculate — Evaluates the current expression string.
 * Uses Function() constructor (safer than eval() with proper input sanitization).
 * Pushes result to history and updates display.
 */
function calculate() {
  if (!expression) return;

  // Sanitize: only allow digits, operators, dots, parens, spaces
  const safe = expression.replace(/[^0-9+\-*/().% ]/g, '');
  if (!safe) {
    showError();
    return;
  }

  let result;
  try {
    // eslint-disable-next-line no-new-func
    result = Function('"use strict"; return (' + safe + ')')();
  } catch (e) {
    showError();
    return;
  }

  if (!isFinite(result)) {
    showError('Division by zero');
    return;
  }

  // Round to avoid floating point noise
  const rounded = parseFloat(result.toPrecision(12));

  // Push to history
  const entry = { expr: expression, result: rounded };
  history.unshift(entry);
  if (history.length > 20) history.pop(); // Keep max 20 entries

  try {
    localStorage.setItem('fkp-calcHistory', JSON.stringify(history));
  } catch (e) { /* Storage quota */ }

  // Update display
  if (exprEl)   exprEl.textContent   = expression + ' =';
  if (resultEl) resultEl.textContent = String(rounded);

  expression = String(rounded);
  justCalculated = true;
  renderHistory();
}

/**
 * showError — Displays an error state on the calculator screen.
 * @param {string} msg - Optional custom message
 */
function showError(msg = 'Error') {
  if (resultEl) resultEl.textContent = msg;
  if (exprEl)   exprEl.textContent   = expression;
  expression = '';
  justCalculated = false;
}

/* =========================================================
   CLEAR & BACKSPACE
   ========================================================= */

/**
 * clearExpression — Resets the calculator to zero state.
 */
function clearExpression() {
  expression = '';
  justCalculated = false;
  if (exprEl)   exprEl.textContent   = '';
  if (resultEl) resultEl.textContent = '0';
}

/**
 * backspace — Removes the last character from the expression.
 */
function backspace() {
  if (justCalculated) {
    clearExpression();
    return;
  }
  expression = expression.slice(0, -1);
  updateDisplay();
  if (!expression && resultEl) resultEl.textContent = '0';
}

/* =========================================================
   SPECIAL FUNCTIONS
   ========================================================= */

/**
 * squareRoot — Computes √ of the current expression result.
 */
function squareRoot() {
  if (!expression) return;
  try {
    // eslint-disable-next-line no-new-func
    const val = Function('"use strict"; return (' + expression + ')')();
    if (val < 0) { showError('Invalid input'); return; }
    const result = parseFloat(Math.sqrt(val).toPrecision(12));
    if (exprEl) exprEl.textContent = '√(' + expression + ')';
    if (resultEl) resultEl.textContent = String(result);
    expression = String(result);
    justCalculated = true;
  } catch (e) { showError(); }
}

/**
 * square — Computes x² of the current expression result.
 */
function square() {
  if (!expression) return;
  try {
    // eslint-disable-next-line no-new-func
    const val = Function('"use strict"; return (' + expression + ')')();
    const result = parseFloat((val * val).toPrecision(12));
    if (exprEl) exprEl.textContent = '(' + expression + ')²';
    if (resultEl) resultEl.textContent = String(result);
    expression = String(result);
    justCalculated = true;
  } catch (e) { showError(); }
}

/**
 * inverse — Computes 1/x of the current expression result.
 */
function inverse() {
  if (!expression) return;
  try {
    // eslint-disable-next-line no-new-func
    const val = Function('"use strict"; return (' + expression + ')')();
    if (val === 0) { showError('Division by zero'); return; }
    const result = parseFloat((1 / val).toPrecision(12));
    if (exprEl) exprEl.textContent = '1/(' + expression + ')';
    if (resultEl) resultEl.textContent = String(result);
    expression = String(result);
    justCalculated = true;
  } catch (e) { showError(); }
}

/**
 * toggleSign — Flips the sign of the current number (positive ↔ negative).
 */
function toggleSign() {
  if (!expression) return;
  if (expression.startsWith('-')) {
    expression = expression.slice(1);
  } else {
    expression = '-' + expression;
  }
  updateDisplay();
}

/* =========================================================
   HISTORY PANEL
   ========================================================= */

/**
 * renderHistory — Re-renders the history panel from the history array.
 * Each item is clickable to restore that result to the calculator.
 */
function renderHistory() {
  const panel = document.getElementById('history-panel');
  if (!panel) return;

  if (history.length === 0) {
    panel.innerHTML = '<p style="color:var(--text-muted);font-size:0.875rem;padding:1rem 0;">No calculations yet. Start typing!</p>';
    return;
  }

  panel.innerHTML = history.map((item, idx) => `
    <div class="history-item" onclick="restoreHistory(${idx})" title="Click to reuse this result">
      <div class="h-expr">${escapeHtml(String(item.expr))} =</div>
      <div class="h-result">${item.result}</div>
    </div>
  `).join('');
}

/**
 * restoreHistory — Loads a history entry back into the calculator.
 * @param {number} idx - Index in the history array
 */
function restoreHistory(idx) {
  const entry = history[idx];
  if (!entry) return;
  expression = String(entry.result);
  justCalculated = true;
  if (exprEl)   exprEl.textContent   = String(entry.expr) + ' =';
  if (resultEl) resultEl.textContent = String(entry.result);
}

/**
 * clearHistory — Removes all history entries.
 */
function clearHistory() {
  history = [];
  try { localStorage.removeItem('fkp-calcHistory'); } catch(e) {}
  renderHistory();
  if (typeof showToast === 'function') showToast('History cleared', 'info');
}

/**
 * escapeHtml — Prevents XSS in history display.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* =========================================================
   KEYBOARD SUPPORT
   ========================================================= */

/**
 * Keyboard event listener — Maps keyboard keys to calculator functions.
 * Digits 0-9, operators, Enter, Backspace, Escape all work.
 */
document.addEventListener('keydown', function(e) {
  // Don't intercept if user is typing in an input
  if (e.target.tagName === 'INPUT') return;

  const key = e.key;

  if (key >= '0' && key <= '9')          { appendToExpression(key); return; }
  if (key === '.')                        { appendToExpression('.'); return; }
  if (key === '+')                        { appendToExpression('+'); return; }
  if (key === '-')                        { appendToExpression('-'); return; }
  if (key === '*')                        { appendToExpression('*'); return; }
  if (key === '/')   { e.preventDefault(); appendToExpression('/'); return; }
  if (key === '%')                        { appendToExpression('%'); return; }
  if (key === 'Enter' || key === '=')     { calculate(); return; }
  if (key === 'Backspace')                { backspace(); return; }
  if (key === 'Escape')                   { clearExpression(); return; }
});

/* =========================================================
   INIT
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  renderHistory();
});