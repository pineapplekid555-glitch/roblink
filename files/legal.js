/* ============ Legal: age + Terms acceptance gate, links ============ */
function showTosGate(user){
  if(document.getElementById('tosgate'))return;
  const d=document.createElement('div');d.id='tosgate';
  d.style.cssText='position:fixed;inset:0;z-index:470;background:var(--bg0);display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto';
  d.innerHTML=`<div class="modal" style="max-width:460px;width:100%;padding:24px"><h2 style="margin:0 0 6px">Quick update to our rules</h2><p class="sub">We've added Terms of Service, a Privacy Policy and Community Guidelines. Please confirm your age and agree to continue.</p>
  <label class="lbl">Date of birth <span class="sub">(only used to check your age – we don't store it)</span></label><input class="input" id="tdob" type="date" max="${new Date().toISOString().slice(0,10)}">
  <label style="display:flex;gap:8px;align-items:flex-start;margin-top:12px;font-size:13px"><input type="checkbox" id="ttos" style="margin-top:3px"><span>I am <b>13 or older</b> (if I'm under 18, my parent or guardian has agreed to this), and I agree to the <a href="terms.html" target="_blank">Terms of Service</a>, <a href="privacy.html" target="_blank">Privacy Policy</a> and <a href="guidelines.html" target="_blank">Community Guidelines</a>.</span></label>
  <div style="display:flex;gap:8px;margin-top:16px"><button class="btn ghost" id="tout">Log out</button><span style="flex:1"></span><button class="btn primary" id="tok">Agree &amp; continue</button></div></div>`;
  document.body.appendChild(d);
  document.getElementById('tout').onclick=()=>{d.remove();(A.logout2||A.logout)()};
  document.getElementById('tok').onclick=async()=>{
    const ag=ageGroup(document.getElementById('tdob').value);
    if(ag==='none')return toast('Please enter your date of birth.','err');
    if(ag==='under13'){try{localStorage.setItem('roblink_u13',String(Date.now()))}catch(x){}toast('Roblink is for people aged 13 and over, so we can\'t keep this account active. Please ask a parent or guardian if you have questions.','err');d.remove();return(A.logout2||A.logout)()}
    if(!document.getElementById('ttos').checked)return toast('Please tick the box to agree.','err');
    const r=await sb.auth.updateUser({data:{tos_version:TOS_VER,tos_accepted_at:new Date().toISOString(),age_group:ag}});
    if(r.error)return toast(errMsg(r.error),'err');d.remove();toast('Thanks!')}}
const _ss7=startSession;
startSession=async function(u){const r=await _ss7.apply(this,arguments);try{const md=(u&&u.user_metadata)||{};if(md.tos_version!==TOS_VER)showTosGate(u)}catch(e){}return r};
const _sa7=secAccount;
secAccount=function(){return _sa7()+`<h3>Legal &amp; safety</h3><p class="sub">Roblink is for people aged 13 and over.</p><p><a href="terms.html" target="_blank">Terms of Service</a> • <a href="privacy.html" target="_blank">Privacy Policy</a> • <a href="guidelines.html" target="_blank">Community Guidelines &amp; Safety</a></p>`};
