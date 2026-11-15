/* ============ Server structure: auto roles, bot roles, welcome message, channel settings + permissions, drag-to-reorder ============ */
/* needs migration_006_roles_order.sql */

/* ---- extra server fields ---- */
const _bs6=buildServer;
buildServer=function(row){
  const s=_bs6.apply(this,arguments);
  s.autoRoles=row.auto_roles||[];s.botRoles=row.bot_roles||{};s.welcome=row.welcome||{};
  Object.keys(s.botRoles).forEach(b=>{const r=s.roles.find(x=>x.id===s.botRoles[b]);if(s.members[b])s.members[b].roles=r?[r.id]:[]});
  return s};

const canRole=(s,i)=>s.owner==='me'||i>rank(s,'me');
const dot=c=>`<i style="width:12px;height:12px;border-radius:50%;background:${c};display:inline-block;flex:none"></i>`;

/* ---- Auto roles ---- */
function secAutoRoles(s){
  const can=perm(s,'me','MANAGE_ROLES'),sel=new Set(s.autoRoles||[]);
  return`<h2>Auto Roles</h2>${can?'':lock(s,'MANAGE_ROLES')}<p class="sub">These roles are given automatically to everyone the moment they join (invite, Explore or auto-join). You can only pick roles below your own, so nobody can be handed more power than you have.</p>`+
  (s.roles.length?s.roles.map((r,i)=>{const ok=can&&canRole(s,i);return`<div class="row"><div style="display:flex;gap:8px;align-items:center">${dot(r.color)}<b style="color:var(--text)">${esc(r.name)}</b>${r.perms&&r.perms.ADMIN?' <span class="badge">ADMIN</span>':''}</div><label class="toggle"><input type="checkbox" data-ar="${r.id}" ${sel.has(r.id)?'checked':''} ${ok?'':'disabled'}><i></i></label></div>`}).join('')
  :'<p class="sub">No roles yet. Create some under Roles first.</p>')+
  '<p class="sub" style="margin-top:12px">Tip: give auto roles no dangerous permissions, e.g. a plain “Member” role.</p>'}

/* ---- Bot roles ---- */
function serverBots(s){
  return[...s.bots.filter(b=>BOTS[b]).map(b=>({id:b,name:BOTS[b].name,u:S.users[b]})),...((F.bots&&F.bots[s.id])||[]).map(b=>({id:b.id,name:b.name,color:b.color}))]}
function secBotRoles(s){
  const can=perm(s,'me','MANAGE_ROLES'),bots=serverBots(s),br=s.botRoles||{};
  return`<h2>Bot Roles</h2>${can?'':lock(s,'MANAGE_ROLES')}<p class="sub">Give each bot a role. The role sets the bot's colour and where it sits in the member list (turn on “Display separately” on the role to group bots). Bots still only do what their commands do – a role doesn't give a bot extra powers.</p>`+
  (bots.length?bots.map(b=>{const cur=br[b.id]||'';
    const opts=`<option value="">No role</option>`+s.roles.map((r,i)=>(canRole(s,i)||r.id===cur)?`<option value="${r.id}" ${r.id===cur?'selected':''}>${esc(r.name)}</option>`:'').join('');
    return`<div class="card" style="display:flex;gap:12px;align-items:center">${b.u?av(b.u,40):`<div class="av" style="width:40px;height:40px;background:${esc(b.color||'#7c5cff')}"></div>`}<div style="flex:1"><b style="color:var(--text)">${esc(b.name)}</b> <span class="badge">BOT</span></div><select class="input" style="width:auto;min-width:150px" data-brole="${b.id}" ${can?'':'disabled'}>${opts}</select></div>`}).join('')
  :'<p class="sub">No bots installed. Add some under Bots &amp; Integrations.</p>')}

/* ---- Welcome / messages ---- */
function secMessages(s){
  const d=!perm(s,'me','MANAGE_SERVER'),w=s.welcome||{},tx=s.channels.filter(c=>c.type==='text');
  return`<h2>Messages</h2>${d?lock(s,'MANAGE_SERVER'):''}<p class="sub">Automatic messages Roblink posts for your server.</p>
  <div class="row"><div><b style="color:var(--text)">Welcome message</b><p class="sub">Posted in a channel when someone joins.</p></div><label class="toggle"><input type="checkbox" id="won" ${w.on?'checked':''} ${d?'disabled':''}><i></i></label></div>
  <label class="lbl">Channel</label><select class="input" id="wchan" ${d?'disabled':''}><option value="">First text channel</option>${tx.map(c=>`<option value="${c.id}" ${w.channel===c.id?'selected':''}># ${esc(c.name)}</option>`).join('')}</select>
  <label class="lbl">Message</label><textarea class="input" id="wtext" rows="3" maxlength="300" placeholder="Welcome {user} to {server}!" ${d?'disabled':''}>${esc(w.text||'')}</textarea>
  <p class="sub">Use <code>{user}</code> for the new member and <code>{server}</code> for the server name. Roblink also posts its normal “just joined” line.</p>
  ${d?'':'<button class="btn primary" data-act="welcomeSave">Save</button>'}`}
A.welcomeSave=async()=>{const s=srvOf();if(!s)return;const w={on:$('#won').checked,channel:$('#wchan').value||null,text:$('#wtext').value.trim()};
  if(await tryDo(()=>rpc('set_welcome',{sid:s.id,p_on:w.on,p_channel:w.channel,p_text:w.text}),'Saved'))s.welcome=w};

document.addEventListener('change',async e=>{
  const t=e.target;if(!t||!t.closest)return;const s=srvOf();
  if(t.dataset&&t.dataset.ar&&s){const ids=[...document.querySelectorAll('#settings [data-ar]')].filter(x=>x.checked).map(x=>x.dataset.ar);
    const ok=await tryDo(()=>rpc('set_auto_roles',{sid:s.id,ids}));if(ok)s.autoRoles=ids;else{await reloadServer(s.id)}if(V.set)renderSet();return}
  if(t.dataset&&t.dataset.brole&&s){const b=t.dataset.brole,v=t.value||null;
    const ok=await tryDo(()=>rpc('set_bot_role',{sid:s.id,bot:b,rid:v}));if(ok){if(v)s.botRoles[b]=v;else delete s.botRoles[b];if(s.members[b])s.members[b].roles=v?[v]:[];renderMembers&&renderMembers()}else await reloadServer(s.id);if(V.set)renderSet()}
});

/* ---- Channels list in server settings (grouped, draggable) ---- */
secChannels=function(s){
  const can=perm(s,'me','MANAGE_CHANNELS'),dd=(k,id)=>can?`draggable="true" data-dd="${k}" data-id="${id}"`:'';
  const row=c=>`<div class="ddrow" ${dd('chan',c.id)}><span class="grip">⠿</span><span>${c.type==='voice'?'🔊':'#'} ${esc(c.name)}</span><span class="sp"></span>${can?`<button class="ib" data-act="editCh" data-a="${c.id}" title="Channel settings &amp; permissions">⚙️</button><button class="ib" data-act="delChBtn" data-a="${c.id}" title="Delete">🗑️</button>`:''}</div>`;
  const has=k=>s.categories.some(x=>x.id===k);
  const loose=s.channels.filter(c=>!c.cat||!has(c.cat));
  return`<h2>Channels</h2>${can?'':lock(s,'MANAGE_CHANNELS')}${can?'<p class="sub">Drag ⠿ to reorder. Drag a channel onto a category to move it there. Drag categories to reorder them. Use ⚙️ for a channel\'s name, topic and permissions.</p><button class="btn primary sm" data-act="newCh">＋ Create channel</button> <button class="btn sm" data-act="newCat">＋ Create category</button>':''}`+
  `<div ${can?'data-dd="cat" data-id=""':''} class="ddrow cat" style="${can?'':'display:none'}">No category</div>`+loose.map(row).join('')+
  s.categories.map(k=>`<div class="ddrow cat" ${dd('cat',k.id)}><span class="grip">⠿</span><span>${esc(k.name)}</span><span class="sp"></span>${can?`<button class="ib" data-act="newCh" data-a="${k.id}" title="Create channel here">＋</button><button class="ib" data-act="catRename" data-a="${k.id}" title="Rename">✏️</button><button class="ib" data-act="catDel" data-a="${k.id}" title="Delete category">🗑️</button>`:''}</div>`+s.channels.filter(c=>c.cat===k.id).map(row).join('')).join('')}
A.delChBtn=el=>{const s=srvOf(),c=s.channels.find(x=>x.id===el.dataset.a);if(c)delChannel(s,c)};
A.catRename=el=>{const s=srvOf(),k=s.categories.find(x=>x.id===el.dataset.a);if(!k)return;modal({title:'Rename category',body:`<input class="input" id="crn" maxlength="30" value="${esc(k.name)}">`,btns:[{label:'Cancel',cls:'ghost'},{label:'Save',cls:'primary',fn:()=>{const n=$('#crn').value.trim();if(!n)return false;tryDo(async()=>{await must(sb.from('categories').update({name:n}).eq('id',k.id));await reloadServer(s.id);if(V.set)renderSet()})}}]})};
A.catDel=el=>{const s=srvOf(),k=s.categories.find(x=>x.id===el.dataset.a);if(!k)return;confirmBox('Delete category',`Delete <b>${esc(k.name)}</b>? Its channels are kept and move to “No category”.`,'Delete',()=>{tryDo(async()=>{await must(sb.from('categories').delete().eq('id',k.id));await reloadServer(s.id);if(V.set)renderSet()})},1)};

secXTools=function(){return`<h2>Discovery &amp; custom bots</h2><p class="sub">Channel permissions now live in each channel's own settings: open <b>Channels</b> and press ⚙️, or right-click a channel → Edit Channel.</p><div style="display:grid;gap:10px;max-width:360px"><button class="btn" data-act="xDisc">🧭 Discovery requirements</button><button class="btn" data-act="xInv">🎟️ Create invite code</button><button class="btn" data-act="xBot">🤖 Custom bots</button></div>`};

/* ---- Channel settings: overview + permissions ---- */
A.editCh=(el,e)=>{
  if(e&&e.stopPropagation)e.stopPropagation();
  const s=actSrv(),c=s&&s.channels.find(x=>x.id===el.dataset.a);if(!c||!perm(s,'me','MANAGE_CHANNELS'))return;
  const voice=c.type==='voice';let ov=null;
  const m=modal({title:(voice?'🔊 ':'# ')+esc(c.name),sub:'Channel settings',wide:1,
    body:`<div class="chtabs"><button class="btn sm primary" data-ct="o">Overview</button><button class="btn sm" data-ct="p">🔒 Permissions</button></div>
    <div id="ct-o"><label class="lbl">Channel name</label><input class="input" id="chn" maxlength="30" value="${esc(c.name)}">${voice?'':`<label class="lbl">Topic</label><input class="input" id="cht" maxlength="120" value="${esc(c.topic||'')}">`}</div>
    <div id="ct-p" hidden><p class="sub">Decide who can see ${voice?'':'and send messages in '}this channel. A member's setting beats their roles, and roles beat @everyone. “Default” means no override. Owners and Admins always have access. Changes here save instantly.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px"><button class="btn sm" id="cpPriv">🔒 Make private</button><button class="btn sm" id="cpPub">🌐 Make public</button></div>
      <div id="cpl" class="sub">Loading…</div>
      <div style="display:flex;gap:8px;margin-top:12px"><select class="input" id="cpadd" style="flex:1"></select><button class="btn primary sm" id="cpaddb">＋ Add</button></div></div>`,
    btns:[{label:'Delete',cls:'danger',fn:()=>{setTimeout(()=>delChannel(s,c),0)}},{label:'Close',cls:'ghost'},{label:'Save',cls:'primary',fn:()=>{const n=$('#chn').value.trim();if(!n)return false;const patch={name:voice?n:n.toLowerCase().replace(/\s+/g,'-')};if($('#cht'))patch.topic=$('#cht').value.trim();tryDo(async()=>{await must(sb.from('channels').update(patch).eq('id',c.id));await reloadServer(s.id);if(V.set)renderSet()})}}]});
  const tri=v=>v===true?'t':v===false?'f':'',un=v=>v==='t'?true:v==='f'?false:null;
  const opts=v=>`<option value="" ${v===''?'selected':''}>Default</option><option value="t" ${v==='t'?'selected':''}>✅ Allow</option><option value="f" ${v==='f'?'selected':''}>⛔ Deny</option>`;
  const who=o=>o.target_type==='everyone'?'<b>@everyone</b>':o.target_type==='role'?(()=>{const r=s.roles.find(x=>x.id===o.target_id);return r?`${dot(r.color)} <b>${esc(r.name)}</b>`:'<b>(deleted role)</b>'})():(()=>{const u=getUser(mid(o.target_id));return u?`${av(u,24)} <b>${esc(u.name)}</b>`:'<b>Member</b>'})();
  const draw=()=>{
    const l=$('#cpl',m);if(!l)return;
    l.innerHTML=ov.length?ov.map((o,i)=>`<div class="ovrow" data-i="${i}"><span class="who">${who(o)}</span><label class="sub">View <select class="input" data-w="v">${opts(tri(o.can_view))}</select></label>${voice?'':`<label class="sub">Send <select class="input" data-w="s">${opts(tri(o.can_send))}</select></label>`}<button class="ib" data-rm="${i}" title="Remove">✕</button></div>`).join(''):'<p class="sub">No overrides – everyone with access to the server can use this channel.</p>';
    const have=new Set(ov.map(o=>o.target_type+':'+o.target_id)),a=$('#cpadd',m);let h='';
    if(!have.has('everyone:'+s.id))h+=`<option value="everyone:${s.id}">@everyone</option>`;
    s.roles.forEach(r=>{if(!have.has('role:'+r.id))h+=`<option value="role:${r.id}">Role: ${esc(r.name)}</option>`});
    Object.keys(s.members).forEach(k=>{if(BOTS[k])return;const id=k==='me'?MYID:k,u=getUser(k);if(u&&!have.has('member:'+id))h+=`<option value="member:${id}">Member: ${esc(u.name)}</option>`});
    a.innerHTML=h||'<option value="">Everything added</option>'};
  const save=async(o)=>{const ok=await tryDo(()=>rpc('set_channel_override',{cid:c.id,ttype:o.target_type,tid:o.target_id,v:o.can_view,s:o.can_send}));if(!ok)await load()};
  const load=async()=>{try{ov=await must(sb.from('channel_overrides').select('*').eq('channel_id',c.id))}catch(x){ov=[];toast(errMsg(x),'err')}draw()};
  m.querySelectorAll('[data-ct]').forEach(b=>b.onclick=()=>{m.querySelectorAll('[data-ct]').forEach(x=>x.classList.toggle('primary',x===b));$('#ct-o',m).hidden=b.dataset.ct!=='o';$('#ct-p',m).hidden=b.dataset.ct!=='p';if(b.dataset.ct==='p'&&ov===null)load()});
  $('#cpl',m).addEventListener('change',async ev=>{const r=ev.target.closest('.ovrow');if(!r||!ev.target.dataset.w)return;const o=ov[+r.dataset.i];
    const v=un(r.querySelector('[data-w="v"]').value),sd=r.querySelector('[data-w="s"]'),sv=sd?un(sd.value):o.can_send;o.can_view=v;o.can_send=sv;
    if(v===null&&sv===null){ov.splice(+r.dataset.i,1);draw()}await save({...o})});
  $('#cpl',m).addEventListener('click',async ev=>{const b=ev.target.closest('[data-rm]');if(!b)return;const o=ov.splice(+b.dataset.rm,1)[0];draw();await save({...o,can_view:null,can_send:null})});
  $('#cpaddb',m).onclick=async()=>{const v=$('#cpadd',m).value;if(!v)return;const i=v.indexOf(':'),o={channel_id:c.id,target_type:v.slice(0,i),target_id:v.slice(i+1),can_view:null,can_send:null};
    // a blank override is not stored; start it as "Deny view" for @everyone/roles so the row means something, or "Allow" for a member
    if(o.target_type==='member'){o.can_view=true;o.can_send=voice?null:true}else{o.can_view=false;o.can_send=voice?null:false}
    ov.push(o);draw();await save(o)};
  $('#cpPriv',m).onclick=async()=>{if(ov===null)await load();let o=ov.find(x=>x.target_type==='everyone');if(!o){o={channel_id:c.id,target_type:'everyone',target_id:s.id};ov.push(o)}o.can_view=false;o.can_send=voice?null:false;draw();await save({...o});toast('Private: only people you add (or Admins) can see it.')};
  $('#cpPub',m).onclick=async()=>{if(ov===null)await load();const o=ov.find(x=>x.target_type==='everyone');if(!o)return toast('Already public.');ov=ov.filter(x=>x!==o);draw();await save({...o,can_view:null,can_send:null});toast('Public again.')};
};

/* ---- drag & drop: roles, channels, categories ---- */
let DD=null;
const ddWipe=()=>document.querySelectorAll('.dd-before,.dd-after').forEach(x=>x.classList.remove('dd-before','dd-after'));
const ddOk=(a,b)=>a==='role'?b==='role':(b==='chan'||b==='cat');
document.addEventListener('dragstart',e=>{const t=e.target.closest&&e.target.closest('[data-dd]');if(!t||!t.dataset.id)return;DD={k:t.dataset.dd,id:t.dataset.id};t.classList.add('drag');e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',DD.id)}catch(x){}},true);
document.addEventListener('dragover',e=>{if(!DD)return;const t=e.target.closest&&e.target.closest('[data-dd]');if(!t||!ddOk(DD.k,t.dataset.dd)||(t.dataset.dd===DD.k&&t.dataset.id===DD.id))return;e.preventDefault();ddWipe();const r=t.getBoundingClientRect();t.classList.add((e.clientY-r.top)>r.height/2?'dd-after':'dd-before')});
document.addEventListener('dragend',()=>{DD=null;ddWipe();document.querySelectorAll('[data-dd].drag').forEach(x=>x.classList.remove('drag'))});
document.addEventListener('drop',e=>{if(!DD)return;const t=e.target.closest&&e.target.closest('[data-dd]'),d=DD;DD=null;ddWipe();document.querySelectorAll('[data-dd].drag').forEach(x=>x.classList.remove('drag'));
  if(!t||!ddOk(d.k,t.dataset.dd))return;e.preventDefault();const r=t.getBoundingClientRect();ddMove(d,{k:t.dataset.dd,id:t.dataset.id},(e.clientY-r.top)>r.height/2,!!t.closest('#settings'))});

/* pure ordering helpers (also used by tests) */
function orderRoles(s,id,tid,after){const ids=s.roles.map(r=>r.id).filter(x=>x!==id),i=ids.indexOf(tid);if(i<0||!s.roles.some(r=>r.id===id))return null;ids.splice(after?i+1:i,0,id);return ids}
function orderChannels(s,id,t,after){
  const cats=s.categories.map(k=>k.id),g={'':[]};cats.forEach(k=>g[k]=[]);
  s.channels.forEach(c=>g[c.cat&&g[c.cat]?c.cat:''].push(c.id));
  if(!s.channels.some(c=>c.id===id))return null;
  Object.keys(g).forEach(k=>g[k]=g[k].filter(x=>x!==id));
  let tg,ix;
  if(t.k==='cat'){tg=t.id||'';if(!(tg in g))return null;ix=0}
  else{const tc=s.channels.find(c=>c.id===t.id);if(!tc)return null;tg=tc.cat&&g[tc.cat]?tc.cat:'';ix=g[tg].indexOf(t.id);if(ix<0)return null;if(after)ix++}
  g[tg].splice(ix,0,id);let pos=0;const items=[];['',...cats].forEach(k=>g[k].forEach(x=>items.push({id:x,cat:k||null,pos:pos++})));return items}
function orderCats(s,id,t,after){
  const tcat=t.k==='cat'?t.id:(s.channels.find(c=>c.id===t.id)||{}).cat;if(!tcat)return null;
  const ids=s.categories.map(k=>k.id).filter(x=>x!==id),i=ids.indexOf(tcat);if(i<0||!s.categories.some(k=>k.id===id))return null;
  ids.splice(t.k==='cat'&&after?i+1:i,0,id);return ids}

async function ddMove(d,t,after,inSet){
  const s=inSet?srvOf():curServer();if(!s)return;let ok;
  if(d.k==='role'){
    if(!perm(s,'me','MANAGE_ROLES'))return;const ids=orderRoles(s,d.id,t.id,after);if(!ids)return;
    if(s.owner!=='me'&&ids.indexOf(d.id)<=rank(s,'me'))return toast('You can\'t move a role to or above your own.','err');
    const old=s.roles.slice();s.roles=ids.map(id=>old.find(r=>r.id===id));s.roles.forEach((r,i)=>r.position=i);if(inSet)renderSet();
    ok=await tryDo(()=>rpc('reorder_roles',{sid:s.id,ids}))}
  else if(d.k==='chan'){
    if(!perm(s,'me','MANAGE_CHANNELS'))return;const items=orderChannels(s,d.id,t,after);if(!items)return;
    const pos={};items.forEach(i=>{pos[i.id]=i.pos;const c=s.channels.find(x=>x.id===i.id);c.cat=i.cat});s.channels.sort((a,b)=>pos[a.id]-pos[b.id]);
    renderSide();if(inSet)renderSet();
    ok=await tryDo(()=>rpc('reorder_channels',{sid:s.id,items}))}
  else if(d.k==='cat'){
    if(!perm(s,'me','MANAGE_CHANNELS'))return;const ids=orderCats(s,d.id,t,after);if(!ids)return;
    const old=s.categories.slice();s.categories=ids.map(id=>old.find(k=>k.id===id));renderSide();if(inSet)renderSet();
    ok=await tryDo(()=>rpc('reorder_categories',{sid:s.id,ids}))}
  await reloadServer(s.id);if(inSet&&V.set)renderSet()}

/* make sidebar channels/categories and settings roles draggable */
const _rside6=renderSide;
renderSide=function(){_rside6.apply(this,arguments);
  const s=curServer();if(!s||V.dm||V.server==='home'||!perm(s,'me','MANAGE_CHANNELS'))return;
  document.querySelectorAll('#side .ch[data-a]').forEach(e=>{e.draggable=true;e.dataset.dd='chan';e.dataset.id=e.dataset.a});
  document.querySelectorAll('#side .cat[data-a]').forEach(e=>{e.draggable=true;e.dataset.dd='cat';e.dataset.id=e.dataset.a})};
const _rset6=renderSet;
renderSet=function(){_rset6.apply(this,arguments);
  const st=V.set;if(!st||st.kind!=='server')return;const s=srvOf();if(!s||!perm(s,'me','MANAGE_ROLES'))return;
  document.querySelectorAll('#settings .ri[data-a]').forEach(e=>{const i=s.roles.findIndex(r=>r.id===e.dataset.a);if(i<0||!canRole(s,i))return;e.draggable=true;e.dataset.dd='role';e.dataset.id=e.dataset.a})};
