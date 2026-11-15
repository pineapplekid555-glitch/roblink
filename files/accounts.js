/* ============ Saved accounts: switch without logging out ============ */
const ACC_KEY='roblink_accounts_v1';
const accGet=()=>{try{return JSON.parse(localStorage.getItem(ACC_KEY)||'[]')}catch(e){return[]}};
const accSet=l=>{try{localStorage.setItem(ACC_KEY,JSON.stringify(l))}catch(e){}};
async function accSave(){
  try{const{data}=await sb.auth.getSession();const ss=data&&data.session;if(!ss||!MYID||!S.me)return;
    const l=accGet().filter(a=>a.id!==ss.user.id);
    l.unshift({id:ss.user.id,email:ss.user.email,name:S.me.name,username:S.me.username,color:S.me.color,avatar:S.me.avatarImg||null,at:ss.access_token,rt:ss.refresh_token,ts:Date.now()});
    accSet(l.slice(0,8))}catch(e){}}
function accTokens(ss){try{if(!ss||!ss.user)return;const l=accGet(),a=l.find(x=>x.id===ss.user.id);if(a){a.at=ss.access_token;a.rt=ss.refresh_token;accSet(l)}}catch(e){}}
async function accSwitch(id){
  const a=accGet().find(x=>x.id===id);if(!a)return;
  window.ACC_BUSY=true;await accSave();
  try{const r=await sb.auth.setSession({access_token:a.at,refresh_token:a.rt});if(r.error||!r.data.session)throw r.error||new Error('expired')}
  catch(e){window.ACC_BUSY=false;accSet(accGet().filter(x=>x.id!==id));toast('That account\'s login expired – please log in to it again.','err');return A.accounts()}
  location.reload()}
A.accSwitch=el=>accSwitch(el.dataset.a);
A.accRemove=el=>{accSet(accGet().filter(a=>a.id!==el.dataset.a));A.accounts()};
A.accAdd=async()=>{window.ACC_BUSY=true;await accSave();try{await sb.auth.signOut({scope:'local'})}catch(e){}location.reload()};
A.accUsernameLogin=async el=>{const on=el.checked;try{await must(sb.from('profiles').update({username_login:on}).eq('id',MYID));toast(on?'People can now log in to your account with your username.':'Username login turned off for your account.')}catch(e){el.checked=!on;toast(errMsg(e),'err')}};
const accAvatar=a=>`<div class="av" style="width:36px;height:36px;background:${esc(a.color||'#5865f2')};font-size:16px">${a.avatar?`<img src="${esc(a.avatar)}" alt="">`:`<span>${esc((a.name||'?')[0].toUpperCase())}</span>`}</div>`;
A.accounts=()=>{
  const l=accGet(),cur=MYID;
  modal({title:'Switch account',sub:'Stay signed in to several accounts and hop between them. Accounts are remembered only on this device.',
    body:`<div class="accs">${l.map(a=>`<div class="accrow ${a.id===cur?'cur':''}">${accAvatar(a)}<div class="t"><b>${esc(a.name||a.username)}</b><small>@${esc(a.username||'')} • ${esc(a.email||'')}</small></div>${a.id===cur?'<span class="badge">Current</span>':`<button class="btn sm primary" data-act="accSwitch" data-a="${a.id}">Switch</button><button class="ib" data-act="accRemove" data-a="${a.id}" title="Remove from this device">✕</button>`}</div>`).join('')||'<p class="sub">No saved accounts yet.</p>'}</div>
    <button class="btn" style="width:100%;margin-top:10px" data-act="accAdd">＋ Add another account</button>
    <label class="chk" style="display:flex;gap:8px;align-items:center;margin-top:14px"><input type="checkbox" data-act="accUsernameLogin" ${S.me.usernameLogin===false?'':'checked'}> Let people log in with just my username</label>`,
    btns:[{label:'Close',cls:'ghost'}]})};
/* hooks */
const _startSession=startSession;startSession=async function(u){const r=await _startSession(u);accSave();return r};
const _logout2=A.logout2;
A.logout2=async()=>{window.ACC_BUSY=true;const id=MYID,rest=accGet().filter(a=>a.id!==id);accSet(rest);try{await sb.auth.signOut({scope:'local'})}catch(e){}
  if(rest.length){try{await sb.auth.setSession({access_token:rest[0].at,refresh_token:rest[0].rt})}catch(e){}}location.reload()};
document.addEventListener('visibilitychange',()=>{if(document.hidden)accSave()});window.addEventListener('beforeunload',()=>{accSave()});
/* saved accounts on the login screen */
const _showAuth=showAuth;showAuth=function(mode,note){_showAuth(mode,note);
  const l=accGet();if(!l.length)return;const lb=$('#boot .lbl');if(!lb)return;
  lb.insertAdjacentHTML('beforebegin',`<div class="accs" style="margin-top:12px"><div class="sub" style="margin-bottom:6px">Saved accounts on this device</div>${l.map(a=>`<div class="accrow">${accAvatar(a)}<div class="t"><b>${esc(a.name||a.username)}</b><small>@${esc(a.username||'')}</small></div><button class="btn sm primary" data-act="accSwitch" data-a="${a.id}">Continue</button></div>`).join('')}</div>`)};
