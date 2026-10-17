/* Mark 40 — shared behaviour for the cover and both option pages.
   Reads window.MARK40 (assets/config.js) and window.TRIP (set on each page).
   Option pages also load a scene file that sets window.SCENE_DEF. */
(function(){
'use strict';
const M = window.MARK40, T = window.TRIP || { page: 'cover' };
const OPT = T.option ? M.options[T.option] : null;

/* ---------- helpers ---------- */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const LS={ get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},
           set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}, del(k){try{localStorage.removeItem(k)}catch(e){}} };
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const addDays=(d,n)=>{const t=new Date(d+'T00:00:00Z');t.setUTCDate(t.getUTCDate()+n);return t.toISOString().slice(0,10)};
const daysBetween=(a,b)=>Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/864e5);
const endOfDay=d=>new Date(d+'T23:59:00'+M.tzOffset);
const fmt=(d,o)=>new Intl.DateTimeFormat(undefined,Object.assign({timeZone:'UTC'},o||{day:'numeric',month:'short',year:'numeric'})).format(new Date(d+'T00:00:00Z'));
const fmtShort=d=>fmt(d,{day:'numeric',month:'short'});
const fmtLong=d=>fmt(d,{weekday:'short',day:'numeric',month:'short',year:'numeric'});
function today(){ try{return new Intl.DateTimeFormat('en-CA',{timeZone:M.tzName,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}catch(e){return new Date().toISOString().slice(0,10)} }
function tripRange(){
  const f=new Intl.DateTimeFormat(undefined,{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}), a=new Date(M.start+'T00:00:00Z'), b=new Date(M.end+'T00:00:00Z');
  try{ return f.formatRange(a,b) }catch(e){ return f.format(a)+' – '+f.format(b) }
}
function rel(due){ const n=daysBetween(today(),due); if(n===0)return'Today'; if(n===1)return'Tomorrow'; if(n>1)return`In ${n} days`; return n===-1?'Yesterday':`${-n} days ago` }
const aud=n=>'A$'+Math.round(n).toLocaleString('en-AU');
const audRange=([a,b])=>`A$${a.toLocaleString('en-AU')}–${b.toLocaleString('en-AU')}`;
function toast(msg){ const t=$('#toast'); if(!t) return; t.textContent=msg; t.classList.add('show'); clearTimeout(toast._t); toast._t=setTimeout(()=>t.classList.remove('show'),3200) }
const REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;
const isIOS=/iP(hone|od|ad)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const NS='http://www.w3.org/2000/svg';
const LEAF='M0 0C4-6 13-8 21-3C15 3 6 5 0 0Z';
const prefName=p=>p==='either'?'Happy with either':M.options[p]?`${M.options[p].label}: ${M.options[p].name}`:'—';
const prefBudget=p=>p==='either'||!M.options[p]?[Math.min(...Object.values(M.options).map(o=>o.budget[0])),Math.max(...Object.values(M.options).map(o=>o.budget[1]))]:M.options[p].budget;

/* ---------- state ---------- */
let me = LS.get('m40.me', null);
let myRsvp = null;
let done = LS.get('m40.done.'+(T.option||'cover'), {});

/* ---------- API (Apps Script, or local preview) ---------- */
const DEMO = !M.API_URL;
const rnd=()=>Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>b.toString(16).padStart(2,'0')).join('');
async function api(action,payload){
  if(DEMO) return demoApi(action,payload||{});
  const res=await fetch(M.API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(Object.assign({action},payload))});
  if(!res.ok) throw new Error('HTTP '+res.status);
  return res.json();
}
const tally=votes=>{ const t={angkor:0,danang:0}; Object.values(votes).forEach(v=>{ if(t[v.option]!=null) t[v.option]++ }); return t };
const nn=x=>String(x||'').trim().toLowerCase().replace(/\s+/g,' ');
function demoApi(action,p){
  const db=LS.get('m40.demo',{rsvps:{}});
  const email=String(p.email||(p.rsvp&&p.rsvp.email)||'').trim().toLowerCase();
  let out={ok:false,error:'unknown_action'};
  if(action==='upsert'){
    const ex=db.rsvps[email];
    if(ex && ex.token!==p.token) out={ok:false,error:'exists'};
    else{
      const now=new Date().toISOString();
      const r=Object.assign({},ex,p.rsvp,{email,token:ex?ex.token:rnd(),createdAt:ex?ex.createdAt:now,updatedAt:now,sequence:ex?ex.sequence+1:0});
      delete r.website; db.rsvps[email]=r; LS.set('m40.demo',db); out={ok:true,rsvp:r,token:r.token};
    }
  } else if(action==='get'){ const r=db.rsvps[email]; out=r&&r.token===p.token?{ok:true,rsvp:r}:{ok:false,error:'not_found'} }
  else if(action==='sendLink'){ out={ok:true} }
  else if(action==='export'){ out={ok:true,rsvps:Object.values(db.rsvps),votes:Object.entries(db.votes||{}).map(([id,v])=>Object.assign({voter:id.slice(0,6)},v)),voteOpen:!db.voteClosed} }
  else if(action==='vote'){
    db.votes=db.votes||{};
    if(db.voteClosed) out={ok:false,error:'closed',results:tally(db.votes)};
    else if(db.votes[p.voter]) out={ok:false,error:'already',mine:db.votes[p.voter]};
    else if(Object.values(db.votes).some(v=>nn(v.name)===nn(p.name))) out={ok:false,error:'name_taken',message:'Someone has already voted with that name. If that was you, you\'re all set. If not, add your surname or message Mark.'};
    else { db.votes[p.voter]={name:String(p.name).trim().slice(0,60),option:p.option,at:new Date().toISOString()}; LS.set('m40.demo',db); out={ok:true} }
  }
  else if(action==='removeVote'){ const k=Object.keys(db.votes||{}).filter(x=>x.indexOf(p.id)===0); if(k.length===1){ delete db.votes[k[0]]; LS.set('m40.demo',db); out={ok:true} } else out={ok:false,error:'not_found'} }
  else if(action==='voteStatus'){ const v=(db.votes||{})[p.voter]; out={ok:true,open:!db.voteClosed,mine:v||null,results:db.voteClosed?tally(db.votes||{}):null} }
  else if(action==='closeVote'||action==='reopenVote'){ db.voteClosed=action==='closeVote'; LS.set('m40.demo',db); out={ok:true,open:!db.voteClosed} }
  return new Promise(r=>setTimeout(()=>r(out),350));
}

/* ---------- calendar ---------- */
const icsEsc=s=>String(s||'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
const icsDate=d=>d.replace(/-/g,'');
const icsUTC=t=>new Date(t).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
function fold(line){ const out=[]; while(line.length>73){out.push(line.slice(0,73)); line=' '+line.slice(73)} out.push(line); return out.join('\r\n') }
function buildICS(events){
  const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Mark 40//RSVP//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
  const stamp=icsUTC(Date.now());
  events.forEach(e=>{
    L.push('BEGIN:VEVENT','UID:'+e.uid,'DTSTAMP:'+stamp,'SEQUENCE:'+(e.seq||0));
    if(e.allDay) L.push('DTSTART;VALUE=DATE:'+icsDate(e.start),'DTEND;VALUE=DATE:'+icsDate(addDays(e.end||e.start,1)));
    else L.push('DTSTART:'+icsUTC(e.start),'DTEND:'+icsUTC(e.end));
    L.push('SUMMARY:'+icsEsc(e.summary));
    if(e.description) L.push('DESCRIPTION:'+icsEsc(e.description));
    if(e.location) L.push('LOCATION:'+icsEsc(e.location));
    (e.alarms||[]).forEach(a=>L.push('BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+icsEsc(e.summary),'TRIGGER:'+a,'END:VALARM'));
    L.push('END:VEVENT');
  });
  L.push('END:VCALENDAR');
  return L.map(fold).join('\r\n')+'\r\n';
}
const siteRoot=()=>location.origin+location.pathname.replace(/[^/]*$/,'');
const uidKey=()=>(myRsvp&&myRsvp.token)||'guest';
function tripEvent(r){
  const a=(r&&r.arrive)||M.start, b=(r&&r.depart)||M.end;
  return {uid:`trip-${uidKey()}@mark40`,allDay:true,start:a,end:b,summary:`${M.title} · Saigon`,location:M.meet,alarms:['-P14D','-PT15H'],
    description:`${M.host}'s 40th. Starts and finishes in Saigon.\nYour dates: ${fmtLong(a)} to ${fmtLong(b)}.\nDetails and changes: ${siteRoot()}`};
}
function deadlineEvents(r){
  return (T.milestones||[]).map(m=>({uid:`ms-${m.id}-${uidKey()}@mark40`,allDay:true,start:dueOf(m,r),summary:`${m.title} (${M.title})`,
    description:m.detail+(m.href&&m.href.startsWith('http')?`\n${m.href}`:`\n${siteRoot()}${OPT?OPT.page:''}#dates`),alarms:['-P6DT15H','-PT15H']}));
}
function gcalLink(e){
  const dates=e.allDay?`${icsDate(e.start)}/${icsDate(addDays(e.end||e.start,1))}`:`${icsUTC(e.start)}/${icsUTC(e.end)}`;
  return 'https://calendar.google.com/calendar/render?'+new URLSearchParams({action:'TEMPLATE',text:e.summary,dates,details:e.description||'',location:e.location||''});
}
function outlookLink(e,work){
  const base=work?'https://outlook.office.com/calendar/0/action/compose':'https://outlook.live.com/calendar/0/action/compose';
  const p={rru:'addevent',subject:e.summary,body:e.description||'',location:e.location||'',startdt:e.start,enddt:addDays(e.end||e.start,1),allday:'true'};
  return base+'?'+new URLSearchParams(p);
}
function downloadICS(name,text){
  if(isIOS){ location.href='data:text/calendar;charset=utf-8,'+encodeURIComponent(text); return }
  const url=URL.createObjectURL(new Blob([text],{type:'text/calendar;charset=utf-8'}));
  const a=document.createElement('a'); a.href=url; a.download=name; document.body.append(a); a.click();
  setTimeout(()=>{URL.revokeObjectURL(url);a.remove()},1500);
}

/* ---------- milestones ---------- */
function dueOf(m){ return m.due }
function isDone(m){ return m.id==='rsvp'? !!myRsvp : !!done[m.id] }
function renderTimeline(){
  const box=$('#timeline'); if(!box) return;
  const t=today();
  const items=(T.milestones||[]).map(m=>({m,due:dueOf(m),opens:m.opens||null})).sort((a,b)=>a.due.localeCompare(b.due));
  box.innerHTML=items.map(({m,due,opens})=>{
    const d=isDone(m), n=daysBetween(t,due);
    let chip;
    if(d) chip='<span class="chip ok">Done</span>';
    else if(opens && daysBetween(t,opens)>0) chip=`<span class="chip">Opens ${esc(fmtShort(opens))}</span>`;
    else if(n<0) chip='<span class="chip bad">Overdue</span>';
    else if(n<=14) chip=`<span class="chip warn">${esc(rel(due))}</span>`;
    else chip=`<span class="chip">${esc(rel(due))}</span>`;
    const link=m.href?(m.href.startsWith('#')?` <a href="${m.href}">Go</a>`:` <a href="${m.href}" target="_blank" rel="noopener">Open site</a>`):'';
    const box2=m.id==='rsvp'?`<input type="checkbox" ${d?'checked':''} disabled aria-label="RSVP sent">`:`<input type="checkbox" data-ms="${m.id}" ${d?'checked':''} aria-label="Mark ${esc(m.title)} done">`;
    return `<li class="ms${d?' done':''}">${box2}<div class="t"><strong>${esc(m.title)}</strong><span class="small muted">${esc(m.detail)}${link}</span></div><div class="when"><span class="mono">${esc(fmtShort(due))}</span>${chip}</div></li>`;
  }).join('');
  const next=items.find(x=>!isDone(x.m)&&daysBetween(t,x.due)>=0);
  const nu=$('#next-up'); if(nu) nu.innerHTML=next?`Next up: <b>${esc(next.m.title)}</b> · ${esc(rel(next.due).toLowerCase())}`:'All caught up.';
}
document.addEventListener('change',e=>{
  const id=e.target.dataset&&e.target.dataset.ms; if(!id) return;
  if(e.target.checked) done[id]=true; else delete done[id];
  LS.set('m40.done.'+(T.option||'cover'),done); renderTimeline(); renderBar();
});
const addDl=$('#add-deadlines'); if(addDl) addDl.addEventListener('click',()=>downloadICS('mark40-deadlines.ics',buildICS(deadlineEvents(myRsvp))));

/* ---------- static content ---------- */
function renderStatic(){
  $$('.js-start').forEach(e=>e.textContent=fmtLong(M.start));
  $$('.js-end').forEach(e=>e.textContent=fmtLong(M.end));
  $$('.js-rsvpby').forEach(e=>e.textContent=fmtLong(M.rsvpBy));
  $$('.js-range').forEach(e=>e.textContent=tripRange());
  $$('[data-budget]').forEach(e=>e.textContent=audRange(M.options[e.dataset.budget].budget));
  const nights=daysBetween(M.start,M.end);
  const hf=$('#hero-facts'); if(hf) hf.innerHTML=`<span>${esc(tripRange())}</span><span>${nights} nights</span><span>Start and finish in Saigon</span>`;
  const days=$('#days');
  if(days) days.innerHTML=(T.days||[]).map((d,i)=>{
    const date=addDays(M.start,i);
    return `<div class="day${d.key?' key':''}"><div class="d">${esc(fmt(date,{weekday:'short'}))}<b>${esc(fmt(date,{day:'numeric'}))}</b>${esc(fmt(date,{month:'short'}))}</div><div><h3>${esc(d.title)}</h3><p class="muted">${esc(d.text)}</p><div class="tags">${d.where?`<span class="chip">${esc(d.where)}</span>`:''}${d.tag?`<span class="chip must">${esc(d.tag)}</span>`:''}${d.dinner?'<span class="chip">Dinner together</span>':''}</div></div></div>`;
  }).join('');
  const ct=$('#cost-table tbody');
  if(ct) ct.innerHTML=(T.fixed||[]).map(c=>`<tr><td>${esc(c.item)}<small>${esc(c.note)}</small></td><td>${esc(c.amount)}</td></tr>`).join('');
  const bc=$('#budget-chart'); if(bc) renderBudgetChart(bc);
  $$('.btable').forEach(renderBreakdown);
  const diet=$('#diet'); if(diet) diet.innerHTML=M.diet.map((d,i)=>`<input type="checkbox" id="d${i}" name="dietary" value="${esc(d)}"><label for="d${i}">${esc(d)}</label>`).join('');
  ['#f-arrive','#f-depart'].forEach(s=>{const el=$(s); if(el){el.min=M.start;el.max=M.end}});
  if(DEMO) $$('.demo-note').forEach(n=>n.hidden=false);
}
function renderBreakdown(el){
  const rows=M.breakdown||[], keys=Object.keys(M.options), r=([a,b])=>`${aud(a)}–${b.toLocaleString('en-AU')}`;
  const tot=i=>[rows.reduce((s,x)=>s+x[i+1][0],0),rows.reduce((s,x)=>s+x[i+1][1],0)];
  el.innerHTML=`<table class="btab"><thead><tr><th>Per person, AUD</th>${keys.map(k=>`<th class="o${M.options[k].n}">${esc(M.options[k].name.replace('Saigon + ',''))}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(x=>`<tr><th>${esc(x[0])}</th>${keys.map((k,i)=>`<td>${r(x[i+1])}</td>`).join('')}</tr>`).join('')}</tbody>
    <tfoot><tr><th>Total, approx.</th>${keys.map((k,i)=>`<td>${r(tot(i))}</td>`).join('')}</tr></tfoot></table>`;
}
function renderBudgetChart(el){
  const lo=1000, hi=3000, pct=v=>((v-lo)/(hi-lo)*100).toFixed(2)+'%';
  el.innerHTML=Object.entries(M.options).map(([k,o])=>`
    <div class="brow o${o.n}"><div class="who"><small>${esc(o.label)}</small>${esc(o.name)}</div>
      <div class="track2" role="img" aria-label="${esc(o.name)}: ${esc(audRange(o.budget))} per person"><div class="rail"></div>
        <div class="span" style="left:${pct(o.budget[0])};width:calc(${pct(o.budget[1])} - ${pct(o.budget[0])})"></div>
        <span class="lab lo" style="left:${pct(o.budget[0])}">≈ ${esc(aud(o.budget[0]))}</span><span class="lab hi" style="left:${pct(o.budget[1])}">${esc(aud(o.budget[1]))}</span></div></div>`).join('')+
    `<div class="axis" aria-hidden="true"><span>A$1,000</span><span>A$2,000</span><span>A$3,000</span></div>`;
}

/* ---------- countdown + bar ---------- */
function tick(){
  if(!$('#cd')) return;
  const now=Date.now(), rsvpEnd=endOfDay(M.rsvpBy).getTime(), tripStart=new Date(M.start+'T14:00:00'+M.tzOffset).getTime();
  let target,label;
  if(now<rsvpEnd && !myRsvp){target=rsvpEnd;label='RSVP closes in'}
  else if(now<tripStart){target=tripStart;label=myRsvp&&myRsvp.attending==='no'?'Party starts in':'Saigon in'}
  else {target=null;label=now<endOfDay(M.end).getTime()?'Happening now':'That was a week'}
  $('#cd-label').textContent=label;
  if(target==null){$('#cd').hidden=true;return}
  const s=Math.max(0,Math.floor((target-now)/1000));
  $('#cd-d').textContent=Math.floor(s/86400); $('#cd-h').textContent=String(Math.floor(s%86400/3600)).padStart(2,'0');
  $('#cd-m').textContent=String(Math.floor(s%3600/60)).padStart(2,'0'); $('#cd-s').textContent=String(s%60).padStart(2,'0');
}
let rsvpInView=false, voteInView=false;
function renderBar(){
  const bar=$('#bar'); if(!bar) return; let off=false;
  if($('#vote')&&vote.open&&!vote.mine){ $('#bar-label').textContent='Help pick the trip'; $('#bar-when').textContent='Vote takes 10 seconds'; $('#bar-btn').textContent='Vote'; $('#bar-btn').href='#vote'; bar.classList.toggle('hide',voteInView); return }
  if(!myRsvp){ $('#bar-label').textContent='RSVP by'; $('#bar-when').textContent=`${fmtShort(M.rsvpBy)} · ${rel(M.rsvpBy).toLowerCase()}`; $('#bar-btn').textContent='RSVP'; $('#bar-btn').href='#rsvp'; }
  else {
    const next=(T.milestones||[]).map(m=>({m,due:dueOf(m)})).filter(x=>!isDone(x.m)&&daysBetween(today(),x.due)>=0).sort((a,b)=>a.due.localeCompare(b.due))[0];
    if(myRsvp.attending==='yes'&&next&&$('#dates')){ $('#bar-label').textContent='Next: '+next.m.title; $('#bar-when').textContent=`${fmtShort(next.due)} · ${rel(next.due).toLowerCase()}`; $('#bar-btn').textContent='Checklist'; $('#bar-btn').href='#dates'; }
    else off=true;
  }
  bar.classList.toggle('hide',off||rsvpInView);
}
if($('#rsvp')) new IntersectionObserver(es=>es.forEach(e=>{ rsvpInView=e.isIntersecting; renderBar() }),{threshold:.05}).observe($('#rsvp'));
if($('#vote')) new IntersectionObserver(es=>es.forEach(e=>{ voteInView=e.isIntersecting; renderBar() }),{threshold:.05}).observe($('#vote'));

/* ---------- RSVP form ---------- */
const form=$('#rsvp-form');
function setAttending(v){
  $('#yes-fields').hidden=v!=='yes';
  if(v==='yes'){
    if(!$('#f-arrive').value) $('#f-arrive').value=M.start; if(!$('#f-depart').value) $('#f-depart').value=M.end;
    nightsNote(); markFilled();
  }
}
function nightsNote(){ const a=$('#f-arrive').value,b=$('#f-depart').value; $('#nights-note').textContent=a&&b&&b>a?`${daysBetween(a,b)} nights`:'' }
function markFilled(){ $$('.field',form).forEach(f=>{ const i=f.querySelector('input,textarea'); f.classList.toggle('filled',!!(i&&i.value.trim())) }) }
function readForm(){
  const fd=new FormData(form);
  return { name:(fd.get('name')||'').trim(), email:(fd.get('email')||'').trim().toLowerCase(), attending:fd.get('attending')||'',
    arrive:fd.get('arrive')||'', depart:fd.get('depart')||'', dietary:fd.getAll('dietary'), dietaryNotes:(fd.get('dietaryNotes')||'').trim(),
    phone:(fd.get('phone')||'').trim(), notes:(fd.get('notes')||'').trim(), website:fd.get('website')||'' };
}
function fillForm(r){
  $('#f-name').value=r.name||''; $('#f-email').value=r.email||'';
  $$('input[name=attending]').forEach(i=>i.checked=i.value===r.attending);
  $('#f-arrive').value=r.arrive||''; $('#f-depart').value=r.depart||'';
  $$('#diet input').forEach(i=>i.checked=(r.dietary||[]).includes(i.value));
  $('#f-allergy').value=r.dietaryNotes||''; $('#f-phone').value=r.phone||''; $('#f-notes').value=r.notes||'';
  setAttending(r.attending); nightsNote(); markFilled();
}
function validate(r){
  const errs=[];
  const bad=(sel,msg)=>{ const f=$(sel).closest('.field'); if(f) f.classList.add('invalid'); errs.push(msg) };
  if(!r.name) bad('#f-name','Add your name.');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(r.email)) bad('#f-email','Check your email address.');
  if(!r.attending) errs.push('Choose whether you can make it.');
  if(r.attending==='yes'){
    if(!r.arrive||!r.depart) bad('#f-arrive','Add your arrival and leaving dates.');
    else if(r.depart<=r.arrive) bad('#f-depart','Your leaving date needs to be after your arrival.');
    else if(r.arrive<M.start||r.depart>M.end) bad('#f-arrive',`Pick dates between ${fmtShort(M.start)} and ${fmtShort(M.end)}. Arriving earlier? Say so in the notes.`);
  }
  return errs;
}
function showErr(msg,html){ const e=$('#form-err'); if(!msg){e.hidden=true;return} e.hidden=false; if(html) e.innerHTML=msg; else e.textContent=msg }
async function sendLink(email){
  email=(email||$('#f-email').value||'').trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)){ showErr('Type your email in the form first, then tap the link again.'); $('#f-email').focus(); return }
  try{ await api('sendLink',{email}); showErr(''); toast(DEMO?'Preview mode: links are emailed once the backend is connected.':'If you\'ve RSVP\'d, a link is on its way to '+email); }
  catch(e){ showErr('We couldn\'t send the link. Try again shortly.') }
}
function wireForm(){
  if(!form) return;
  form.addEventListener('change',e=>{ if(e.target.name==='attending') setAttending(e.target.value);
    if(e.target.name==='dietary'){ const none=$('#diet input[value="No requirements"]'); if(e.target===none&&none.checked) $$('#diet input').forEach(i=>{if(i!==none)i.checked=false}); else if(e.target!==none&&e.target.checked) none.checked=false; }
    if(e.target.id==='f-arrive'||e.target.id==='f-depart') nightsNote();
  });
  $('#whole-week').addEventListener('click',()=>{ $('#f-arrive').value=M.start; $('#f-depart').value=M.end; nightsNote(); markFilled() });
  form.addEventListener('input',e=>{ const f=e.target.closest('.field'); if(f){ f.classList.toggle('filled',!!e.target.value.trim()); f.classList.remove('invalid') } });
  form.addEventListener('submit',async e=>{
    e.preventDefault(); showErr('');
    const r=readForm(); const errs=validate(r);
    if(errs.length){ showErr(errs[0]); return }
    if(r.attending==='no'){ r.arrive=''; r.depart=''; }
    const btn=$('#submit'); btn.disabled=true; btn.textContent='Sending…';
    try{
      const token=me&&me.email===r.email?me.token:undefined;
      const res=await api('upsert',{rsvp:r,token});
      if(res.ok){
        me={email:r.email,token:res.token}; LS.set('m40.me',me); myRsvp=res.rsvp;
        renderAll();
        toast(r.attending==='yes'?'RSVP saved. Check your inbox.':'Thanks for letting us know.');
        $('#rsvp').scrollIntoView({behavior:REDUCED?'auto':'smooth'});
        if(r.attending==='yes') celebrate();
      } else if(res.error==='exists'){
        showErr(`This email has already RSVP'd. For privacy we'll email you a link to edit it. <button type="button" class="btn link small" id="send-link-inline">Email me my link</button>`,true);
        $('#send-link-inline').onclick=()=>sendLink(r.email);
      } else showErr(res.message||'Something went wrong saving your RSVP. Try again in a minute.');
    }catch(err){ showErr('We couldn\'t reach the RSVP server. Check your connection and try again.') }
    finally{ btn.disabled=false; btn.textContent=myRsvp?'Save changes':'Send RSVP' }
  });
  $('#find-btn').addEventListener('click',()=>sendLink());
  $('#cancel-edit').addEventListener('click',()=>renderRsvp());
}
function renderRsvp(editing){
  if(!form||FORM_MODE) return;
  const sum=$('#rsvp-summary');
  if(!myRsvp||editing){
    form.hidden=false; sum.hidden=true;
    $('#cancel-edit').hidden=!myRsvp; $('#find-wrap').hidden=!!myRsvp;
    $('#submit').textContent=myRsvp?'Save changes':'Send RSVP';
    $('#rsvp-title').textContent=myRsvp?'Update your RSVP':'Are you coming?';
    if(myRsvp) fillForm(myRsvp);
    return;
  }
  form.hidden=true; sum.hidden=false;
  const r=myRsvp, yes=r.attending==='yes', first=r.name.split(' ')[0];
  $('#rsvp-title').textContent=yes?`See you in Saigon, ${first}`:`We'll miss you, ${first}`;
  const ev=tripEvent(r), diet=(r.dietary||[]).filter(d=>d!=='No requirements'), nights=yes?daysBetween(r.arrive,r.depart):0;
  sum.innerHTML=`
    <div class="status"><span class="chip ${yes?'ok':''}">${yes?'Going':'Not going'}</span><span class="small muted">Last updated ${esc(new Date(r.updatedAt).toLocaleString(undefined,{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}))}</span></div>
    <dl class="kv">
      <dt>Name</dt><dd>${esc(r.name)}</dd>
      <dt>Email</dt><dd>${esc(r.email)}</dd>
      ${yes?`<dt>Dates</dt><dd>${esc(fmtLong(r.arrive))} → ${esc(fmtLong(r.depart))} <span class="muted">(${nights} nights)</span></dd>
      <dt>Budget</dt><dd>Approx. ${esc(audRange(prefBudget(vote.mine&&vote.mine.option)))} per person</dd>
      <dt>Dietary</dt><dd>${diet.length?esc(diet.join(', ')):'No requirements'}${r.dietaryNotes?`<br><span class="muted small">${esc(r.dietaryNotes)}</span>`:''}</dd>`:''}
      ${r.notes?`<dt>Notes</dt><dd>${esc(r.notes)}</dd>`:''}
    </dl>
    ${yes?`<div class="cal">
      <p class="legend">Add the trip to your calendar</p>
      <p class="small muted">${DEMO?'Once the site is live, a calendar invite is also emailed to you.':'We\'ve also emailed you an invite that works in any calendar.'} The dates are the same whichever option wins.</p>
      <div class="row">
        <a class="btn small" href="${esc(gcalLink(ev))}" target="_blank" rel="noopener">Google</a>
        <button class="btn small" type="button" id="cal-ics">Apple / other</button>
        <a class="btn small" href="${esc(outlookLink(ev))}" target="_blank" rel="noopener">Outlook</a>
      </div>
      <p class="small muted">Work Outlook account? <a href="${esc(outlookLink(ev,true))}" target="_blank" rel="noopener">Use this link</a>.</p>
    </div>
    <div class="row">${$('#dates')?'<a class="btn primary small" href="#dates">Open my checklist</a>':Object.values(M.options).map(o=>`<a class="btn small" href="${o.page}#dates">${esc(o.label)} checklist</a>`).join('')}</div>`:''}
    <div class="row" style="padding-top:.4rem;border-top:1px solid var(--line)">
      <button class="btn small" type="button" id="edit-rsvp">Change my RSVP</button>
      <button class="btn link small" type="button" id="sign-out">Not you, ${esc(first)}?</button>
    </div>`;
  $('#edit-rsvp').onclick=()=>renderRsvp(true);
  $('#sign-out').onclick=()=>{ LS.del('m40.me'); me=null; myRsvp=null; form.reset(); markFilled(); setAttending(''); renderAll(); };
  const ics=$('#cal-ics'); if(ics) ics.onclick=()=>downloadICS('mark40.ics',buildICS([tripEvent(r)]));
}
function renderAll(){ renderRsvp(); renderTimeline(); renderBar(); tick(); const vn=$('#v-name'); if(vn&&!vn.value&&myRsvp){ vn.value=myRsvp.name; vn.closest('.field').classList.add('filled') } }
async function restore(){
  const q=new URLSearchParams(location.search);
  if(q.get('e')&&q.get('t')){ me={email:q.get('e').toLowerCase(),token:q.get('t')}; LS.set('m40.me',me); history.replaceState(null,'',location.pathname+(location.hash||'#rsvp')) }
  if(!me) return;
  try{ const res=await api('get',me); if(res.ok){ myRsvp=res.rsvp } else if(res.error==='not_found'){ LS.del('m40.me'); me=null } }catch(e){}
}

/* ---------- vote: name + option, results hidden until the host closes it ---------- */
const voter=(()=>{ let v=LS.get('m40.voter',null); if(!v){ v=rnd(); LS.set('m40.voter',v) } return v })();
const vote={open:true,mine:LS.get('m40.vote',null),results:null,editing:false};
const optLabel=k=>M.options[k]?`${M.options[k].label}: ${M.options[k].name}`:'';
function renderVoteOpts(){
  const box=$('#vote-opts'); if(!box) return;
  box.innerHTML=Object.entries(M.options).map(([k,o])=>`<input type="radio" name="vopt" id="v-${k}" value="${k}"><label for="v-${k}" class="o${o.n}"><span class="tick"></span><span class="num">${esc(o.label)}</span><strong>${esc(o.name)}</strong><span class="sm">${esc(o.blurb||'')}</span></label>`).join('');
}
const FORM_MODE=!!(M.VOTE_FORM&&!M.API_URL);
function formMode(){
  if(!FORM_MODE) return;
  const rs=$('#rsvp'); if(rs&&!rs.dataset.soon){
    rs.dataset.soon='1';
    rs.innerHTML='<div class="sec-head"><p class="eyebrow">RSVP</p><h2>RSVPs open soon</h2><p class="sub">Vote first. Once the trip is picked, RSVP and calendar invites open here.</p></div>';
  }
  document.querySelectorAll('a[href="#rsvp"]').forEach(a=>{ if(!a.closest('#vote-done')) a.hidden=true });
}
function renderVote(){
  formMode();
  if(!$('#vote')) return;
  const f=$('#vote-form'), done=$('#vote-done'), res=$('#vote-results'), title=$('#vote-title'), sub=$('#vote-sub');
  if(!sub.dataset.text) sub.dataset.text=sub.textContent;
  if(!vote.open){
    f.hidden=true; done.hidden=true; res.hidden=false;
    title.textContent='The votes are in'; sub.textContent='Voting has closed. Here’s how it went.';
    const r=vote.results||{}, tot=Math.max(1,Object.keys(M.options).reduce((s,k)=>s+(r[k]||0),0));
    res.innerHTML=Object.entries(M.options).map(([k,o])=>{ const n=r[k]||0, pc=Math.round(n/tot*100);
      return `<div class="vres o${o.n}"><div class="who"><small>${esc(o.label)}</small>${esc(o.name)}</div><div class="vbar" role="img" aria-label="${pc} percent"><span style="width:${pc}%"></span></div><b class="mono">${pc}%</b><span class="small muted">${n} vote${n===1?'':'s'}</span></div>` }).join('')
      +(vote.mine?`<p class="small muted">You voted for ${esc(optLabel(vote.mine.option))}.</p>`:'');
    return;
  }
  res.hidden=true; sub.textContent=sub.dataset.text;
  if(vote.mine&&!vote.editing){
    f.hidden=true; done.hidden=false; title.textContent='Thanks for voting';
    done.innerHTML=`<p class="vote-thanks">Thanks, ${esc(vote.mine.name)}. You voted for <b>${esc(optLabel(vote.mine.option))}</b>.</p>
      <p class="small muted">Your vote is locked in. Results stay hidden until Mark closes the vote, so nobody’s swayed. Voted by mistake? Message Mark.</p>
      ${$('#rsvp')?'<div class="row"><a class="btn small" href="#rsvp">RSVP too</a></div>':''}`;
  } else {
    f.hidden=false; done.hidden=true; title.textContent='Which one should we do?';
  }
}
function wireVote(){
  const f=$('#vote-form'); if(!f) return;
  const err=$('#vote-err'), say=m=>{ err.textContent=m; err.hidden=!m };
  $('#v-name').addEventListener('input',e=>{ e.target.closest('.field').classList.toggle('filled',!!e.target.value.trim()); say('') });
  f.addEventListener('change',()=>say(''));
  f.addEventListener('submit',async e=>{
    e.preventDefault(); say('');
    const name=$('#v-name').value.trim(), opt=(f.querySelector('input[name=vopt]:checked')||{}).value;
    if(!name){ say('Add your name so Mark knows who voted.'); $('#v-name').focus(); return }
    if(!opt){ say('Pick option 1 or option 2.'); return }
    const btn=$('#vote-btn'); btn.disabled=true; btn.textContent='Sending…';
    try{
      let res;
      if(FORM_MODE){
        if($('#v-website').value) res={ok:true};
        else if(vote.mine) res={ok:false,error:'already',mine:vote.mine};
        else { const F=M.VOTE_FORM, fd=new URLSearchParams(); fd.set(F.nameEntry,name); fd.set(F.pickEntry,F.values[opt]);
          await fetch(F.url,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:fd.toString()}); res={ok:true} }
      } else res=await api('vote',{voter,name,option:opt,website:$('#v-website').value});
      if(res.ok){ vote.mine={name,option:opt}; LS.set('m40.vote',vote.mine); vote.editing=false; renderVote(); renderBar(); toast('Vote saved. Thank you!'); celebrate() }
      else if(res.error==='already'){ vote.mine=res.mine; LS.set('m40.vote',vote.mine); renderVote(); renderBar(); toast('You’ve already voted') }
      else if(res.error==='closed'){ vote.open=false; vote.results=res.results||null; renderVote(); renderBar() }
      else say(res.message||'Something went wrong saving your vote. Try again in a minute.');
    }catch(x){ say('We couldn’t reach the server. Check your connection and try again.') }
    finally{ btn.disabled=false; btn.textContent='Cast my vote' }
  });
}
async function loadVote(){
  if(!$('#vote')) return;
  if(FORM_MODE){ renderVote(); renderBar(); return }
  try{
    const res=await api('voteStatus',{voter});
    if(res.ok){
      vote.open=res.open; vote.results=res.results||null;
      if(res.mine){ vote.mine={name:res.mine.name,option:res.mine.option}; LS.set('m40.vote',vote.mine) }
      else { vote.mine=null; LS.del('m40.vote') }
    }
  }catch(e){}
  renderVote(); renderBar();
}

/* ---------- host view (#admin) ---------- */
async function loadAdmin(key){
  const out=$('#admin-out'); out.innerHTML='<p class="muted small">Loading…</p>';
  try{
    const res=await api('export',{key});
    if(!res.ok){ out.innerHTML='<p class="err">That key didn\'t work. Check ADMIN_KEY in Code.gs.</p>'; return }
    try{sessionStorage.setItem('m40.key',key)}catch(e){}
    const all=res.rsvps.sort((a,b)=>(a.name||'').localeCompare(b.name||''));
    const yes=all.filter(r=>r.attending==='yes'), no=all.filter(r=>r.attending==='no');
    const nights=[]; for(let d=M.start; d<M.end; d=addDays(d,1)) nights.push(d);
    const per=nights.map(d=>yes.filter(r=>r.arrive<=d&&d<r.depart).length), max=Math.max(1,...per);
    const vl=(res.votes||[]).slice().sort((a,b)=>(a.name||'').localeCompare(b.name||''));
    const vt={}; Object.keys(M.options).forEach(k=>vt[k]=vl.filter(v=>v.option===k).length);
    const vtot=Math.max(1,vl.length), norm=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
    const seen={}; vl.forEach(v=>seen[norm(v.name)]=(seen[norm(v.name)]||0)+1);
    const vOpen=res.voteOpen!==false;
    const diet={}; yes.forEach(r=>(r.dietary||[]).filter(x=>x!=='No requirements').forEach(x=>diet[x]=(diet[x]||0)+1));
    out.innerHTML=`
      <div class="admin-stats"><div><b>${yes.length}</b><span>going</span></div><div><b>${no.length}</b><span>can't make it</span></div><div><b>${Math.max(0,...per)}</b><span>peak night</span></div><div><b>${yes.reduce((s,r)=>s+daysBetween(r.arrive,r.depart),0)}</b><span>guest nights</span></div></div>
      <div class="stack"><div class="row" style="justify-content:space-between"><h3>Vote <span class="chip ${vOpen?'ok':''}">${vOpen?'Open · results hidden':'Closed · results showing'}</span></h3>
          <button class="btn small" type="button" id="vote-toggle">${vOpen?'Close the vote and show results':'Reopen the vote'}</button></div>
        <div class="votes nights">${Object.entries(M.options).map(([k,o])=>`<div class="night"><span>${esc(o.label)} · ${esc(o.name.replace('Saigon + ',''))}</span><div class="track"><div class="fill o${o.n}" style="width:${vt[k]/vtot*100}%"></div></div><span class="mono">${vt[k]}</span></div>`).join('')}</div>
        <details><summary>Who voted (${vl.length})</summary><div class="table-wrap"><table class="list"><thead><tr><th>Name</th><th>Pick</th><th>When</th><th></th><th></th></tr></thead><tbody>
          ${vl.map(v=>`<tr><td>${esc(v.name)}</td><td>${esc((M.options[v.option]||{}).label||'—')}</td><td class="mono">${esc(new Date(v.at).toLocaleString(undefined,{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}))}</td><td>${seen[norm(v.name)]>1?'<span class="chip warn">Same name twice</span>':''}</td><td><button class="btn small vrm" type="button" data-id="${esc(v.voter)}" data-name="${esc(v.name)}">Remove</button></td></tr>`).join('')||'<tr><td colspan="5" class="muted">No votes yet.</td></tr>'}
        </tbody></table></div></details></div>
      <div class="stack"><h3>Heads per night</h3><div class="nights">${nights.map((d,i)=>`<div class="night"><span class="mono">${esc(fmt(d,{weekday:'short',day:'numeric'}))}</span><div class="track"><div class="fill" style="width:${per[i]/max*100}%"></div></div><span class="mono">${per[i]}</span></div>`).join('')}</div></div>
      <div class="stack"><h3>Dietary</h3><p>${Object.keys(diet).length?Object.entries(diet).map(([k,v])=>`${esc(k)} <b class="mono">${v}</b>`).join(' · '):'<span class="muted">Nothing flagged yet.</span>'}</p>
        ${yes.filter(r=>r.dietaryNotes).map(r=>`<p class="small"><b>${esc(r.name)}:</b> ${esc(r.dietaryNotes)}</p>`).join('')}</div>
      <div class="stack"><h3>Everyone</h3><div class="table-wrap"><table class="list"><thead><tr><th>Name</th><th>Status</th><th>Dates</th><th>Email</th><th>WhatsApp</th><th>Notes</th></tr></thead><tbody>
        ${all.map(r=>`<tr><td>${esc(r.name)}</td><td>${r.attending==='yes'?'<span class="chip ok">Going</span>':'<span class="chip">No</span>'}</td><td class="mono">${r.attending==='yes'?esc(fmtShort(r.arrive)+'–'+fmtShort(r.depart)):'—'}</td><td>${esc(r.email)}</td><td>${esc(r.phone||'')}</td><td class="wrap">${esc(r.notes||'')}</td></tr>`).join('')||'<tr><td colspan="6" class="muted">No RSVPs yet.</td></tr>'}
      </tbody></table></div></div>
      <div class="row"><button class="btn small" type="button" id="dl-json">Download JSON</button><button class="btn small" type="button" id="copy-emails">Copy guest emails</button></div>`;
    $('#dl-json').onclick=()=>{ const url=URL.createObjectURL(new Blob([JSON.stringify(all.map(({token,...r})=>r),null,2)],{type:'application/json'})); const a=document.createElement('a'); a.href=url; a.download='rsvps.json'; document.body.append(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(url);a.remove()},1500) };
    out.querySelectorAll('.vrm').forEach(b=>b.onclick=async()=>{
      if(b.dataset.armed!=='1'){ b.dataset.armed='1'; b.textContent='Tap again'; setTimeout(()=>{ b.dataset.armed=''; b.textContent='Remove' },4000); return }
      b.disabled=true; const r=await api('removeVote',{key,id:b.dataset.id}); if(!r.ok){ toast('Couldn’t remove that vote.'); b.disabled=false; return }
      toast('Removed '+b.dataset.name+'’s vote. They can vote again.'); loadAdmin(key);
    });
    const vb=$('#vote-toggle'); let armed=false;
    vb.onclick=async()=>{
      if(!armed){ armed=true; vb.textContent=vOpen?'Tap again to close the vote':'Tap again to reopen'; setTimeout(()=>{ if(armed){ armed=false; vb.textContent=vOpen?'Close the vote and show results':'Reopen the vote' } },4000); return }
      vb.disabled=true; const r=await api(vOpen?'closeVote':'reopenVote',{key}); if(!r.ok){ toast('That didn’t work. Check your admin key.'); vb.disabled=false; return }
      toast(vOpen?'Vote closed. Results are now showing.':'Vote reopened.'); loadAdmin(key); loadVote();
    };
    $('#copy-emails').onclick=async()=>{ const t=yes.map(r=>r.email).join(', '); try{await navigator.clipboard.writeText(t);toast('Emails copied')}catch(e){toast(t)} };
  }catch(e){ out.innerHTML='<p class="err">Couldn\'t reach the RSVP server.</p>' }
}
function routeAdmin(){
  const sec=$('#admin'); if(!sec) return;
  const on=location.hash==='#admin'; sec.hidden=!on;
  if(on){ let k=null; try{k=sessionStorage.getItem('m40.key')}catch(e){} if(k||DEMO) loadAdmin(k||''); }
}
if($('#admin-form')) $('#admin-form').addEventListener('submit',e=>{ e.preventDefault(); loadAdmin($('#admin-key').value.trim()) });
addEventListener('hashchange',routeAdmin);

/* ==========================================================
   MONKEY SCENE ENGINE — scenery comes from window.SCENE_DEF
   ========================================================== */
const MK=`<path class="tail" d="M-7 -5C-20 -2 -26 -16 -20 -24C-16 -29 -11 -27 -12 -22"/>
<ellipse class="fur" cx="0" cy="-12" rx="8.5" ry="10.5"/>
<ellipse class="fur" cx="-3" cy="-2.5" rx="6.5" ry="3.5"/>
<ellipse class="fur" cx="6" cy="-2" rx="4.5" ry="2.8"/>
<path class="limb arm-dn" d="M4 -17Q10 -11 8 -5"/>
<path class="limb arm-up" d="M3 -19Q7 -28 4 -36"/>
<path class="held" d="M7 -8q7-1 9-9"/>
<circle class="fur" cx="-3.5" cy="-27" r="2.8"/><circle class="fur" cx="10" cy="-27" r="2.8"/>
<circle class="fur" cx="3.2" cy="-27" r="7.2"/>
<ellipse class="face" cx="5" cy="-25.5" rx="4.4" ry="3.9"/>
<g class="eyes"><circle cx="3.6" cy="-27" r=".95"/><circle cx="6.9" cy="-27" r=".95"/></g>`;

const SCENES=window.SCENES||{};
function sceneHelpers(){
  return { f1:n=>n.toFixed(1), circ:(cx,cy,r)=>`M${cx-r} ${cy}a${r} ${r} 0 1 1 ${2*r} 0a${r} ${r} 0 1 1 ${-2*r} 0Z`,
    rng:seed=>()=>((seed=(seed*9301+49297)%233280)/233280), LEAF };
}
// cover cards: draw each option's real scene, still, no monkeys
function renderCards(){
  $$('svg[data-scene]').forEach(svg=>{ const fn=SCENES[svg.dataset.scene]; if(!fn) return; const def=fn(sceneHelpers()); svg.setAttribute('viewBox',def.cardView); svg.innerHTML=def.art(svg.dataset.scene+'-') });
}
function Scene(defFn){
  const svg=$('#scene'); if(!svg||!defFn) return {celebrate(){}};
  const {f1}=sceneHelpers();
  const def=defFn(sceneHelpers());
  const S=def.S||1.15, HAND=[4,-36];
  const mkEl=(tag,attrs)=>{ const e=document.createElementNS(NS,tag); if(attrs) for(const k in attrs) e.setAttribute(k,attrs[k]); return e };
  const rand=(a,b)=>a+Math.random()*(b-a), pick=a=>a[Math.floor(Math.random()*a.length)];
  const ease=t=>(1-Math.cos(Math.PI*t))/2, clock=()=>performance.now()/1000;

  const perches=def.perches.map(p=>Object.assign({owner:null},p)); const byId={}; perches.forEach(p=>byId[p.id]=p);
  const isMonkey=o=>o&&typeof o==='object';
  let monkeys=[], bananas=[], nuts=[], fx=[], fed=LS.get('m40.fed',0), L={};
  let raf=0, lastT=0, onScreen=true;
  const score=()=>{ $('#score').textContent=fed?`Monkeys fed: ${fed} banana${fed===1?'':'s'}. The real ones are wild, so don't feed those.`:def.hint };

  function addMonkey(perch){
    const g=mkEl('g',{class:'mk','data-i':monkeys.length});
    const inner=mkEl('g'); inner.innerHTML=MK+'<circle class="hit" cx="2" cy="-18" r="20"/>';
    inner.querySelector('.eyes').style.animationDelay=(-Math.random()*5).toFixed(2)+'s';
    inner.querySelector('.tail').style.animationDelay=(-Math.random()*2.6).toFixed(2)+'s';
    g.append(inner); L.mk.append(g);
    const rope=mkEl('line',{class:'rope',visibility:'hidden'}); L.ropes.append(rope);
    const m={g,inner,rope,x:perch.x,y:perch.y,rot:0,face:perch.x<400?1:-1,perch,anim:null,eating:false,nextAt:clock()+rand(1,4)};
    perch.owner=m; monkeys.push(m); place(m);
  }
  function place(m){
    m.g.setAttribute('transform',`translate(${f1(m.x)} ${f1(m.y)})`);
    m.inner.setAttribute('transform',`rotate(${f1(m.rot)}) scale(${(m.face*S).toFixed(2)} ${S})`);
  }
  function anchorFor(a,b){
    if(!a||Math.abs(a.x-b.x)<50) return null;
    for(const p of def.anchors) if(Math.abs(a.x-p.x)<=190&&Math.abs(b.x-p.x)<=190&&a.y>=p.y+70&&b.y>=p.y+70) return p;
    return null;
  }
  function move(m,p,t){
    const from={x:m.x,y:m.y}, fp=m.perch;
    if(fp&&fp.owner===m) fp.owner=null;
    p.owner=m; m.perch=p;
    const dx=p.x-from.x; if(Math.abs(dx)>2) m.face=dx<0?-1:1;
    const A=anchorFor(fp,p);
    const a={t0:t,dur:REDUCED?.01:A?1+Math.abs(dx)/500:.45+Math.abs(dx)/900,to:{x:p.x,y:p.y}};
    if(A){
      const off=[HAND[0]*S*m.face,HAND[1]*S];
      const H1={x:from.x+off[0],y:from.y+off[1]}, H2={x:p.x+off[0],y:p.y+off[1]};
      const r1=Math.hypot(H1.x-A.x,H1.y-A.y), r2=Math.hypot(H2.x-A.x,H2.y-A.y);
      const q1=Math.atan2(H1.x-A.x,H1.y-A.y), q2=Math.atan2(H2.x-A.x,H2.y-A.y), dip=Math.min(r1,r2)*.3;
      m.g.classList.add('hang');
      m.rope.setAttribute('x1',f1(A.x)); m.rope.setAttribute('y1',f1(A.y)); m.rope.setAttribute('visibility','visible');
      a.fn=k=>{
        const q=q1+(q2-q1)*ease(k), rr=r1+(r2-r1)*k-dip*Math.sin(Math.PI*k);
        const Hx=A.x+rr*Math.sin(q), Hy=A.y+rr*Math.cos(q);
        const w=Math.min(1,k/.15,(1-k)/.15), phi=-q*w, c=Math.cos(phi), s=Math.sin(phi);
        m.rot=phi*180/Math.PI; m.x=Hx-(off[0]*c-off[1]*s); m.y=Hy-(off[0]*s+off[1]*c);
        m.rope.setAttribute('x2',f1(Hx)); m.rope.setAttribute('y2',f1(Hy));
      };
    } else {
      const peak=Math.max(-60,Math.min(from.y,p.y)-28-Math.abs(dx)*.12), c=2*peak-(from.y+p.y)/2;
      a.fn=k=>{ m.x=from.x+dx*k; m.y=(1-k)*(1-k)*from.y+2*k*(1-k)*c+k*k*p.y; m.rot=Math.sin(Math.PI*k)*12*m.face };
    }
    m.anim=a;
  }
  function arrive(m,t){ const b=bananas.find(b=>b.state==='wait'&&b.perch===m.perch); if(b) eat(m,b); else m.nextAt=t+rand(2.5,7) }
  function eat(m,b){
    b.state='gone'; b.el.remove(); bananas=bananas.filter(x=>x!==b);
    m.eating=true; m.g.classList.add('eat');
    setTimeout(()=>{
      m.eating=false; m.g.classList.remove('eat'); peel(m.x+9*m.face,m.y-10);
      fed++; LS.set('m40.fed',fed); score(); m.nextAt=clock()+rand(1.5,4);
      if(bananas.some(x=>x.state==='wait'&&!x.claim)) decide(m,clock());
    },REDUCED?400:1700);
  }
  const freePerches=ex=>perches.filter(p=>!p.owner&&p!==ex);
  function decide(m,t){
    const b=bananas.find(b=>b.state==='wait'&&!b.claim);
    if(b){ b.claim=m; move(m,b.perch,t); return }
    const opts=freePerches(m.perch); if(!opts.length) return;
    const w=opts.map(p=>(p.k==='tree'?1.6:p.k==='bld'?1.2:.5)/(1+Math.hypot(p.x-m.x,p.y-m.y)/240)), tot=w.reduce((s,x)=>s+x,0);
    let r=Math.random()*tot, i=0; while((r-=w[i])>0) i++;
    move(m,opts[Math.min(i,opts.length-1)],t);
  }
  function flee(m){
    const opts=freePerches(m.perch); if(!opts.length) return;
    opts.sort((a,b)=>Math.hypot(b.x-m.x,b.y-m.y)-Math.hypot(a.x-m.x,a.y-m.y));
    move(m,pick(opts.slice(0,4)),clock());
  }
  function tapMonkey(m){
    bubble(pick(def.says||['ook!','eek!','ooh ooh','hm?']),m.x,m.y-50);
    if(m.anim||m.eating) return;
    setTimeout(()=>{ if(!m.anim&&!m.eating) flee(m) },REDUCED?0:240);
  }
  function toss(){
    if(bananas.filter(b=>b.state!=='gone').length>=4){ bubble('full!',def.bunch.x,def.bunch.y-20); return }
    const opts=perches.filter(p=>!p.owner&&p.k!=='ground'); if(!opts.length) return;
    const blds=opts.filter(p=>p.k==='bld'), p=pick(blds.length&&Math.random()<.7?blds:opts);
    p.owner='banana';
    const el=mkEl('g'); el.innerHTML='<path class="bn" d="M-5 0q5 5 11 -1"/>'; L.ban.append(el);
    bananas.push({perch:p,state:'fly',t0:clock(),dur:REDUCED?.01:.8,from:{x:def.bunch.x,y:def.bunch.y},to:{x:p.x+10,y:p.y-3},el,claim:null}); start();
  }
  function summon(b,t){
    const idle=monkeys.filter(m=>!m.anim&&!m.eating); if(!idle.length) return;
    idle.sort((a,c)=>Math.hypot(a.x-b.to.x,a.y-b.to.y)-Math.hypot(c.x-b.to.x,c.y-b.to.y));
    b.claim=idle[0]; move(idle[0],b.perch,t);
  }
  function addNuts(){
    nuts=def.nuts.spots.map(([hx,hy])=>{ const el=mkEl('circle',{class:'nut',cx:hx,cy:hy,r:4.5}); L.nuts.append(el); return {el,hx,hy,x:hx,y:hy,vx:0,vy:0,state:'hang',t:0,r:4.5} });
    const [hx,hy,hr]=def.nuts.hit; L.nuts.append(mkEl('circle',{class:'hit nut-hit',cx:hx,cy:hy,r:hr}));
  }
  function dropNut(){
    const n=nuts.find(n=>n.state==='hang'); if(!n){ bubble('wait…',def.nuts.hit[0],def.nuts.hit[1]-50); return }
    n.state='fall'; n.vx=rand(-18,32); n.vy=0; n.hitGround=false;
    const pm=byId[def.nuts.perch]&&byId[def.nuts.perch].owner; if(isMonkey(pm)&&!pm.anim&&!pm.eating){ bubble('!',pm.x,pm.y-50); setTimeout(()=>flee(pm),150) }
    start();
  }
  function bonk(x){ monkeys.forEach(m=>{ if(!m.anim&&m.perch.k==='ground'&&Math.abs(m.x-x)<28){ stars(m.x,m.y-38); bubble('ow!',m.x,m.y-54); setTimeout(()=>flee(m),300) } }) }
  function addFx(el,life,fn){ L.fx.append(el); fx.push({el,t0:clock(),life,fn}); start() }
  function bubble(text,x,y){ const el=mkEl('text',{class:'bubble',x:x.toFixed(0),y:y.toFixed(0)}); el.textContent=text; addFx(el,1.1,k=>{ el.setAttribute('y',f1(y-10*k)); el.setAttribute('opacity',(1-k*k).toFixed(2)) }) }
  function stars(x,y){ for(let i=0;i<3;i++){ const el=mkEl('path',{class:'star',d:'M0-5L1.4-1.4L5 0L1.4 1.4L0 5L-1.4 1.4L-5 0L-1.4-1.4Z'}); const a=i*2.1; addFx(el,.8,k=>{ const rr=10+6*k; el.setAttribute('transform',`translate(${f1(x+Math.cos(a+k*4)*rr)} ${f1(y+Math.sin(a+k*4)*rr*.5)}) scale(${(1-k*.6).toFixed(2)})`); el.setAttribute('opacity',(1-k).toFixed(2)) }) } }
  function ripple(x,y){ const sc=Math.max(.35,.45+(y-def.waterTop)/150); for(let i=0;i<3;i++){ const el=mkEl('ellipse',{class:'ripple',cx:f1(x),cy:f1(y)}); addFx(el,1.2+i*.35,k=>{ const rr=(3+30*k*(1-i*.22))*sc; el.setAttribute('rx',f1(rr)); el.setAttribute('ry',f1(rr*.24)); el.setAttribute('opacity',(1-k).toFixed(2)) }) } }
  function peel(x,y){
    const el=mkEl('path',{class:'bn',d:'M-4 0q4 4 9 -1M-4 0l-3 3M5 -1l3 3',opacity:.85}); let vy=-40, py=y, px=x, landed=0;
    addFx(el,2.2,(k,dt)=>{ if(!landed){ vy+=700*dt; py+=vy*dt; px+=8*dt; const fl=def.floorY(px)-2; if(py>=fl){ py=fl; landed=1 } } el.setAttribute('transform',`translate(${f1(px)} ${f1(py)})`); if(k>.6) el.setAttribute('opacity',((1-k)/.4*.85).toFixed(2)) });
  }
  function step(t,dt){
    monkeys.forEach(m=>{
      if(m.anim){
        const a=m.anim, k=Math.min(1,(t-a.t0)/a.dur); a.fn(k);
        if(k>=1){ m.anim=null; m.rot=0; m.x=a.to.x; m.y=a.to.y; m.g.classList.remove('hang'); m.rope.setAttribute('visibility','hidden'); place(m); arrive(m,t) }
        else place(m);
      } else if(!m.eating && !REDUCED && t>m.nextAt) decide(m,t);
    });
    bananas.forEach(b=>{
      if(b.state!=='fly') return;
      const k=Math.min(1,(t-b.t0)/b.dur), peak=Math.min(b.from.y,b.to.y)-70, c=2*peak-(b.from.y+b.to.y)/2;
      const x=b.from.x+(b.to.x-b.from.x)*k, y=(1-k)*(1-k)*b.from.y+2*k*(1-k)*c+k*k*b.to.y;
      b.el.setAttribute('transform',`translate(${f1(x)} ${f1(y)}) rotate(${(k<1?k*540:0).toFixed(0)})`);
      if(k>=1){ b.state='wait'; summon(b,t) }
    });
    nuts.forEach(n=>{
      const floor=def.floorY(n.x)-4.5;
      if(n.state==='fall'){
        n.vy+=900*dt; n.x+=n.vx*dt; n.y+=n.vy*dt;
        if(n.y>=floor){ n.y=floor; if(!n.hitGround){ n.hitGround=true; bonk(n.x) } if(Math.abs(n.vy)>70){ n.vy=-n.vy*.35; n.vx*=.8 } else { n.vy=0; n.state='roll' } }
      } else if(n.state==='roll'){
        n.vx*=Math.pow(.15,dt); n.x+=n.vx*dt; n.y=def.floorY(n.x)-4.5;
        if(Math.abs(n.vx)<4){ n.state='rest'; n.t=t }
      } else if(n.state==='rest'){ if(t-n.t>4){ n.state='fade'; n.t=t } }
      else if(n.state==='fade'){
        const k=(t-n.t)/.6; n.el.setAttribute('opacity',Math.max(0,1-k).toFixed(2));
        if(k>=1){ n.state='grow'; n.t=t; n.x=n.hx; n.y=n.hy; n.el.setAttribute('opacity',1) }
      } else if(n.state==='grow'){ const k=Math.min(1,(t-n.t)/.6); n.r=4.5*k; if(k>=1) n.state='hang' }
      n.el.setAttribute('cx',f1(n.x)); n.el.setAttribute('cy',f1(n.y)); n.el.setAttribute('r',(n.state==='grow'?n.r:4.5).toFixed(2));
    });
    if(def.extras&&def.extras.step) def.extras.step(t,dt,API);
    fx=fx.filter(f=>{ const k=Math.min(1,(t-f.t0)/f.life); f.fn(k,dt); if(k>=1){ f.el.remove(); return false } return true });
  }
  function frame(ts){ const t=ts/1000, dt=lastT?Math.min(.05,t-lastT):0; lastT=t; step(t,dt); raf=(onScreen&&!document.hidden)?requestAnimationFrame(frame):0 }
  function start(){ if(!raf&&onScreen&&!document.hidden){ lastT=0; raf=requestAnimationFrame(frame) } }
  const fitView=()=>svg.setAttribute('viewBox',innerWidth<600?def.views.mobile:def.views.desktop);
  function svgPoint(e){ const pt=svg.createSVGPoint(); pt.x=e.clientX; pt.y=e.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()) }
  const API={bubble,ripple,start,mkEl,clock,svg,REDUCED,f1};
  function celebrate(){
    monkeys.forEach((m,i)=>setTimeout(()=>bubble(pick(['ook!','ooh ooh!','yay!']),m.x,m.y-50),i*220));
    for(let i=0;i<3;i++) setTimeout(toss,500+i*400);
  }
  svg.innerHTML=def.art('')+'<g id="l-nuts"></g><g id="l-ropes"></g><g id="l-ban"></g><g id="l-mk"></g><g id="l-fx"></g>';
  L={nuts:$('#l-nuts'),ropes:$('#l-ropes'),ban:$('#l-ban'),mk:$('#l-mk'),fx:$('#l-fx')};
  addNuts(); def.start.forEach(id=>addMonkey(byId[id]));
  if(def.extras&&def.extras.init) def.extras.init(API);
  fitView(); addEventListener('resize',fitView); score();
  svg.addEventListener('click',e=>{
    const mk=e.target.closest('.mk'); if(mk) return tapMonkey(monkeys[+mk.dataset.i]);
    if(e.target.closest('.l-bunch')) return toss();
    if(e.target.closest('.nut-hit')) return dropNut();
    if(def.extras&&def.extras.click&&def.extras.click(e,API)) return;
    if(e.target.closest('.water-hit')){ const p=svgPoint(e); ripple(p.x,p.y) }
  });
  $('#toss').addEventListener('click',toss);
  $('#drop').addEventListener('click',dropNut);
  new IntersectionObserver(es=>es.forEach(e=>{ onScreen=e.isIntersecting; if(onScreen) start() })).observe(svg);
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden) start() });
  start();
  return {celebrate};
}

/* ---------- monkeys sitting on boxes, and the swinger ---------- */
function pageMonkeys(){
  const svgMk=()=>`<svg viewBox="-27 -45 50 48" aria-hidden="true"><g class="mk">${MK}</g></svg>`;
  $$('[data-monkey]').forEach(el=>{
    const b=document.createElement('button'); b.type='button'; b.className='pm '+el.dataset.monkey; b.setAttribute('aria-label','Monkey sitting on the box');
    b.innerHTML=svgMk(); if(el.dataset.monkey==='r') b.querySelector('g').setAttribute('transform','scale(-1 1)');
    b.addEventListener('click',()=>{
      if(b.classList.contains('leap')) return;
      if(REDUCED){ b.style.visibility='hidden'; setTimeout(()=>b.style.visibility='',4000); return }
      b.classList.add('leap');
      b.addEventListener('animationend',function f(){ b.removeEventListener('animationend',f); b.style.visibility='hidden';
        setTimeout(()=>{ b.classList.remove('leap'); b.style.visibility=''; b.classList.add('back'); setTimeout(()=>b.classList.remove('back'),900) },5000) });
    });
    el.append(b);
  });
  const sw=$('#swinger'); if(!sw) return;
  sw.innerHTML=`<svg viewBox="-20 0 40 90" aria-hidden="true"><path class="vl" d="M0 -60Q4 -10 0 44"/><g class="mk hang" transform="translate(-3.6 76.4) scale(.9)">${MK}</g></svg>`;
  sw.addEventListener('click',()=>{ if(REDUCED) return; sw.classList.remove('whee'); void sw.offsetWidth; sw.classList.add('whee') });
  sw.addEventListener('animationend',e=>{ if(e.animationName==='whee') sw.classList.remove('whee') });
}
let scene={celebrate(){}};
function celebrate(){
  scene.celebrate();
  if(REDUCED) return;
  const rain=document.createElement('div'); rain.className='rain'; rain.setAttribute('aria-hidden','true');
  for(let i=0;i<28;i++){
    const s=document.createElementNS(NS,'svg'); s.setAttribute('viewBox','-8 -8 16 16');
    s.innerHTML='<path d="M-6 -1q6 7 13 -1" style="fill:none;stroke:var(--banana);stroke-width:3.4;stroke-linecap:round"/>';
    s.style.left=(Math.random()*100)+'%'; s.style.animationDuration=(1.6+Math.random()*1.4).toFixed(2)+'s'; s.style.animationDelay=(Math.random()*.6).toFixed(2)+'s';
    s.style.setProperty('--r',(Math.random()*720-360).toFixed(0)+'deg'); rain.append(s);
  }
  document.body.append(rain); setTimeout(()=>rain.remove(),3800);
}

/* ---------- vines on boxes and fields ---------- */
const VINE=[
  {d:'M0 8C28 2 46 18 78 12S128 2 176 16',leaves:true},
  {d:'M8 0C2 28 18 50 10 80S6 116 14 138',leaves:true},
  {d:'M78 12c6 10 18 12 20 4c1-5-5-7-7-3',leaves:false,thin:true},
  {d:'M10 80c10 4 14 14 6 20c-4 3-8 0-6-3',leaves:false,thin:true}
];
function vine(host,corner,big){
  const svg=document.createElementNS(NS,'svg');
  svg.setAttribute('viewBox','0 0 180 140'); svg.setAttribute('aria-hidden','true');
  svg.setAttribute('class',`vine ${corner}${big?' big':''}`);
  host.prepend(svg);
  let seed=corner.charCodeAt(0)+corner.charCodeAt(1); const r=()=>((seed=(seed*9301+49297)%233280)/233280);
  VINE.forEach((v,vi)=>{
    const p=document.createElementNS(NS,'path'); p.setAttribute('d',v.d); p.setAttribute('class','stem'+(v.thin?' thin':'')); svg.append(p);
    let len=0; try{len=p.getTotalLength()}catch(e){} p.style.setProperty('--len',len||300);
    if(!v.leaves||!len) return;
    let side=1;
    for(let t=10;t<len-4;t+=15+r()*8){
      const a=p.getPointAtLength(t), b=p.getPointAtLength(Math.min(len,t+1));
      const ang=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI + side*(50+r()*20);
      const s=(.55+r()*.5)*(1-t/len*.35);
      const g=document.createElementNS(NS,'g'); g.setAttribute('transform',`translate(${a.x.toFixed(1)} ${a.y.toFixed(1)}) rotate(${ang.toFixed(0)}) scale(${s.toFixed(2)})`);
      const lf=document.createElementNS(NS,'path'); lf.setAttribute('d',LEAF); lf.setAttribute('class','leaf'+(r()<.3?' dark':'')); lf.style.setProperty('--d',(vi*.4+t/len*1.6).toFixed(2)+'s');
      g.append(lf); svg.append(g); side=-side;
    }
  });
  return svg;
}
function sprig(){
  return `<svg class="sprig" viewBox="0 0 46 40" aria-hidden="true"><path class="s" pathLength="1" d="M44 38C40 30 34 22 24 18S8 11 3 3"/>
  <g transform="translate(36 28) rotate(-140) scale(.8)"><path class="leaf" style="--d:.25s" d="${LEAF}"/></g>
  <g transform="translate(27 20) rotate(-35) scale(.75)"><path class="leaf" style="--d:.4s" d="${LEAF}"/></g>
  <g transform="translate(15 14) rotate(-165) scale(.7)"><path class="leaf" style="--d:.55s" d="${LEAF}"/></g>
  <g transform="translate(5 6) rotate(-70) scale(.6)"><path class="leaf" style="--d:.7s" d="${LEAF}"/></g></svg>`;
}
function plant(){
  const vines=[];
  $$('[data-vine]').forEach(el=>{ const big=el.dataset.vineSize==='big'; el.dataset.vine.split(' ').forEach(c=>vines.push(vine(el,c,big))) });
  $$('#rsvp-form .field, #vote-form .field').forEach(f=>{ if(!f.closest('.dates')) f.insertAdjacentHTML('beforeend',sprig()) });
  $$('.choice label').forEach(l=>l.insertAdjacentHTML('beforeend',sprig()));
  if(REDUCED||!('IntersectionObserver' in window)){ vines.forEach(v=>v.classList.add('grown')); return }
  const io=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('grown'); io.unobserve(e.target) } }),{rootMargin:'0px 0px -10% 0px'});
  vines.forEach(v=>io.observe(v));
}

/* ---------- cover: link cards to the route map ---------- */
function coverMap(){
  const map=$('#route'); if(!map) return;
  if(REDUCED) $$('animateMotion',map).forEach(a=>a.remove());
  $$('[data-route]').forEach(el=>{
    const on=()=>map.dataset.focus=el.dataset.route, off=()=>delete map.dataset.focus;
    el.addEventListener('mouseenter',on); el.addEventListener('mouseleave',off);
    el.addEventListener('focusin',on); el.addEventListener('focusout',off);
  });
}

/* ---------- open each page at the top, unless the link points to a section ---------- */
function startAtTop(){
  try{ history.scrollRestoration='manual' }catch(e){}
  const top=()=>{ if(!location.hash||location.hash==='#top') window.scrollTo({top:0,left:0,behavior:'instant'}) };
  top(); requestAnimationFrame(top); addEventListener('load',top); addEventListener('pageshow',top); setTimeout(top,250);
}

/* ---------- boot ---------- */
renderStatic(); renderVoteOpts();
if(T.option&&SCENES[T.option]) scene=Scene(SCENES[T.option]);
renderCards();
startAtTop(); plant(); pageMonkeys(); coverMap(); wireForm(); wireVote(); renderVote(); renderTimeline(); renderRsvp(); renderBar(); tick();
setInterval(tick,1000);
routeAdmin();
restore().then(renderAll); loadVote();
})();
