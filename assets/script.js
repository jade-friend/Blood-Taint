const COMPACT_DIGITS = '0123456789ABCDEFGHIJ';

function parseCompact(str) {
  str = str.trim().toUpperCase();
  if (!str) return null;
  const parts = str.split('.');
  if (parts.length > 2) return null;
  const intPart = parts[0];
  const fracPart = parts[1] || '';
  if (!/^[0-9A-J]*$/.test(intPart) || !/^[0-9A-J]*$/.test(fracPart)) return null;
  if (intPart === '' && fracPart === '') return null;
  let val = 0;
  for (let i = 0; i < intPart.length; i++) val = val * 20 + COMPACT_DIGITS.indexOf(intPart[i]);
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
  const intGroups = parseGroups(sides[0]);
  if (intGroups === null) return null;
  const fracGroups = sides.length === 2 ? parseGroups(sides[1]) : [];
  if (fracGroups === null) return null;
  if (intGroups.length === 0 && fracGroups.length === 0) return null;
  let val = 0;
  for (let i = 0; i < intGroups.length; i++) val = val * 20 + intGroups[i];
  for (let i = 0; i < fracGroups.length; i++) val += fracGroups[i] / Math.pow(20, i + 1);
  return val;
}

function parseB20(str, notation) {
  return notation === 'compact' ? parseCompact(str) : parseCsv(str);
}

function toCompact(val, dp) {
  if (val < 0) return '-' + toCompact(-val, dp);
  const intVal = Math.floor(val);
  const fracVal = val - intVal;
  let intStr = '';
  if (intVal === 0) { intStr = '0'; }
  else { let n = intVal; while (n > 0) { intStr = COMPACT_DIGITS[n % 20] + intStr; n = Math.floor(n / 20); } }
  if (dp === 0) return intStr;
  let fracStr = '';
  let f = fracVal;
  for (let i = 0; i < dp; i++) { f *= 20; const d = Math.floor(f + 1e-12); fracStr += COMPACT_DIGITS[Math.min(d, 19)]; f -= d; }
  fracStr = fracStr.replace(/0+$/, '');
  return fracStr ? intStr + '.' + fracStr : intStr;
}

function toCsv(val, dp) {
  if (val < 0) return '-' + toCsv(-val, dp);
  const intVal = Math.floor(val);
  const fracVal = val - intVal;
  let intGroups = [];
  if (intVal === 0) { intGroups = [0]; }
  else { let n = intVal; while (n > 0) { intGroups.unshift(n % 20); n = Math.floor(n / 20); } }
  const intStr = intGroups.join(',');
  if (dp === 0) return intStr;
  let fracGroups = [];
  let f = fracVal;
  for (let i = 0; i < dp; i++) { f *= 20; const d = Math.floor(f + 1e-12); fracGroups.push(Math.min(d, 19)); f -= d; }
  while (fracGroups.length && fracGroups[fracGroups.length - 1] === 0) fracGroups.pop();
  return fracGroups.length ? intStr + '.' + fracGroups.join(',') : intStr;
}

// ── Converter ──
const b20in = document.getElementById('b20in');
const b10in = document.getElementById('b10in');
const b20hint = document.getElementById('b20hint');
const b10hint = document.getElementById('b10hint');
const outCompact = document.getElementById('outCompact');
const outCsv = document.getElementById('outCsv');
const outDec = document.getElementById('outDec');
const dpSel = document.getElementById('dp');
const notationSel = document.getElementById('inputNotation');
const swapBtn = document.getElementById('swapBtn');
let activeField = 'b20';

function clearConv() { outCompact.textContent = '—'; outCsv.textContent = '—'; outDec.textContent = '—'; }

function convertFromB20() {
  const str = b20in.value.trim();
  const notation = notationSel.value;
  if (!str) { clearConv(); b20hint.textContent = ''; b20in.className = ''; return; }
  const val = parseB20(str, notation);
  if (val === null) {
    b20hint.textContent = notation === 'compact'
      ? 'Use digits 0–9 and A–J (e.g. 2D8 or 2D8.A3)'
      : 'Comma-separated 0–19 groups (e.g. 2,13,8 or 2,13,8.5,3)';
    b20hint.className = 'hint';
    b20in.className = 'error';
    clearConv(); return;
  }
  b20hint.textContent = ''; b20in.className = 'valid';
  b10in.value = ''; b10hint.textContent = ''; b10in.className = '';
  const dp = parseInt(dpSel.value, 10);
  outCompact.textContent = toCompact(val, dp);
  outCsv.textContent = toCsv(val, dp);
  outDec.textContent = val.toFixed(dp);
}

function convertFromB10() {
  const str = b10in.value.trim();
  if (!str) { clearConv(); b10hint.textContent = ''; b10in.className = ''; return; }
  const val = parseFloat(str);
  if (isNaN(val)) {
    b10hint.textContent = 'Invalid decimal number'; b10hint.className = 'hint';
    b10in.className = 'error'; clearConv(); return;
  }
  b10hint.textContent = ''; b10in.className = 'valid';
  b20in.value = ''; b20hint.textContent = ''; b20in.className = '';
  const dp = parseInt(dpSel.value, 10);
  outCompact.textContent = toCompact(val, dp);
  outCsv.textContent = toCsv(val, dp);
  outDec.textContent = val.toFixed(dp);
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
  if (dec === '—' || dec === '') return;
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

// ── Averager ──
const motherIn = document.getElementById('motherIn');
const fatherIn = document.getElementById('fatherIn');
const motherHint = document.getElementById('motherHint');
const fatherHint = document.getElementById('fatherHint');
const avgDpSel = document.getElementById('avgDp');
const avgNotSel = document.getElementById('avgNotation');
const childInline = document.getElementById('childInline');
const childCompact = document.getElementById('childCompact');
const childCsv = document.getElementById('childCsv');
const childDec = document.getElementById('childDec');
const motherDec10 = document.getElementById('motherDec10');
const fatherDec10 = document.getElementById('fatherDec10');

function clearAvg() {
  childInline.textContent = '—'; childCompact.textContent = '—';
  childCsv.textContent = '—'; childDec.textContent = '—';
  motherDec10.textContent = '—'; fatherDec10.textContent = '—';
}

function validateParent(inputEl, hintEl, notation) {
  const str = inputEl.value.trim();
  if (!str) { hintEl.textContent = ''; inputEl.className = ''; return null; }
  const val = parseB20(str, notation);
  if (val === null) { hintEl.textContent = 'Invalid input'; hintEl.className = 'hint'; inputEl.className = 'error'; return null; }
  hintEl.textContent = ''; inputEl.className = 'valid';
  return val;
}

function computeAverage() {
  const notation = avgNotSel.value;
  const dp = parseInt(avgDpSel.value, 10);
  const m = validateParent(motherIn, motherHint, notation);
  const f = validateParent(fatherIn, fatherHint, notation);
  if (m !== null) motherDec10.textContent = m.toFixed(dp);
  if (f !== null) fatherDec10.textContent = f.toFixed(dp);
  if (m === null || f === null) { childInline.textContent = '—'; childCompact.textContent = '—'; childCsv.textContent = '—'; childDec.textContent = '—'; return; }
  const avg = (m + f) / 2;
  const comp = toCompact(avg, dp);
  childInline.textContent = comp;
  childCompact.textContent = comp;
  childCsv.textContent = toCsv(avg, dp);
  childDec.textContent = avg.toFixed(dp);
}

motherIn.addEventListener('input', computeAverage);
fatherIn.addEventListener('input', computeAverage);
avgDpSel.addEventListener('change', computeAverage);
avgNotSel.addEventListener('change', () => {
  const ph = avgNotSel.value === 'compact' ? 'e.g. 2D8' : 'e.g. 2,13,8';
  motherIn.placeholder = ph; fatherIn.placeholder = ph;
  computeAverage();
});