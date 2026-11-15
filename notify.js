/* ============ Pings & notifications: @mentions, replies, role pings, desktop alerts, mentions inbox, Shift-to-delete ============ */
let SHIFT=false;
['keydown','keyup','mousedown','pointerdown','click'].forEach(ev=>document.addEventListener(ev,e=>{SHIFT=!!e.shiftKey},true));

/* ---- per-server / per-channel settings ---- */
const srvLevel=sid=>((S.set.srvNotif||{})[sid])||'all';
const isChMuted=cid=>!!(S.set.muted||{})[cid];
function chanMute(cid){S.set.muted=S.set.muted||{};if(S.set.muted[cid])delete S.set.muted[cid];else S.set.muted[cid]=1;save();toast(S.set.muted[cid]?'Channel muted – no alerts from it.':'Channel unmuted.')}
function setSrvLevel(sid,v){S.set.srvNotif=S.set.srvNotif||{};if(v==='all')delete S.set.srvNotif[sid];else S.set.srvNotif[sid]=v;save()}
function srvNotifModal(s){const cur=srvLevel(s.id),o=(v,l,d)=>`<label class="card" style="display:flex;gap:10px;align-items:flex-start;cursor:pointer"><input type="radio" name="snl" value="${v}" ${cur===v?'checked':''} style="margin-top:4px"><span><b style="color:var(--text)">${l}</b><div class="sub">${d}</div></span></label>`;
  modal({title:'🔔 '+esc(s.name),sub:'Notification settings for this server',body:o('all','All messages','Sound and desktop alerts for every new message.')+o('mentions','Only @mentions','Alerts only when someone pings you, replies to you or pings a role you have.')+o('none','Nothing','No sounds or popups. Unread badges still show.'),btns:[{label:'Cancel',cls:'ghost'},{label:'Save',cls:'primary',fn:b=>{const v=(b.querySelector('input[name=snl]:checked')||{}).value||'all';setSrvLevel(s.id,v);toast('Saved')}}]})}

/* ---- ping detection ---- */
const svOfConv=conv=>S.servers.find(s=>s.channels.some(c=>c.id===conv))||null;
function pingOf(conv,m){const sv=svOfConv(conv);return mentionsMe(m,sv,conv)}

/* ---- mentions inbox (kept on this device) ---- */
let PINGS=[];
const pingKey=()=>'roblink_pings:'+MYID;
function pingLoad(){try{PINGS=JSON.parse(localStorage.getItem(pingKey())||'[]')}catch(e){PINGS=[]}}
function pingSave(){try{localStorage.setItem(pingKey(),JSON.stringify(PINGS.slice(0,50)))}catch(e){}}
const pingUnread=()=>PINGS.filter(p=>!p.read).length;
function pingAdd(p){if(!PINGS.length)pingLoad();PINGS.unshift(p);PINGS=PINGS.slice(0,50);pingSave();bellRefresh()}
function pingRead(conv){if(!PINGS.some(p=>p.conv===conv&&!p.read))return;PINGS.forEach(p=>{if(p.conv===conv)p.read=1});pingSave();bellRefresh()}
function bellRefresh(){const n=pingUnread(),b=document.getElementById('bellb');if(b){b.textContent=n>99?'99+':n;b.style.display=n?'flex':'none'}titleRefresh()}
function titleRefresh(){const n=Object.values(S.unread||{}).reduce((a,u)=>a+(u.m||0),0);document.title=(n?'('+(n>99?'99+':n)+') ':'')+'Roblink'}
const _rt9=renderTop;renderTop=function(){_rt9.apply(this,arguments);const t=document.getElementById('top');if(t&&!t.querySelector('#bell'))t.insertAdjacentHTML('beforeend','<button class="ib bell" id="bell" data-act="pingInbox" title="Mentions & pings">🔔<b class="bellb" id="bellb" style="display:none"></b></button>');bellRefresh()};
const _rr9=renderRail;renderRail=function(){_rr9.apply(this,arguments);titleRefresh()};
const _mr9=markRead;markRead=function(conv){pingRead(conv);return _mr9.apply(this,arguments)};
const where=conv=>{if(isDmKey(conv)){const d=S.dms.find(x=>x.id===conv),u=d&&getUser(d.user);return{label:'DM with '+(u?u.name:'someone')}}const sv=svOfConv(conv),c=sv&&sv.channels.find(x=>x.id===conv);return{label:c?(sv.name+' › #'+c.name):'a channel'}};
function pingJump(conv){if(isDmKey(conv))go('home',null,conv);else{const sv=svOfConv(conv);if(sv)go(sv.id,conv)}}
A.pingInbox=()=>{if(!PINGS.length)pingLoad();const rows=PINGS.map((p,i)=>`<div class="card pingrow ${p.read?'':'unr'}" data-act="pingGo" data-a="${p.conv}" style="cursor:pointer"><div class="sub">${esc(p.where)} • ${new Date(p.ts).toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div><div><b style="color:var(--text)">${esc(p.from)}</b> ${esc(p.txt)}</div></div>`).join('');
  modal({title:'🔔 Mentions & pings',sub:'Times someone @mentioned you, replied to you or pinged a role you have. Kept on this device.',wide:1,body:rows||'<div class="empty">Nothing yet. 🎉</div>',btns:[{label:'Clear all',cls:'danger',fn:()=>{PINGS=[];pingSave();bellRefresh()}},{label:'Mark all read',fn:()=>{PINGS.forEach(p=>p.read=1);pingSave();bellRefresh()}},{label:'Close',cls:'primary'}]})};
A.pingGo=el=>{closeModal();const c=el.dataset.a;const p=PINGS.find(x=>x.conv===c);pingJump(c);pingRead(c)};

/* ---- the alert itself ---- */
const plain=t=>String(t||'').replace(/\|\|.+?\|\|/g,'▮▮▮').replace(/[*_~`>]/g,'').replace(/\s+/g,' ').trim().slice(0,140);
function notifyMsg(conv,m){
  const dm=isDmKey(conv),sv=dm?null:svOfConv(conv),ping=!dm&&pingOf(conv,m),isPing=ping||dm;
  const au=getUser(m.a)||{name:'Someone'},w=where(conv),txt=plain(m.t)||(m.img?'📷 Image':'sent something');
  if(ping)pingAdd({conv,id:m.id,ts:m.ts||Date.now(),from:au.name,txt,where:w.label});
  if(isChMuted(conv))return;
  const lvl=sv?srvLevel(sv.id):'all';
  if(lvl==='none'||(lvl==='mentions'&&!isPing))return;
  if(S.me.status==='dnd')return;                                  /* Do Not Disturb = silence */
  const quietOk=!S.set.mentionsOnly||isPing;
  if(S.set.sounds&&quietOk)tone(isPing?[[988,.08],[1319,.1],[1568,.16]]:[[880,.08],[1175,.12]]);
  if(!isPing)return;
  const here=!document.hidden&&document.hasFocus();
  if(S.set.desktop&&'Notification' in window&&Notification.permission==='granted'&&!here){
    try{const n=new Notification(dm?au.name:`${au.name} (${w.label})`,{body:txt,tag:conv,icon:'icon-192.png'});n.onclick=()=>{window.focus();pingJump(conv);n.close()}}catch(e){}}
  else if(here&&S.set.pingToasts!==false)pingToast(au,w.label,txt,conv,dm)}
function pingToast(au,label,txt,conv,dm){let box=document.getElementById('pingbox');if(!box){box=document.createElement('div');box.id='pingbox';document.body.appendChild(box)}
  const d=document.createElement('div');d.className='pingtoast';d.innerHTML=`${av(au,32)}<div style="min-width:0"><b>${esc(au.name)}</b> <span class="sub">${dm?'sent you a message':'pinged you in '+esc(label)}</span><div class="pt">${esc(txt)}</div></div>`;
  d.onclick=()=>{pingJump(conv);d.remove()};box.appendChild(d);while(box.children.length>3)box.firstChild.remove();setTimeout(()=>d.remove(),7000)}

/* ---- @mention autocomplete in the composer ---- */
let MEN=null;
function menCands(q){const s=curServer(),d=curDm(),out=[];q=q.toLowerCase();
  const add=(key,label,sub,u)=>{if(!q||key.startsWith(q)||label.toLowerCase().includes(q))out.push({key,label,sub,u})};
  if(s){Object.keys(s.members).forEach(id=>{if(BOTS[id]||id==='me')return;const u=getUser(id);if(u)add(u.username,dispName(u,s),'@'+u.username,u)});
    s.roles.forEach(r=>add(r.name.toLowerCase().replace(/\s+/g,''),r.name,'role',null));
    add('everyone','everyone','Notify all members');add('here','here','Notify members online')}
  else if(d){const u=getUser(d.user);if(u&&!u.bot)add(u.username,u.name,'@'+u.username,u)}
  return out.slice(0,8)}
function menClose(){MEN=null;const b=document.getElementById('suggest');if(b&&b.dataset.men){b.dataset.men='';b.style.display='none'}}
function menShow(inp){
  const pos=inp.selectionStart,m=/(^|\s)@([a-z0-9_.]*)$/i.exec(inp.value.slice(0,pos));if(!m)return menClose();
  const c=menCands(m[2]);if(!c.length)return menClose();
  MEN={start:pos-m[2].length-1,end:pos,c,i:0};const b=document.getElementById('suggest');if(!b)return;b.dataset.men='1';b.style.display='block';menDraw()}
function menDraw(){const b=document.getElementById('suggest');if(!b||!MEN)return;b.innerHTML=MEN.c.map((x,i)=>`<div data-men="${i}" class="${i===MEN.i?'on':''}">${x.u?av(x.u,20):'<span style="width:20px;display:inline-block;text-align:center">@</span>'}<b>${esc(x.label)}</b><span>${esc(x.sub)}</span></div>`).join('')}
function menPick(i){const inp=document.getElementById('input');if(!MEN||!inp)return;const x=MEN.c[i];if(!x)return;const ins='@'+x.key+' ';inp.value=inp.value.slice(0,MEN.start)+ins+inp.value.slice(MEN.end);const p=MEN.start+ins.length;inp.focus();inp.selectionStart=inp.selectionEnd=p;V.drafts[convKey()]=inp.value;menClose();autosize&&autosize(inp)}
document.addEventListener('input',e=>{if(e.target&&e.target.id==='input')menShow(e.target)});
document.addEventListener('keydown',e=>{if(!MEN||!e.target||e.target.id!=='input')return;
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();e.stopImmediatePropagation();MEN.i=(MEN.i+(e.key==='ArrowDown'?1:MEN.c.length-1))%MEN.c.length;menDraw()}
  else if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();e.stopImmediatePropagation();menPick(MEN.i)}
  else if(e.key==='Escape'){e.stopImmediatePropagation();menClose()}},true);
document.addEventListener('mousedown',e=>{const it=e.target.closest&&e.target.closest('#suggest [data-men]');if(it){e.preventDefault();menPick(+it.dataset.men)}},true);

/* ---- notification settings page ---- */
secNotifs=function(){const s=S.set,perm=('Notification' in window)?Notification.permission:'unsupported',
  srvs=S.servers.map(v=>`<div class="row"><span>${esc(v.name)}</span><select class="input" style="width:auto" data-srvlvl="${v.id}"><option value="all" ${srvLevel(v.id)==='all'?'selected':''}>All messages</option><option value="mentions" ${srvLevel(v.id)==='mentions'?'selected':''}>Only @mentions</option><option value="none" ${srvLevel(v.id)==='none'?'selected':''}>Nothing</option></select></div>`).join('');
  return`<h2>Notifications</h2>${tog('set.sounds','Notification sounds','Play a chime for new messages. @mentions get a different, brighter chime.',s.sounds)}${tog('set.mentionsOnly','Only sound for @mentions & DMs','',s.mentionsOnly)}${tog('set.desktop','Desktop notifications','Show a system notification for @mentions, replies and DMs when Roblink is in the background.',s.desktop)}
  <p class="sub">Browser permission: <b>${perm==='granted'?'✅ allowed':perm==='denied'?'⛔ blocked – allow it in your browser\'s site settings':perm==='unsupported'?'not supported here':'not asked yet'}</b> <button class="btn sm" data-act="testNotif">Send a test</button></p>
  ${tog('set.pingToasts','In-app ping popups','A small popup when you\'re pinged somewhere else while using Roblink.',s.pingToasts!==false)}${tog('set.noEveryone','Ignore @everyone and @here','Don\'t treat them as pings for you.',s.noEveryone)}
  <p class="sub">Do Not Disturb status silences all sounds and popups. Pings are still saved in your 🔔 inbox.</p>
  <h3>Per server</h3>${srvs||'<p class="sub">Join a server to see it here.</p>'}<p class="sub">Tip: right-click a channel to mute it.</p><h3>Test</h3><button class="btn" data-act="testSound">🔔 Play sound</button>`};
A.testNotif=async()=>{if(!('Notification' in window))return toast('Not supported in this browser.','err');let p=Notification.permission;if(p==='default')p=await Notification.requestPermission();if(p!=='granted'){renderSet&&V.set&&renderSet();return toast('Notifications are blocked for this site.','err')}
  new Notification('Roblink',{body:'Desktop notifications are working 🎉',icon:'icon-192.png'});if(V.set)renderSet()};
document.addEventListener('change',async e=>{const t=e.target;if(!t||!t.dataset)return;
  if(t.dataset.srvlvl){setSrvLevel(t.dataset.srvlvl,t.value);return}
  if(t.dataset.bind==='set.desktop'&&t.checked){if(!('Notification' in window)){t.checked=false;S.set.desktop=false;return toast('Not supported in this browser.','err')}
    let p=Notification.permission;if(p==='default')p=await Notification.requestPermission();if(p!=='granted'){S.set.desktop=false;save();toast('Notifications are blocked – allow them in your browser\'s site settings.','err');if(V.set)renderSet()}else if(V.set)renderSet()}});
document.addEventListener('visibilitychange',titleRefresh);
