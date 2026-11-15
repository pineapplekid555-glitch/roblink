/* Roblink voice: WebRTC mesh over Supabase Realtime broadcast (best for small rooms, ~6 people). */
const VC={ch:null,peers:{},local:null,rooms:{}};
const ICE={iceServers:[{urls:'stun:stun.l.google.com:19302'}]};
async function vcJoin(cid){await vcLeave();
 try{VC.local=await navigator.mediaDevices.getUserMedia({audio:{noiseSuppression:S.me.set?.noiseSup!==false,echoCancellation:true}})}catch(e){return toast('Microphone blocked or unavailable.','err')}
 VC.cid=cid;VC.ch=sb.channel('voice:'+cid,{config:{broadcast:{self:false},presence:{key:MYID}}});
 VC.ch.on('broadcast',{event:'sig'},({payload:p})=>{if(p.to===MYID)vcSig(p)});
 VC.ch.on('presence',{event:'join'},({key})=>{if(key!==MYID&&MYID>key)vcCall(key)}); // higher id initiates
 VC.ch.on('presence',{event:'leave'},({key})=>vcDrop(key));
 await new Promise(r=>VC.ch.subscribe(s=>{if(s==='SUBSCRIBED'){VC.ch.track({t:Date.now()});r()}}));
 const st=VC.ch.presenceState();Object.keys(st).forEach(k=>{if(k!==MYID&&MYID>k)vcCall(k)});vcMute()}
function vcPeer(id){if(VC.peers[id])return VC.peers[id];const pc=new RTCPeerConnection(ICE);VC.local.getTracks().forEach(t=>pc.addTrack(t,VC.local));
 pc.onicecandidate=e=>e.candidate&&vcSend(id,{ice:e.candidate});
 pc.ontrack=e=>{let a=document.getElementById('va_'+id);if(!a){a=document.createElement('audio');a.id='va_'+id;a.autoplay=true;document.body.appendChild(a)}a.srcObject=e.streams[0];a.volume=V.deaf?0:(S.me.set?.spk??100)/100;vcMeter(id,e.streams[0])};
 return VC.peers[id]=pc}
const vcSend=(to,p)=>VC.ch&&VC.ch.send({type:'broadcast',event:'sig',payload:Object.assign({to,from:MYID},p)});
async function vcCall(id){const pc=vcPeer(id);const o=await pc.createOffer();await pc.setLocalDescription(o);vcSend(id,{sdp:pc.localDescription})}
async function vcSig(p){const pc=vcPeer(p.from);if(p.sdp){await pc.setRemoteDescription(p.sdp);if(p.sdp.type==='offer'){const a=await pc.createAnswer();await pc.setLocalDescription(a);vcSend(p.from,{sdp:pc.localDescription})}}else if(p.ice){try{await pc.addIceCandidate(p.ice)}catch(e){}}}
function vcDrop(id){const pc=VC.peers[id];if(pc){pc.close();delete VC.peers[id]}const a=document.getElementById('va_'+id);if(a)a.remove()}
function vcMute(){if(VC.local)VC.local.getAudioTracks().forEach(t=>t.enabled=!(V.muted||V.deaf));$$('audio[id^=va_]').forEach(a=>a.volume=V.deaf?0:(S.me.set?.spk??100)/100)}
function vcMeter(id,stream){try{const c=new AudioContext(),an=c.createAnalyser();c.createMediaStreamSource(stream).connect(an);const d=new Uint8Array(an.frequencyBinCount);(function f(){if(!VC.peers[id])return c.close();an.getByteFrequencyData(d);const v=d.reduce((a,b)=>a+b,0)/d.length>12;document.querySelectorAll('[data-uid="'+id+'"]').forEach(e=>e.classList.toggle('speaking',v));requestAnimationFrame(f)})()}catch(e){}}
async function vcLeave(){Object.keys(VC.peers).forEach(vcDrop);if(VC.local){VC.local.getTracks().forEach(t=>t.stop());VC.local=null}if(VC.ch){await VC.ch.unsubscribe();VC.ch=null}}
