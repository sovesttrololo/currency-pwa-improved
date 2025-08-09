/* Reactive converter with formatted inputs and postfixes */

function onlyDigitsAndSep(s, allowDecimal){
  if (s===null) return '';
  let out = '';
  for (let ch of s){
    if (ch >= '0' && ch <= '9') out += ch;
    if (allowDecimal && (ch === '.' || ch === ',' ) && !out.includes('.')) out += '.';
  }
  return out;
}

function formatNumberForDisplay(nStr, allowDecimal){
  if (nStr === '' || nStr === null) return '';
  let parts = nStr.split('.');
  let intPart = parts[0] || '0';
  intPart = intPart.replace(/^0+(?=\d)/, '');
  let intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  if (allowDecimal && parts.length>1){
    return intFormatted + ',' + parts[1].slice(0,2);
  }
  return intFormatted;
}

function parseInputValue(val){
  if (!val) return NaN;
  val = String(val).replace(/\s+/g,'').replace(',','.').replace(/[^\d.-]/g,'');
  const num = Number(val);
  return isNaN(num)?NaN:num;
}

function setFormattedInput(el, rawStr, allowDecimal){
  const cleaned = onlyDigitsAndSep(rawStr, allowDecimal);
  const disp = formatNumberForDisplay(cleaned, allowDecimal);
  el.value = disp;
}

const E = {
  rubUsd: document.getElementById('rubUsd'),
  newUsd: document.getElementById('newUsd'),
  rubEur: document.getElementById('rubEur'),
  usdVndMarket: document.getElementById('usdVndMarket'),
  eurVndMarket: document.getElementById('eurVndMarket'),
  fetchRates: document.getElementById('fetchRates'),
  clearMarket: document.getElementById('clearMarket'),
  usdVndNew: document.getElementById('usdVndNew'),
  usdVndOld: document.getElementById('usdVndOld'),
  eurVndManual: document.getElementById('eurVndManual'),
  marketDiff: document.getElementById('marketDiff'),
  marketDiffText: document.getElementById('marketDiffText'),
  radioUsd: document.getElementById('radioUsd'),
  radioEur: document.getElementById('radioEur'),
  amountRub: document.getElementById('amountRub'),
  amountVnd: document.getElementById('amountVnd'),
  convertBtn: document.getElementById('convertBtn'),
  resetBtn: document.getElementById('resetBtn'),
  out: document.getElementById('out'),
  explain: document.getElementById('explain'),
  diff: document.getElementById('diff')
};

function saveState(){ const s = {
  rubUsd: E.rubUsd.value, newUsd: E.newUsd.checked, rubEur: E.rubEur.value,
  usdVndNew: E.usdVndNew.value, usdVndOld: E.usdVndOld.value, eurVndManual: E.eurVndManual.value,
  amountRub: E.amountRub.value, amountVnd: E.amountVnd.value, currency: (E.radioUsd.checked? 'usd':'eur')
}; localStorage.setItem('vndrub2_state', JSON.stringify(s)); }
function loadState(){
  try{
    const s = JSON.parse(localStorage.getItem('vndrub2_state')||'{}');
    if (!s) return;
    if (s.rubUsd) E.rubUsd.value = s.rubUsd;
    E.newUsd.checked = !!s.newUsd;
    if (s.rubEur) E.rubEur.value = s.rubEur;
    if (s.usdVndNew) E.usdVndNew.value = s.usdVndNew;
    if (s.usdVndOld) E.usdVndOld.value = s.usdVndOld;
    if (s.eurVndManual) E.eurVndManual.value = s.eurVndManual;
    if (s.amountRub) E.amountRub.value = s.amountRub;
    if (s.amountVnd) E.amountVnd.value = s.amountVnd;
    if (s.currency === 'eur') { E.radioEur.checked = true; E.radioUsd.checked = false; }
  }catch(e){ console.log(e); }
}
loadState();

[['rubUsd', true], ['rubEur', true], ['amountRub', true]].forEach(([id, allow])=>{
  const el = document.getElementById(id);
  el.addEventListener('input', (ev)=>{ setFormattedInput(ev.target, ev.target.value, allow); reactiveCompute(); saveState(); });
  el.addEventListener('blur', ()=>{ saveState(); });
});

[['usdVndNew', false], ['usdVndOld', false], ['eurVndManual', false], ['amountVnd', false], ['usdVndMarket', false], ['eurVndMarket', false]].forEach(id=>{
  const el = document.getElementById(id);
  el.addEventListener('input', (ev)=>{ setFormattedInput(ev.target, ev.target.value, false); reactiveCompute(); saveState(); });
  el.addEventListener('blur', ()=>{ saveState(); });
});

function numFrom(el){ return parseInputValue(el.value); }

function activeUsdVnd(){
  const newV = numFrom(E.usdVndNew); const oldV = numFrom(E.usdVndOld);
  return E.newUsd.checked ? (isFinite(newV)? newV : NaN) : (isFinite(oldV)? oldV : NaN);
}

async function fetchMarket(){
  E.fetchRates.disabled = true; E.fetchRates.innerText = 'Загрузка…';
  try{
    const r1 = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=VND');
    const j1 = await r1.json();
    const r2 = await fetch('https://api.exchangerate.host/latest?base=EUR&symbols=VND');
    const j2 = await r2.json();
    if (j1 && j1.rates && j1.rates.VND) E.usdVndMarket.value = Math.round(j1.rates.VND).toLocaleString('ru-RU');
    if (j2 && j2.rates && j2.rates.VND) E.eurVndMarket.value = Math.round(j2.rates.VND).toLocaleString('ru-RU');
  }catch(e){ alert('Ошибка получения биржевых курсов: '+(e.message||e)); }
  finally{ E.fetchRates.disabled = false; E.fetchRates.innerText = 'Подтянуть'; reactiveCompute(); saveState(); }
}

E.fetchRates.addEventListener('click', fetchMarket);
E.clearMarket.addEventListener('click', ()=>{ E.usdVndMarket.value=''; E.eurVndMarket.value=''; reactiveCompute(); saveState(); });

function reactiveCompute(){
  try{
    const rubUsd = numFrom(E.rubUsd), rubEur = numFrom(E.rubEur);
    const usdVndMarket = numFrom(E.usdVndMarket), eurVndMarket = numFrom(E.eurVndMarket);
    const usdVndNew = numFrom(E.usdVndNew), usdVndOld = numFrom(E.usdVndOld), eurVnd = numFrom(E.eurVndManual);
    const amtRub = numFrom(E.amountRub), amtVnd = numFrom(E.amountVnd);
    const currency = E.radioUsd.checked ? 'usd' : 'eur';

    if (!isNaN(usdVndMarket) || !isNaN(eurVndMarket)){
      E.marketDiff.style.display = 'block';
      let parts = [];
      if (!isNaN(usdVndMarket)){
        if (!isNaN(usdVndNew)) parts.push('USD(new): ' + (usdVndNew - usdVndMarket).toLocaleString('ru-RU') + ' ₫');
        if (!isNaN(usdVndOld)) parts.push('USD(old): ' + (usdVndOld - usdVndMarket).toLocaleString('ru-RU') + ' ₫');
      }
      if (!isNaN(eurVndMarket) && !isNaN(eurVnd)) parts.push('EUR: ' + (eurVnd - eurVndMarket).toLocaleString('ru-RU') + ' ₫');
      E.marketDiffText.innerText = parts.length? parts.join(' • ') : '—';
    } else {
      E.marketDiff.style.display = 'none';
    }

    if (!isNaN(amtRub) && amtRub>0){
      if (currency === 'usd'){
        if (!isNaN(rubUsd) && !isNaN(activeUsdVnd())){
          const usd = amtRub / rubUsd;
          const vnd = Math.round(usd * activeUsdVnd());
          E.amountVnd.value = vnd.toLocaleString('ru-RU');
          E.out.innerText = vnd.toLocaleString('ru-RU') + ' ₫';
          E.explain.innerText = `${amtRub.toLocaleString('ru-RU')} ₽ → ${usd.toFixed(2)} $ → ${vnd.toLocaleString('ru-RU')} ₫`;
        }
      } else {
        if (!isNaN(rubEur) && !isNaN(eurVnd)){
          const eur = amtRub / rubEur;
          const vnd = Math.round(eur * eurVnd);
          E.amountVnd.value = vnd.toLocaleString('ru-RU');
          E.out.innerText = vnd.toLocaleString('ru-RU') + ' ₫';
          E.explain.innerText = `${amtRub.toLocaleString('ru-RU')} ₽ → ${eur.toFixed(2)} € → ${vnd.toLocaleString('ru-RU')} ₫`;
        }
      }
    } else if (!isNaN(amtVnd) && amtVnd>0){
      if (currency === 'usd'){
        if (!isNaN(rubUsd) && !isNaN(activeUsdVnd())){
          const usd = amtVnd / activeUsdVnd();
          const rub = usd * rubUsd;
          E.amountRub.value = Math.round(rub).toLocaleString('ru-RU');
          E.out.innerText = Math.round(rub).toLocaleString('ru-RU') + ' ₽';
          E.explain.innerText = `${amtVnd.toLocaleString('ru-RU')} ₫ → ${usd.toFixed(2)} $ → ${Math.round(rub).toLocaleString('ru-RU')} ₽`;
        }
      } else {
        if (!isNaN(rubEur) && !isNaN(eurVnd)){
          const eur = amtVnd / eurVnd;
          const rub = eur * rubEur;
          E.amountRub.value = Math.round(rub).toLocaleString('ru-RU');
          E.out.innerText = Math.round(rub).toLocaleString('ru-RU') + ' ₽';
          E.explain.innerText = `${amtVnd.toLocaleString('ru-RU')} ₫ → ${eur.toFixed(2)} € → ${Math.round(rub).toLocaleString('ru-RU')} ₽`;
        }
      }
    }

    let diffText = '—';
    try{
      if (currency === 'usd'){
        if (!isNaN(activeUsdVnd()) && !isNaN(rubUsd) && !isNaN(eurVnd) && !isNaN(rubEur)){
          const baseVnd = (!isNaN(amtVnd) && amtVnd>0) ? amtVnd : ( (!isNaN(amtRub) && amtRub>0 && !isNaN(activeUsdVnd())) ? Math.round((amtRub/rubUsd)*activeUsdVnd()) : NaN);
          if (!isNaN(baseVnd)){
            const primaryRub = (baseVnd/activeUsdVnd())*rubUsd;
            const altRub = (baseVnd/eurVnd)*rubEur;
            const diffRub = Math.round(altRub - primaryRub);
            const diffVnd = Math.round( (diffRub / rubUsd) * activeUsdVnd() );
            const sign = diffVnd>0 ? 'Потери' : 'Экономия';
            diffText = `${sign} ${Math.abs(diffVnd).toLocaleString('ru-RU')} ₫ (${Math.abs(diffRub).toLocaleString('ru-RU')} ₽) если бы обмен был EUR/USD`;
          }
        }
      } else {
        if (!isNaN(eurVnd) && !isNaN(rubEur) && !isNaN(activeUsdVnd()) && !isNaN(rubUsd)){
          const baseVnd = (!isNaN(amtVnd) && amtVnd>0) ? amtVnd : ( (!isNaN(amtRub) && amtRub>0 && !isNaN(eurVnd)) ? Math.round((amtRub/rubEur)*eurVnd) : NaN);
          if (!isNaN(baseVnd)){
            const primaryRub = (baseVnd/eurVnd)*rubEur;
            const altRub = (baseVnd/activeUsdVnd())*rubUsd;
            const diffRub = Math.round(altRub - primaryRub);
            const diffVnd = Math.round( (diffRub / rubUsd) * activeUsdVnd() );
            const sign = diffVnd>0 ? 'Потери' : 'Экономия';
            diffText = `${sign} ${Math.abs(diffVnd).toLocaleString('ru-RU')} ₫ (${Math.abs(diffRub).toLocaleString('ru-RU')} ₽) если бы обмен был USD/EUR`;
          }
        }
      }
    }catch(e){ console.log(e); }
    E.diff.innerText = diffText;
  }catch(e){ console.log(e); }
}

document.querySelectorAll('input').forEach(inp=>{
  inp.addEventListener('input', ()=>{ reactiveCompute(); saveState(); });
  inp.addEventListener('change', ()=>{ reactiveCompute(); saveState(); });
});

E.convertBtn.addEventListener('click', ()=>{ reactiveCompute(); });
E.resetBtn.addEventListener('click', ()=>{ localStorage.removeItem('vndrub2_state'); location.reload(); });

setTimeout(reactiveCompute, 250);

if ('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js').catch(()=>console.log('SW fail')); }
