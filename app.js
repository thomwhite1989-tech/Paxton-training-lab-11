
(()=>{'use strict';
const $=id=>document.getElementById(id);const pins=[...document.querySelectorAll('[data-pin]')];const pinMap=Object.fromEntries(pins.map(el=>[el.dataset.pin,el]));
const circuit=[['S+','P+'],['S-','P-'],['RD+','R+'],['RD-','R-'],['RC','GND'],['RN','EXIT'],['S+','NC'],['COM','BN'],['BC','FN'],['FC','K+'],['K-','S-']];
let wires=[],mode='wire',first=null,red=null,black=null,glass=false,fire=false,rte=false,relay=false,until=0;const svg=$('wires');
function key(a,b){return [a,b].sort().join('|')}
function has(a,b){return wires.some(w=>key(...w)===key(a,b))}
function add(a,b){if(a!==b&&!has(a,b)){wires.push([a,b]);render()}}
function remove(a,b){wires=wires.filter(w=>key(...w)!==key(a,b));render()}
function connected(g,a,b){let seen=new Set([a]),stack=[a];while(stack.length){let n=stack.pop();if(n===b)return true;for(let t of g[n]||[])if(!seen.has(t)){seen.add(t);stack.push(t)}}return false}
function graph(){
let g={};for(const p of pins)g[p.dataset.pin]=[];
const join=(a,b)=>{g[a]?.push(b);g[b]?.push(a)};
for(const [a,b] of wires)join(a,b);
if(!glass&&$('fault').value!=='glass')join('BC','BN');else if(glass)join('BC','BO');
if(!fire&&$('fault').value!=='fire')join('FC','FN');else if(fire)join('FC','FO');
if(rte)join('RC','RN');else join('RC','RX');
if(relay)join('COM','NO');else join('COM','NC');
const acu=connected(g,'P+','S+')&&connected(g,'P-','S-')&&$('fault').value!=='psu';
if(acu){join('R+','P+');join('R-','P-');join('GND','P-')}
return {g,acu};
}
function powered(g,p){return $('fault').value!=='psu'&&connected(g,p,'S+')&&!connected(g,p,'S-')}
function grounded(g,p){return connected(g,p,'S-')&&!connected(g,p,'S+')}
function voltage(g,p){if(powered(g,p))return 12;if(grounded(g,p))return 0;return null}
function evaluate(){
let {g,acu}=graph();
const reader=acu&&connected(g,'RD+','R+')&&connected(g,'RD-','R-')&&$('fault').value!=='reader';
const exit=acu&&$('fault').value!=='rte'&&connected(g,'EXIT','GND');
const cardActive=Date.now()<until;
relay=acu&&$('fault').value!=='relay'&&(cardActive||rte&&exit);
({g}=graph());
const vplus=voltage(g,'K+'),vminus=voltage(g,'K-');
const lock=vplus!==null&&vminus!==null&&vplus-vminus>=10&&$('fault').value!=='cable';
$('lockIcon').textContent=lock?'🔒':'🔓';
$('lockVolts').textContent=lock?'12.0 V':'0.0 V';
$('doorStatus').textContent=lock?'Energised':'Released';
$('relayStatus').textContent='ACU: COM ↔ '+(relay?'NO':'NC');
$('acuStatus').textContent=acu?'ACU powered':'ACU offline';
$('readerStatus').textContent=reader?'Reader online':'Reader offline';
$('rteStatus').textContent=rte?'COM ↔ NO':'COM ↔ NC';
$('fireStatus').textContent=fire?'ACTIVATED':'NORMAL';
$('glassStatus').textContent=glass?'ACTIVATED':'NORMAL';
$('contactsStatus').textContent=`Glass ${glass?'NO':'NC'} · Fire ${fire?'NO':'NC'}`;
const remaining=Math.max(0,(until-Date.now())/1000);
$('timer').textContent=remaining.toFixed(1)+'s';
$('progress').style.width=(remaining/3*100)+'%';
$('message').textContent=remaining>0?'Valid card accepted — lock relay active':reader?'Present a valid card to release for 3 seconds.':'Check ACU and reader power wiring.';
const rv=red?voltage(g,red):null,bv=black?voltage(g,black):null;
$('reading').textContent=rv===null||bv===null?'—.— V':(rv-bv).toFixed(1)+' V';
$('probeStatus').textContent=`Red ${red||'—'} / Black ${black||'—'}`;
$('online').textContent=navigator.onLine?'Ready':'Offline';
return {g,acu,reader,lock};
}
function save(){try{localStorage.setItem('paxton-lab-wires',JSON.stringify(wires))}catch(e){}}
function render(){
save();$('wireCount').textContent=`${wires.length} wires`;
const list=$('wireList');list.replaceChildren();
for(const [a,b] of wires){
const btn=document.createElement('button');
btn.textContent=`${a} ↔ ${b}  ✕`;
btn.title='Remove this wire';
btn.addEventListener('click',()=>remove(a,b));
list.appendChild(btn);
}
draw();evaluate();
}
function draw(){
const area=$('workspace').getBoundingClientRect();
svg.setAttribute('viewBox',`0 0 ${area.width} ${area.height}`);
svg.setAttribute('width',area.width);svg.setAttribute('height',area.height);
svg.replaceChildren();
for(const [a,b] of wires){
const pa=pinMap[a]?.getBoundingClientRect(),pb=pinMap[b]?.getBoundingClientRect();
if(!pa||!pb)continue;
const x1=pa.left+pa.width/2-area.left,y1=pa.top+pa.height/2-area.top;
const x2=pb.left+pb.width/2-area.left,y2=pb.top+pb.height/2-area.top;
const path=document.createElementNS('http://www.w3.org/2000/svg','path');
path.setAttribute('d',`M ${x1} ${y1} C ${(x1+x2)/2} ${y1}, ${(x1+x2)/2} ${y2}, ${x2} ${y2}`);
path.setAttribute('fill','none');
path.setAttribute('stroke',a.includes('+')||b.includes('+')||a==='NC'?'#e44b4b':a.includes('-')||b.includes('-')?'#444':'#4c9be8');
path.setAttribute('stroke-width','4');
path.setAttribute('stroke-linecap','round');
path.style.pointerEvents=mode==='remove'?'stroke':'none';
path.addEventListener('click',()=>{if(mode==='remove')remove(a,b)});
svg.appendChild(path);
}
}
function setMode(m){
mode=m;first=null;
document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('chosen',b.dataset.mode===m));
$('hint').textContent={
wire:'Tap two terminals to connect them.',
remove:'Tap a wire on the diagram or in the wire list to remove it.',
red:'Tap a terminal for the RED meter probe.',
black:'Tap a terminal for the BLACK meter probe.'
}[m];
draw();
}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
pins.forEach(b=>b.addEventListener('click',()=>{
const p=b.dataset.pin;
if(mode==='red')red=p;
else if(mode==='black')black=p;
else if(mode==='wire'){
if(!first){first=p;$('hint').textContent=`Selected ${p} — tap the second terminal.`}
else{add(first,p);first=null;$('hint').textContent='Tap two terminals to connect them.'}
}else if(mode==='remove'){
const found=wires.find(w=>w.includes(p));
if(found)remove(...found);
}
evaluate();
}));
$('example').addEventListener('click',()=>{wires=circuit.map(w=>[...w]);render()});
$('clear').addEventListener('click',()=>{wires=[];render()});
$('card').addEventListener('click',()=>{
const s=evaluate();
if(s.reader){until=Date.now()+3000;$('message').textContent='Valid card accepted'}
else $('message').textContent='Reader offline — check wiring';
evaluate();
});
const rteButton=$('rte');
function rteSet(v){rte=v;evaluate()}
rteButton.addEventListener('pointerdown',e=>{rteButton.setPointerCapture?.(e.pointerId);rteSet(true)});
['pointerup','pointercancel','lostpointercapture'].forEach(e=>rteButton.addEventListener(e,()=>rteSet(false)));
rteButton.addEventListener('click',()=>{rteSet(true);setTimeout(()=>rteSet(false),500)});
$('glass').addEventListener('click',()=>{glass=true;evaluate()});
$('glassReset').addEventListener('click',()=>{glass=false;evaluate()});
$('fire').addEventListener('click',()=>{fire=true;evaluate()});
$('fireReset').addEventListener('click',()=>{fire=false;evaluate()});
$('fault').addEventListener('change',evaluate);
try{
const saved=JSON.parse(localStorage.getItem('paxton-lab-wires'));
if(Array.isArray(saved))wires=saved.filter(w=>Array.isArray(w)&&w.length===2&&pinMap[w[0]]&&pinMap[w[1]]);
}catch(e){}
window.addEventListener('resize',draw);
setInterval(evaluate,100);
render();
})();
