import '../style.css';
import { SC, PI } from '../simulation/scenarios.js';
import { init, step, gt, metrics, sim } from '../simulation/engine.js';
// ---------- UI ----------
let S,P='NONE',sc='classic',tab='Tasks',hl=null,timer=null,prevEff={};
const $=i=>document.getElementById(i);
$('sc').innerHTML=Object.entries(SC).map(([k,v])=>`<option value="${k}">${v.n}</option>`).join('')+'<option value="custom">Custom Scenario</option>';
$('tabs').innerHTML=['Tasks','Resources','Events','Detection','Metrics','Compare'].map(x=>`<button data-t="${x}">${x}</button>`).join('');
const stop=()=>{clearInterval(timer);timer=null};
let hist=[],idx=0;
const DEF='P1 prio=1 arr=0 dl=14 : c1 L R1 c3 U R1\nP2 prio=5 arr=3 dl=12 : c4\nP3 prio=10 arr=2 dl=9 : c1 L R1 c1 U R1 c1';
function parseCustom(txt){const tasks=[],res={};for(const ln of txt.split('\n').map(x=>x.trim()).filter(Boolean)){
const m=ln.match(/^(\w+)\s+prio=(\d+)\s+arr=(\d+)\s+dl=(\d+)\s*:\s*(.+)$/i);if(!m)throw new Error('Bad line: '+ln);
const tk=m[5].trim().split(/\s+/),prog=[];for(let i=0;i<tk.length;i++){const a=tk[i];let c;
if(c=a.match(/^c(\d+)$/i)){if(+c[1]<1)throw new Error('c needs >=1');prog.push(['c',+c[1]])}
else if(/^[LU]$/i.test(a)&&tk[i+1]){const r=tk[++i];res[r]={};prog.push([a.toUpperCase(),r])}else throw new Error('Bad op "'+a+'" in '+m[1])}
const owned=new Set();prog.forEach(o=>{if(o[0]=='L'){if(owned.has(o[1]))throw new Error(m[1]+' locks '+o[1]+' twice');owned.add(o[1])}else if(o[0]=='U'){if(!owned.has(o[1]))throw new Error(m[1]+' unlocks '+o[1]+' before locking');owned.delete(o[1])}});
if(owned.size)throw new Error(m[1]+' never releases '+[...owned]);tasks.push({id:m[1],base:+m[2],arr:+m[3],dl:+m[4],prog})}
if(!tasks.length)throw new Error('No tasks');return{n:'Custom Scenario',d:'User-defined scenario.',res,tasks}}
function reset(){stop();if(sc=='custom'){try{SC.custom=parseCustom($('ctxt').value);$('cerr').textContent=''}catch(e){$('cerr').textContent='⚠ '+e.message+' (using last valid)';SC.custom=SC.custom||parseCustom(DEF)}}
$('cust').style.display=sc=='custom'?'block':'none';S=init(sc);hist=[structuredClone(S)];idx=0;hl=null;draw()}
function go(i){idx=i;S=structuredClone(hist[i]);draw()}
function adv(){if(idx<hist.length-1){go(idx+1);return}if(S.done){stop();return}step(S,P);hist.push(structuredClone(S));idx++;draw();if(S.done)stop()}
function toEnd(){stop();while(!S.done&&hist.length<80){step(S,P);hist.push(structuredClone(S))}idx=hist.length-1;draw()}
$('back').onclick=()=>{stop();if(idx>0)go(idx-1)};$('end').onclick=toEnd;$('scrub').oninput=e=>{stop();go(+e.target.value)};$('apply').onclick=reset;
addEventListener('keydown',e=>{if(/TEXTAREA|SELECT|INPUT/.test(e.target.tagName)&&e.key!='Escape')return;
if(e.key==' '){e.preventDefault();timer?$('pause').click():$('run').click()}else if(e.key=='ArrowRight'){$('step').click()}else if(e.key=='ArrowLeft'){$('back').click()}else if(e.key=='r'){reset()}else if(e.key=='End'){toEnd()}});
$('sc').onchange=e=>{sc=e.target.value;reset()};$('pr').onchange=e=>{P=e.target.value;reset()};
$('rs').onclick=$('rs2').onclick=reset;$('step').onclick=()=>{stop();adv()};$('pause').onclick=()=>{stop();draw()};
$('run').onclick=()=>{if(timer)return;timer=setInterval(adv,+$('spd').value);draw()};
$('spd').onchange=()=>{if(timer){stop();$('run').click()}};
$('tabs').onclick=e=>{if(e.target.dataset.t){tab=e.target.dataset.t;draw()}};
$('tab').onclick=e=>{const r=e.target.closest('[data-hl]');if(r){hl=hl==r.dataset.hl?null:r.dataset.hl;draw()}};
const badge=s=>`<span class="st ${s}">${s}</span>`;
function viz(){let h='';const d=S.det;
if(S.dead)h+=`<div class="alert"><b>✖ DEADLOCK</b><br>${S.tasks.filter(k=>k.state=='BLOCKED').map(k=>`${k.id} waits for ${k.wf} held by ${k.blk}`).join('; ')}. No task can proceed — circular wait.</div>`;
if(d){const B=gt(S,d.b),O=gt(S,d.o),M=gt(S,d.m);h+=`<div class="alert"><b>⚠ PRIORITY INVERSION DETECTED</b><div class="chain mono"><span class="node">${B.id} (${B.base})</span><span class="arr">waiting for ▶</span><span class="node">${d.r}</span><span class="arr">owned by ▶</span><span class="node">${O.id} (${O.base})</span><span class="arr">◀ preempted by</span><span class="node">${M.id} (${M.base})</span></div>${B.id} (priority ${B.base}) is blocked by ${O.id} (priority ${O.base}) while ${M.id} (priority ${M.base}) prevents ${O.id} from executing.</div>`}
else if(S.inv&&P!='NONE'){const l=[...S.ev].reverse().find(e=>e.type=='PIP');h+=`<div class="ok"><b style="color:var(--ac)">${P} active.</b> Inversion was bounded: ${l?l.m:''}. The resource owner runs at the waiter's priority until release.</div>`}
else h+=`<div class="ok">${S.t?'No priority inversion at this moment.':'Press Step or Run to begin.'}</div>`;
const R=S.run&&gt(S,S.run);const wait=S.tasks.filter(k=>k.state=='BLOCKED');
h+=`<div class="pn"><h3>Live state</h3><b>Running:</b> ${R&&R.state=='RUNNING'?R.id:'idle/none'} &nbsp; <b>Blocked:</b> ${wait.map(k=>`${k.id} (on ${k.wf}, held by ${k.blk})`).join(', ')||'none'}<br><div class="chain mono">${Object.entries(S.res).map(([n,r])=>`${r.q.map(q=>`<span class="node">${q}</span><span class="arr">waiting ▶</span>`).join('')}<span class="node" style="border-color:${r.owner?'var(--rdy)':'var(--b)'}">${n}</span><span class="arr">${r.owner?'owned by ▶':'free'}</span>${r.owner?`<span class="node">${r.owner}</span>`:''}`).join('<span class="arr"> │ </span>')}</div></div>`;
if(P=='PIP'){const x=S.tasks.filter(k=>k.eff>k.base);h+=x.map(k=>`<div class="pn"><b>${k.id}</b>: Base ${k.base} → Effective <span class="up">${k.eff}</span> ↑ inherited. <span class="m">${k.id} inherited the priority of a waiting task because it owns the resource that task needs.</span></div>`).join('')}
if(P=='PCP'){h+=`<div class="pn"><h3>Resource ceilings</h3>${Object.entries(S.res).map(([n,r])=>`<b>${n}</b> ceiling ${r.ceil}, users ${r.users.join(', ')||'—'}`).join('<br>')}`;const c=S.pcp;h+=c?`<h3 style="margin-top:10px">PCP check</h3>${c.task} (prio ${c.pr}) requests ${c.res} (ceiling ${c.ceil})<br>Decision: <b style="color:${c.ok?'var(--run)':'var(--blk)'}">${c.ok?'ACCESS':'BLOCK'}</b> — ${c.why}`:'';h+='</div>'}
return h}
function gantt(){const n=Math.max(S.t,8);const mk=Array(n).fill('');S.ev.forEach(e=>{if(['LOCK','BLOCKED','INVERSION','PIP','RELEASE','UNBLOCK'].includes(e.type)&&e.t<n)mk[e.t]+=(mk[e.t]?'·':'')+({LOCK:'L',BLOCKED:'B',INVERSION:'⚠',PIP:'PIP',RELEASE:'U',UNBLOCK:'↑'})[e.type]});
const cols=`60px repeat(${n},minmax(28px,1fr))`;let h=`<div class="g" style="grid-template-columns:${cols}"><div></div>${[...Array(n).keys()].map(i=>`<div class="gh">${i}</div>`).join('')}<div></div>${mk.map(x=>`<div class="mk" title="L=lock B=block U=release ↑=unblock">${x}</div>`).join('')}`;
S.tasks.forEach(k=>{h+=`<b class="mono">${k.id}</b>`+[...Array(n).keys()].map(i=>`<div class="c ${S.g[k.id][i]||''}" title="t=${i} ${S.g[k.id][i]||''}"></div>`).join('')});return h+'</div>'}
function tabs(){let h='';const hr=i=>hl==i?'hl':'';
if(tab=='Tasks')h=`<table><tr><th>Task</th><th>Base</th><th>Effective</th><th>State</th><th>Resource</th><th>Deadline</th></tr>${S.tasks.map(k=>`<tr data-hl="${k.id}" class="${hr(k.id)}"><td><b>${k.id}</b></td><td>${k.base}</td><td class="${k.eff!=k.base?'up':''}">${k.eff}${k.eff!=k.base?' ↑':''}</td><td>${badge(k.state)}</td><td>${k.wf?'⏳ '+k.wf:k.own.join(',')||'-'}</td><td>${k.dl}</td></tr>`).join('')}</table>`;
if(tab=='Resources')h=`<table><tr><th>Resource</th><th>Owner</th><th>Ceiling</th><th>Waiting</th><th>Users</th></tr>${Object.entries(S.res).map(([n,r])=>`<tr data-hl="${n}" class="${hr(n)}"><td><b>${n}</b></td><td>${r.owner||'free'}</td><td>${r.ceil}</td><td>${r.q.join(', ')||'-'}</td><td>${r.users.join(', ')}</td></tr>`).join('')}</table>`;
if(tab=='Events')h=`<div style="max-height:220px;overflow:auto">${S.ev.map(e=>`<div class="ev ${e.type}" data-hl="${e.task||e.r||''}">t=${e.t}&nbsp; ${e.m}</div>`).join('')||'<span class="m">No events yet.</span>'}</div>`;
if(tab=='Detection'){const d=S.det,t=S.tasks;h=`<div class="mono">${S.dead?'✖ Deadlock detected':'✓ No deadlock'}<br>${S.starv?'⚠ Starvation suspected: '+S.starv:'✓ No starvation'}<br>${d?`⚠ Priority inversion detected<br>Blocking task: ${d.b}<br>Resource: ${d.r}<br>Resource owner: ${d.o}<br>Interfering task: ${d.m}`:'✓ No active priority inversion'}<br><span class="m">Inversion events so far: ${S.inv}</span></div>`}
if(tab=='Metrics'){const m=metrics(S);h=`<table>${Object.entries(m).map(([a,b])=>`<tr><td>${a}</td><td><b>${b}</b></td></tr>`).join('')}</table><small>Values come from the simulation at t=${S.t}.</small>`}
if(tab=='Compare'){const r=['NONE','PIP','PCP'].map(p=>{const s=sim(sc,p);return[p,metrics(s),s]});const ks=Object.keys(r[0][1]);h=`<table><tr><th>Metric</th><th>None</th><th>PIP</th><th>PCP</th></tr>${ks.map(k=>`<tr><td>${k}</td>${r.map(x=>`<td>${x[1][k]}</td>`).join('')}</tr>`).join('')}<tr><td>Outcome</td>${r.map(x=>`<td>${x[2].dead?'deadlock':'completed t='+x[2].t}</td>`).join('')}</tr></table>${r.map(x=>`<div class="m" style="margin-top:8px">${x[0]}</div><div class="g" style="grid-template-columns:40px repeat(${x[2].t},minmax(10px,1fr))">${x[2].tasks.map(k=>`<b class="mono">${k.id}</b>`+x[2].g[k.id].map(c=>`<div class="c ${c}" style="height:12px"></div>`).join('')).join('')}</div>`).join('')}<small>Each column is a full run of this scenario under that protocol. Protocols behave differently; no one is declared universally better.</small>`}
return h}
function draw(){$('viz').innerHTML=viz();$('gantt').innerHTML=gantt();$('tab').innerHTML=tabs();document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t==tab));
$('tm').textContent='t = '+S.t;$('scrub').max=hist.length-1;$('scrub').value=idx;$('scl').textContent=`step ${idx}/${hist.length-1}`;$('stat').textContent=S.dead?'DEADLOCK':S.done?'FINISHED':timer?'RUNNING':S.t?'PAUSED':'READY';
$('pinfo').innerHTML=`<b>${P=='NONE'?'None':P}</b><p class="m">${PI[P]}</p>`;$('sinfo').textContent=SC[sc].d}
$('ctxt').value=DEF;reset();
