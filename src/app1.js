'use strict';
/* ============ Roblink core ============ */
const KEY='roblink_v1';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const uid=()=>Math.random().toString(36).slice(2,10);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const now=()=>Date.now(),pick=a=>a[Math.floor(Math.random()*a.length)],rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const LOGO='<svg viewBox="0 0 48 48" width="30" height="30"><rect x="4" y="12" width="26" height="18" rx="9" fill="none" stroke="#fff" stroke-width="5"/><rect x="18" y="18" width="26" height="18" rx="9" fill="none" stroke="#fff" stroke-width="5" opacity=".85"/></svg>';
const PERMS={ADMIN:['Administrator','Grants every permission and bypasses all restrictions. Dangerous!'],MANAGE_SERVER:['Manage Server','Change server name, icon and settings'],MANAGE_ROLES:['Manage Roles','Create and edit roles below their own'],MANAGE_CHANNELS:['Manage Channels','Create, edit and delete channels'],KICK:['Kick Members','Remove members (they can rejoin)'],BAN:['Ban Members','Permanently remove members'],TIMEOUT:['Timeout Members','Stop members from chatting for a while'],MANAGE_MESSAGES:['Manage Messages','Delete and pin other people\'s messages'],MANAGE_EMOJI:['Manage Emoji','Add and remove custom emoji'],INVITE:['Create Invite','Invite new people'],SEND:['Send Messages','Post in text channels'],REACT:['Add Reactions','React to messages'],ATTACH:['Attach Files','Upload images'],MENTION_ALL:['Mention @everyone','Notify the whole server']};
const BOTS={dicebot:{name:'DiceBot',color:'#5865f2',cmds:{roll:'/roll [NdM] – roll dice',coinflip:'/coinflip – flip a coin'},desc:'Dice rolls and coin flips.'},
oraclebot:{name:'OracleBot',color:'#a855f7',cmds:{'8ball':'/8ball <question> – ask the oracle',joke:'/joke – hear a joke',fact:'/fact – random fact'},desc:'Answers questions and tells jokes.'},
pollbot:{name:'PollBot',color:'#14b8a6',cmds:{poll:'/poll Question | A | B | C – start a poll'},desc:'Create polls with live votes.'},
modbot:{name:'ModBot',color:'#ef4444',cmds:{purge:'/purge <1-50> – delete messages',warn:'/warn @user <reason> – warn a member'},desc:'Auto-moderation, purge and warn.'},
musicbot:{name:'MusicBot',color:'#f59e0b',cmds:{play:'/play <song> – play a song',queue:'/queue – show queue',skip:'/skip – skip song'},desc:'Plays music in voice channels (demo).'}};
const NPCS=[['nova','Nova','#f87171','online','Admin of Roblink HQ. Builds tycoons at 3am.'],['pixel','Pixel','#60a5fa','online','Moderator • pixel art • coffee ☕'],['blocky','Blocky','#34d399','idle','I build obbies nobody can finish.'],['luna','Luna','#c084fc','dnd','Scripter. Lua > everything.'],['drift','Drift','#fbbf24','online','racing games only 🏎️'],['kira','Kira','#f472b6','offline','UI designer'],['zed','Zed','#22d3ee','online','speedrunner ⚡'],['mochi','Mochi','#fb923c','offline','🍡'],['echo','Echo','#a3e635','idle','sound designer 🎧']];
const CHAT=['anyone up for a round of obby?','just finished my tycoon map, feedback welcome 👀','who else is excited for the weekend update','lol that was hilarious','brb grabbing food','this UI is so clean ngl','has anyone figured out the new physics settings?','gg everyone','i can\'t believe it actually worked','what are you all building?','drop your favourite game below 👇','morning chat ☀️','who wants to collab on a project?','that\'s actually a really good idea','pls someone help me with this script, it keeps erroring','new avatar who dis','check out my build 🔥','⏰ reminder: event starts at 8pm','that bug was actually a feature','one more game and then sleep (lies)'];
const TPL={gaming:{n:'🎮 Gaming',cats:[['Info',['welcome','rules','announcements'],[]],['Text Channels',['general','clips','looking-for-group','memes'],[]],['Voice Channels',[],['Lobby','Squad 1','Squad 2']]]},
friends:{n:'🏠 Friends',cats:[['Text Channels',['general','photos','plans'],[]],['Voice Channels',[],['Hangout','AFK']]]},
study:{n:'📚 Study Group',cats:[['Info',['announcements','resources'],[]],['Study',['general','homework-help','off-topic'],[]],['Focus Rooms',[],['Silent Study','Group Study']]]},
creators:{n:'🎨 Creators',cats:[['Info',['welcome','rules'],[]],['Showcase',['general','showcase','feedback','collabs'],[]],['Voice',[],['Studio','Lounge']]]},
blank:{n:'✨ Blank',cats:[['Text Channels',['general'],[]],['Voice Channels',[],['General']]]}};
const EMO={Smileys:'😀😃😄😁😆😅😂🤣😊😇🙂😉😍🥰😘😋😛😜🤪🤔🤨😐😑😶🙄😏😴🤤😎🤓🥳😢😭😤😡🤬😱😨😰🥺😳🤯🥶🥵'.match(/./gu),Gestures:'👍👎👌✌️🤞🤟🤘👋🤚👏🙌👐🤝🙏💪🫶❤️🧡💛💚💙💜🖤🤍💔💯💥🔥✨⭐🌟'.match(/\p{Extended_Pictographic}️?/gu),Things:'🎮🕹️🎲🎯🎵🎧🎤🎸🏆🥇⚽🏀🏎️🚀✈️🌈☀️🌙⚡❄️🍕🍔🍟🍿🍩🍪☕🍺🎉🎁💎👑🔑💡📌📎'.match(/\p{Extended_Pictographic}️?/gu)};
const THEMES=[['dark','Dark','#313338'],['midnight','Midnight','#000'],['light','Light','#fff'],['sunset','Sunset','linear-gradient(135deg,#ff6b6b,#ffb86b)',1],['aurora','Aurora','linear-gradient(135deg,#2dd4bf,#6366f1)',1],['sakura','Sakura','linear-gradient(135deg,#f472b6,#fb7185)',1],['neon','Neon','linear-gradient(135deg,#d946ef,#22d3ee)',1]];
const COLORS=['#5865f2','#3ba55d','#ed4245','#faa61a','#eb459e','#f47b67','#00b0f4','#9b59b6'];
const svgEmoji=(ch,bg)=>'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${bg}"/><text x="32" y="43" font-size="26" text-anchor="middle" fill="#fff" font-family="sans-serif" font-weight="700">${ch}</text></svg>`);

/* ---------- state ---------- */
let S=null;try{S=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){}
const V={server:'home',channel:null,dm:null,ftab:'online',members:innerWidth>900,reply:null,edit:null,voice:null,typing:{},drafts:{},muted:false,deaf:false,att:null,collapsed:{},set:null,ctxOpen:false};
let saveT;function save(){clearTimeout(saveT);saveT=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){toast('Storage is full – some images may not be saved.','err')}},250)}
const DEF_SET={theme:'dark',accent:'#5865f2',density:'cozy',font:16,sounds:true,desktop:false,reduceMotion:false,dev:false,mentionsOnly:false,noiseSup:true,mic:100,spk:100,hd:false,dmMembers:true,friendReq:'all',explicit:'all',autoplayGif:true,hideTyping:false};
function mkRole(name,color,perms,hoist){return{id:uid(),name,color,perms,hoist:!!hoist}}
function getUser(id){return id==='me'?S.me:S.users[id]}
function curServer(){return V.server==='home'?null:S.servers.find(s=>s.id===V.server)}
function curChannel(){const s=curServer();return s&&s.channels.find(c=>c.id===V.channel)}
function curDm(){return V.dm&&S.dms.find(d=>d.id===V.dm)}
function convKey(){return V.dm||V.channel}
function perm(s,u,p){if(s.owner===u)return true;const m=s.members[u];if(!m)return false;if(s.everyone[p]||s.everyone.ADMIN)return true;return m.roles.some(rid=>{const r=s.roles.find(x=>x.id===rid);return r&&(r.perms[p]||r.perms.ADMIN)})}
function rank(s,u){if(s.owner===u)return -1;const m=s.members[u];if(!m)return 999;let b=999;m.roles.forEach(rid=>{const i=s.roles.findIndex(r=>r.id===rid);if(i>=0&&i<b)b=i});return b}
const canManage=(s,t)=>rank(s,'me')<rank(s,t);
function topRole(s,u,hoistOnly){const m=s&&s.members[u];if(!m)return null;for(const r of s.roles)if(m.roles.includes(r.id)&&(!hoistOnly||r.hoist))return r;return null}
function dispName(u,s){const m=s&&s.members[u.id];return(m&&m.nick)||u.name}
function audit(s,t){s.audit.unshift({ts:now(),who:S.me.name,t});s.audit.length=Math.min(s.audit.length,100)}
function anyManage(s){return['MANAGE_SERVER','MANAGE_ROLES','MANAGE_CHANNELS','KICK','BAN','MANAGE_EMOJI','ADMIN'].some(p=>perm(s,'me',p))}

/* ---------- seed ---------- */
function mkServer(o){
  const t=TPL[o.tpl||'gaming'];
  const s={id:uid(),name:o.name,icon:o.icon||o.name[0].toUpperCase(),iconImg:null,color:o.color||'#5865f2',owner:o.owner,desc:o.desc||'',boosts:o.boosts||0,bannerColor:'#5865f2',bannerImg:null,categories:[],channels:[],roles:[],everyone:{SEND:1,REACT:1,ATTACH:1,INVITE:1},members:{},bots:[...(o.bots||[])],invites:[],bans:[],emojis:[],audit:[],automod:{on:false,words:['badword','spamlink','freerobux']},verification:'low',filter:'members',invite:o.invite||uid().slice(0,6),voiceUsers:{},created:now()-(o.age||864e5*30)};
  t.cats.forEach(([name,txt,vc])=>{const cat={id:uid(),name};s.categories.push(cat);txt.forEach(n=>s.channels.push({id:uid(),name:n,type:'text',cat:cat.id,topic:''}));vc.forEach(n=>{const c={id:uid(),name:n,type:'voice',cat:cat.id};s.channels.push(c);s.voiceUsers[c.id]=[]})});
  s.roles=[mkRole('Admin','#ef4444',{ADMIN:1},true),mkRole('Moderator','#3b82f6',{KICK:1,BAN:1,TIMEOUT:1,MANAGE_MESSAGES:1},true)];
  (o.members||[]).concat(['me']).forEach(id=>{if(!s.members[id])s.members[id]={roles:[],nick:'',joined:now()-rnd(1,25)*864e5,timeout:0}});
  if(!s.members[o.owner])s.members[o.owner]={roles:[],nick:'',joined:s.created,timeout:0};
  if(s.bots.length){const br=mkRole('Bots','#a78bfa',{},true);s.roles.push(br);s.bots.forEach(b=>{s.members[b]={roles:[br.id],nick:'',joined:s.created,timeout:0}})}
  s.channels.forEach(c=>{S.messages[c.id]=[]});
  return s}
function seedChat(s,n){const ch=s.channels.find(c=>c.name==='general')||s.channels.find(c=>c.type==='text');const ppl=Object.keys(s.members).filter(i=>i!=='me'&&!S.users[i].bot);if(!ppl.length)return;let ts=now()-n*9*6e4;const used=new Set();for(let i=0;i<n;i++){let l;do l=pick(CHAT);while(used.has(l)&&used.size<CHAT.length);used.add(l);ts+=rnd(4,12)*6e4;S.messages[ch.id].push({id:uid(),a:pick(ppl),t:l,ts,rx:{}})}}
function newState(me){
  S={v:1,me,users:{},servers:[],directory:[],messages:{},dms:[],friends:[],pending:[],blocked:[],unread:{},set:{...DEF_SET},last:{}};
  NPCS.forEach(([id,name,color,status,about])=>S.users[id]={id,username:id,name,color,status,about,created:now()-864e5*rnd(60,900)});
  Object.entries(BOTS).forEach(([id,b])=>S.users[id]={id,username:id,name:b.name,color:b.color,status:'online',about:b.desc,bot:true,created:now()-864e5*300});
  const hq=mkServer({name:'Roblink HQ',icon:'R',color:'#7c5cff',owner:'me',tpl:'gaming',desc:'The official Roblink community. Build, chat, hang out!',boosts:5,bots:Object.keys(BOTS),members:NPCS.map(n=>n[0]),invite:'hq'});
  const adm=hq.roles[0],mod=hq.roles[1],bld=mkRole('Builder','#10b981',{MANAGE_EMOJI:1},true);hq.roles.splice(2,0,bld);
  hq.members.nova.roles=[adm.id];hq.members.pixel.roles=[mod.id];hq.members.blocky.roles=[bld.id];hq.members.luna.roles=[bld.id];
  hq.emojis=[{id:uid(),name:'roblink',data:svgEmoji('R','#7c5cff')},{id:uid(),name:'pog',data:svgEmoji('!?','#f59e0b')},{id:uid(),name:'gg',data:svgEmoji('GG','#10b981')},{id:uid(),name:'hype',data:svgEmoji('🔥','#ef4444')}];
  hq.channels.find(c=>c.name==='general').topic='Chat about anything. Try /help!';hq.channels.find(c=>c.name==='announcements').topic='Official news';
  hq.voiceUsers[hq.channels.find(c=>c.name==='Lobby').id]=['zed','drift'];
  hq.invites=[{code:'hq',by:'me',uses:12,max:0,ts:now()-864e5*3}];
  hq.audit=[{ts:now()-864e5,who:'Nova',t:'created the Builder role'},{ts:now()-864e5*2,who:'Pixel',t:'timed out Mochi for 5 minutes'}];
  S.servers.push(hq);
  const M=S.messages,gid=n=>hq.channels.find(c=>c.name===n).id;
  M[gid('rules')].push({id:uid(),a:'nova',t:'**Welcome to Roblink HQ!**\n1. Be kind to everyone\n2. No spam or self-promo\n3. Have fun building 🧱',ts:now()-864e5*5,rx:{'👍':['pixel','zed','luna']},pin:true});
  M[gid('announcements')].push({id:uid(),a:'nova',t:'🎉 Roblink is live! Try `/roll`, `/8ball`, `/poll`, `/play` and upload an :roblink: emoji of your own in Server Settings.',ts:now()-864e5,rx:{'🎉':['pixel','blocky'],':hype:':['zed']}});
  seedChat(hq,8);
  M[gid('general')].push({id:uid(),a:'modbot',t:'👋 Welcome to **Roblink HQ**! Type `/help` to see what the bots can do.',ts:now()-5*6e4,rx:{}});
  const ob=mkServer({name:'Obby Builders',icon:'🧱',color:'#10b981',owner:'blocky',tpl:'creators',desc:'Obby makers unite.',bots:['dicebot','oraclebot'],members:['nova','pixel','zed','kira','echo'],boosts:2,invite:'obby'});
  ob.members.zed.roles=[ob.roles[1].id];ob.members.blocky.roles=[ob.roles[0].id];seedChat(ob,6);S.servers.push(ob);
  [['Scripters Guild','⌨️','#6366f1','luna','creators',['echo','kira','nova'],'script','Lua, Luau and everything in between.'],['Chill Lounge','🛋️','#ec4899','mochi','friends',['drift','kira','zed'],'chill','Relax, vent, share memes.'],['Sunset Racing','🏁','#f97316','drift','gaming',['zed','pixel'],'race','Racing game fans and time trials.']].forEach(([n,i,c,o,t,m,inv,d])=>{const sv=mkServer({name:n,icon:i,color:c,owner:o,tpl:t,members:m,invite:inv,desc:d,bots:['dicebot']});seedChat(sv,5);S.directory.push(sv)});
  S.friends=['nova','pixel','zed','luna'];S.pending=[{id:'drift',dir:'in'}];
  ['nova','dicebot'].forEach(u=>{const d={id:uid(),user:u};S.dms.push(d);S.messages[d.id]=[]});
  S.messages[S.dms[0].id].push({id:uid(),a:'nova',t:'hey! welcome to Roblink 👋 let me know if you need anything',ts:now()-3e5,rx:{}});
  S.messages[S.dms[1].id].push({id:uid(),a:'dicebot',t:'Hi! I\'m **DiceBot**. Try `/roll 2d20` or `/coinflip`.',ts:now()-2e5,rx:{}});
  S.last={server:hq.id,channel:gid('general')};save()}

/* ---------- formatting ---------- */
function av(u,size,status){u=u||{name:'?',color:'#888'};const st=status?`<i class="dot ${u.status==='invisible'?'offline':(u.status||'online')}"></i>`:'';const inner=u.avatarImg?`<img src="${u.avatarImg}" alt="">`:`<span>${esc((u.name||'?')[0].toUpperCase())}</span>`;return`<div class="av" style="width:${size}px;height:${size}px;background:${u.color||'#5865f2'};font-size:${Math.round(size*.45)}px">${inner}${st}</div>`}
function fmtTime(ts,short){const d=new Date(ts),n=new Date(),t=d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});if(short)return t;const same=(a,b)=>a.toDateString()===b.toDateString();if(same(d,n))return'Today at '+t;const y=new Date(n-864e5);if(same(d,y))return'Yesterday at '+t;return d.toLocaleDateString()+' '+t}
function findEmoji(name,plus){const s=curServer();let e=s&&s.emojis.find(x=>x.name===name);if(e)return e;if(plus)for(const sv of S.servers){e=sv.emojis.find(x=>x.name===name);if(e)return e}if(!s)return null;return null}
function emoHtml(k){if(k[0]===':'){const e=findEmoji(k.slice(1,-1),true);return e?`<img class="cemoji" src="${e.data}" alt="${esc(k)}">`:esc(k)}return esc(k)}
function fmt(text,plus){
  let t=esc(text);const blocks=[];
  t=t.replace(/```([\s\S]*?)```/g,(m,c)=>{blocks.push('<pre><code>'+c.replace(/^\n/,'')+'</code></pre>');return'\u0000'+(blocks.length-1)+'\u0000'});
  t=t.replace(/`([^`\n]+)`/g,(m,c)=>{blocks.push('<code>'+c+'</code>');return'\u0000'+(blocks.length-1)+'\u0000'});
  t=t.replace(/\|\|(.+?)\|\|/g,'<span class="spoiler" data-act="spoiler">$1</span>').replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/__(.+?)__/g,'<u>$1</u>').replace(/(^|[^*\w])\*(?!\s)([^*\n]+?)\*/g,'$1<i>$2</i>').replace(/~~(.+?)~~/g,'<s>$1</s>').replace(/^&gt; (.*)$/gm,'<blockquote>$1</blockquote>');
  t=t.replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  t=t.replace(/@(everyone|[a-z0-9_.]+)/gi,(m,n)=>{const l=n.toLowerCase();if(l==='everyone')return`<span class="mention me">@everyone</span>`;if(l===S.me.username)return`<span class="mention me">@${esc(S.me.name)}</span>`;const u=Object.values(S.users).find(x=>x.username===l);return u?`<span class="mention" data-act="profile" data-a="${u.id}">@${esc(u.name)}</span>`:m});
  t=t.replace(/:([a-z0-9_]{2,}):/gi,(m,n)=>{const e=findEmoji(n,plus);return e?`<img class="cemoji" src="${e.data}" title=":${esc(n)}:" alt=":${esc(n)}:">`:m});
  t=t.replace(/\u0000(\d+)\u0000/g,(m,i)=>blocks[i]);
  return t.replace(/\n/g,'<br>')}
const mentionsMe=m=>new RegExp('@(everyone|'+S.me.username.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')\\b','i').test(m.t||'');
function nameHtml(u,s){const r=s&&topRole(s,u.id);return`<span class="un ${u.plus?'plusname':''}" data-act="profile" data-a="${u.id}" data-ctx="member" ${r&&!u.plus?`style="color:${r.color}"`:''}>${esc(dispName(u,s))}</span>`}
const badges=u=>(u.bot?'<span class="badge">BOT</span> ':'')+(u.plus?'<span class="badge plus">💎 PLUS</span>':'');

/* ---------- audio ---------- */
let AC;function tone(seq,vol){if(!S.set.sounds&&!vol)return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();let t=AC.currentTime;seq.forEach(([f,d,ty])=>{const o=AC.createOscillator(),g=AC.createGain();o.type=ty||'sine';o.frequency.value=f;g.gain.setValueAtTime(.08,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+d);t+=d*.9})}catch(e){}}
const SOUNDS={Airhorn:[[440,.15,'sawtooth'],[440,.15,'sawtooth'],[587,.4,'sawtooth']],Ding:[[988,.12],[1319,.4]],Drum:[[120,.15,'triangle'],[90,.2,'triangle'],[120,.15,'triangle']],Laser:[[1500,.06,'square'],[900,.06,'square'],[500,.08,'square'],[250,.15,'square']],Wow:[[330,.15],[392,.15],[523,.15],[659,.35]],Bruh:[[200,.25,'sawtooth'],[140,.4,'sawtooth']]};

/* ---------- toast / layer ---------- */
function toast(t,kind){const el=document.createElement('div');el.className='toast '+(kind||'');el.textContent=t;document.body.appendChild(el);setTimeout(()=>el.remove(),3200)}

/* ---------- render: rail ---------- */
const unreadOf=s=>s.channels.reduce((a,c)=>{const u=S.unread[c.id];return u?{n:a.n+u.n,m:a.m+u.m}:a},{n:0,m:0});
function renderRail(){
  const dmU=S.dms.reduce((a,d)=>a+((S.unread[d.id]||{}).n||0),0);
  let h=`<div class="srv home ${V.server==='home'?'active':''}" data-act="goHome" title="Direct Messages"><i class="pill ${dmU?'on':''}"></i>${LOGO}${dmU?`<b class="bdg">${dmU}</b>`:''}</div><div class="sep"></div>`;
  S.servers.forEach(s=>{const u=unreadOf(s);h+=`<div class="srv ${V.server===s.id?'active':''}" data-act="goServer" data-a="${s.id}" data-ctx="server" style="${s.iconImg?'':'background:'+s.color+';'}" title="${esc(s.name)}"><i class="pill ${u.n?'on':''}"></i>${s.iconImg?`<img src="${s.iconImg}" alt="">`:`<span>${esc(s.icon)}</span>`}${u.m?`<b class="bdg">${u.m}</b>`:''}</div>`});
  h+=`<div class="sep"></div><div class="srv add" data-act="addServer" title="Add a Server">＋</div><div class="srv add" data-act="explore" title="Explore Servers" style="font-size:20px">🧭</div>`;
  $('#rail').innerHTML=h}

/* ---------- render: sidebar ---------- */
function userPanel(){const m=S.me;return`<div class="userpanel"><div class="me" data-act="statusMenu">${av(m,32,true)}<div><b class="${m.plus?'plusname':''}">${esc(m.name)}</b><small>${esc(m.customStatus||m.status)}</small></div></div><button class="ib ${V.muted?'on':''}" data-act="mute" title="Mute">${V.muted?'🔇':'🎤'}</button><button class="ib ${V.deaf?'on':''}" data-act="deafen" title="Deafen">${V.deaf?'🔕':'🎧'}</button><button class="ib" data-act="openSet" data-a="account" title="User Settings">⚙️</button></div>`}
function voicePanel(){if(!V.voice)return'';const s=S.servers.find(x=>x.id===V.voice.sid),c=s&&s.channels.find(x=>x.id===V.voice.cid);if(!c)return'';return`<div id="voicepanel"><div class="g">📶 Voice Connected</div><div class="sub">${esc(c.name)} / ${esc(s.name)}</div><div class="row2"><button class="btn sm" data-act="soundboard" title="Soundboard">🔊 Sounds</button><button class="btn sm" data-act="camTest">📷</button><button class="btn sm danger" data-act="leaveVoice">📞 Leave</button></div></div>`}
function renderSide(){
  const el=$('#side'),s=curServer();let h='';
  if(!s){
    h=`<div class="shead static"><input class="finder" readonly placeholder="Find or start a conversation" data-act="quick"></div><div class="chs"><div class="ch ${!V.dm?'active':''}" data-act="goHome"><span class="ico">👥</span><span class="nm">Friends</span>${S.pending.some(p=>p.dir==='in')?`<span class="mb">${S.pending.filter(p=>p.dir==='in').length}</span>`:''}</div><div class="ch" data-act="openSet" data-a="plus"><span class="ico">💎</span><span class="nm">Roblink Plus</span></div><div class="cat"><span>Direct Messages</span><b data-act="newDm" title="New DM">+</b></div>`;
    S.dms.forEach(d=>{const u=getUser(d.user);if(!u)return;const un=S.unread[d.id];h+=`<div class="dmrow ${V.dm===d.id?'active':''}" data-act="openDm" data-a="${d.id}" data-ctx="dm">${av(u,32,true)}<div class="t"><b class="${u.plus?'plusname':''}">${esc(u.name)}${u.bot?' <span class="badge">BOT</span>':''}</b><small>${esc(u.customStatus||u.about||'')}</small></div>${un?`<span class="mb ch" style="padding:0;background:none"><span class="mb">${un.m||un.n}</span></span>`:''}</div>`});
    h+='</div>'}
  else{
    const lvl=boostLevel(s),ban=lvl>=2&&(s.bannerImg||s.bannerColor);
    h=`<div class="shead" data-act="serverMenu"><span>${esc(s.name)}</span><span>▾</span></div>${ban?`<div class="sbanner" style="background:${s.bannerImg?`url(${s.bannerImg})`:s.bannerColor};background-size:cover;background-position:center"></div>`:''}<div class="chs">`;
    const chRow=c=>{const u=S.unread[c.id],on=V.channel===c.id&&!V.dm;
      let r=`<div class="ch ${on?'active':''} ${u&&u.n?'unread':''}" data-act="openCh" data-a="${c.id}" data-ctx="channel"><span class="ico">${c.type==='voice'?'🔊':'#'}</span><span class="nm">${esc(c.name)}</span>${u&&u.m?`<span class="mb">${u.m}</span>`:''}${perm(s,'me','MANAGE_CHANNELS')?`<span class="x" data-act="editCh" data-a="${c.id}" title="Edit">⚙️</span>`:''}</div>`;
      if(c.type==='voice'){const ids=[...(s.voiceUsers[c.id]||[])];if(V.voice&&V.voice.cid===c.id)ids.unshift('me');if(ids.length)r+=`<div class="vusers">${ids.map(i=>{const u=getUser(i);return u?`<div class="vu" data-vu="${i}">${av(u,22)}<span>${esc(dispName(u,s))}</span></div>`:''}).join('')}</div>`}
      return r};
    s.channels.filter(c=>!c.cat||!s.categories.some(k=>k.id===c.cat)).forEach(c=>h+=chRow(c));
    s.categories.forEach(k=>{const col=V.collapsed[k.id];h+=`<div class="cat" data-act="toggleCat" data-a="${k.id}"><span>${col?'▸':'▾'} ${esc(k.name)}</span>${perm(s,'me','MANAGE_CHANNELS')?`<b data-act="newCh" data-a="${k.id}" title="Create Channel">+</b>`:''}</div>`;s.channels.filter(c=>c.cat===k.id).forEach(c=>{if(!col||V.channel===c.id||(S.unread[c.id]&&S.unread[c.id].n))h+=chRow(c)})});
    h+='</div>'}
  el.innerHTML=h+voicePanel()+userPanel()}
function boostLevel(s){return s.boosts>=14?3:s.boosts>=7?2:s.boosts>=2?1:0}

/* ---------- render: members ---------- */
function renderMembers(){
  const el=$('#members'),s=curServer();
  if(!s||!V.members||V.dm){el.style.display='none';return}el.style.display='';
  const groups=[],placed=new Set(),ids=Object.keys(s.members).filter(i=>getUser(i));
  const st=i=>{const u=getUser(i);return u.status==='invisible'||u.status==='offline'?'offline':'on'};
  s.roles.filter(r=>r.hoist).forEach(r=>{const l=ids.filter(i=>!placed.has(i)&&st(i)==='on'&&topRole(s,i,true)&&topRole(s,i,true).id===r.id);l.forEach(i=>placed.add(i));if(l.length)groups.push([r.name,l])});
  const on=ids.filter(i=>!placed.has(i)&&st(i)==='on'),off=ids.filter(i=>st(i)==='offline');
  if(on.length)groups.push(['Online',on]);if(off.length)groups.push(['Offline',off]);
  el.innerHTML=groups.map(([n,l])=>`<div class="mgt">${esc(n)} — ${l.length}</div>`+l.map(i=>{const u=getUser(i),r=topRole(s,i);return`<div class="mem ${st(i)==='offline'?'off':''}" data-act="profile" data-a="${i}" data-ctx="member">${av(u,32,true)}<div class="t"><b class="${u.plus?'plusname':''}" ${r&&!u.plus?`style="color:${r.color}"`:''}>${esc(dispName(u,s))}${u.bot?' <span class="badge">BOT</span>':''}</b>${u.customStatus?`<small>${esc(u.customStatus)}</small>`:''}</div></div>`}).join('')).join('')}

/* ---------- render: main ---------- */
function renderTop(){
  const el=$('#top');if(!el)return;const s=curServer(),c=curChannel(),d=curDm();let t;
  const ham='<button class="ib hamb" data-act="navToggle">☰</button>';
  if(d){const u=getUser(d.user);t=`${ham}<span style="color:var(--muted);font-size:20px">@</span>${esc(u.name)} ${badges(u)}<span class="sp"></span><button class="ib" data-act="pins" title="Pinned">📌</button><button class="ib" data-act="profile" data-a="${u.id}" title="Profile">👤</button>`}
  else if(c){t=`${ham}<span style="color:var(--muted);font-size:22px">${c.type==='voice'?'🔊':'#'}</span>${esc(c.name)}${c.topic?`<span class="tp">${esc(c.topic)}</span>`:''}<span class="sp"></span><button class="ib" data-act="pins" title="Pinned Messages">📌</button><button class="ib" data-act="toggleMembers" title="Member List">👥</button><input class="search" id="search" placeholder="Search" autocomplete="off">`}
  else t=ham;
  el.innerHTML=t}
function renderMain(){
  const m=$('#main'),s=curServer(),c=curChannel();
  if(!s&&!V.dm){
    m.innerHTML=`<div class="top" id="top"><button class="ib hamb" data-act="navToggle">☰</button><span style="font-size:20px">👥</span>Friends<span style="border-left:1px solid var(--line);height:24px"></span><div class="tabs2">${[['online','Online'],['all','All'],['pending','Pending'+(S.pending.length?` (${S.pending.length})`:'')],['blocked','Blocked']].map(([k,l])=>`<button class="${V.ftab===k?'on':''}" data-act="ftab" data-a="${k}">${l}</button>`).join('')}<button class="add" data-act="addFriend">Add Friend</button></div></div><div class="friends" id="friends"></div>`;renderFriends();return}
  if(c&&c.type==='voice'&&!V.dm){renderVoiceView();return}
  const key=convKey(),ph=V.dm?`Message @${getUser(curDm().user).name}`:`Message #${c?c.name:''}`;
  m.innerHTML=`<div class="top" id="top"></div><div id="msgs"></div><div id="typing"></div><div id="composer"><div id="replybar" style="display:none"></div><div id="suggest" style="display:none"></div><div class="cbox"><label class="cbtn" title="Upload an image">⊕<input type="file" id="file" accept="image/*" hidden></label><textarea id="input" rows="1" placeholder="${esc(ph)}" autocomplete="off"></textarea><button class="cbtn" data-act="emojiPick" title="Emoji">😀</button><button class="cbtn" data-act="send" title="Send">➤</button></div><div id="attprev"></div><span class="cnt" id="cnt"></span></div>`;
  renderTop();renderMsgs(true);renderTyping();renderReply();renderAtt();
  const inp=$('#input');inp.value=V.drafts[key]||'';autosize(inp);
  if(innerWidth>860)inp.focus()}
function renderVoiceView(){
  const s=curServer(),c=curChannel(),joined=V.voice&&V.voice.cid===c.id,ids=[...(s.voiceUsers[c.id]||[])];if(joined)ids.unshift('me');
  $('#main').innerHTML=`<div class="top" id="top"></div><div class="vgrid">${ids.length?ids.map(i=>{const u=getUser(i);return`<div class="vtile" data-vu="${i}">${av(u,64)}<b>${esc(dispName(u,s))}</b><small>${i==='me'&&V.muted?'🔇 ':''}${esc(dispName(u,s))}</small></div>`}).join(''):`<div class="empty"><h2 style="color:var(--text)">No one's here yet</h2>Be the first to join ${esc(c.name)}.</div>`}</div><div class="vbar">${joined?`<button class="btn ${V.muted?'danger':''}" data-act="mute">${V.muted?'🔇':'🎤'}</button><button class="btn ${V.deaf?'danger':''}" data-act="deafen">${V.deaf?'🔕':'🎧'}</button><button class="btn" data-act="camTest">📷</button><button class="btn" data-act="shareScreen">🖥️</button><button class="btn" data-act="soundboard">🔊</button><button class="btn danger" data-act="leaveVoice">📞</button>`:`<button class="btn green" style="width:auto;border-radius:8px;padding:0 24px" data-act="joinVoice" data-a="${c.id}">Join Voice</button>`}</div>`;
  renderTop()}
function renderFriends(){
  const el=$('#friends');if(!el)return;let h='';
  const row=(u,btns)=>`<div class="frow" data-ctx="member" data-a="${u.id}">${av(u,36,true)}<div class="t"><b>${esc(u.name)}</b><small>${esc(u.customStatus||(u.status==='offline'?'Offline':u.status))}</small></div>${btns}</div>`;
  if(V.ftab==='pending'){const l=S.pending;h=l.length?l.map(p=>{const u=getUser(p.id);return row(u,p.dir==='in'?`<button class="btn green sm" data-act="acceptFr" data-a="${u.id}">Accept</button><button class="btn sm" data-act="declineFr" data-a="${u.id}">Ignore</button>`:`<span class="sub">Outgoing request</span><button class="btn sm" data-act="declineFr" data-a="${u.id}">Cancel</button>`)}).join(''):'<div class="empty">No pending requests. Add a friend by username!</div>'}
  else if(V.ftab==='blocked'){h=S.blocked.length?S.blocked.map(i=>row(getUser(i),`<button class="btn sm" data-act="unblock" data-a="${i}">Unblock</button>`)).join(''):'<div class="empty">You haven\'t blocked anyone.</div>'}
  else{const l=S.friends.filter(i=>V.ftab==='all'||(getUser(i).status!=='offline'&&getUser(i).status!=='invisible'));h=`<div class="mgt" style="padding-left:0">${V.ftab==='all'?'All friends':'Online'} — ${l.length}</div>`+(l.length?l.map(i=>row(getUser(i),`<button class="ib" data-act="msgUser" data-a="${i}" title="Message">💬</button><button class="ib" data-act="profile" data-a="${i}" title="Profile">👤</button>`)).join(''):'<div class="empty">Nobody is around. Try the All tab or add a friend.</div>')}
  el.innerHTML=h}

/* ---------- messages ---------- */
function msgHtml(m,prev,list){
  const s=curServer(),u=getUser(m.a)||{id:'?',name:'Deleted User',color:'#777'};
  if(m.sys)return`<div class="sysmsg" data-id="${m.id}">ℹ️ <span>${fmt(m.t)}</span></div>`;
  const re=m.re&&list.find(x=>x.id===m.re),ru=re&&getUser(re.a);
  const grp=prev&&!prev.sys&&prev.a===m.a&&!m.re&&m.ts-prev.ts<42e4&&new Date(prev.ts).getDate()===new Date(m.ts).getDate();
  const plus=u.id==='me'?S.me.plus:false,mine=m.a==='me';
  const canDel=mine||(s?perm(s,'me','MANAGE_MESSAGES'):false),canPin=s?perm(s,'me','MANAGE_MESSAGES'):true;
  const emojiOnly=m.t&&/^(\p{Extended_Pictographic}️?\s*){1,3}$/u.test(m.t);
  const body=V.edit===m.id?`<textarea class="input" id="editbox" rows="2" style="margin-top:4px">${esc(m.t)}</textarea><div class="sub" style="font-size:12px;margin-top:4px">Enter to <a href="#" data-act="saveEdit">save</a> • Esc to <a href="#" data-act="cancelEdit">cancel</a></div>`:`<div class="tx ${emojiOnly?'big-emoji':''}">${fmt(m.t||'',plus)}${m.ed?' <span class="edited">(edited)</span>':''}</div>`;
  let ex='';
  if(m.img)ex+=`<img class="att" src="${m.img}" alt="attachment" data-act="zoom">`;
  if(m.poll){const tot=m.poll.options.reduce((a,o)=>a+o.v.length,0);ex+=`<div class="embed poll"><h4>📊 ${esc(m.poll.q)}</h4>${m.poll.options.map((o,i)=>`<div class="opt ${o.v.includes('me')?'mine':''}" data-act="vote" data-a="${m.id}" data-b="${i}"><i style="width:${tot?Math.round(o.v.length/tot*100):0}%"></i><span>${esc(o.t)}</span><span>${o.v.length}</span></div>`).join('')}<div class="sub">${tot} vote${tot===1?'':'s'}</div></div>`}
  if(m.embed)ex+=`<div class="embed"><h4>${esc(m.embed.title)}</h4><div>${fmt(m.embed.desc)}</div>${m.embed.bar?'<div class="bar"><i></i></div>':''}</div>`;
  const rx=Object.entries(m.rx||{}).filter(([k,v])=>v.length);
  const rxh=rx.length?`<div class="rxs">${rx.map(([k,v])=>`<button class="rx ${v.includes('me')?'mine':''}" data-act="react" data-a="${m.id}" data-b="${esc(k)}">${emoHtml(k)}<span>${v.length}</span></button>`).join('')}<button class="rx" data-act="reactPick" data-a="${m.id}">＋</button></div>`:'';
  const acts=`<div class="acts"><button class="ib" data-act="reactPick" data-a="${m.id}" title="Add reaction">😀</button>${S.me.plus?`<button class="ib" data-act="superReact" data-a="${m.id}" title="Super reaction (Plus)">💥</button>`:''}<button class="ib" data-act="reply" data-a="${m.id}" title="Reply">↩️</button>${mine?`<button class="ib" data-act="edit" data-a="${m.id}" title="Edit">✏️</button>`:''}${canPin?`<button class="ib" data-act="pin" data-a="${m.id}" title="${m.pin?'Unpin':'Pin'}">📌</button>`:''}${canDel?`<button class="ib" data-act="del" data-a="${m.id}" title="Delete">🗑️</button>`:''}</div>`;
  const cls=`msg ${grp?'':'first'} ${mentionsMe(m)&&!mine?'mine-mention':''}`;
  const reply=re?`<div class="replyp" data-act="jumpMsg" data-a="${re.id}">${av(ru,16)}<b>${esc(ru?dispName(ru,s):'?')}</b><span>${esc((re.t||'📎 attachment').slice(0,80))}</span></div>`:m.re?`<div class="replyp"><i>Original message was deleted</i></div>`:'';
  if(grp)return`<div class="${cls}" data-id="${m.id}" data-ctx="msg"><span class="gts">${fmtTime(m.ts,1)}</span>${body}${ex}${rxh}${acts}</div>`;
  return`<div class="${cls}" data-id="${m.id}" data-ctx="msg">${reply}<div class="mav" data-act="profile" data-a="${u.id}">${av(u,40)}</div><div class="mh">${nameHtml(u,s)} ${badges(u)}<span class="ts">${fmtTime(m.ts)}</span>${m.pin?'<span class="pinbadge">📌</span>':''}</div>${body}${ex}${rxh}${acts}</div>`}
function renderMsgs(stick){
  const box=$('#msgs');if(!box)return;const key=convKey(),list=(S.messages[key]||[]).filter(m=>!S.blocked.includes(m.a)),c=curChannel(),d=curDm();
  const atB=box.scrollHeight-box.scrollTop-box.clientHeight<90;const ev=$('#editbox')?$('#editbox').value:null;
  const head=d?`<div class="welcome">${av(getUser(d.user),80)}<h1>${esc(getUser(d.user).name)}</h1><p>This is the beginning of your direct message history with <b>${esc(getUser(d.user).name)}</b>.</p></div>`:c?`<div class="welcome"><div class="big">#</div><h1>Welcome to #${esc(c.name)}!</h1><p>This is the start of the #${esc(c.name)} channel.${c.topic?' '+esc(c.topic):''}</p></div>`:'';
  box.innerHTML=head+list.map((m,i)=>msgHtml(m,list[i-1],list)).join('');
  const eb=$('#editbox');if(eb){if(ev!=null)eb.value=ev;eb.focus();eb.setSelectionRange(eb.value.length,eb.value.length)}
  if(stick||atB)box.scrollTop=box.scrollHeight}
function renderTyping(){const el=$('#typing');if(!el)return;const l=(V.typing[convKey()]||[]);el.textContent=l.length?(l.length>2?'Several people are typing…':l.join(' and ')+(l.length>1?' are':' is')+' typing…'):''}
function renderReply(){const el=$('#replybar');if(!el)return;if(V.reply){const m=(S.messages[convKey()]||[]).find(x=>x.id===V.reply);if(m){el.style.display='flex';el.innerHTML=`<span>Replying to <b>${esc(getUser(m.a).name)}</b></span><b style="cursor:pointer" data-act="cancelReply">✕</b>`;return}}el.style.display='none'}
function renderAtt(){const el=$('#attprev');if(!el)return;el.innerHTML=V.att?`<div class="p"><img src="${V.att}" alt=""><button data-act="rmAtt">✕</button></div>`:''}
function renderAll(){renderRail();renderSide();renderMain();renderMembers()}
function refreshApp(){renderRail();renderSide();renderMembers();renderTop();renderMsgs()}
function applyTheme(){let th=S.set.theme;const meta=THEMES.find(t=>t[0]===th);if(meta&&meta[3]&&!S.me.plus){th='dark';S.set.theme='dark'}document.body.dataset.theme=th;document.documentElement.style.setProperty('--accent',S.set.accent);document.documentElement.style.setProperty('--fs',S.set.font+'px');document.body.classList.toggle('compact',S.set.density==='compact');document.body.classList.toggle('reduce',!!S.set.reduceMotion)}

/* ---------- navigation ---------- */
function saveDraft(){const i=$('#input');if(i)V.drafts[convKey()]=i.value}
function clearUnread(k){if(S.unread[k]){delete S.unread[k]}}
function go(sid,cid,did){saveDraft();V.server=sid;V.dm=did||null;V.reply=null;V.edit=null;V.att=null;
  if(sid==='home'){V.channel=null}else{const s=S.servers.find(x=>x.id===sid);V.channel=cid||(S.last['s'+sid])||(s.channels.find(c=>c.type==='text')||s.channels[0]).id;if(!s.channels.find(c=>c.id===V.channel))V.channel=s.channels[0].id;S.last['s'+sid]=V.channel;S.last.server=sid;S.last.channel=V.channel}
  clearUnread(convKey());document.getElementById('app').classList.remove('nav-open');renderAll();save()}
function jumpTo(sid,cid,mid,did){go(sid,cid,did);setTimeout(()=>{const el=$(`.msg[data-id="${mid}"]`);if(el){el.scrollIntoView({block:'center'});el.classList.add('hl');setTimeout(()=>el.classList.remove('hl'),2200)}},60)}

/* ---------- sending ---------- */
function push(key,msg){(S.messages[key]=S.messages[key]||[]).push(msg);if(S.messages[key].length>400)S.messages[key].shift();
  if(convKey()===key){renderMsgs(msg.a==='me')}else if(msg.a!=='me'){const u=S.unread[key]||{n:0,m:0};u.n++;const dm=S.dms.find(d=>d.id===key);if(dm||mentionsMe(msg))u.m++;S.unread[key]=u;renderRail();renderSide();if(S.set.sounds&&(!S.set.mentionsOnly||mentionsMe(msg)||dm))tone([[880,.08],[1175,.12]])}
  save()}
function sysMsg(key,t){push(key,{id:uid(),a:'sys',t,ts:now(),sys:1,rx:{}})}
function typingFor(key,name,ms,fn){const l=V.typing[key]=V.typing[key]||[];l.push(name);renderTyping();setTimeout(()=>{const i=l.indexOf(name);if(i>=0)l.splice(i,1);renderTyping();fn()},ms)}
function botSay(key,botId,payload,delay){const u=S.users[botId];typingFor(key,u.name,delay||700,()=>push(key,Object.assign({id:uid(),a:botId,ts:now(),rx:{}},typeof payload==='string'?{t:payload}:payload)))}
function sendMsg(text,img){
  const key=convKey(),s=curServer(),lim=S.me.plus?4000:2000;text=(text||'').trim();if(!text&&!img)return false;
  if(text.length>lim){toast(`Message too long (max ${lim}). ${S.me.plus?'':'Roblink Plus raises it to 4,000.'}`,'err');return false}
  if(s){if(!perm(s,'me','SEND')){toast('You do not have permission to send messages in this channel.','err');return false}if(s.members.me.timeout>now()){toast('You are timed out and cannot send messages.','err');return false}if(img&&!perm(s,'me','ATTACH')){toast('You cannot attach files here.','err');return false}}
  const msg={id:uid(),a:'me',t:text,ts:now(),rx:{}};if(V.reply){msg.re=V.reply;V.reply=null;renderReply()}if(img)msg.img=img;
  const isCmd=text[0]==='/'&&/^\/[a-z0-9]+/i.test(text);
  if(isCmd&&builtin(text,key,s))return true;
  push(key,msg);
  if(isCmd)botCmd(text,key,s);
  if(s&&s.automod.on&&s.bots.includes('modbot')&&s.automod.words.some(w=>w&&text.toLowerCase().includes(w.toLowerCase()))){setTimeout(()=>{const l=S.messages[key],i=l.findIndex(x=>x.id===msg.id);if(i>=0){l.splice(i,1);renderMsgs();botSay(key,'modbot',`🚫 **${esc(S.me.name)}**, that message was removed by auto-moderation.`,300)}},400)}
  if(s)npcFollow(key,s,text,msg);else if(V.dm)npcDm(curDm().user,key,text);
  return true}
function builtin(text,key,s){
  const [c,...r]=text.slice(1).split(' '),cmd=c.toLowerCase(),arg=r.join(' ').trim();
  if(cmd==='help'){const inst=s?s.bots:(curDm()&&S.users[curDm().user].bot?[curDm().user]:[]);let t='**Built-in:** `/help` `/me` `/shrug` `/nick` `/spoiler`\n';inst.forEach(b=>{t+=`**${BOTS[b].name}:** `+Object.values(BOTS[b].cmds).map(x=>'`'+x.split(' –')[0]+'`').join(' ')+'\n'});sysMsg(key,t);return true}
  if(cmd==='me'){push(key,{id:uid(),a:'me',t:'*'+(arg||'waves')+'*',ts:now(),rx:{}});return true}
  if(cmd==='shrug'){push(key,{id:uid(),a:'me',t:(arg?arg+' ':'')+'¯\\_(ツ)_/¯',ts:now(),rx:{}});return true}
  if(cmd==='spoiler'){push(key,{id:uid(),a:'me',t:'||'+arg+'||',ts:now(),rx:{}});return true}
  if(cmd==='nick'){if(!s){sysMsg(key,'`/nick` only works inside a server.');return true}s.members.me.nick=arg;sysMsg(key,arg?`Your nickname in **${esc(s.name)}** is now **${esc(arg)}**.`:'Nickname cleared.');refreshApp();return true}
  return false}
function botCmd(text,key,s){
  const [c,...r]=text.slice(1).split(' '),cmd=c.toLowerCase(),arg=r.join(' ').trim();
  let bots=s?s.bots:(curDm()&&S.users[curDm().user].bot?[curDm().user]:[]);const b=bots.find(id=>BOTS[id].cmds[cmd]);
  if(!b){setTimeout(()=>sysMsg(key,`No bot here handles \`/${esc(cmd)}\`. ${s?'Add one in Server Settings → Bots, or':''} Type \`/help\`.`),200);return}
  const say=(p,d)=>botSay(key,b,p,d);
  switch(cmd){
    case'roll':{const m=/^(\d*)d(\d+)$/i.exec(arg||'1d6');if(!m)return say('Use the format `/roll 2d20`.');const n=Math.min(+m[1]||1,20),f=Math.max(2,Math.min(+m[2],1000)),rs=Array.from({length:n},()=>rnd(1,f));return say(`🎲 You rolled **${n}d${f}**: [${rs.join(', ')}] = **${rs.reduce((a,b)=>a+b,0)}**`)}
    case'coinflip':return say(`🪙 It's **${Math.random()<.5?'Heads':'Tails'}**!`);
    case'8ball':if(!arg)return say('Ask me a question! `/8ball will I win?`');return say(`🎱 *${esc(arg)}*\n**${pick(['It is certain.','Without a doubt.','Yes – definitely.','Most likely.','Reply hazy, try again.','Ask again later.','Don\'t count on it.','My sources say no.','Very doubtful.','Outlook good.'])}**`);
    case'joke':return say(pick(['Why did the obby player cross the road? To get to the next checkpoint.','I would tell you a Lua joke, but it\'s 1-indexed and I\'d be off by one.','Why do builders make bad secret agents? They always leave blocks behind.','There are 10 kinds of people: those who understand binary and those who don\'t.']));
    case'fact':return say('💡 '+pick(['Honey never spoils – edible honey was found in ancient tombs.','Octopuses have three hearts.','A day on Venus is longer than its year.','Bananas are berries, but strawberries are not.','The first computer bug was a real moth.']));
    case'poll':{const p=arg.split('|').map(x=>x.trim()).filter(Boolean);if(p.length<3||p.length>6)return say('Usage: `/poll Question | Option A | Option B` (2–5 options)');return say({poll:{q:p[0],options:p.slice(1).map(t=>({t,v:[]}))},t:''},500)}
    case'purge':{const n=Math.min(parseInt(arg)||0,50);if(!s||!perm(s,'me','MANAGE_MESSAGES'))return say('⛔ You need the **Manage Messages** permission.');if(n<1)return say('Usage: `/purge 10`');const cname=(curChannel()||{}).name||'channel';setTimeout(()=>{const l=S.messages[key];l.splice(Math.max(0,l.length-n),n);audit(s,`purged ${n} messages in #${cname}`);renderMsgs();say(`🧹 Deleted up to **${n}** messages.`,300)},500);return}
    case'warn':{if(!s||!(perm(s,'me','KICK')||perm(s,'me','TIMEOUT')))return say('⛔ You need a moderation permission.');if(!arg)return say('Usage: `/warn @user reason`');audit(s,'warned a member');return say(`⚠️ ${fmt(arg.split(' ')[0])} has been warned. ${esc(arg.split(' ').slice(1).join(' ')||'')}`)}
    case'play':if(!arg)return say('Tell me what to play: `/play lofi beats`');QUEUE.push(arg);return say({t:'',embed:{title:'🎵 Now playing',desc:'**'+esc(arg)+'**\nRequested by '+esc(S.me.name),bar:1}},600);
    case'queue':return say({t:'',embed:{title:'📜 Queue',desc:QUEUE.length?QUEUE.map((q,i)=>`${i+1}. ${esc(q)}`).join('\n'):'The queue is empty.'}});
    case'skip':QUEUE.shift();return say('⏭️ Skipped!')}}
const QUEUE=[];
/* NPC behaviour */
const REPL=[[/\b(hi|hello|hey|yo|sup)\b/i,['hey! 👋','yo what\'s up','hello hello!']],[/\?$/,['hmm good question, not sure tbh','probably yeah','let me think about that 🤔']],[/\b(thanks|thx|ty)\b/i,['no problem!','anytime 😄']],[/\b(roblink|plus|nitro)\b/i,['this app is really smooth honestly','Plus themes look so good']],[/\b(lol|haha|lmao)\b/i,['😂','lmaooo']],[/./,['nice!','for real','haha yeah','interesting 👀','agreed','tell me more','ok that\'s actually cool']]];
function npcDm(uidd,key,text){const u=S.users[uidd];if(!u||u.bot||S.blocked.includes(uidd))return;const r=REPL.find(x=>x[0].test(text));setTimeout(()=>typingFor(key,u.name,rnd(900,2200),()=>push(key,{id:uid(),a:uidd,t:pick(r[1]),ts:now(),rx:{}})),rnd(400,900))}
function npcFollow(key,s,text,msg){
  const ppl=Object.keys(s.members).filter(i=>i!=='me'&&!S.users[i].bot&&S.users[i].status!=='offline'&&!(s.members[i].timeout>now()));if(!ppl.length)return;
  if(Math.random()<.4)setTimeout(()=>{const m=(S.messages[key]||[]).find(x=>x.id===msg.id);if(m){const e=pick(['👍','😂','🔥','❤️','🎉']);(m.rx[e]=m.rx[e]||[]).push(pick(ppl));renderMsgs()}},rnd(1500,4000));
  const ment=Object.values(S.users).find(u=>!u.bot&&s.members[u.id]&&new RegExp('@'+u.username+'\\b','i').test(text));
  if(ment&&ment.status!=='offline')setTimeout(()=>typingFor(key,ment.name,1400,()=>push(key,{id:uid(),a:ment.id,t:pick(['you called? 👋','yep, what\'s up?','👀','haha hi!']),ts:now(),re:msg.id,rx:{}})),900)}
function npcTick(){
  if(document.hidden)return;const cands=S.servers.filter(s=>s.id!=='x');const s=pick(cands);
  const ppl=Object.keys(s.members).filter(i=>i!=='me'&&!S.users[i].bot&&S.users[i].status!=='offline'&&!S.blocked.includes(i)&&!(s.members[i].timeout>now()));if(!ppl.length)return;
  const txt=s.channels.filter(c=>c.type==='text'&&perm(s,'me','SEND')!==undefined);const gen=txt.find(c=>c.name==='general')||txt[0];const ch=Math.random()<.7?gen:pick(txt);if(!ch)return;
  const who=S.users[pick(ppl)];let t=pick(CHAT);if(Math.random()<.12)t=`@${S.me.username} ${pick(['hey, are you around?','check this out!','welcome!','what do you think?'])}`;
  const emo=s.emojis.length&&Math.random()<.2?` :${pick(s.emojis).name}:`:'';
  typingFor(ch.id,who.name,rnd(1200,2600),()=>push(ch.id,{id:uid(),a:who.id,t:t+emo,ts:now(),rx:{}}))}
