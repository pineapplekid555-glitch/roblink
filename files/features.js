/* Roblink features layer: hooks into the existing app without editing it. */
const F={layout:[],pstyle:{},bots:{}};
const lay=()=>{persist('layout',()=>sb.from('user_layout').upsert({user_id:MYID,layout:F.layout}).then(()=>{}),800)};
const ask=(title,body,ok)=>modal({title,body,btns:[{label:'Cancel',cls:'ghost'},{label:'Save',cls:'primary',fn:ok}]});
const val=(b,id)=>($('#'+id,b)||{}).value;

/* --- login screen line --- */
const _as=authShell;authShell=function(h){_as(h+'<p class="indep">Roblink is an independent chat app and is not affiliated with any other service.</p>')};

/* --- cropping: intercept every image file input before the old handler --- */
document.addEventListener('change',async e=>{const t=e.target,f=t.files&&t.files[0];if(!f||t._cropped||!/^image\//.test(f.type)||/emo/i.test(t.id))return;
 e.stopImmediatePropagation();const kind=t.id==='avFile'?'avatar':t.id==='file'?'image':/bn|banner/i.test(t.id)?'banner':'server';
 const d=await cropImage(f,Object.assign({keepGif:tier()>=1&&kind!=='image'},CROPS[kind]));t.value='';if(!d)return;
 const b=await (await fetch(d)).blob(),nf=new File([b],f.name,{type:b.type}),dt=new DataTransfer();dt.items.add(nf);t.files=dt.files;t._cropped=1;t.dispatchEvent(new Event('change',{bubbles:true}));t._cropped=0},true);

/* --- folders + drag reorder (top bar) --- */
function layoutSync(){const ids=S.servers.map(s=>s.id),seen=new Set();
 F.layout=F.layout.map(x=>typeof x==='string'?(ids.includes(x)?x:null):(x.items=x.items.filter(i=>ids.includes(i)),x.items.length?x:null)).filter(Boolean);
 F.layout.forEach(x=>(typeof x==='string'?[x]:x.items).forEach(i=>seen.add(i)));ids.forEach(i=>{if(!seen.has(i))F.layout.push(i)})}
const srvTile=s=>{const u=unreadOf(s);return`<div class="srv ${V.server===s.id?'active':''}" draggable="true" data-id="${s.id}" data-act="goServer" data-a="${s.id}" data-ctx="server" style="${s.iconImg?'':'background:'+s.color+';'}" title="${esc(s.name)}"><i class="pill ${u.n?'on':''}"></i>${s.iconImg?`<img src="${s.iconImg}" alt="">`:`<span>${esc(s.icon)}</span>`}${u.m?`<b class="bdg">${u.m}</b>`:''}</div>`};
renderRail=function(){layoutSync();const dmU=S.dms.reduce((a,d)=>a+((S.unread[d.id]||{}).n||0),0),by=id=>S.servers.find(s=>s.id===id);
 let h=`<div class="srv home ${V.server==='home'?'active':''}" data-act="goHome" title="Direct Messages">${LOGO}${dmU?`<b class="bdg">${dmU}</b>`:''}</div><div class="sep"></div>`;
 F.layout.forEach(x=>{if(typeof x==='string'){h+=srvTile(by(x))}else{h+=`<div class="fold" data-fid="${x.id}" data-act="foldToggle" data-a="${x.id}" data-ctx="fold" title="${esc(x.name)}" style="${x.open?'':'background:'+(x.color||'var(--bg4)')}">${x.open?`<b>${esc(x.name)}</b>`+x.items.map(i=>srvTile(by(i))).join(''):x.items.slice(0,4).map(i=>{const s=by(i);return`<span style="font-size:16px">${s.iconImg?`<img src="${s.iconImg}" style="width:18px;height:18px;border-radius:5px">`:esc(s.icon)}</span>`}).join('')}</div>`}});
 h+=`<div class="sep"></div><div class="srv add" data-act="addServer" title="Add a Server">＋</div><div class="srv add" data-act="explore" title="Explore" style="font-size:20px">🧭</div><div class="srv add" data-act="tools" title="Server tools" style="font-size:18px">🧰</div><div class="srv add" data-act="security" title="Security (2FA)" style="font-size:18px">🔐</div><div class="srv add" data-act="plusStyle" title="Plus style" style="font-size:18px">✨</div>${S.me.platformRole&&S.me.platformRole!=='user'?'<div class="srv add" data-act="modTools" title="Moderation" style="font-size:18px">🛡️</div>':''}`;
 $('#rail').innerHTML=h};
A.foldToggle=el=>{const f=F.layout.find(x=>x.id===el.dataset.a);if(f){f.open=!f.open;lay();renderRail()}};
let dragId=null;const rail=()=>$('#rail');
document.addEventListener('dragstart',e=>{const t=e.target.closest&&e.target.closest('#rail .srv[data-id]');if(t){dragId=t.dataset.id;t.classList.add('drag');e.dataTransfer.effectAllowed='move'}});
document.addEventListener('dragend',()=>{dragId=null;$$('#rail .drag,#rail .over').forEach(e=>e.classList.remove('drag','over'))});
document.addEventListener('dragover',e=>{if(dragId&&e.target.closest&&e.target.closest('#rail')){e.preventDefault();$$('#rail .over').forEach(x=>x.classList.remove('over'));const t=e.target.closest('.srv[data-id],.fold');if(t&&t.dataset.id!==dragId)t.classList.add('over')}});
document.addEventListener('drop',e=>{if(!dragId)return;const r=e.target.closest&&e.target.closest('#rail');if(!r)return;e.preventDefault();
 const rem=()=>{F.layout=F.layout.map(x=>typeof x==='string'?(x===dragId?null:x):(x.items=x.items.filter(i=>i!==dragId),x.items.length?x:null)).filter(Boolean)};
 const t=e.target.closest('.srv[data-id],.fold');
 if(t&&t.classList.contains('fold')){const f=F.layout.find(x=>x.id===t.dataset.fid);rem();if(f&&!f.items.includes(dragId))f.items.push(dragId)}
 else if(t&&t.dataset.id!==dragId){const rc=t.getBoundingClientRect(),mid=(e.clientX-rc.left)/rc.width,tid=t.dataset.id;
  const inFold=F.layout.find(x=>typeof x!=='string'&&x.items.includes(tid));
  if(mid>.3&&mid<.7&&!inFold){rem();const i=F.layout.indexOf(tid);F.layout[i]={id:uid(),name:'Folder',color:'#2a2f4a',open:true,items:[tid,dragId]}}
  else{rem();if(inFold){const k=inFold.items.indexOf(tid);inFold.items.splice(mid<.5?k:k+1,0,dragId)}else{const i=F.layout.indexOf(tid);F.layout.splice(mid<.5?i:i+1,0,dragId)}}}
 lay();renderRail();dragId=null});
const _ctx=ctxMenu;ctxMenu=function(x,y,items){const el=document.elementFromPoint(x,y),f=el&&el.closest&&el.closest('.fold');
 if(f){const fo=F.layout.find(z=>z.id===f.dataset.fid);return _ctx(x,y,[{l:'✏️ Rename folder',fn:()=>ask('Rename folder','<input class="input" id="fn" value="'+esc(fo.name)+'" maxlength="20"><br><br><input type="color" id="fc" value="'+(fo.color||'#2a2f4a')+'">',b=>{fo.name=val(b,'fn')||fo.name;fo.color=val(b,'fc');lay();renderRail()})},{l:'📂 Ungroup',d:1,fn:()=>{const i=F.layout.indexOf(fo);F.layout.splice(i,1,...fo.items);lay();renderRail()}}])}
 _ctx(x,y,items)};

/* --- voice: connect real audio to existing join/leave/mute --- */
const _jv=A.joinVoice,_lv=A.leaveVoice,_mu=A.mute,_df=A.deafen;
A.joinVoice=el=>{_jv(el);vcJoin(el.dataset.a)};A.leaveVoice=()=>{_lv();vcLeave()};A.mute=()=>{_mu();vcMute()};A.deafen=()=>{_df();vcMute()};

/* --- 2-step delete (confirm) --- */
const _del=A.del;A.del=el=>confirmBox('Delete message?','This permanently removes the message. Step 2 of 2: confirm below.','Delete',()=>_del(el),true);

/* --- super reactions (Plus, monthly limit enforced in DB) --- */
const SUPER=['💥','🔥','✨','🎉','💎','⚡','🌈','👑'];
A.superReact=el=>{const m=findMsg(el.dataset.a);if(!m)return;if(tier()<1)return toast('Super reactions need Roblink Plus 💎','err');
 const b=modal({title:'Super reaction',sub:'Glows and animates. Limited per month.',body:'<div style="display:flex;gap:8px;flex-wrap:wrap;font-size:28px">'+SUPER.map(e=>`<span class="srx" style="cursor:pointer;padding:4px 8px;border-radius:12px" data-e="${e}">${e}</span>`).join('')+'</div>',btns:[{label:'Close',cls:'ghost'}]});
 b.onclick=async ev=>{const e=ev.target.dataset&&ev.target.dataset.e;if(!e)return;closeModal();try{await must(sb.from('reactions').insert({message_id:m.id,user_id:MYID,emoji:e,super:true}));applyReaction(m,e,MYID,true);renderMsgs()}catch(er){toast(errMsg(er),'err')}}};

/* --- Plus styling: tag, name colours --- */
const _nh=nameHtml;nameHtml=function(u,s){let h=_nh(u,s);const p=F.pstyle[u.uuid||u.id];if(!p)return h;
 if(p.name_color)h=h.replace('class="un ',`style="${p.name_color2?`background:linear-gradient(90deg,${p.name_color},${p.name_color2});-webkit-background-clip:text;background-clip:text;color:transparent`:'color:'+p.name_color}" class="un `);
 return h+(p.tag?`<span class="ptag">${esc(p.tag)}</span>`:'')};
A.plusStyle=()=>{if(tier()<1)return toast('Custom tag and name colours need Roblink Plus 💎','err');const p=F.pstyle[MYID]||{};
 ask('Plus style','<p class="sub">Tag (max 5 chars)</p><input class="input" id="pt" maxlength="5" value="'+esc(p.tag||'')+'"><p class="sub">Name colours (2nd optional → gradient)</p><input type="color" id="p1" value="'+(p.name_color||'#7c5cff')+'"> <input type="color" id="p2" value="'+(p.name_color2||'#22d3ee')+'"> <label><input type="checkbox" id="pg" '+(p.name_color2?'checked':'')+'> gradient</label><p class="sub">Animated GIF avatars/banners are kept automatically when you upload them (Plus).</p>',
  async b=>{const r={user_id:MYID,tag:val(b,'pt')||null,name_color:val(b,'p1'),name_color2:$('#pg',b).checked?val(b,'p2'):null};try{await must(sb.from('plus_style').upsert(r));F.pstyle[MYID]=r;renderMsgs();renderMembers()}catch(e){toast(errMsg(e),'err')}})};

/* --- 2FA (Supabase TOTP) --- */
A.security=async()=>{const{data}=await sb.auth.mfa.listFactors(),on=(data.totp||[]).find(f=>f.status==='verified');
 if(on)return modal({title:'Two-factor authentication',sub:'Enabled ✅',btns:[{label:'Close',cls:'ghost'},{label:'Turn off',cls:'danger',fn:()=>{tryDo(async()=>{await sb.auth.mfa.unenroll({factorId:on.id});await rpc('set_mfa_flag',{b:false})},'2FA disabled')}}]});
 const r=await sb.auth.mfa.enroll({factorType:'totp'});if(r.error)return toast(r.error.message+' (enable MFA in Supabase → Auth → Providers)','err');const f=r.data;
 modal({title:'Set up 2FA',sub:'Scan with an authenticator app, then enter the 6-digit code.',body:`<div style="display:flex;justify-content:center;background:#fff;border-radius:12px;padding:8px"><img src="${f.totp.qr_code}" width="180"></div><p class="sub" style="word-break:break-all">Key: ${f.totp.secret}</p><input class="input" id="mc" placeholder="123456" maxlength="6">`,
  btns:[{label:'Cancel',cls:'ghost'},{label:'Verify',cls:'primary',fn:b=>{const code=val(document,'mc');(async()=>{const c=await sb.auth.mfa.challenge({factorId:f.id});const v=await sb.auth.mfa.verify({factorId:f.id,challengeId:c.data.id,code});if(v.error)return toast(v.error.message,'err');await rpc('set_mfa_flag',{b:true});toast('2FA enabled ✅')})();return true}}]})};
const _ss=startSession;startSession=async function(user){
 try{const a=(await sb.auth.mfa.getAuthenticatorAssuranceLevel()).data;if(a&&a.nextLevel==='aal2'&&a.currentLevel!=='aal2'){const fs=(await sb.auth.mfa.listFactors()).data.totp[0];
  await new Promise(res=>{authShell(`<h1>Two-factor code</h1><p class="sub">Enter the code from your authenticator app.</p><input class="input" id="mfa" maxlength="6" placeholder="123456"><button class="btn primary" id="mfab" style="margin-top:12px;width:100%">Verify</button>`);
   $('#mfab').onclick=async()=>{const c=await sb.auth.mfa.challenge({factorId:fs.id}),v=await sb.auth.mfa.verify({factorId:fs.id,challengeId:c.data.id,code:$('#mfa').value.trim()});if(v.error)toast(v.error.message,'err');else res()}})}}catch(e){console.warn(e)}
 await _ss(user);
 try{const n=await rpc('refresh_boosts');if(typeof n==='number')S.me.boostsLeft=n;await rpc('autojoin_me');
  const[l,p,cb]=await Promise.all([sb.from('user_layout').select('layout').eq('user_id',MYID).maybeSingle(),sb.from('plus_style').select('*'),sb.from('custom_bots').select('*')]);
  F.layout=(l.data&&l.data.layout)||[];(p.data||[]).forEach(r=>F.pstyle[r.user_id]=r);(cb.data||[]).forEach(r=>(F.bots[r.server_id]=F.bots[r.server_id]||[]).push(r));renderRail();renderMsgs&&renderMsgs()}catch(e){console.warn(e)}};

/* --- custom bots run on /command --- */
const _bi=builtin;builtin=async function(text,key,s){if(s&&await _bi(text,key,s))return true;
 const cmd=text.slice(1).split(' ')[0].toLowerCase(),arg=text.split(' ').slice(1).join(' ');
 for(const b of(F.bots[s&&s.id]||[]))for(const c of b.commands||[])if(c.name.toLowerCase()===cmd){try{const row=await insertRow(key,{content:`**${b.name}:** `+c.reply.replace(/\{args\}/g,arg).replace(/\{user\}/g,S.me.name)});onNewMessage(key,mapMsg(row))}catch(e){toast(errMsg(e),'err')}return true}
 return false};

/* --- server tools hub: channel perms, discovery, invites, bots --- */
A.tools=()=>{const s=curServer();if(!s)return toast('Open a server first.','err');
 modal({title:s.name+' tools',body:'<div style="display:grid;gap:8px"><button class="btn" data-t="perm">🔒 Channel permissions</button><button class="btn" data-t="disc">🧭 Discovery requirements</button><button class="btn" data-t="inv">🎟️ Invite codes</button><button class="btn" data-t="bot">🤖 Custom bots</button></div>',btns:[{label:'Close',cls:'ghost'}],
  onOpen:b=>b.addEventListener('click',e=>{const t=e.target.dataset&&e.target.dataset.t;if(t)({perm:permModal,disc:discModal,inv:invModal,bot:botModal})[t](s)})})};
async function discModal(s){const d=await rpc('discovery_status',{sid:s.id}),ok=(c,t)=>`<p>${c?'✅':'⬜'} ${t}</p>`;
 modal({title:'Discovery requirements',sub:'Needed before a server can be listed in Explore.',body:ok(d.members>=d.need_members,`${d.members}/${d.need_members} members`)+ok(d.age_days>=d.need_age,`${d.age_days}/${d.need_age} days old`)+ok(d.has_description,'Description of 20+ characters')+ok(d.has_icon,'Server icon uploaded'),btns:[{label:'Close',cls:'ghost'}]})}
function invModal(s){modal({title:'Invite code',body:'<p class="sub">Max uses (0 = unlimited)</p><input class="input" id="im" type="number" value="0" min="0"><p class="sub">Expires after (hours, 0 = never)</p><input class="input" id="ih" type="number" value="0" min="0"><p id="ic" style="font-size:20px;margin-top:12px"></p>',btns:[{label:'Close',cls:'ghost'},{label:'Create',cls:'primary',fn:()=>{(async()=>{try{const c=await rpc('create_invite_ex',{sid:s.id,max:+val(document,'im')||0,hours:+val(document,'ih')||0});const u=location.href.split('#')[0].split('?')[0]+'?join='+c;$('#ic').textContent=u;navigator.clipboard&&navigator.clipboard.writeText(u);toast('Invite copied')}catch(e){toast(errMsg(e),'err')}})();return false}}]})}
async function permModal(s){const ch=s.channels,tg=[...s.roles.map(r=>['role',r.id,'Role: '+r.name]),...Object.keys(s.members).filter(k=>k!=='me').map(k=>['member',k,'Member: '+(getUser(k)||{}).name]),['member',MYID,'Member: me']];
 const sel=(id,o)=>`<select class="input" id="${id}">${o}</select>`,tri='<option value="">Default</option><option value="t">Allow</option><option value="f">Deny</option>',tv=v=>v===''?null:v==='t';
 modal({title:'Channel permissions',sub:'Override who can view / send per role or member.',body:sel('pc',ch.map(c=>`<option value="${c.id}">${c.type==='voice'?'🔊':'#'} ${esc(c.name)}</option>`).join(''))+'<br><br>'+sel('pt',tg.map((t,i)=>`<option value="${i}">${esc(t[2])}</option>`).join(''))+'<br><br>View '+sel('pv',tri)+' Send '+sel('ps',tri),btns:[{label:'Close',cls:'ghost'},{label:'Apply',cls:'primary',fn:()=>{const t=tg[+val(document,'pt')];tryDo(()=>rpc('set_channel_override',{cid:val(document,'pc'),ttype:t[0],tid:t[1],v:tv(val(document,'pv')),s:tv(val(document,'ps'))}),'Permissions updated');return false}}]})}
async function botModal(s){modal({title:'Custom bot',sub:'One command per line: name=reply. Use {args} and {user}.',body:'<input class="input" id="bn" placeholder="Bot name" maxlength="24"><br><br><input type="color" id="bc" value="#7c5cff"><br><br><textarea class="input" id="bm" rows="5" placeholder="hello=Hi {user}!\nrules=Be kind."></textarea>',btns:[{label:'Close',cls:'ghost'},{label:'Create',cls:'primary',fn:()=>{(async()=>{const cm=val(document,'bm').split('\n').map(l=>l.split('=')).filter(a=>a[0]&&a[1]).map(a=>({name:a[0].trim().replace(/^\//,''),reply:a.slice(1).join('=').trim()}));try{const r=await must(sb.from('custom_bots').insert({server_id:s.id,name:val(document,'bn'),color:val(document,'bc'),commands:cm}).select().single());(F.bots[s.id]=F.bots[s.id]||[]).push(r);toast('Bot created. Try /'+(cm[0]||{}).name)}catch(e){toast(errMsg(e),'err')}})();return true}}]})}

/* --- moderation hub --- */
A.modTools=()=>modal({title:'Moderation',body:'<input class="input" id="mq" placeholder="Search username…"><div id="mr" style="margin-top:10px"></div>'+(S.me.platformRole==='owner'?'<hr><button class="btn" id="maj">Set current server as auto-join for new users</button>':''),btns:[{label:'Close',cls:'ghost'}],
 onOpen:b=>{let t;$('#mq',b).oninput=e=>{clearTimeout(t);t=setTimeout(async()=>{try{const r=await rpc('staff_find_user',{q:e.target.value});$('#mr',b).innerHTML=r.map(u=>`<div class="dmrow"><div class="t"><b>${esc(u.display_name)}</b> @${esc(u.username)} · ${u.msgs} msgs ${u.suspended?'🚫':''}</div><button class="btn sm" data-p="${u.id}">Purge 24h</button> <button class="btn sm danger" data-s="${u.id}" data-f="${u.suspended?0:1}">${u.suspended?'Unsuspend':'Suspend'}</button></div>`).join('')||'No results'}catch(er){toast(errMsg(er),'err')}},300)};
  b.addEventListener('click',async e=>{const d=e.target.dataset;try{if(d.p){toast((await rpc('staff_purge_user',{target:d.p,hours:24}))+' messages removed')}else if(d.s){await rpc('staff_set_suspended',{target:d.s,flag:d.f==='1',why:'Moderation panel'});toast('Done')}else if(e.target.id==='maj'){const s=curServer();if(!s)return toast('Open a server first.','err');await rpc('set_autojoin',{sid:s.id});toast('Auto-join set')}}catch(er){toast(errMsg(er),'err')}})}});

/* --- ?join=code invite links --- */
addEventListener('load',()=>{const c=new URLSearchParams(location.search).get('join');if(c)setTimeout(()=>{if(typeof MYID!=='undefined'&&MYID)rpc('join_server',{p_code:c}).then(()=>location.replace(location.pathname)).catch(e=>toast(errMsg(e),'err'))},2500)});
