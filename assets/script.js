// ── Theme toggle (all pages) ─────────────────────────────────────────────────

(function () {
  const STORAGE_KEY = 'taint-theme';
  const root        = document.documentElement;
  const saved       = localStorage.getItem(STORAGE_KEY) || 'dark';

  root.setAttribute('data-theme', saved);

  document.addEventListener('DOMContentLoaded', () => {
    const btn   = document.getElementById('themeToggle');
    const icon  = btn.querySelector('.theme-toggle-icon');
    const label = btn.querySelector('.theme-toggle-label');

    function applyTheme(theme) {
      root.setAttribute('data-theme', theme);
      localStorage.setItem(STORAGE_KEY, theme);
      icon.textContent  = theme === 'dark' ? '☀' : '🌙';
      label.textContent = theme === 'dark' ? 'Light' : 'Dark';
    }

    applyTheme(saved);
    btn.addEventListener('click', () => {
      applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  });
})();

// ── Core math (shared) ───────────────────────────────────────────────────────

const COMPACT_DIGITS = '0123456789ABCDEFGHIJ';

function parseCompact(str) {
  str = str.trim().toUpperCase();
  if (!str) return null;
  const parts = str.split('.');
  if (parts.length > 2) return null;
  const intPart  = parts[0];
  const fracPart = parts[1] || '';
  if (!/^[0-9A-J]*$/.test(intPart) || !/^[0-9A-J]*$/.test(fracPart)) return null;
  if (!intPart && !fracPart) return null;
  let val = 0;
  for (let i = 0; i < intPart.length; i++)  val = val * 20 + COMPACT_DIGITS.indexOf(intPart[i]);
  for (let i = 0; i < fracPart.length; i++) val += COMPACT_DIGITS.indexOf(fracPart[i]) / Math.pow(20, i + 1);
  return val;
}

function parseCsv(str) {
  str = str.trim();
  if (!str) return null;
  const sides = str.split('.');
  if (sides.length > 2) return null;
  function parseGroups(side) {
    if (!side) return [];
    const groups = side.split(',');
    const nums = [];
    for (const g of groups) {
      const n = parseInt(g.trim(), 10);
      if (isNaN(n) || n < 0 || n > 19) return null;
      nums.push(n);
    }
    return nums;
  }
  const intGroups  = parseGroups(sides[0]);
  if (intGroups === null) return null;
  const fracGroups = sides.length === 2 ? parseGroups(sides[1]) : [];
  if (fracGroups === null) return null;
  if (!intGroups.length && !fracGroups.length) return null;
  let val = 0;
  for (let i = 0; i < intGroups.length; i++)  val = val * 20 + intGroups[i];
  for (let i = 0; i < fracGroups.length; i++) val += fracGroups[i] / Math.pow(20, i + 1);
  return val;
}

function parseB20(str, notation) {
  return notation === 'compact' ? parseCompact(str) : parseCsv(str);
}

// Extract one base-20 fractional digit from f, returning [digit, remainder].
// Clamps f into [0, 20) first to neutralise floating-point drift.
function nextFracDigit(f) {
  f = Math.max(0, Math.min(f * 20, 20 - Number.EPSILON * 32));
  const d = Math.floor(f);
  return [Math.min(d, 19), f - d];
}

function toCompact(val, dp) {
  if (val < 0) return '-' + toCompact(-val, dp);
  const intVal  = Math.floor(val);
  let fracVal   = val - intVal;
  let intStr = intVal === 0 ? '0' : '';
  if (intVal > 0) {
    let n = intVal;
    while (n > 0) { intStr = COMPACT_DIGITS[n % 20] + intStr; n = Math.floor(n / 20); }
  }
  if (dp === 0) return intStr;
  let fracStr = '';
  let f = fracVal;
  for (let i = 0; i < dp; i++) {
    let d;
    [d, f] = nextFracDigit(f);
    fracStr += COMPACT_DIGITS[d];
  }
  fracStr = fracStr.replace(/0+$/, '');
  return fracStr ? intStr + '.' + fracStr : intStr;
}

function toCsv(val, dp) {
  if (val < 0) return '-' + toCsv(-val, dp);
  const intVal  = Math.floor(val);
  let fracVal   = val - intVal;
  let intGroups = [];
  if (intVal === 0) { intGroups = [0]; }
  else { let n = intVal; while (n > 0) { intGroups.unshift(n % 20); n = Math.floor(n / 20); } }
  const intStr = intGroups.join(',');
  if (dp === 0) return intStr;
  let fracGroups = [];
  let f = fracVal;
  for (let i = 0; i < dp; i++) {
    let d;
    [d, f] = nextFracDigit(f);
    fracGroups.push(d);
  }
  while (fracGroups.length && fracGroups[fracGroups.length - 1] === 0) fracGroups.pop();
  return fracGroups.length ? intStr + '.' + fracGroups.join(',') : intStr;
}

// ── Page init ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {

  // ── Converter (converter.html) ───────────────────────────────────────────

  if (document.getElementById('b20in')) {
    const b20in       = document.getElementById('b20in');
    const b10in       = document.getElementById('b10in');
    const b20hint     = document.getElementById('b20hint');
    const b10hint     = document.getElementById('b10hint');
    const outCompact  = document.getElementById('outCompact');
    const outCsv      = document.getElementById('outCsv');
    const outDec      = document.getElementById('outDec');
    const dpSel       = document.getElementById('dp');
    const notationSel = document.getElementById('inputNotation');
    const swapBtn     = document.getElementById('swapBtn');
    let activeField   = 'b20';

    function clearConv() {
      outCompact.textContent = '—';
      outCsv.textContent     = '—';
      outDec.textContent     = '—';
    }

    function convertFromB20() {
      const str      = b20in.value.trim();
      const notation = notationSel.value;
      if (!str) { clearConv(); b20hint.textContent = ''; b20in.className = ''; return; }
      const val = parseB20(str, notation);
      if (val === null) {
        b20hint.textContent = notation === 'compact'
          ? 'Use digits 0–9 and A–J (e.g. 2D8 or 2D8.A3)'
          : 'Comma-separated 0–19 groups (e.g. 2,13,8 or 2,13,8.5,3)';
        b20in.className = 'error'; clearConv(); return;
      }
      b20hint.textContent = ''; b20in.className = 'valid';
      b10in.value = ''; b10hint.textContent = ''; b10in.className = '';
      const dp = parseInt(dpSel.value, 10);
      outCompact.textContent = toCompact(val, dp);
      outCsv.textContent     = toCsv(val, dp);
      outDec.textContent     = val.toFixed(dp);
    }

    function convertFromB10() {
      const str = b10in.value.trim();
      if (!str) { clearConv(); b10hint.textContent = ''; b10in.className = ''; return; }
      const val = parseFloat(str);
      if (isNaN(val)) {
        b10hint.textContent = 'Invalid decimal number';
        b10in.className = 'error'; clearConv(); return;
      }
      b10hint.textContent = ''; b10in.className = 'valid';
      b20in.value = ''; b20hint.textContent = ''; b20in.className = '';
      const dp = parseInt(dpSel.value, 10);
      outCompact.textContent = toCompact(val, dp);
      outCsv.textContent     = toCsv(val, dp);
      outDec.textContent     = val.toFixed(dp);
    }

    b20in.addEventListener('input', () => { activeField = 'b20'; convertFromB20(); });
    b10in.addEventListener('input', () => { activeField = 'b10'; convertFromB10(); });
    dpSel.addEventListener('change', () => activeField === 'b20' ? convertFromB20() : convertFromB10());
    notationSel.addEventListener('change', () => {
      b20in.placeholder = notationSel.value === 'compact' ? 'e.g. 2D8 or 2D8.A3' : 'e.g. 2,13,8 or 2,13,8.5,3';
      if (activeField === 'b20') convertFromB20();
    });

    swapBtn.addEventListener('click', () => {
      const dec = outDec.textContent;
      if (dec === '—' || !dec) return;
      if (activeField === 'b20') {
        b10in.value = dec; b20in.value = '';
        b20in.className = ''; b20hint.textContent = '';
        activeField = 'b10'; convertFromB10();
      } else {
        const c = outCompact.textContent;
        if (c === '—') return;
        b20in.value = c; b10in.value = '';
        b10in.className = ''; b10hint.textContent = '';
        notationSel.value = 'compact';
        activeField = 'b20'; convertFromB20();
      }
    });
  }

  // ── Averager (averager.html) — 3-way solve ───────────────────────────────

  if (document.getElementById('motherIn')) {
    const FIELDS = ['mother', 'father', 'child'];
    const inputs = {
      mother: document.getElementById('motherIn'),
      father: document.getElementById('fatherIn'),
      child:  document.getElementById('childIn'),
    };
    const hints = {
      mother: document.getElementById('motherHint'),
      father: document.getElementById('fatherHint'),
      child:  document.getElementById('childHint'),
    };
    const outChildCompact = document.getElementById('childCompact');
    const outChildCsv     = document.getElementById('childCsv');
    const outChildDec     = document.getElementById('childDec');
    const outMotherDec    = document.getElementById('motherDec10');
    const outFatherDec    = document.getElementById('fatherDec10');
    const avgDpSel        = document.getElementById('avgDp');
    const avgNotSel       = document.getElementById('avgNotation');

    // editRecency: array of field names in order of most recent user edit (newest last).
    // Only contains fields the user has typed non-empty values into.
    let editRecency = [];
    let calcField   = null; // which field is currently auto-calculated

    function getDp() { return parseInt(avgDpSel.value, 10); }

    function parseField(name) {
      const el  = inputs[name];
      const str = el.value.trim();
      if (!str) { hints[name].textContent = ''; el.classList.remove('valid', 'error'); return null; }
      const val = parseB20(str, avgNotSel.value);
      if (val === null) {
        hints[name].textContent = 'Invalid input';
        el.classList.add('error'); el.classList.remove('valid');
        return null;
      }
      hints[name].textContent = '';
      el.classList.add('valid'); el.classList.remove('error');
      return val;
    }

    function setCalculated(name, result) {
      const dp = getDp();
      calcField = name;
      inputs[name].value = toCompact(result, dp);
      inputs[name].classList.add('is-calculated');
      inputs[name].classList.remove('valid', 'error');
      hints[name].textContent = '';
    }

    function clearCalculated(name) {
      if (calcField !== name) return;
      inputs[name].value = '';
      inputs[name].classList.remove('is-calculated', 'valid', 'error');
      hints[name].textContent = '';
      calcField = null;
    }

    function clearOutputs() {
      outChildCompact.textContent = '—';
      outChildCsv.textContent     = '—';
      outChildDec.textContent     = '—';
      outMotherDec.textContent    = '—';
      outFatherDec.textContent    = '—';
    }

    function updateOutputs(vals) {
      const dp = getDp();
      outMotherDec.textContent    = vals.mother != null ? vals.mother.toFixed(dp) : '—';
      outFatherDec.textContent    = vals.father != null ? vals.father.toFixed(dp) : '—';
      outChildCompact.textContent = vals.child  != null ? toCompact(vals.child, dp) : '—';
      outChildCsv.textContent     = vals.child  != null ? toCsv(vals.child, dp)     : '—';
      outChildDec.textContent     = vals.child  != null ? vals.child.toFixed(dp)    : '—';
    }

    function recalculate() {
      // Decide which field to calculate:
      // - If exactly one field is empty (and not the calc field), calculate that one.
      // - If all three have values (the two user fields + the calc field), recalculate calcField.
      // - Otherwise clear.
      const emptyFields = FIELDS.filter(f => inputs[f].value.trim() === '');

      let toCalc = null;
      if (emptyFields.length === 1) {
        toCalc = emptyFields[0];
      } else if (emptyFields.length === 0 && calcField) {
        toCalc = calcField;
      } else {
        // Can't solve — clear any stale calc field and outputs
        if (calcField) clearCalculated(calcField);
        clearOutputs();
        return;
      }

      // Parse the two source fields
      const sources = FIELDS.filter(f => f !== toCalc);
      const v = {};
      let allValid = true;
      for (const f of sources) {
        const parsed = parseField(f);
        if (parsed === null) { allValid = false; } else { v[f] = parsed; }
      }

      if (!allValid) {
        clearCalculated(toCalc);
        clearOutputs();
        return;
      }

      // Compute
      let result;
      if      (toCalc === 'child')  result = (v.mother + v.father) / 2;
      else if (toCalc === 'mother') result = 2 * v.child - v.father;
      else                          result = 2 * v.child - v.mother;

      setCalculated(toCalc, result);
      v[toCalc] = result;
      updateOutputs(v);
    }

    function onInput(name) {
      const el    = inputs[name];
      const empty = el.value.trim() === '';

      // User has taken over the calc field — it's now user-edited
      if (name === calcField) {
        el.classList.remove('is-calculated');
        calcField = null;
      }

      // Update recency list
      editRecency = editRecency.filter(f => f !== name);
      if (!empty) editRecency.push(name);

      recalculate();
    }

    inputs.mother.addEventListener('input', () => onInput('mother'));
    inputs.father.addEventListener('input', () => onInput('father'));
    inputs.child.addEventListener('input',  () => onInput('child'));
    avgDpSel.addEventListener('change', recalculate);
    avgNotSel.addEventListener('change', () => {
      const ph = avgNotSel.value === 'compact' ? 'e.g. 2D8' : 'e.g. 2,13,8';
      FIELDS.forEach(f => inputs[f].placeholder = ph);
      recalculate();
    });
  }

  // ── Blood Shadow (shadow.html) ───────────────────────────────────────────

  if (document.getElementById('taintIn')) {
    const taintIn      = document.getElementById('taintIn');
    const taintB10     = document.getElementById('taintB10');
    const taintHint    = document.getElementById('taintHint');
    const taintB10Hint = document.getElementById('taintB10Hint');
    const outCompact   = document.getElementById('shadowCompact');
    const outCsv       = document.getElementById('shadowCsv');
    const outDec       = document.getElementById('shadowDec');
    const dpSel        = document.getElementById('shadowDp');
    const notSel       = document.getElementById('shadowNotation');
    let   activeField  = 'b20';

    function clearOut() {
      outCompact.textContent = '—';
      outCsv.textContent     = '—';
      outDec.textContent     = '—';
    }

    function renderShadow(taintVal) {
      const dp     = parseInt(dpSel.value, 10);
      const shadow = taintVal * 20;
      outCompact.textContent = toCompact(shadow, dp);
      outCsv.textContent     = toCsv(shadow, dp);
      outDec.textContent     = shadow.toFixed(dp);
    }

    function fromB20() {
      const str = taintIn.value.trim();
      if (!str) {
        taintHint.textContent = ''; taintIn.className = '';
        taintB10.value = ''; taintB10Hint.textContent = ''; taintB10.className = '';
        clearOut(); return;
      }
      const val = parseB20(str, notSel.value);
      if (val === null) {
        taintHint.textContent = notSel.value === 'compact'
          ? 'Use digits 0–9 and A–J (e.g. 2D8)'
          : 'Comma-separated 0–19 groups (e.g. 2,13,8)';
        taintIn.className = 'error'; clearOut(); return;
      }
      taintHint.textContent = ''; taintIn.className = 'valid';
      taintB10.value = ''; taintB10Hint.textContent = ''; taintB10.className = '';
      taintB10.value = val.toFixed(parseInt(dpSel.value, 10));
      renderShadow(val);
    }

    function fromB10() {
      const str = taintB10.value.trim();
      if (!str) {
        taintB10Hint.textContent = ''; taintB10.className = '';
        taintIn.value = ''; taintHint.textContent = ''; taintIn.className = '';
        clearOut(); return;
      }
      const val = parseFloat(str);
      if (isNaN(val)) {
        taintB10Hint.textContent = 'Invalid decimal number';
        taintB10.className = 'error'; clearOut(); return;
      }
      taintB10Hint.textContent = ''; taintB10.className = 'valid';
      const dp = parseInt(dpSel.value, 10);
      taintIn.value = ''; taintHint.textContent = ''; taintIn.className = '';
      taintIn.value = toCompact(val, dp);
      notSel.value = 'compact';
      renderShadow(val);
    }

    taintIn.addEventListener('input',  () => { activeField = 'b20'; fromB20(); });
    taintB10.addEventListener('input', () => { activeField = 'b10'; fromB10(); });
    dpSel.addEventListener('change',   () => activeField === 'b20' ? fromB20() : fromB10());
    notSel.addEventListener('change',  () => {
      taintIn.placeholder = notSel.value === 'compact' ? 'e.g. 2D8' : 'e.g. 2,13,8';
      if (activeField === 'b20') fromB20();
    });
  }

}); // end DOMContentLoaded