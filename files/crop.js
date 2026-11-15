/* Roblink image cropper: cropImage(file,{w,h,round,maxKB,keepGif}) -> Promise<dataURL|null> */
function cropImage(file,o){o=Object.assign({w:256,h:256,round:false,keepGif:false},o||{});
return new Promise(res=>{
 const rd=new FileReader();rd.onload=()=>{
  if(file.type==='image/gif'&&o.keepGif&&file.size<2.5e6)return res(rd.result); // Plus: animated GIFs kept as-is
  const img=new Image();img.onload=()=>{
   const vw=Math.min(380,innerWidth-80),vh=Math.round(vw*o.h/o.w);let z=1,ox=0,oy=0;const base=Math.max(vw/img.width,vh/img.height);
   const b=modal({title:'Crop image',sub:'Drag to move, slider to zoom.',body:`<div class="cropwrap"><canvas id="cc" width="${vw}" height="${vh}"></canvas><input id="cz" type="range" min="1" max="4" step="0.01" value="1" style="width:${vw}px"></div>`,
    btns:[{label:'Cancel',cls:'ghost',fn:()=>{res(null)}},{label:'Use image',cls:'primary',fn:()=>{const out=document.createElement('canvas');out.width=o.w;out.height=o.h;draw(out,out.width/vw);
     let q=.9,d=out.toDataURL('image/jpeg',q);while(o.maxKB&&d.length/1.37>o.maxKB*1024&&q>.4){q-=.1;d=out.toDataURL('image/jpeg',q)}res(d)}}]});
   const c=$('#cc',b),x=c.getContext('2d');
   function clamp(){const s=base*z;ox=Math.min(0,Math.max(vw-img.width*s,ox));oy=Math.min(0,Math.max(vh-img.height*s,oy))}
   function draw(cv,k){const g=cv.getContext('2d'),s=base*z*k;g.fillStyle='#000';g.fillRect(0,0,cv.width,cv.height);g.drawImage(img,ox*k,oy*k,img.width*s,img.height*s);if(cv===c&&o.round){g.save();g.globalCompositeOperation='destination-in';g.restore()}}
   function paint(){clamp();draw(c,1);if(o.round){x.save();x.strokeStyle='rgba(255,255,255,.8)';x.lineWidth=2;x.beginPath();x.ellipse(vw/2,vh/2,vw/2-2,vh/2-2,0,0,7);x.stroke();x.restore()}}
   ox=(vw-img.width*base)/2;oy=(vh-img.height*base)/2;paint();
   let d=null;c.onpointerdown=e=>{d=[e.clientX-ox,e.clientY-oy];c.setPointerCapture(e.pointerId)};c.onpointermove=e=>{if(d){ox=e.clientX-d[0];oy=e.clientY-d[1];paint()}};c.onpointerup=()=>d=null;
   $('#cz',b).oninput=e=>{const cx=vw/2-ox,cy=vh/2-oy,old=z;z=+e.target.value;ox=vw/2-cx*z/old;oy=vh/2-cy*z/old;paint()};
   new MutationObserver((_,ob)=>{if(!document.body.contains(b)){res(null);ob.disconnect()}}).observe(document.body,{childList:true});
  };img.onerror=()=>res(null);img.src=rd.result};rd.onerror=()=>res(null);rd.readAsDataURL(file)})}
/* pick file then crop */
const CROPS={avatar:{w:256,h:256,round:true,maxKB:300},server:{w:256,h:256,maxKB:300},banner:{w:960,h:320,maxKB:600},image:{w:1280,h:720,maxKB:900}};
function pickCrop(kind){return new Promise(res=>{const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=()=>i.files[0]?cropImage(i.files[0],Object.assign({keepGif:tier()>=1&&kind!=='image'},CROPS[kind])).then(res):res(null);i.click()})}
