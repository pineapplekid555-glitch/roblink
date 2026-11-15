/* ============ Roblink data layer (Supabase) ============ */
const SB_URL='https://aadrjiammelkqauxyvuf.supabase.co';
const SB_KEY='sb_publishable_CoNwoAEgS_mUdV1n80977w_2HRtHkMM';
let sb=null,MYID=null,USER_EMAIL='',ONLINE=new Set(),RECOVERY=false,APP_STARTED=false;
const mid=id=>id===MYID?'me':id, rid=id=>id==='me'?MYID:id;
const TM={};function persist(k,fn,ms){clearTimeout(TM[k]);TM[k]=setTimeout(fn,ms||600)}
const chunk=(a,n)=>Array.from({length:Math.ceil(a.length/n)},(_,i)=>a.slice(i*n,i*n+n));
async function must(p){const r=await p;if(r.error)throw r.error;return r.data}
const rpc=(fn,args)=>must(sb.rpc(fn,args));
function errMsg(e){const m=(e&&e.message)||String(e);if(/row-level security|permission denied/i.test(m))return 'You don\'t have permission to do that.';if(/Failed to fetch|NetworkError|Load failed/i.test(m))return 'Network error – check your connection.';return m}
async function tryDo(fn,okMsg){try{await fn();if(okMsg)toast(okMsg);return true}catch(e){console.warn(e);toast(errMsg(e),'err');return false}}
async function inQ(table,col,ids,sel,extra){const out=[];for(const c of chunk([...new Set(ids)],60)){let q=sb.from(table).select(sel||'*').in(col,c);if(extra)q=extra(q);out.push(...await must(q))}return out}
const isStaff=()=>!!(S.me&&S.me.platformRole&&S.me.platformRole!=='user');

/* ---------- users ---------- */
function mapUser(p,isMe){return{id:isMe?'me':p.id,uuid:p.id,username:p.username,name:p.display_name,color:p.color,avatarImg:p.avatar_url,bannerImg:p.banner_url,bannerColor:p.banner_color,about:p.about,pronouns:p.pronouns,pstatus:p.status,status:isMe?p.status:'offline',customStatus:p.custom_status,plus:p.plus,plusTier:p.plus_tier||0,plusSince:p.plus_since?+new Date(p.plus_since):0,boostsLeft:p.boosts_left,platformRole:p.platform_role,suspended:p.suspended,suspendedReason:p.suspended_reason,created:+new Date(p.created_at)}}
function registerUser(p){if(p.id===MYID){const m=mapUser(p,true);Object.assign(S.me,m,{boosted:S.me.boosted||{},email:S.me.email});return}const u=mapUser(p);S.users[p.id]=u;applyPresence()}
function applyPresence(){Object.values(S.users).forEach(u=>{if(u.bot)return;u.status=(ONLINE.has(u.uuid)&&u.pstatus!=='invisible')?u.pstatus:'offline'})}
async function ensureUsers(ids){const need=[...new Set(ids)].filter(i=>i&&i!==MYID&&!S.users[i]&&!BOTS[i]);if(!need.length)return;try{(await inQ('profiles','id',need)).forEach(registerUser)}catch(e){console.warn(e)}}

/* ---------- servers ---------- */
function buildServer(row,chs,cats,roles,mems,emos,prev){
  const s={id:row.id,name:row.name,icon:row.icon,iconImg:row.icon_url,color:row.color,owner:mid(row.owner_id),desc:row.description,boosts:row.boosts,bannerColor:row.banner_color,bannerImg:row.banner_url,isPublic:row.is_public,verification:row.verification,filter:row.explicit_filter,everyone:row.everyone_perms||{},automod:row.automod||{on:false,words:[]},bots:row.bots||[],invite:row.invite_code,created:+new Date(row.created_at),
    categories:cats.sort((a,b)=>a.position-b.position).map(c=>({id:c.id,name:c.name})),
    channels:chs.sort((a,b)=>a.position-b.position).map(c=>({id:c.id,name:c.name,type:c.type,cat:c.category_id,topic:c.topic})),
    roles:roles.sort((a,b)=>a.position-b.position).map(r=>({id:r.id,name:r.name,color:r.color,perms:r.perms||{},hoist:r.hoist,position:r.position})),
    members:{},emojis:emos.map(e=>({id:e.id,name:e.name,data:e.url})),invites:prev?prev.invites:[],bans:prev?prev.bans:[],audit:prev?prev.audit:[],voiceUsers:prev?prev.voiceUsers:{}};
  mems.forEach(m=>{s.members[mid(m.user_id)]={roles:m.role_ids||[],nick:m.nickname||'',joined:+new Date(m.joined_at),timeout:m.timeout_until?+new Date(m.timeout_until):0}});
  s.bots.forEach(b=>{if(BOTS[b])s.members[b]={roles:[],nick:'',joined:s.created,timeout:0}});
  s.channels.filter(c=>c.type==='voice').forEach(c=>{s.voiceUsers[c.id]=s.voiceUsers[c.id]||[]});
  return s}
async function loadServers(sids){
  sids=[...new Set(sids)];if(!sids.length)return;
  const [srv,chs,cats,roles,mems,emos]=await Promise.all(['servers:id','channels:server_id','categories:server_id','roles:server_id','server_members:server_id','emojis:server_id'].map(x=>{const[t,c]=x.split(':');return inQ(t,c,sids)}));
  await ensureUsers(mems.map(m=>m.user_id));
  srv.forEach(row=>{const by=a=>a.filter(x=>x.server_id===row.id);const prev=S.servers.find(x=>x.id===row.id);
    const s=buildServer(row,by(chs),by(cats),by(roles),by(mems),by(emos),prev);const i=S.servers.findIndex(x=>x.id===row.id);if(i>=0)S.servers[i]=s;else S.servers.push(s)});
  S.servers.sort((a,b)=>a.created-b.created)}
async function loadAdmin(s){
  const[inv,bans,aud,bst]=await Promise.all([sb.from('invites').select('*').eq('server_id',s.id),sb.from('bans').select('*').eq('server_id',s.id),sb.from('audit_log').select('*').eq('server_id',s.id).order('created_at',{ascending:false}).limit(100),sb.from('boosts').select('*').eq('server_id',s.id)]);
  const bl=bans.data||[],al=aud.data||[];await ensureUsers(bl.map(b=>b.user_id).concat(al.map(a=>a.actor_id)));
  s.invites=(inv.data||[]).map(v=>({id:v.id,code:v.code,by:mid(v.created_by),uses:v.uses,max:v.max_uses,ts:+new Date(v.created_at)}));
  s.bans=bl.map(b=>({id:mid(b.user_id),uuid:b.user_id,reason:b.reason,ts:+new Date(b.created_at)}));
  s.audit=al.map(a=>({ts:+new Date(a.created_at),who:(getUser(mid(a.actor_id))||{name:'Someone'}).name,t:a.text}));
  S.me.boosted[s.id]=((bst.data||[])[0]||{}).count||0}
function dropServer(sid){const s=S.servers.find(x=>x.id===sid);if(!s)return;S.servers=S.servers.filter(x=>x.id!==sid);s.channels.forEach(c=>{delete S.messages[c.id];delete S.unread[c.id];delete V.loaded[c.id]});if(V.voice&&V.voice.sid===sid)V.voice=null;if(V.server===sid)go('home');else{renderRail();renderSide()}}
async function reloadServer(sid){await loadServers([sid]);afterServerChange()}
function afterServerChange(){if(V.server!=='home'&&!curServer()){go('home');return}if(curServer()&&!curChannel())go(V.server);else{renderRail();renderSide();renderMembers();renderTop()}if(V.set&&V.set.kind==='server'&&!srvOf()){A.closeSet()}else if(V.set)renderSet();syncVoiceSubs()}

/* ---------- social ---------- */
async function loadSocial(){
  const[fr,bl,dmm]=await Promise.all([must(sb.from('friendships').select('*')),must(sb.from('blocks').select('*').eq('blocker_id',MYID)),must(sb.from('dm_members').select('*'))]);
  S.friends=[];S.pending=[];S.fmap={};
  fr.forEach(r=>{const o=r.requester_id===MYID?r.addressee_id:r.requester_id;S.fmap[o]=r.id;if(r.status==='accepted')S.friends.push(o);else S.pending.push({id:o,dir:r.addressee_id===MYID?'in':'out'})});
  S.blocked=bl.map(b=>b.blocked_id);
  const by={};dmm.forEach(m=>{(by[m.dm_id]=by[m.dm_id]||[]).push(m)});
  const old=S.dms;S.dms=Object.entries(by).map(([id,l])=>{const o=l.find(m=>m.user_id!==MYID);return o?{id,user:o.user_id,since:+new Date(o.joined_at)}:null}).filter(Boolean);
  S.dms.sort((a,b)=>(old.findIndex(x=>x.id===a.id)+1||1e9)-(old.findIndex(x=>x.id===b.id)+1||1e9)||b.since-a.since);
  await ensureUsers(S.friends.concat(S.pending.map(p=>p.id),S.blocked,S.dms.map(d=>d.user)));
  S.dms.forEach(d=>{S.messages[d.id]=S.messages[d.id]||undefined})}
async function loadUnread(){try{const rows=await must(sb.rpc('unread_counts'));S.unread={};rows.forEach(r=>{S.unread[r.conv_id]={n:+r.n,m:+r.m}})}catch(e){console.warn(e)}}

/* ---------- hydrate / session ---------- */
async function hydrate(){
  const p=await must(sb.from('profiles').select('*').eq('id',MYID).single());
  S.me=Object.assign(mapUser(p,true),{email:USER_EMAIL,boosted:{}});S.users={};
  Object.entries(BOTS).forEach(([id,b])=>{S.users[id]={id,uuid:id,username:id,name:b.name,color:b.color,status:'online',about:b.desc,bot:true,created:0}});
  const mems=await must(sb.from('server_members').select('server_id').eq('user_id',MYID));
  S.servers=[];await loadServers(mems.map(m=>m.server_id));
  await loadSocial();
  const bst=await sb.from('boosts').select('*');(bst.data||[]).forEach(b=>{S.me.boosted[b.server_id]=b.count});
  try{const c=await sb.from('app_config').select('*');S.cfg={};(c.data||[]).forEach(r=>{S.cfg[r.key]=r.value})}catch(e){S.cfg={}}
  await loadUnread()}
function authShell(inner){const b=$('#boot');if(!b)return;b.style.display='flex';b.innerHTML=`<div class="auth"><div class="lg">${LOGO}</div>${inner}</div>`}
async function startSession(user){
  MYID=user.id;USER_EMAIL=user.email||'';
  let prefs={};try{prefs=JSON.parse(localStorage.getItem(KEY+':'+MYID)||'{}')}catch(e){}
  S.set={...DEF_SET,...(prefs.set||{})};S.last=prefs.last||{};
  authShell('<h1>Loading Roblink…</h1><p class="sub">Connecting to your servers</p>');
  try{await hydrate()}catch(e){console.error(e);authShell(`<h1>Couldn't load your account</h1><p class="sub">${esc(errMsg(e))}</p><p class="sub">If this is a brand new project, make sure you ran <b>schema.sql</b> in the Supabase SQL Editor.</p><button class="btn primary" id="retry">Try again</button> <button class="btn" id="lo">Log out</button>`);$('#retry').onclick=()=>startSession(user);$('#lo').onclick=A.logout2;return}
  const b=$('#boot');if(b)b.remove();
  applyTheme();APP_STARTED=true;
  if(S.me.suspended)showSuspended();
  startRealtime();startPresence();
  const ls=S.servers.find(s=>s.id===S.last.server);if(ls)go(ls.id,S.last.channel);else go('home');
  if(RECOVERY){RECOVERY=false;pwModal()}}
function showSuspended(){if($('#susp'))return;const d=document.createElement('div');d.id='susp';d.className='mback';d.style.zIndex=450;d.innerHTML=`<div class="modal"><div class="mh2"><h2>🚫 Account suspended</h2><p>${esc(S.me.suspendedReason||'Your account has been suspended by Roblink staff.')}</p></div><div class="mf"><button class="btn danger" id="susplo">Log out</button></div></div>`;document.body.appendChild(d);$('#susplo').onclick=A.logout2}
A.logout2=async()=>{try{await sb.auth.signOut()}catch(e){}location.reload()};
A.logout=()=>confirmBox('Log out?','You can log back in any time with your email and password.','Log Out',()=>{A.logout2()},1);
function pwModal(){modal({title:'Set a new password',body:'<input class="input" type="password" id="npw" placeholder="New password (8+ characters)" autocomplete="new-password">',btns:[{label:'Cancel',cls:'ghost'},{label:'Save',cls:'primary',fn:()=>{const v=$('#npw').value;if(v.length<8){toast('Use at least 8 characters.','err');return false}sb.auth.updateUser({password:v}).then(r=>toast(r.error?errMsg(r.error):'Password updated!',r.error?'err':''));}}]})}
A.changePw=async()=>{const v=$('#newpw').value;if(v.length<8)return toast('Use at least 8 characters.','err');const r=await sb.auth.updateUser({password:v});if(r.error)toast(errMsg(r.error),'err');else{toast('Password updated!');$('#newpw').value=''}};

/* ---------- auth screen ---------- */
function showAuth(mode,note){
  mode=mode||'signup';let color=COLORS[0];const su=mode==='signup';
  authShell(`<h1>${su?'Create your Roblink account':'Welcome back!'}</h1><p class="sub">${su?'Chat, hang out and build communities.':'We\'re so excited to see you again.'}</p>${note?`<div class="card" style="text-align:left;margin-top:12px">${note}</div>`:''}
  <label class="lbl">Email *</label><input class="input" id="ae" type="email" autocomplete="email">
  ${su?`<label class="lbl">Username *</label><input class="input" id="au" maxlength="20" placeholder="letters, numbers, _ and ." autocomplete="username"><label class="lbl">Display name</label><input class="input" id="ad" maxlength="32"><label class="lbl">Avatar colour</label><div class="swatches" id="asw">${COLORS.map((c,i)=>`<div class="sw ${i?'':'on'}" style="background:${c}" data-c="${c}"></div>`).join('')}</div>`:''}
  <label class="lbl">Password *</label><input class="input" id="ap" type="password" autocomplete="${su?'new-password':'current-password'}" placeholder="${su?'At least 8 characters':''}">
  <br><button class="btn primary" style="width:100%;padding:12px" id="ago">${su?'Create account':'Log in'}</button>
  <p class="sub" style="margin-top:14px">${su?'Already have an account? <a href="#" id="asw1">Log in</a>':'Need an account? <a href="#" id="asw1">Sign up</a> • <a href="#" id="afg">Forgot password?</a>'}</p>`);
  const sw=$('#asw');if(sw)sw.onclick=e=>{const c=e.target.closest('[data-c]');if(!c)return;color=c.dataset.c;$$('#asw .sw').forEach(x=>x.classList.toggle('on',x===c))};
  $('#asw1').onclick=e=>{e.preventDefault();showAuth(su?'login':'signup')};
  const fg=$('#afg');if(fg)fg.onclick=async e=>{e.preventDefault();const em=$('#ae').value.trim();if(!em)return toast('Enter your email first.','err');const r=await sb.auth.resetPasswordForEmail(em,{redirectTo:location.href.split('#')[0]});toast(r.error?errMsg(r.error):'Password reset email sent – check your inbox.',r.error?'err':'')};
  const go_=async()=>{
    const email=$('#ae').value.trim(),pw=$('#ap').value,btn=$('#ago');if(!email||!pw)return toast('Fill in your email and password.','err');
    btn.disabled=true;
    try{
      if(su){
        const u=$('#au').value.trim().toLowerCase();if(!/^[a-z0-9_.]{2,20}$/.test(u)){btn.disabled=false;return toast('Username: 2–20 letters, numbers, _ or .','err')}
        if(pw.length<8){btn.disabled=false;return toast('Password must be at least 8 characters.','err')}
        const ok=await must(sb.rpc('username_available',{u}));if(!ok){btn.disabled=false;return toast('That username is taken.','err')}
        const r=await sb.auth.signUp({email,password:pw,options:{data:{username:u,display_name:$('#ad').value.trim()||u,color}}});if(r.error)throw r.error;
        if(r.data.session)return startSession(r.data.user);
        showAuth('login','✅ Account created! Check your inbox (and spam folder) for a confirmation email, click the link, then log in here.')
      }else{
        const r=await sb.auth.signInWithPassword({email,password:pw});if(r.error)throw r.error;await startSession(r.data.user)}
    }catch(e){btn.disabled=false;toast(errMsg(e),'err')}};
  $('#ago').onclick=go_;$$('#boot input').forEach(i=>i.onkeydown=e=>{if(e.key==='Enter')go_()})}

/* ---------- uploads ---------- */
function readImage(file,max,cb,png){
  if(!file||!file.type.startsWith('image/'))return toast('Please choose an image file.','err');
  const lim=[10,25,50,50][tier()];if(file.size>lim*1048576)return toast(`File too large – limit is ${lim} MB${tier()<2?' (Roblink Plus: 50 MB)':''}.`,'err');
  if(file.type==='image/gif')return cb(file,true,URL.createObjectURL(file));
  const url=URL.createObjectURL(file),im=new Image();
  im.onload=()=>{const k=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*k));c.height=Math.max(1,Math.round(im.height*k));c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(url);c.toBlob(b=>b?cb(b,false,URL.createObjectURL(b)):toast('Could not process that image.','err'),png?'image/png':'image/jpeg',.88)};
  im.onerror=()=>toast('Could not read that image.','err');im.src=url}
async function uploadBlob(blob,kind){
  const ext={'image/gif':'gif','image/png':'png','image/webp':'webp'}[blob.type]||'jpg';
  const path=`${MYID}/${kind}-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
  const{error}=await sb.storage.from('media').upload(path,blob,{contentType:blob.type||'image/jpeg',cacheControl:'31536000'});if(error)throw error;
  return sb.storage.from('media').getPublicUrl(path).data.publicUrl}

/* ---------- persist settings edits ---------- */
const ME_MAP={name:'display_name',pronouns:'pronouns',about:'about',customStatus:'custom_status',status:'status',color:'color',bannerColor:'banner_color'};
const SRV_MAP={name:'name',icon:'icon',desc:'description',color:'color',verification:'verification',filter:'explicit_filter',bannerColor:'banner_color',isPublic:'is_public'};
const updateProfile=patch=>tryDo(async()=>{await must(sb.from('profiles').update(patch).eq('id',MYID))});
const updateServer=(s,patch)=>tryDo(async()=>{await must(sb.from('servers').update(patch).eq('id',s.id))}).then(ok=>{if(!ok)reloadServer(s.id);return ok});
function saveRole(s,r){return tryDo(async()=>{await must(sb.from('roles').update({name:r.name,color:r.color,perms:r.perms,hoist:r.hoist}).eq('id',r.id))}).then(ok=>{if(!ok)reloadServer(s.id)})}
function persistBind(path,val){
  const p=path.split('.'),root=p.shift();
  if(root==='me'){const col=ME_MAP[p[0]];if(col)persist('me.'+col,()=>updateProfile({[col]:p[0]==='name'?String(val).slice(0,32)||S.me.name:val}));return}
  if(root!=='srv')return;const s=srvOf();if(!s)return;
  if(p[0]==='roles'){const r=s.roles[+p[1]];if(r)persist('role.'+r.id,()=>saveRole(s,r))}
  else if(p[0]==='everyone')persist('ev.'+s.id,()=>tryDo(()=>rpc('set_everyone_perms',{sid:s.id,perms:s.everyone})).then(ok=>{if(!ok)reloadServer(s.id)}));
  else if(p[0]==='automod')persist('am.'+s.id,()=>updateServer(s,{automod:s.automod}));
  else{const col=SRV_MAP[p[0]];if(col)persist('srv.'+s.id+col,()=>updateServer(s,{[col]:val}))}}

/* ---------- messages: mapping, loading ---------- */
function mapMsg(row){return{id:row.id,a:row.kind==='bot'?row.bot_id:mid(row.author_id),by:mid(row.author_id),t:row.content||'',ts:+new Date(row.created_at),rx:{},re:row.reply_to||null,img:row.image_url||null,pin:row.pinned,ed:row.edited_at?+new Date(row.edited_at):0,sys:row.kind==='sys'?1:0,
  poll:row.poll?{q:row.poll.q,options:(row.poll.options||[]).map(t=>({t,v:[]}))}:null,embed:row.embed||null}}
function applyReaction(m,emoji,uidv,add){const u=mid(uidv);
  if(emoji.startsWith('poll:')){const o=m.poll&&m.poll.options[+emoji.slice(5)];if(!o)return;o.v=o.v.filter(x=>x!==u);if(add)o.v.push(u);return}
  const l=(m.rx[emoji]=m.rx[emoji]||[]).filter(x=>x!==u);if(add)l.push(u);if(l.length)m.rx[emoji]=l;else delete m.rx[emoji]}
async function loadConv(conv,isDm){
  let q=sb.from('messages').select('*').order('created_at',{ascending:false}).limit(100);q=isDm?q.eq('dm_id',conv):q.eq('channel_id',conv);
  const rows=(await must(q)).reverse();await ensureUsers(rows.map(r=>r.author_id));
  const list=rows.map(mapMsg);
  if(rows.length){const rx=await inQ('reactions','message_id',rows.map(r=>r.id));const by={};list.forEach(m=>by[m.id]=m);rx.forEach(r=>{if(by[r.message_id])applyReaction(by[r.message_id],r.emoji,r.user_id,true)})}
  S.messages[conv]=list;V.loaded[conv]=true}
const convKnown=c=>S.servers.some(s=>s.channels.some(x=>x.id===c))||S.dms.some(d=>d.id===c);
const isDmKey=k=>S.dms.some(d=>d.id===k);
function pushMsg(conv,m){const l=S.messages[conv];if(!l)return true;if(l.some(x=>x.id===m.id))return false;l.push(m);if(l.length>400)l.shift();return true}
let readT={};
function markRead(conv){if(!conv)return;if(S.unread[conv]){delete S.unread[conv];renderRail();renderSide()}clearTimeout(readT[conv]);readT[conv]=setTimeout(()=>{sb.from('read_state').upsert({user_id:MYID,conv_id:conv,last_read:new Date().toISOString()}).then(()=>{})},800)}
function onNewMessage(conv,m){
  if(m.a!=='me'&&S.blocked.includes(m.a))return;
  if(!pushMsg(conv,m))return;
  const cur=convKey()===conv&&!document.hidden;
  if(convKey()===conv)renderMsgs(m.by==='me');
  if(m.by==='me'||m.sys)return;
  if(cur){markRead(conv);return}
  const u=S.unread[conv]||{n:0,m:0};u.n++;if(isDmKey(conv)||mentionsMe(m))u.m++;S.unread[conv]=u;renderRail();renderSide();
  if(S.set.sounds&&(!S.set.mentionsOnly||mentionsMe(m)||isDmKey(conv)))tone([[880,.08],[1175,.12]])}
async function onMsgChange(p){
  try{
    if(p.eventType==='DELETE'){const id=p.old.id;let hit=false;Object.values(S.messages).forEach(l=>{if(!l)return;const i=l.findIndex(m=>m.id===id);if(i>=0){l.splice(i,1);hit=true}});if(hit)renderMsgs();return}
    const row=p.new,conv=row.channel_id||row.dm_id;
    if(p.eventType==='UPDATE'){const l=S.messages[conv],m=l&&l.find(x=>x.id===row.id);if(m){m.t=row.content;m.ed=row.edited_at?+new Date(row.edited_at):0;m.pin=row.pinned;if(convKey()===conv)renderMsgs()}return}
    if(!convKnown(conv)){await loadSocial();if(!convKnown(conv))return;renderSide()}
    await ensureUsers([row.author_id]);onNewMessage(conv,mapMsg(row))
  }catch(e){console.warn(e)}}
function onReactionChange(p){
  const r=p.eventType==='DELETE'?p.old:p.new;if(!r||!r.message_id)return;
  for(const [conv,l] of Object.entries(S.messages)){if(!l)continue;const m=l.find(x=>x.id===r.message_id);if(m){if(!r.emoji)return;applyReaction(m,r.emoji,r.user_id,p.eventType!=='DELETE');if(convKey()===conv)renderMsgs();return}}}

/* ---------- realtime ---------- */
let reloadSet=new Set(),reloadT=null,socialT=null;
function queueReload(sid){reloadSet.add(sid||'*');clearTimeout(reloadT);reloadT=setTimeout(doReload,350)}
async function doReload(){
  const want=[...reloadSet];reloadSet.clear();
  try{const mems=await must(sb.from('server_members').select('server_id').eq('user_id',MYID)),mine=mems.map(m=>m.server_id);
    S.servers.filter(s=>!mine.includes(s.id)).forEach(s=>{toast(`You're no longer in ${s.name}`,'err');dropServer(s.id)});
    await loadServers(want.includes('*')?mine:want.filter(id=>mine.includes(id)));afterServerChange()}catch(e){console.warn(e)}}
function queueSocial(){clearTimeout(socialT);socialT=setTimeout(async()=>{try{await loadSocial();renderSide();renderRail();if(V.server==='home'&&!V.dm)renderMain();else renderMembers()}catch(e){console.warn(e)}},300)}
function startRealtime(){
  const ch=sb.channel('rb-db');const on=(table,fn)=>ch.on('postgres_changes',{event:'*',schema:'public',table},fn);
  on('messages',onMsgChange);on('reactions',onReactionChange);
  ['server_members','channels','categories','roles','emojis','servers'].forEach(t=>on(t,p=>{const r=(p.eventType==='DELETE'?p.old:p.new)||{};queueReload(t==='servers'?r.id:r.server_id)}));
  ['friendships','blocks','dm_members'].forEach(t=>on(t,queueSocial));
  on('profiles',p=>{const r=p.new;if(!r||!r.id)return;if(r.id===MYID){const was=S.me.suspended;Object.assign(S.me,{plus:r.plus,plusTier:r.plus_tier||0,boostsLeft:r.boosts_left,platformRole:r.platform_role,suspended:r.suspended,suspendedReason:r.suspended_reason});if(r.suspended&&!was)showSuspended();if(V.set)renderSet();return}if(S.users[r.id]){registerUser(r);renderMembers();renderSide();if(V.server==='home'&&!V.dm)renderFriends()}});
  on('reports',()=>{if(window.staffRefresh)staffRefresh('reports')});
  ch.subscribe()}
function startPresence(){
  const ch=sb.channel('presence:online',{config:{presence:{key:MYID}}});
  ch.on('presence',{event:'sync'},()=>{ONLINE=new Set(Object.keys(ch.presenceState()));applyPresence();renderMembers();renderSide();if(V.server==='home'&&!V.dm)renderFriends()});
  ch.subscribe(st=>{if(st==='SUBSCRIBED')ch.track({at:Date.now()})})}
/* typing */
let typingCh=null,typingConv=null,lastTyping=0;
function syncTyping(conv){if(typingConv===conv)return;if(typingCh)sb.removeChannel(typingCh);typingConv=conv;if(!conv){typingCh=null;return}
  typingCh=sb.channel('typing:'+conv,{config:{broadcast:{self:false}}}).on('broadcast',{event:'typing'},({payload})=>{if(!payload||payload.id===MYID)return;const l=V.typing[conv]=V.typing[conv]||[];if(!l.includes(payload.name))l.push(payload.name);renderTyping();setTimeout(()=>{const i=l.indexOf(payload.name);if(i>=0)l.splice(i,1);renderTyping()},4500)}).subscribe()}
function sendTyping(){if(!typingCh||S.set.hideTyping||Date.now()-lastTyping<2500)return;lastTyping=Date.now();try{typingCh.send({type:'broadcast',event:'typing',payload:{name:S.me.name,id:MYID}})}catch(e){}}
/* voice presence */
const voiceSubs={};
function syncVoiceSubs(){
  const s=curServer(),want=new Set(s?s.channels.filter(c=>c.type==='voice').map(c=>c.id):[]);if(V.voice)want.add(V.voice.cid);
  Object.keys(voiceSubs).forEach(id=>{if(!want.has(id)){sb.removeChannel(voiceSubs[id]);delete voiceSubs[id]}});
  want.forEach(id=>{if(voiceSubs[id])return;const ch=sb.channel('voice:'+id,{config:{presence:{key:MYID}}});
    ch.on('presence',{event:'sync'},()=>{const keys=Object.keys(ch.presenceState()).filter(k=>k!==MYID),sv=S.servers.find(x=>x.channels.some(c=>c.id===id));if(!sv)return;sv.voiceUsers[id]=keys.map(mid);ensureUsers(keys).then(()=>{renderSide();const c=curChannel();if(c&&c.id===id&&c.type==='voice')renderMain()})});
    ch.subscribe(st=>{if(st==='SUBSCRIBED'&&V.voice&&V.voice.cid===id)ch.track({id:MYID})});voiceSubs[id]=ch})}
A.joinVoice=el=>{const s=curServer(),c=s.channels.find(x=>x.id===el.dataset.a);V.voice={sid:s.id,cid:c.id};tone([[523,.1],[784,.15]]);syncVoiceSubs();const ch=voiceSubs[c.id];if(ch&&ch.state==='joined')ch.track({id:MYID});if(V.channel!==c.id)go(s.id,c.id);else{renderSide();renderMain()}};
A.leaveVoice=()=>{const v=V.voice;V.voice=null;tone([[784,.1],[523,.15]]);if(v&&voiceSubs[v.cid])voiceSubs[v.cid].untrack();syncVoiceSubs();renderSide();if(curChannel()&&curChannel().type==='voice')renderMain()};
/* navigation hook */
async function onGo(){
  const conv=convKey();syncTyping(conv&&!(curChannel()&&curChannel().type==='voice')?conv:null);syncVoiceSubs();
  if(!conv||(curChannel()&&curChannel().type==='voice'))return;
  if(!V.loaded[conv]){try{await loadConv(conv,!!V.dm)}catch(e){toast(errMsg(e),'err');return}if(convKey()!==conv)return;renderMsgs(true)}
  markRead(conv)}

/* ---------- sending ---------- */
function precheck(text,att){const s=curServer(),lim=S.me.plus?4000:2000;text=text.trim();
  if(text.length>lim)return `Message too long (max ${lim}). ${S.me.plus?'':'Roblink Plus raises it to 4,000.'}`;
  if(s){if(!perm(s,'me','SEND'))return 'You do not have permission to send messages in this channel.';if(s.members.me&&s.members.me.timeout>now())return 'You are timed out and cannot send messages.';if(att&&!perm(s,'me','ATTACH'))return 'You cannot attach files here.'}
  return ''}
async function insertRow(key,fields){const row={author_id:MYID,...fields};row[isDmKey(key)?'dm_id':'channel_id']=key;return must(sb.from('messages').insert(row).select().single())}
async function sendMsg(text,att,re,key){
  const s=curServer(),isCmd=text[0]==='/'&&/^\/[a-z0-9]+/i.test(text);
  if(isCmd&&await builtin(text,key,s))return true;
  let image=null;if(att){try{image=await uploadBlob(att.blob,'msg')}catch(e){toast(errMsg(e),'err');return false}}
  try{const row=await insertRow(key,{content:text,image_url:image,reply_to:re||null});await ensureUsers([row.author_id]);onNewMessage(key,mapMsg(row))}
  catch(e){toast(/AutoMod/.test(e.message||'')?'🚫 '+e.message:errMsg(e),'err');return false}
  if(isCmd)botCmd(text,key,s);return true}
A.send=async()=>{const i=$('#input');if(!i)return;const text=i.value,att=V.att;if(!text.trim()&&!att)return;
  const pre=precheck(text,att);if(pre)return toast(pre,'err');
  const key=convKey(),re=V.reply;i.value='';V.drafts[key]='';V.att=null;V.reply=null;autosize(i);renderAtt();renderReply();$('#suggest').style.display='none';$('#cnt').textContent='';
  const ok=await sendMsg(text.trim(),att,re,key);
  if(ok===false){const inp=$('#input');if(inp&&convKey()===key&&!inp.value){inp.value=text;autosize(inp)}}};
function sysLocal(key,t){pushMsg(key,{id:'local-'+uid(),a:'sys',by:'sys',t,ts:now(),sys:1,rx:{},local:1});if(convKey()===key)renderMsgs(true)}
async function builtin(text,key,s){
  const[c,...r]=text.slice(1).split(' '),cmd=c.toLowerCase(),arg=r.join(' ').trim();
  const say=async t=>{try{const row=await insertRow(key,{content:t});onNewMessage(key,mapMsg(row))}catch(e){toast(errMsg(e),'err')}};
  if(cmd==='help'){const inst=s?s.bots:[];let t='**Built-in:** `/help` `/me` `/shrug` `/nick` `/spoiler`\n';inst.forEach(b=>{if(BOTS[b])t+=`**${BOTS[b].name}:** `+Object.values(BOTS[b].cmds).map(x=>'`'+x.split(' –')[0]+'`').join(' ')+'\n'});sysLocal(key,t+'*(only you can see this)*');return true}
  if(cmd==='me'){await say('*'+(arg||'waves')+'*');return true}
  if(cmd==='shrug'){await say((arg?arg+' ':'')+'¯\\_(ツ)_/¯');return true}
  if(cmd==='spoiler'){await say('||'+arg+'||');return true}
  if(cmd==='nick'){if(!s){sysLocal(key,'`/nick` only works inside a server.');return true}await tryDo(async()=>{await must(sb.from('server_members').update({nickname:arg.slice(0,32)}).eq('server_id',s.id).eq('user_id',MYID));s.members.me.nick=arg.slice(0,32);refreshApp()},arg?`Nickname set to ${arg}.`:'Nickname cleared.');return true}
  return false}
const QUEUE=[];
function botSay(key,botId,payload,delay){
  const u=S.users[botId],l=V.typing[key]=V.typing[key]||[];l.push(u.name);renderTyping();
  setTimeout(async()=>{const i=l.indexOf(u.name);if(i>=0)l.splice(i,1);renderTyping();
    try{const p=typeof payload==='string'?{content:payload}:{content:payload.t||'',poll:payload.poll||null,embed:payload.embed||null};const row=await insertRow(key,{kind:'bot',bot_id:botId,...p});onNewMessage(key,mapMsg(row))}catch(e){toast(errMsg(e),'err')}},delay||700)}
function botCmd(text,key,s){
  const[c,...r]=text.slice(1).split(' '),cmd=c.toLowerCase(),arg=r.join(' ').trim();
  const bots=s?s.bots:[];const b=bots.find(id=>BOTS[id]&&BOTS[id].cmds[cmd]);
  if(!b){setTimeout(()=>sysLocal(key,`No bot here handles \`/${esc(cmd)}\`. ${s?'Add one in Server Settings → Bots, or ':''}type \`/help\`.`),200);return}
  const say=(p,d)=>botSay(key,b,p,d);
  switch(cmd){
    case'roll':{const m=/^(\d*)d(\d+)$/i.exec(arg||'1d6');if(!m)return say('Use the format `/roll 2d20`.');const n=Math.min(+m[1]||1,20),f=Math.max(2,Math.min(+m[2],1000)),rs=Array.from({length:n},()=>rnd(1,f));return say(`🎲 **${esc(S.me.name)}** rolled **${n}d${f}**: [${rs.join(', ')}] = **${rs.reduce((a,b)=>a+b,0)}**`)}
    case'coinflip':return say(`🪙 It's **${Math.random()<.5?'Heads':'Tails'}**!`);
    case'8ball':if(!arg)return say('Ask me a question! `/8ball will I win?`');return say(`🎱 *${esc(arg)}*\n**${pick(['It is certain.','Without a doubt.','Yes – definitely.','Most likely.','Reply hazy, try again.','Ask again later.','Don\'t count on it.','My sources say no.','Very doubtful.','Outlook good.'])}**`);
    case'joke':return say(pick(['Why did the obby player cross the road? To get to the next checkpoint.','I would tell you a Lua joke, but it\'s 1-indexed and I\'d be off by one.','Why do builders make bad secret agents? They always leave blocks behind.','There are 10 kinds of people: those who understand binary and those who don\'t.']));
    case'fact':return say('💡 '+pick(['Honey never spoils – edible honey was found in ancient tombs.','Octopuses have three hearts.','A day on Venus is longer than its year.','Bananas are berries, but strawberries are not.','The first computer bug was a real moth.']));
    case'poll':{const p=arg.split('|').map(x=>x.trim()).filter(Boolean);if(p.length<3||p.length>6)return say('Usage: `/poll Question | Option A | Option B` (2–5 options)');return say({poll:{q:p[0],options:p.slice(1)},t:''},500)}
    case'purge':{const n=Math.min(parseInt(arg)||0,50);if(!s||!perm(s,'me','MANAGE_MESSAGES'))return say('⛔ You need the **Manage Messages** permission.');if(n<1)return say('Usage: `/purge 10`');
      (async()=>{try{const rows=await must(sb.from('messages').select('id').eq('channel_id',key).order('created_at',{ascending:false}).limit(n+1));const ids=rows.map(x=>x.id);await must(sb.from('messages').delete().in('id',ids).select('id'));const l=S.messages[key];if(l)S.messages[key]=l.filter(m=>!ids.includes(m.id));renderMsgs();say(`🧹 Deleted **${n}** messages.`,300)}catch(e){toast(errMsg(e),'err')}})();return}
    case'warn':{if(!s||!(perm(s,'me','KICK')||perm(s,'me','TIMEOUT')))return say('⛔ You need a moderation permission.');if(!arg)return say('Usage: `/warn @user reason`');return say(`⚠️ ${fmt(arg.split(' ')[0])} has been warned. ${esc(arg.split(' ').slice(1).join(' ')||'')}`)}
    case'play':if(!arg)return say('Tell me what to play: `/play lofi beats`');QUEUE.push(arg);return say({t:'',embed:{title:'🎵 Now playing',desc:'**'+esc(arg)+'**\nRequested by '+esc(S.me.name),bar:1}},600);
    case'queue':return say({t:'',embed:{title:'📜 Queue',desc:QUEUE.length?QUEUE.map((q,i)=>`${i+1}. ${esc(q)}`).join('\n'):'The queue is empty.'}});
    case'skip':QUEUE.shift();return say('⏭️ Skipped!')}}

/* ---------- message actions ---------- */
function toggleReact(mid_,emo){
  const m=findMsg(mid_),s=curServer();if(!m)return;
  if(s&&!perm(s,'me','REACT'))return toast('You can\'t add reactions here.','err');
  if(emo[0]===':'&&!S.me.plus&&!(s&&s.emojis.some(e=>':'+e.name+':'===emo)))return toast('Using emoji from other servers requires Roblink Plus 💎','err');
  const had=(m.rx[emo]||[]).includes('me');applyReaction(m,emo,MYID,!had);renderMsgs();
  const q=had?sb.from('reactions').delete().eq('message_id',m.id).eq('user_id',MYID).eq('emoji',emo):sb.from('reactions').insert({message_id:m.id,user_id:MYID,emoji:emo});
  q.then(r=>{if(r.error){applyReaction(m,emo,MYID,had);renderMsgs();toast(errMsg(r.error),'err')}})}
A.saveEdit=async()=>{const b=$('#editbox');if(!b)return;const m=findMsg(V.edit),v=b.value.trim();V.edit=null;if(m&&v&&v!==m.t){const old=m.t,oe=m.ed;m.t=v;m.ed=now();renderMsgs();const r=await sb.from('messages').update({content:v,edited_at:new Date().toISOString()}).eq('id',m.id);if(r.error){m.t=old;m.ed=oe;renderMsgs();toast(errMsg(r.error),'err')}}else renderMsgs()};
A.pin=async el=>{const m=findMsg(el.dataset.a);if(!m)return;const want=!m.pin;try{await rpc('pin_message',{mid:m.id,pin:want});m.pin=want;renderMsgs();toast(want?'Message pinned.':'Message unpinned.')}catch(e){toast(errMsg(e),'err')}};
A.del=async el=>{const id=el.dataset.a;try{const d=await must(sb.from('messages').delete().eq('id',id).select('id'));if(!d.length)return toast('You can\'t delete that message.','err');const l=S.messages[convKey()],i=l.findIndex(m=>m.id===id);if(i>=0)l.splice(i,1);renderMsgs()}catch(e){toast(errMsg(e),'err')}};
A.vote=async el=>{const m=findMsg(el.dataset.a),i=+el.dataset.b;if(!m||!m.poll)return;const had=m.poll.options[i].v.includes('me');
  m.poll.options.forEach((o,j)=>applyReaction(m,'poll:'+j,MYID,false));if(!had)applyReaction(m,'poll:'+i,MYID,true);renderMsgs();
  try{await must(sb.from('reactions').delete().eq('message_id',m.id).eq('user_id',MYID).like('emoji','poll:%'));if(!had)await must(sb.from('reactions').insert({message_id:m.id,user_id:MYID,emoji:'poll:'+i}))}catch(e){toast(errMsg(e),'err')}};
A.superReact=el=>{const m=findMsg(el.dataset.a);if(!m)return;const e=pick(['💥','🔥','✨','🎉','💎','⚡']);if(!(m.rx[e]||[]).includes('me'))toggleReact(m.id,e);
  const r=$(`.msg[data-id="${m.id}"]`),b=r?r.getBoundingClientRect():{left:innerWidth/2,top:innerHeight/2};
  for(let i=0;i<16;i++){const p=document.createElement('div');p.className='burst';p.textContent=e;p.style.cssText=`left:${b.left+120}px;top:${b.top+20}px;--dx:${rnd(-220,220)}px;--dy:${rnd(-200,60)}px;--r:${rnd(-90,90)}deg`;document.body.appendChild(p);setTimeout(()=>p.remove(),1250)}tone([[660,.08],[880,.08],[1320,.18]])};
A.pins=async()=>{const key=convKey();try{let q=sb.from('messages').select('*').eq('pinned',true).order('created_at');q=V.dm?q.eq('dm_id',key):q.eq('channel_id',key);const rows=await must(q);await ensureUsers(rows.map(r=>r.author_id));const l=rows.map(mapMsg);
  modal({title:'📌 Pinned Messages',wide:1,body:l.length?l.map(m=>{const u=getUser(m.a)||{name:'?',color:'#777'};return`<div class="card"><div style="display:flex;gap:10px;align-items:center">${av(u,28)}<b style="color:var(--text)">${esc(u.name)}</b><span class="ts">${fmtTime(m.ts)}</span><span style="flex:1"></span><button class="btn sm" data-act="pinJump" data-a="${m.id}">Jump</button></div><div style="margin-top:6px">${fmt(m.t||'')}</div></div>`}).join(''):'<div class="empty">No pinned messages here yet.<br>Hover a message and press 📌.</div>',btns:[{label:'Close',cls:'primary'}]})}catch(e){toast(errMsg(e),'err')}};
async function doSearch(q){q=q.trim();if(!q)return;const s=curServer();
  try{let qq=sb.from('messages').select('*').ilike('content','%'+q.replace(/[%_]/g,'\\$&')+'%').neq('kind','sys').order('created_at',{ascending:false}).limit(30);
    qq=s?qq.in('channel_id',s.channels.filter(c=>c.type==='text').map(c=>c.id)):qq.eq('dm_id',V.dm);
    const rows=await must(qq);await ensureUsers(rows.map(r=>r.author_id));const chn=id=>(s&&s.channels.find(c=>c.id===id)||{}).name||'';
    modal({title:`Search: “${esc(q)}”`,sub:`${rows.length} result${rows.length===1?'':'s'}`,wide:1,body:rows.map(r=>{const m=mapMsg(r),u=getUser(m.a)||{name:'?'};return`<div class="card" style="cursor:pointer" data-act="srJump" data-a="${m.id}" data-b="${r.channel_id||''}"><div class="sub">${s?'#'+esc(chn(r.channel_id))+' • ':''}<b style="color:var(--text)">${esc(u.name)}</b> • ${fmtTime(m.ts)}</div><div>${esc(m.t.slice(0,200))}</div></div>`}).join('')||'<div class="empty">No messages found.</div>',btns:[{label:'Close',cls:'primary'}]})}catch(e){toast(errMsg(e),'err')}}
A.srJump=async el=>{closeModal();const cid=el.dataset.b;if(cid&&!V.loaded[cid]){}jumpTo(V.server,V.dm?null:cid,el.dataset.a,V.dm);const id=el.dataset.a;setTimeout(async()=>{if(!$(`.msg[data-id="${id}"]`)&&!V.dm){/* message older than the 100 loaded */toast('That message is older than the loaded history.')}},400)};
function reportModal(msgId){modal({title:'Report message',sub:'Roblink staff will review it.',body:'<label class="lbl">What\'s wrong?</label><input class="input" id="rrs" maxlength="300" placeholder="Spam, harassment, …">',btns:[{label:'Cancel',cls:'ghost'},{label:'Report',cls:'danger',fn:()=>{const r=$('#rrs').value;tryDo(()=>rpc('report_message',{mid:msgId,p_reason:r}),'Thanks – we\'ll take a look.')}}]})}

/* ---------- friends & DMs ---------- */
async function openDmWith(id){
  try{if(BOTS[id])return toast('Bots live in servers – add one in Server Settings.');const did=await rpc('open_dm',{other:id});await ensureUsers([id]);if(!S.dms.some(d=>d.id===did))S.dms.unshift({id:did,user:id,since:now()});go('home',null,did)}catch(e){toast(errMsg(e),'err')}}
async function sendFriend(name){
  name=(name||'').trim().toLowerCase().replace(/^@/,'');if(!name)return false;
  try{const p=await must(sb.from('profiles').select('*').eq('username',name).maybeSingle());
    if(!p||p.id===MYID){toast('Hm, didn\'t work. Double-check that the username is correct.','err');return false}
    registerUser(p);const o=p.id;
    if(S.blocked.includes(o)){toast('Unblock this user first.','err');return false}
    if(S.friends.includes(o)){toast(`You're already friends with ${p.display_name}.`);return true}
    if(S.pending.find(x=>x.id===o&&x.dir==='in')){await A.acceptFr({dataset:{a:o}});return true}
    if(S.pending.some(x=>x.id===o)){toast('Request already sent.');return true}
    await must(sb.from('friendships').insert({requester_id:MYID,addressee_id:o}));await loadSocial();renderSide();if(!V.dm&&V.server==='home')renderMain();toast(`Friend request sent to ${p.display_name}!`);return true
  }catch(e){toast(errMsg(e),'err');return false}}
A.acceptFr=async el=>{const id=el.dataset.a;await tryDo(async()=>{await must(sb.from('friendships').update({status:'accepted'}).eq('id',S.fmap[id]));await loadSocial();renderSide();renderMain()},'Friend added!')};
A.declineFr=async el=>{await tryDo(async()=>{await must(sb.from('friendships').delete().eq('id',S.fmap[el.dataset.a]));await loadSocial();renderSide();renderMain()})};
async function removeFriend(id){await tryDo(async()=>{await must(sb.from('friendships').delete().eq('id',S.fmap[id]));await loadSocial();renderAll()})}
A.blockToggle=async el=>{const id=el.dataset.a;const was=S.blocked.includes(id);
  await tryDo(async()=>{if(was)await must(sb.from('blocks').delete().eq('blocker_id',MYID).eq('blocked_id',id));else{await must(sb.from('blocks').insert({blocker_id:MYID,blocked_id:id}));if(S.fmap[id])await sb.from('friendships').delete().eq('id',S.fmap[id])}await loadSocial();renderAll()},was?'Unblocked.':'User blocked.')};
A.unblock=el=>A.blockToggle(el);
A.addFriend=()=>modal({title:'Add Friend',sub:'You can add friends with their Roblink username.',body:'<input class="input" id="fname" placeholder="Enter a username">',btns:[{label:'Cancel',cls:'ghost'},{label:'Send Friend Request',cls:'primary',fn:()=>{sendFriend($('#fname').value).then(ok=>{if(ok)closeModal()});return false}}]});
A.newDm=()=>{const ids=S.friends.slice();modal({title:'Select a Friend',sub:ids.length?'Start a new conversation':'Add some friends first, or message someone from a server\'s member list.',body:ids.map(i=>`<div class="dmrow" data-act="pickDm" data-a="${i}">${av(S.users[i],32,true)}<div class="t"><b>${esc(S.users[i].name)}</b><small>${esc(S.users[i].username)}</small></div></div>`).join(''),btns:[{label:'Close',cls:'ghost'}]})};

/* ---------- servers ---------- */
A.addServer=()=>{let tpl='gaming';modal({title:'Create Your Server',sub:'Your server is where you and your friends hang out.',body:`<div class="tpls" id="tpls">${Object.entries(TPL).map(([k,t])=>`<div class="tpl ${k===tpl?'on':''}" data-tpl="${k}">${t.n}</div>`).join('')}</div><label class="lbl">Server name</label><input class="input" id="sname" maxlength="40" value="${esc(S.me.name)}'s server"><div class="row" style="border:0"><div><b style="color:var(--text)">Add starter bots</b><p class="sub">DiceBot &amp; ModBot</p></div><label class="toggle"><input type="checkbox" id="sbots" checked><i></i></label></div><div class="sub" style="text-align:center">Have an invite already? <a href="#" data-act="joinServer">Join a server</a></div>`,
  btns:[{label:'Cancel',cls:'ghost'},{label:'Create',cls:'primary',fn:()=>{const n=$('#sname').value.trim();if(!n){toast('Give your server a name.','err');return false}const bots=$('#sbots').checked;
    tryDo(async()=>{const sid=await rpc('create_server',{p_name:n,p_template:tpl,p_bots:bots});await loadServers([sid]);go(sid)},'Server created!')}}],
  onOpen:b=>{$('#tpls',b).onclick=e=>{const t=e.target.closest('[data-tpl]');if(!t)return;tpl=t.dataset.tpl;$$('.tpl',b).forEach(x=>x.classList.toggle('on',x===t))}}})};
async function joinByCode(code){code=(code||'').trim().replace(/^.*\//,'');if(!code){toast('Enter an invite code.','err');return false}
  try{const sid=await rpc('join_server',{p_code:code});await loadServers([sid]);go(sid);toast(`Joined ${(curServer()||{}).name||'server'}!`);return true}catch(e){toast(errMsg(e),'err');return false}}
A.joinServer=()=>{closeModal();modal({title:'Join a Server',sub:'Enter an invite code to join an existing server.',body:'<label class="lbl">Invite code *</label><input class="input" id="jcode" placeholder="e.g. a1b2c3d4">',btns:[{label:'Cancel',cls:'ghost'},{label:'Join Server',cls:'primary',fn:()=>{joinByCode($('#jcode').value).then(ok=>{if(ok)closeModal()});return false}}]})};
A.explore=async()=>{try{const rows=(await must(sb.from('servers').select('id,name,icon,icon_url,color,description,invite_code').eq('is_public',true).limit(50))).filter(r=>!S.servers.some(s=>s.id===r.id));
  modal({title:'🧭 Explore Servers',sub:'Discover public communities.',wide:1,body:rows.length?rows.map(s=>`<div class="card" style="display:flex;gap:12px;align-items:center"><div class="srv" style="background:${esc(s.color)};flex:none">${s.icon_url?`<img src="${esc(s.icon_url)}" alt="">`:esc(s.icon)}</div><div style="flex:1;min-width:0"><b style="color:var(--text)">${esc(s.name)}</b><div class="sub">${esc(s.description||'')}</div></div><button class="btn primary sm" data-act="joinDir" data-a="${esc(s.invite_code)}">Join</button></div>`).join(''):'<div class="empty">No public servers to show yet.<br>Server owners can list theirs in Server Settings → Overview.</div>',btns:[{label:'Have an invite code?',fn:()=>{setTimeout(A.joinServer,0)}},{label:'Close',cls:'ghost'}]})}catch(e){toast(errMsg(e),'err')}};
A.joinDir=el=>{closeModal();joinByCode(el.dataset.a)};
function leaveServer(s){if(s.owner==='me')return toast('Owners can\'t leave. Delete the server instead.','err');confirmBox('Leave Server',`Are you sure you want to leave <b>${esc(s.name)}</b>?`,'Leave Server',()=>{tryDo(async()=>{await rpc('leave_server',{sid:s.id});dropServer(s.id)})},1)}
A.delServer=()=>{const s=srvOf();if($('#delc').value!==s.name)return toast('Server name does not match.','err');tryDo(async()=>{await rpc('delete_server',{sid:s.id});A.closeSet();dropServer(s.id)},'Server deleted.')};
function nickModal(s){modal({title:'Change Nickname',sub:`Only in ${esc(s.name)}`,body:`<input class="input" id="nk" maxlength="32" value="${esc(s.members.me.nick||'')}" placeholder="${esc(S.me.name)}">`,btns:[{label:'Cancel',cls:'ghost'},{label:'Save',cls:'primary',fn:()=>{const v=$('#nk').value.trim();tryDo(async()=>{await must(sb.from('server_members').update({nickname:v}).eq('server_id',s.id).eq('user_id',MYID));s.members.me.nick=v;refreshApp()})}}]})}
function newCatModal(s){modal({title:'Create Category',body:'<input class="input" id="cn" maxlength="30" placeholder="New Category">',btns:[{label:'Cancel',cls:'ghost'},{label:'Create',cls:'primary',fn:()=>{const n=$('#cn').value.trim();if(!n)return false;tryDo(async()=>{await must(sb.from('categories').insert({server_id:s.id,name:n,position:s.categories.length+Date.now()%1000}));await reloadServer(s.id)})}}]})}
function inviteModal(s){
  if(!perm(s,'me','INVITE'))return toast('You do not have permission to create invites.','err');
  modal({title:`Invite friends to ${esc(s.name)}`,body:`<label class="lbl">Invite code</label><div style="display:flex;gap:8px"><input class="input" readonly value="${esc(s.invite)}"><button class="btn primary" data-act="copy" data-a="${esc(s.invite)}">Copy</button></div><p class="sub">Friends join with this code via “Join a Server”.</p><label class="lbl">Send to a friend</label>${S.friends.map(i=>`<div class="frow">${av(S.users[i],32,true)}<div class="t"><b>${esc(S.users[i].name)}</b></div><button class="btn sm" data-act="sendInvite" data-a="${i}" data-b="${s.id}">Invite</button></div>`).join('')||'<div class="empty">Add some friends first!</div>'}`,btns:[{label:'Done',cls:'primary'}]})}
A.sendInvite=async el=>{const s=S.servers.find(x=>x.id===el.dataset.b),o=el.dataset.a;el.disabled=true;try{const did=await rpc('open_dm',{other:o});await must(sb.from('messages').insert({dm_id:did,author_id:MYID,content:`Join me in **${s.name}**! Invite code: \`${s.invite}\``}));el.textContent='Sent ✓'}catch(e){el.disabled=false;toast(errMsg(e),'err')}};

/* ---------- channels ---------- */
A.newCh=el=>{const s=actSrv();let type='text';modal({title:'Create Channel',body:`<label class="lbl">Channel type</label><div class="tpls" id="ctype"><div class="tpl on" data-t="text"># Text</div><div class="tpl" data-t="voice">🔊 Voice</div></div><label class="lbl">Channel name</label><input class="input" id="chn" maxlength="30" placeholder="new-channel"><label class="lbl">Category</label><select class="input" id="chc"><option value="">None</option>${s.categories.map(k=>`<option value="${k.id}" ${k.id===el.dataset.a?'selected':''}>${esc(k.name)}</option>`).join('')}</select>`,
  btns:[{label:'Cancel',cls:'ghost'},{label:'Create Channel',cls:'primary',fn:()=>{let n=$('#chn').value.trim();if(!n)return false;if(type==='text')n=n.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9\-_]/g,'');if(!n)return false;const cat=$('#chc').value||null;
    tryDo(async()=>{const c=await must(sb.from('channels').insert({server_id:s.id,category_id:cat,name:n,type,position:Math.max(-1,...s.channels.map((x,i)=>i))+1+Date.now()%1000}).select().single());await reloadServer(s.id);go(s.id,c.id)})}}],
  onOpen:b=>{$('#ctype',b).onclick=e=>{const t=e.target.closest('[data-t]');if(!t)return;type=t.dataset.t;$$('.tpl',b).forEach(x=>x.classList.toggle('on',x===t))}}})};
A.editCh=(el,e)=>{if(e)e.stopPropagation();const s=actSrv(),c=s.channels.find(x=>x.id===el.dataset.a);if(!perm(s,'me','MANAGE_CHANNELS'))return;
  modal({title:'Edit Channel',body:`<label class="lbl">Channel name</label><input class="input" id="chn" maxlength="30" value="${esc(c.name)}">${c.type==='text'?`<label class="lbl">Topic</label><input class="input" id="cht" maxlength="120" value="${esc(c.topic||'')}">`:''}`,
  btns:[{label:'Delete',cls:'danger',fn:()=>{setTimeout(()=>delChannel(s,c),0)}},{label:'Cancel',cls:'ghost'},{label:'Save',cls:'primary',fn:()=>{const n=$('#chn').value.trim();if(!n)return false;const patch={name:c.type==='text'?n.toLowerCase().replace(/\s+/g,'-'):n};if($('#cht'))patch.topic=$('#cht').value.trim();tryDo(async()=>{await must(sb.from('channels').update(patch).eq('id',c.id));await reloadServer(s.id)})}}]})};
function delChannel(s,c){if(s.channels.filter(x=>x.type==='text').length<2&&c.type==='text')return toast('A server needs at least one text channel.','err');confirmBox('Delete Channel',`Delete <b>${esc(c.name)}</b>? All its messages will be lost.`,'Delete Channel',()=>{tryDo(async()=>{await must(sb.from('channels').delete().eq('id',c.id));await reloadServer(s.id)})},1)}
async function swapPos(table,a,b,sid){const pa=a.position!==undefined?a.position:null;await tryDo(async()=>{const items=table==='channels'?S.servers.find(x=>x.id===sid).channels:null;
  const ia=items.indexOf(a),ib=items.indexOf(b);const posA=ia,posB=ib;await Promise.all([must(sb.from(table).update({position:posB}).eq('id',a.id)),must(sb.from(table).update({position:posA}).eq('id',b.id))]);await reloadServer(sid)})}
A.chUp=el=>{const s=srvOf(),i=+el.dataset.a;if(i>0)reorderChannels(s,i,i-1)};
A.chDown=el=>{const s=srvOf(),i=+el.dataset.a;if(i<s.channels.length-1)reorderChannels(s,i,i+1)};
async function reorderChannels(s,i,j){const arr=s.channels.slice();[arr[i],arr[j]]=[arr[j],arr[i]];await tryDo(async()=>{await Promise.all(arr.map((c,k)=>must(sb.from('channels').update({position:k}).eq('id',c.id))));await reloadServer(s.id)})}

/* ---------- moderation ---------- */
function timeoutModal(s,id){modal({title:`Timeout ${esc(getUser(id).name)}`,sub:'They won\'t be able to send messages.',body:'<select class="input" id="tod"><option value="60">60 seconds</option><option value="300">5 minutes</option><option value="3600">1 hour</option><option value="86400">1 day</option><option value="0">Remove timeout</option></select>',btns:[{label:'Cancel',cls:'ghost'},{label:'Apply',cls:'primary',fn:()=>{const sec=+$('#tod').value;tryDo(async()=>{await rpc('timeout_member',{sid:s.id,target:rid(id),seconds:sec});await reloadServer(s.id)},sec?'Timeout applied.':'Timeout removed.')}}]})}
function modAct(kind,s,id){const u=getUser(id);if(!canManage(s,id))return toast('You can\'t manage someone with an equal or higher role.','err');
  modal({title:(kind==='ban'?'Ban ':'Kick ')+esc(u.name),sub:kind==='ban'?'They will not be able to rejoin unless unbanned.':'They can rejoin with an invite.',body:'<label class="lbl">Reason (optional)</label><input class="input" id="rsn" maxlength="100">',btns:[{label:'Cancel',cls:'ghost'},{label:kind==='ban'?'Ban':'Kick',cls:'danger',fn:()=>{const r=$('#rsn').value.trim();tryDo(async()=>{await rpc(kind==='ban'?'ban_member':'kick_member',{sid:s.id,target:rid(id),reason:r});await reloadServer(s.id);await loadAdmin(s);if(V.set)renderSet()},`${u.name} was ${kind==='ban'?'banned':'kicked'}.`)}}]})}
A.unban=el=>{const s=srvOf(),b=s.bans[+el.dataset.a];tryDo(async()=>{await must(sb.from('bans').delete().eq('server_id',s.id).eq('user_id',b.uuid));await loadAdmin(s);renderSet()})};

/* ---------- settings actions ---------- */
function secPrivacy(){return`<h2>Privacy &amp; Safety</h2>${tog('set.hideTyping','Hide my typing indicator','Others won\'t see when you\'re typing.',S.set.hideTyping)}<h3>Blocked users</h3>${S.blocked.length?S.blocked.map(i=>`<div class="frow">${av(S.users[i],32)}<div class="t"><b>${esc((S.users[i]||{name:'?'}).name)}</b></div><button class="btn sm" data-act="unblock" data-a="${i}">Unblock</button></div>`).join(''):'<p class="sub">No blocked users.</p>'}<h3>Your data</h3><p class="sub">Your account, servers and messages are stored in Roblink's database. Appearance and sound settings are stored only on this device.</p>`}
A.rmAvatar=async()=>{S.me.avatarImg=null;updatePreview();refreshApp();renderSet();await updateProfile({avatar_url:null})};
A.rmBanner=async()=>{S.me.bannerImg=null;updatePreview();renderSet();await updateProfile({banner_url:null})};
A.rmSrvIcon=async()=>{const s=srvOf();s.iconImg=null;renderRail();renderSet();await updateServer(s,{icon_url:null})};
A.rmSrvBanner=async()=>{const s=srvOf();s.bannerImg=null;renderSide();renderSet();await updateServer(s,{banner_url:null})};
const confetti=()=>{for(let i=0;i<22;i++){const p=document.createElement('div');p.className='burst';p.textContent=pick(['💎','✨','🎉','⭐']);p.style.cssText=`left:50%;top:40%;--dx:${rnd(-400,400)}px;--dy:${rnd(-250,250)}px;--r:${rnd(-180,180)}deg;z-index:900`;document.body.appendChild(p);setTimeout(()=>p.remove(),1250)}};
async function refreshMe(){const p=await must(sb.from('profiles').select('*').eq('id',MYID).single());Object.assign(S.me,mapUser(p,true));const b=await sb.from('boosts').select('*');S.me.boosted={};(b.data||[]).forEach(x=>{S.me.boosted[x.server_id]=x.count});await loadServers(S.servers.map(s=>s.id));applyTheme();refreshApp();renderSet();renderRail()}
A.getPlus=async el=>{const t=+el.dataset.a;if(!(await tryDo(()=>rpc('set_plan_demo',{t}))))return;await refreshMe();toast(`💎 You're on Roblink ${PLANS[t].name}!`);tone([[523,.1],[659,.1],[784,.1],[1047,.3]],1);confetti()};
A.cancelPlus=()=>confirmBox('Cancel your plan?','You\'ll lose your plan perks and any boosts it gave you. Boosts you bought separately are kept.','Cancel plan',async()=>{if(!(await tryDo(()=>rpc('set_plan_demo',{t:0}))))return;await refreshMe();toast('Plan cancelled.')},1);
A.buyBoosts=async el=>{const n=+el.dataset.a;if(!(await tryDo(()=>rpc('buy_boosts_demo',{n}))))return;await refreshMe();toast(`🚀 +${n} boost${n>1?'s':''} added!`);confetti()};
A.setVanity=async()=>{const s=srvOf(),c=($('#vanity').value||'').trim();if(!c)return toast('Type a code first.','err');if(await tryDo(()=>rpc('set_vanity',{sid:s.id,code:c}),'Custom invite code set!'))await reloadServer(s.id)&&renderSet()};
A.boostIt=async()=>{const s=srvOf();if(await tryDo(()=>rpc('boost_server',{sid:s.id}),'🚀 Server boosted!')){S.me.boostsLeft--;S.me.boosted[s.id]=(S.me.boosted[s.id]||0)+1;await reloadServer(s.id)}};
A.unboost=async()=>{const s=srvOf();if(await tryDo(()=>rpc('unboost_server',{sid:s.id}))){S.me.boostsLeft++;S.me.boosted[s.id]=Math.max(0,(S.me.boosted[s.id]||1)-1);await reloadServer(s.id)}};
A.roleNew=async()=>{const s=srvOf();await tryDo(async()=>{const r=await must(sb.from('roles').insert({server_id:s.id,name:'new role',color:pick(COLORS),perms:{},position:Math.max(0,...s.roles.map(x=>x.position))+1}).select().single());V.set.role=r.id;await reloadServer(s.id)})};
async function swapRoles(s,i,j){const a=s.roles[i],b=s.roles[j];await tryDo(async()=>{await Promise.all([must(sb.from('roles').update({position:b.position}).eq('id',a.id)),must(sb.from('roles').update({position:a.position}).eq('id',b.id))]);await reloadServer(s.id)})}
A.roleUp=el=>{const s=srvOf(),i=+el.dataset.a;swapRoles(s,i,i-1)};
A.roleDown=el=>{const s=srvOf(),i=+el.dataset.a;swapRoles(s,i,i+1)};
A.roleDel=el=>{const s=srvOf(),i=+el.dataset.a,r=s.roles[i];confirmBox('Delete role',`Delete <b>${esc(r.name)}</b>? Members will lose it.`,'Delete',()=>{tryDo(async()=>{await must(sb.from('roles').delete().eq('id',r.id));V.set.role=null;await reloadServer(s.id)})},1)};
A.emDel=el=>{const s=srvOf(),e=s.emojis[+el.dataset.a];tryDo(async()=>{await must(sb.from('emojis').delete().eq('id',e.id));await reloadServer(s.id)})};
function setRoles(s,uidm,ids){return tryDo(async()=>{await rpc('set_member_roles',{sid:s.id,target:rid(uidm),new_roles:ids});await reloadServer(s.id)})}
A.rmRole=el=>{const s=srvOf(),m=s.members[el.dataset.a];setRoles(s,el.dataset.a,m.roles.filter(r=>r!==el.dataset.b))};
A.addRole=(el)=>{const s=srvOf(),id=el.dataset.a,m=s.members[id],r=el.getBoundingClientRect();const opts=s.roles.filter(x=>!m.roles.includes(x.id)&&(s.owner==='me'||s.roles.indexOf(x)>rank(s,'me')));ctxMenu(r.left,r.bottom,opts.length?opts.map(x=>({l:`<span style="color:${esc(x.color)}">●</span> ${esc(x.name)}`,fn:()=>setRoles(s,id,m.roles.concat(x.id))})):[{l:'No roles available'}])};
A.botToggle=async el=>{const s=srvOf(),id=el.dataset.a,on=s.bots.includes(id),bots=on?s.bots.filter(b=>b!==id):s.bots.concat(id);
  if(await updateServer(s,{bots})){if(!on){const g=(s.channels.find(c=>c.name==='general'&&c.type==='text')||s.channels.find(c=>c.type==='text'));if(g)try{await must(sb.from('messages').insert({channel_id:g.id,author_id:MYID,kind:'bot',bot_id:id,content:`👋 Hi! **${BOTS[id].name}** has joined. Try ${Object.values(BOTS[id].cmds).map(x=>'`'+x.split(' –')[0]+'`').join(', ')}`}))}catch(e){}}await reloadServer(s.id)}};
A.newInvite=async()=>{const s=srvOf();await tryDo(async()=>{await rpc('create_invite',{sid:s.id,max:0});await loadAdmin(s);renderSet()})};
A.invDel=el=>{const s=srvOf(),v=s.invites[+el.dataset.a];tryDo(async()=>{await must(sb.from('invites').delete().eq('id',v.id));await loadAdmin(s);renderSet()})};
A.invPeople=()=>inviteModal(srvOf());

/* ---------- file inputs ---------- */
document.addEventListener('change',e=>{const t=e.target,f=t.files&&t.files[0];if(!f)return;
  const up=async(max,kind,apply,png)=>readImage(f,max,async(blob,gif)=>{await tryDo(async()=>{const url=await uploadBlob(blob,kind);await apply(url,gif)})},png);
  if(t.id==='file'){readImage(f,1600,(blob,gif,url)=>{V.att={blob,url};renderAtt()})}
  else if(t.id==='avFile'){if(f.type==='image/gif'&&tier()<2){toast('Animated avatars require Roblink Plus 💎','err')}else up(256,'avatar',async url=>{await must(sb.from('profiles').update({avatar_url:url}).eq('id',MYID));S.me.avatarImg=url;updatePreview();refreshApp();renderSet()})}
  else if(t.id==='bnFile'){if(tier()<2)toast('Banner images require Roblink Plus 💎','err');else up(1000,'banner',async url=>{await must(sb.from('profiles').update({banner_url:url}).eq('id',MYID));S.me.bannerImg=url;updatePreview();renderSet()})}
  else if(t.id==='sIcon'){const s=srvOf();if(f.type==='image/gif'&&boostLevel(s)<1)toast('Animated icons need Boost Level 1.','err');else up(256,'icon',async url=>{await must(sb.from('servers').update({icon_url:url}).eq('id',s.id));s.iconImg=url;renderRail();renderSet()})}
  else if(t.id==='sBanner'){const s=srvOf();up(1000,'banner',async url=>{await must(sb.from('servers').update({banner_url:url}).eq('id',s.id));s.bannerImg=url;renderSide();renderSet()})}
  else if(t.id==='emFile'){const s=srvOf(),lim=50+boostLevel(s)*50;if(s.emojis.length>=lim)toast('No emoji slots left – boost the server for more!','err');else{let n=f.name.replace(/\.[^.]+$/,'').toLowerCase().replace(/[^a-z0-9_]/g,'_').slice(0,20);if(n.length<2)n='emoji'+rnd(10,99);while(s.emojis.some(x=>x.name===n))n=n.slice(0,17)+rnd(100,999);up(64,'emoji',async url=>{await must(sb.from('emojis').insert({server_id:s.id,name:n,url}));await reloadServer(s.id)},true)}}
  t.value=''});
document.addEventListener('paste',e=>{if(e.target.id!=='input')return;const f=[...(e.clipboardData.files||[])].find(x=>x.type.startsWith('image/'));if(f){e.preventDefault();readImage(f,1600,(blob,g,url)=>{V.att={blob,url};renderAtt()})}});
document.addEventListener('drop',e=>{e.preventDefault();const f=e.dataTransfer.files&&e.dataTransfer.files[0];if(f&&$('#input'))readImage(f,1600,(blob,g,url)=>{V.att={blob,url};renderAtt()})});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&MYID){const c=convKey();if(c&&S.unread[c])markRead(c)}});

/* ---------- boot ---------- */
async function boot(){
  if(typeof supabase==='undefined'){authShell('<h1>Can\'t load Roblink</h1><p class="sub">The Supabase library failed to load. Check your connection or ad-blocker and refresh.</p>');return}
  sb=supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  sb.auth.onAuthStateChange((ev)=>{if(ev==='PASSWORD_RECOVERY'){if(APP_STARTED)pwModal();else RECOVERY=true}if(ev==='SIGNED_OUT'&&MYID)location.reload()});
  let session=null;try{session=(await sb.auth.getSession()).data.session}catch(e){}
  if(session)startSession(session.user);else showAuth('signup')}
boot();
