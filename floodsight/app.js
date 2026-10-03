// FloodSight prototype: simulated SAR flood scenario + real graph analysis (isolation, routing, ranking).
const W=900,H=560,$=s=>document.querySelector(s);
let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
const riverY=x=>290+70*Math.sin(x/140);
const halfW=(x,l)=>l*0.9*(0.7+0.3*Math.sin(x/90+1));       // flood half-width (px)
const inFlood=(x,y,l)=>l>0&&Math.abs(y-riverY(x))<halfW(x,l);

// --- build synthetic district: 8x5 grid of places joined by roads
const COLS=8,ROWS=5,names=["Kalsi","Rampur","Dhaula","Nerwa","Sundar","Bhatti","Chamba","Tikri","Maldi","Jakhu","Paddal","Sarahan","Naggar","Kotla","Bagi","Thunag","Salari","Darang","Mohal","Pandoh","Rewalsar","Ani","Banjar","Karsog","Sainj","Ghatu","Lahar","Tirthan","Seraj","Jibhi","Shoja","Barot","Katrain","Gram","Kasol","Pulga","Tosh","Bhuntar","Naya","Manikaran"];
const nodes=[];
for(let j=0;j<ROWS;j++)for(let i=0;i<COLS;i++){
  const id=j*COLS+i;
  nodes.push({id,x:60+i*112+(rnd()-.5)*40,y:55+j*112+(rnd()-.5)*36,name:names[id],pop:Math.round(250+rnd()*2750),vuln:+(.8+rnd()*.7).toFixed(2)});
}
nodes[1].camp="District hospital";nodes[1].pop=0;nodes[5].camp="Relief camp";nodes[5].pop=0;
const edges=[];
const link=(a,b)=>{const A=nodes[a],B=nodes[b];edges.push({a,b,len:Math.hypot(A.x-B.x,A.y-B.y),
  bridge:(A.y-riverY(A.x))*(B.y-riverY(B.x))<0});};
for(let j=0;j<ROWS;j++)for(let i=0;i<COLS;i++){const id=j*COLS+i;
  if(i<COLS-1&&(rnd()>.1||j==0))link(id,id+1);
  if(j<ROWS-1&&(rnd()>.12||i==1))link(id,id+COLS);}
{let k=0;const keep=edges.filter(e=>!e.bridge||k++%3==0&&k<=7);edges.length=0;edges.push(...keep);} // few bridges, as in real river valleys
const camps=nodes.filter(n=>n.camp).map(n=>n.id);

// --- analysis: which edges/nodes are lost, who can still be reached from a camp
function analyse(l){
  edges.forEach(e=>{const A=nodes[e.a],B=nodes[e.b];e.flooded=false;
    for(let t=0;t<=6;t++){const x=A.x+(B.x-A.x)*t/6,y=A.y+(B.y-A.y)*t/6;if(inFlood(x,y,l)){e.flooded=true;break;}}});
  nodes.forEach(n=>{n.flooded=inFlood(n.x,n.y,l)&&!n.camp;n.reach=false;});
  const adj=nodes.map(()=>[]);
  edges.filter(e=>!e.flooded).forEach(e=>{adj[e.a].push([e.b,e.len]);adj[e.b].push([e.a,e.len]);});
  const q=[...camps];camps.forEach(c=>nodes[c].reach=true);
  while(q.length){const u=q.pop();adj[u].forEach(([v])=>{if(!nodes[v].reach&&!nodes[v].flooded){nodes[v].reach=true;q.push(v);}});}
  nodes.forEach(n=>{n.status=n.camp?"camp":n.flooded?"flooded":n.reach?"ok":"cut";
    n.score=n.camp?0:n.status=="cut"?n.pop*n.vuln*1.5:n.status=="flooded"?n.pop*n.vuln*1.2:0;});
  return adj;
}
function route(from,adj){ // Dijkstra to nearest camp
  const d={},prev={},todo=new Set([from]);d[from]=0;
  while(todo.size){let u=[...todo].reduce((a,b)=>d[a]<d[b]?a:b);todo.delete(u);
    if(nodes[u].camp){const p=[u];while(prev[p[0]]!==undefined)p.unshift(prev[p[0]]);return{path:p,km:d[u]};}
    adj[u].forEach(([v,w])=>{if(nodes[v].flooded)return;if(d[v]===undefined||d[u]+w<d[v]){d[v]=d[u]+w;prev[v]=u;todo.add(v);}});}
  return null;
}

// --- rendering
let level=0,sel=null,adj,timer=null;
const col={ok:"#1F9D8A",cut:"#E4572E",flooded:"#2F8FD8",camp:"#fff"};
const km=px=>(px*0.12).toFixed(1);
function floodPath(l){const top=[],bot=[];for(let x=0;x<=W;x+=15){const y=riverY(x),w=halfW(x,l);top.push(`${x},${y-w}`);bot.unshift(`${x},${y+w}`);}return"M"+top.join("L")+"L"+bot.join("L")+"Z";}
function draw(){
  adj=analyse(level);
  const on=id=>$("#"+id).checked;let s=`<defs><filter id="sp"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2"/><feColorMatrix values="0 0 0 0 .5 0 0 0 0 .55 0 0 0 0 .6 0 0 0 .55 0"/></filter></defs>`;
  if(on("L_sar"))s+=`<rect width="${W}" height="${H}" filter="url(#sp)"/>`;
  s+=`<path d="${floodPath(8)}" fill="${level?"none":"#0d1317"}" ${on("L_pre")?`stroke="#9cc3e6" stroke-dasharray="6 5"`:""} opacity=".9"/>`;
  if(on("L_flood")&&level)s+=`<path d="${floodPath(level)}" fill="#2F8FD8" fill-opacity=".55" stroke="#7fc0f5" stroke-width="2"/>`;
  if(on("L_road"))edges.forEach(e=>{const A=nodes[e.a],B=nodes[e.b],m=[(A.x+B.x)/2,(A.y+B.y)/2];
    s+=`<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" stroke="${e.flooded?"#E4572E":"#c9d3da"}" stroke-width="${e.flooded?3:2}" ${e.flooded?'stroke-dasharray="3 5"':""}/>`;
    if(e.bridge)s+=`<rect x="${m[0]-8}" y="${m[1]-5}" width="16" height="10" rx="2" fill="${e.flooded?"#E4572E":"#F2B134"}" stroke="#12263A"><title>${e.flooded?"Bridge damaged":"Bridge open"}</title></rect>`;});
  if(sel!==null&&nodes[sel].status=="ok"){const r=route(sel,adj);if(r)s+=`<polyline fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" points="${r.path.map(i=>nodes[i].x+","+nodes[i].y).join(" ")}"/>`;}
  nodes.forEach(n=>{const r=n.camp?11:6+Math.sqrt(n.pop)/9;
    s+=`<g class="v" tabindex="0" role="button" data-id="${n.id}" aria-label="${n.name}, ${n.status}">`+
      (n.camp?`<rect x="${n.x-11}" y="${n.y-11}" width="22" height="22" rx="3" fill="#fff" stroke="#12263A" stroke-width="3"/><text x="${n.x}" y="${n.y+5}" text-anchor="middle" font-size="14" font-weight="700" fill="#12263A">+</text>`
      :`<circle cx="${n.x}" cy="${n.y}" r="${r}" fill="${col[n.status]}" stroke="${sel===n.id?"#fff":"#12263A"}" stroke-width="${sel===n.id?4:2}"/>`)+
      `<text x="${n.x}" y="${n.y-r-5}" text-anchor="middle" font-size="11" fill="#e6edf2">${n.name}</text></g>`;});
  $("#map").innerHTML=s;
  stats();prio();detail();
}
function stats(){
  const fl=edges.filter(e=>e.flooded),br=edges.filter(e=>e.bridge);
  const cut=nodes.filter(n=>n.status=="cut"),fd=nodes.filter(n=>n.status=="flooded");
  const area=Math.min(100,Math.round(level*0.9*2*0.7*100/ H));
  const ppl=[...cut,...fd].reduce((a,n)=>a+n.pop,0);
  $("#stats").innerHTML=[["Area flooded",area+"%"],["Roads lost",fl.length+" of "+edges.length],["Bridges damaged",br.filter(e=>e.flooded).length+" of "+br.length],
    ["Villages cut off",cut.length],["Villages under water",fd.length],["People needing help",ppl.toLocaleString("en-IN")]].map(([a,b])=>`<dt>${a}</dt><dd>${b}</dd>`).join("");
  $("#lv").textContent=level;$("#level").value=level;
  document.querySelectorAll(".presets button").forEach(b=>b.classList.toggle("on",+b.dataset.l==level));
}
function prio(){
  const list=nodes.filter(n=>n.score>0).sort((a,b)=>b.score-a.score).slice(0,7);
  $("#prio").innerHTML=list.length?list.map((n,i)=>`<li><button data-id="${n.id}"><b>${i+1}. ${n.name}</b><span>${n.pop.toLocaleString("en-IN")} people, ${n.status=="cut"?"cut off":"under water"}</span></button></li>`).join(""):`<li class="empty">No communities need rescue at this level. Raise the flood level to see priorities.</li>`;
}
function detail(){
  const el=$("#detail");if(sel===null){el.innerHTML="";return;}
  const n=nodes[sel],lab={ok:"Reachable",cut:"Cut off",flooded:"Under water",camp:"Aid point"}[n.status];
  let adv="";
  if(n.status=="ok"){const r=route(sel,adj);adv=r?`Safe road route to ${nodes[r.path.at(-1)].camp}: about ${km(r.km)} km via ${r.path.length-1} road links.`:"";}
  else if(n.status=="cut")adv="All roads out are lost. Plan an airdrop or boat delivery. Nearest reachable point: "+nearest(n)+".";
  else if(n.status=="flooded")adv="Village is inundated. Prioritise boat evacuation to higher ground.";
  else adv=n.camp+" with road access intact.";
  el.innerHTML=`<b>${n.name}</b><span class="pill" style="background:${col[n.status]=="#fff"?"#12263A":col[n.status]}">${lab}</span><p>${n.pop?n.pop.toLocaleString("en-IN")+" residents. ":""}${adv}</p>`;
}
function nearest(n){let b=null,bd=1e9;nodes.forEach(m=>{if(m.status=="ok"||m.camp){const d=Math.hypot(m.x-n.x,m.y-n.y);if(d<bd){bd=d;b=m;}}});return b?b.name+" ("+km(bd)+" km away)":"none";}

// --- controls
const pick=id=>{sel=+id;draw();};
document.addEventListener("click",e=>{const t=e.target.closest("[data-id]");if(t)pick(t.dataset.id);const p=e.target.closest(".presets button");if(p){stop();level=+p.dataset.l;draw();}});
document.addEventListener("keydown",e=>{if((e.key=="Enter"||e.key==" ")&&e.target.classList.contains("v")){e.preventDefault();pick(e.target.dataset.id);}});
$("#level").oninput=e=>{stop();level=+e.target.value;draw();};
document.querySelectorAll("input[type=checkbox]").forEach(c=>c.onchange=draw);
function stop(){clearInterval(timer);timer=null;$("#play").textContent="Play flood rise";}
$("#play").onclick=()=>{if(timer)return stop();level=0;$("#play").textContent="Pause";
  timer=setInterval(()=>{level=Math.min(100,level+1);draw();if(level>=100)stop();},90);};
$("#export").onclick=()=>{const g={type:"FeatureCollection",features:nodes.filter(n=>!n.camp).map(n=>({type:"Feature",properties:{name:n.name,population:n.pop,status:n.status,priority_score:Math.round(n.score)},geometry:{type:"Point",coordinates:[+(76.9+n.x/900*.6).toFixed(4),+(31.7-n.y/560*.4).toFixed(4)]}}))};
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(g,null,1)],{type:"application/geo+json"}));a.download="floodsight_priority.geojson";a.click();};
level=65;draw();
