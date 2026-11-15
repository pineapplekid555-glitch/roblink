/* ============ Plans & boost packs ============ */
const PLANS=[
 {name:'Free',price:'',boosts:0,perks:['2,000-character messages','10 MB uploads','Dark, Midnight & Light themes']},
 {name:'Lite',price:'£1.99/mo',boosts:1,perks:['1 server boost','Custom emoji everywhere','4,000-character messages','25 MB uploads','LITE badge']},
 {name:'Plus',price:'£3.99/mo',boosts:3,perks:['Everything in Lite','3 server boosts','Gradient themes & custom accent','Animated avatar & profile banner','Soundboard & super reactions','HD streaming','50 MB uploads']},
 {name:'Max',price:'£7.99/mo',boosts:6,perks:['Everything in Plus','6 server boosts','Exclusive Gold & Galaxy themes','Glowing profile card','MAX badge']}];
const PACKS=[[1,'£1.99'],[3,'£4.99'],[7,'£9.99'],[14,'£17.99']];
const demoOn=()=>!S.cfg||S.cfg.demo_purchases!==false;
function plansHtml(){
  const t=tier(),m=S.me;
  const head=t?`<div class="hero"><h1>💎 Roblink ${PLANS[t].name}</h1><p>Member since ${new Date(m.plusSince||now()).toLocaleDateString()}. Boosts left: <b>${m.boostsLeft}</b></p></div>`:`<div class="hero"><h1>💎 Unlock the full Roblink</h1><p>Pick a plan for themes, bigger uploads, animated profiles and free server boosts.</p></div>`;
  const note=demoOn()?'<p class="sub">Demo mode: plans activate instantly and <b>no payment is taken</b> (prices are placeholders).</p>':'<p class="sub" style="color:var(--yellow)">Purchases are not open yet. Roblink staff can still grant plans.</p>';
  const cards=[1,2,3].map(i=>{const p=PLANS[i];return`<div class="tier ${t===i?'cur':''} ${i===2?'best':''}"><h3>${p.name}${i===2?' ⭐':''}</h3><div class="pr">${p.price}</div><ul>${p.perks.map(x=>`<li>${x}</li>`).join('')}</ul>${t===i?'<button class="btn" disabled>Current plan</button>':`<button class="btn primary" data-act="getPlus" data-a="${i}" ${demoOn()?'':'disabled'}>${t>i?'Downgrade':t?'Upgrade':'Get'} ${p.name}</button>`}</div>`}).join('');
  const shop=`<h3>Boost packs</h3><p class="sub">Extra server boosts, one-off. They stay yours even if you cancel your plan. Server levels: 2 / 7 / 14 boosts.</p><div class="feat">${PACKS.map(([n,pr])=>`<div class="card" style="text-align:center;margin:0"><div style="font-size:26px">🚀</div><b>${n} boost${n>1?'s':''}</b><div class="sub">${pr}</div><button class="btn sm primary" data-act="buyBoosts" data-a="${n}" ${demoOn()?'':'disabled'}>Buy</button></div>`).join('')}</div>`;
  return`<h2>Roblink Plans</h2>${head}${note}<div class="tiers">${cards}</div>${shop}${t?'<h3>Manage</h3><button class="btn danger" data-act="cancelPlan0">Cancel plan</button>':''}`}
A.cancelPlan0=()=>A.cancelPlus();
