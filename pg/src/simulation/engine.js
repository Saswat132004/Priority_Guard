import { SC } from './scenarios.js';
// ---------- engine (pure; replaceable by backend) ----------
export function init(sc){const d=SC[sc],res={};const us={};d.tasks.forEach(t=>t.prog.forEach(o=>{if(o[0]=='L')(us[o[1]]=us[o[1]]||[]).push(t)}));
for(const r in d.res)res[r]={owner:null,q:[],users:(us[r]||[]).map(t=>t.id).filter((v,i,a)=>a.indexOf(v)==i),ceil:Math.max(0,...(us[r]||[]).map(t=>t.base))};
return{sc,t:0,res,tasks:d.tasks.map(x=>({...x,eff:x.base,pc:0,rem:0,state:'NEW',blk:null,wf:null,own:[],bt:0,wt:0,fin:null,st:null})),ev:[],g:Object.fromEntries(d.tasks.map(x=>[x.id,[]])),run:null,cs:0,inv:0,det:null,pcp:null,done:false,note:'',dead:false,starv:null}}
export const gt=(s,i)=>s.tasks.find(t=>t.id==i);
const log=(s,type,m,task,r)=>s.ev.push({t:s.t,type,m,task,r});
function canLock(s,k,r,P){const R=s.res[r];if(R.owner)return{ok:false,by:R.owner,why:`${r} is held by ${R.owner}`};
if(P=='PCP'){let mx=-1,w=null;for(const q in s.res){const o=s.res[q];if(o.owner&&o.owner!=k.id&&o.ceil>mx){mx=o.ceil;w=o.owner}}
const ok=k.base>mx;s.pcp={task:k.id,pr:k.base,res:r,ceil:R.ceil,sys:mx,ok,why:ok?`priority ${k.base} > system ceiling ${mx<0?'none':mx}`:`priority ${k.base} ≤ system ceiling ${mx} (held by ${w})`};return ok?{ok:true}:{ok:false,by:w,why:s.pcp.why}}
return{ok:true}}
function rel(s,k,r){const R=s.res[r];R.owner=null;k.own=k.own.filter(x=>x!=r);log(s,'RELEASE',`${k.id} → RELEASE ${r}`,k.id,r)}
function effs(s,P){const old=s.tasks.map(t=>t.eff);s.tasks.forEach(t=>t.eff=t.base);
if(P!='NONE')for(let n=0;n<6;n++)s.tasks.forEach(b=>{if(b.state=='BLOCKED'&&b.blk){const o=gt(s,b.blk);if(o&&o.eff<b.eff)o.eff=b.eff}});
s.tasks.forEach((t,i)=>{if(t.eff>old[i])log(s,'PIP',`${P} → ${t.id} priority ${old[i]} → ${t.eff} (inherited)`,t.id);else if(t.eff<old[i])log(s,'PIP',`${P} → ${t.id} priority ${old[i]} → ${t.eff} (restored)`,t.id)})}
export function step(s,P){if(s.done)return;const t=s.t;let pick=null;
s.tasks.forEach(k=>{if(k.state=='NEW'&&k.arr<=t){k.state='READY';log(s,'ARRIVE',`${k.id} arrives (prio ${k.base})`,k.id)}});
for(let i=0;i<40;i++){
s.tasks.filter(k=>k.state=='BLOCKED').forEach(k=>{const c=canLock(s,k,k.wf,P);if(c.ok){k.state='READY';s.res[k.wf].q=s.res[k.wf].q.filter(x=>x!=k.id);log(s,'UNBLOCK',`${k.id} → UNBLOCKED (${k.wf} available)`,k.id,k.wf);k.wf=null;k.blk=null}else k.blk=c.by});
effs(s,P);
const c=s.tasks.filter(k=>k.state=='READY'||k.state=='RUNNING').sort((a,b)=>b.eff-a.eff||(b.state=='RUNNING')-(a.state=='RUNNING'));pick=c[0]||null;if(!pick)break;
const op=pick.prog[pick.pc];
if(!op){pick.state='FINISHED';pick.fin=t;log(s,'FINISH',`${pick.id} → FINISHED`,pick.id);continue}
if(op[0]=='U'){rel(s,pick,op[1]);pick.pc++;continue}
if(op[0]=='L'){const q=canLock(s,pick,op[1],P);if(q.ok){s.res[op[1]].owner=pick.id;pick.own.push(op[1]);pick.pc++;log(s,'LOCK',`${pick.id} → LOCKED ${op[1]}`,pick.id,op[1]);if(P=='PCP')s.pcp={...s.pcp,ok:true}}
else{pick.state='BLOCKED';pick.wf=op[1];pick.blk=q.by;s.res[op[1]].q.push(pick.id);log(s,'REQUEST',`${pick.id} → REQUEST ${op[1]}`,pick.id,op[1]);log(s,'BLOCKED',`${pick.id} → BLOCKED (${q.why})`,pick.id,op[1])}continue}
break}
// run one unit
if(pick){if(s.run&&s.run!=pick.id){s.cs++;const pr=gt(s,s.run);if(pr.state=='RUNNING'){pr.state='READY';log(s,'PREEMPT',`${pick.id} → PREEMPTED ${pr.id}`,pick.id)}}
else if(!s.run)log(s,'RUN',`${pick.id} → RUNNING`,pick.id);if(s.run!=pick.id&&s.run)log(s,'RUN',`${pick.id} → RUNNING`,pick.id);
pick.state='RUNNING';s.run=pick.id;if(pick.st==null)pick.st=t;if(!pick.rem)pick.rem=pick.prog[pick.pc][1];pick.rem--;if(!pick.rem)pick.pc++}
s.tasks.forEach(k=>{s.g[k.id].push(k===pick?'RUNNING':k.state);if(k.state=='BLOCKED')k.bt++;if(k.state=='READY'&&k!==pick)k.wt++});
s.tasks.forEach(k=>{if(k.state=='READY'&&k!==pick&&k.wt>=5&&!s.starv){s.starv=k.id;log(s,'STARVE',`${k.id} has waited ${k.wt} ticks (possible starvation)`,k.id)}});
// detection
let d=null;if(pick)s.tasks.filter(b=>b.state=='BLOCKED'&&b.blk).forEach(b=>{const o=gt(s,b.blk);if(o&&o.id!=pick.id&&pick.eff<b.eff&&!d)d={b:b.id,o:o.id,m:pick.id,r:b.wf}});
if(d&&!s.det){s.inv++;log(s,'INVERSION',`⚠ PRIORITY INVERSION DETECTED: ${d.b} blocked by ${d.o}, ${d.m} runs`,d.b,d.r)}s.det=d;
// end drain
s.tasks.forEach(k=>{if(k.state=='RUNNING'||k.state=='READY'){while(k.prog[k.pc]&&k.prog[k.pc][0]=='U'&&k===pick){rel(s,k,k.prog[k.pc][1]);k.pc++}if(!k.prog[k.pc]&&k===pick){k.state='FINISHED';k.fin=t+1;log(s,'FINISH',`${k.id} → FINISHED`,k.id)}}});
s.t++;
if(s.tasks.every(k=>k.state=='FINISHED'))s.done=true;
else if(!pick&&s.tasks.some(k=>k.state=='BLOCKED')&&!s.tasks.some(k=>k.state=='NEW')){s.done=true;s.dead=true;log(s,'DEADLOCK','✖ DEADLOCK: circular wait among '+s.tasks.filter(k=>k.state=='BLOCKED').map(k=>k.id).join(', '))}
if(s.t>60)s.done=true}
export function metrics(s){const f=s.tasks.filter(k=>k.fin!=null),n=(x)=>x.length?x:null;
const avg=(a)=>a.length?(a.reduce((x,y)=>x+y,0)/a.length).toFixed(1):'—';
return{'Blocking Time':s.t?s.tasks.reduce((a,k)=>a+k.bt,0):'—','Waiting Time':s.t?s.tasks.reduce((a,k)=>a+k.wt,0):'—','Response Time (avg)':avg(s.tasks.filter(k=>k.st!=null).map(k=>k.st-k.arr)),'Turnaround (avg)':avg(f.map(k=>k.fin-k.arr)),'Context Switches':s.t?s.cs:'—','Inversion Events':s.t?s.inv:'—','Deadline Misses':s.t?s.tasks.filter(k=>(k.fin!=null?k.fin>k.dl:s.t>k.dl)).length:'—'}}
export const sim=(sc,P)=>{const s=init(sc);while(!s.done)step(s,P);return s};
