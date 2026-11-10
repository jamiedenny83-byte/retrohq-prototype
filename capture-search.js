/* Barcode decoding is local. Only the decoded GTIN enters the existing market lookup. */
(function(root){
'use strict';
function barcode(value){
 const code=String(value||'').replace(/[\s-]/g,'');if(!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(code))throw Error('Enter a complete EAN/UPC barcode (8, 12, 13 or 14 digits).');
 const total=[...code.slice(0,-1)].reverse().reduce((n,d,k)=>n+Number(d)*(k%2?1:3),0);if((10-total%10)%10!==Number(code.at(-1)))throw Error('Barcode check digit does not match. Check the printed digits.');return code;
}
async function photo(file){
 if(!file||file.size>12*1024*1024)throw Error('Choose a photo smaller than 12 MB.');
 if(file.type&&!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type))throw Error('Choose an item photo (JPEG, PNG or WebP).');
 let image,url;try{
  try{if(typeof createImageBitmap!=='function')throw Error();image=await createImageBitmap(file);}catch{
   url=URL.createObjectURL(file);image=new Image();image.src=url;await image.decode();
  }
  const width=image.width||image.naturalWidth,height=image.height||image.naturalHeight;if(!width||!height)throw Error();
  const canvas=document.createElement('canvas'),scale=Math.min(1,1100/Math.max(width,height));canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
  for(const quality of [.8,.65,.5,.35]){const result=canvas.toDataURL('image/jpeg',quality);if(result.length<=250000)return result;}
  const small=document.createElement('canvas');small.width=Math.max(1,Math.round(canvas.width*.65));small.height=Math.max(1,Math.round(canvas.height*.65));small.getContext('2d').drawImage(canvas,0,0,small.width,small.height);const result=small.toDataURL('image/jpeg',.5);if(result.length<=250000)return result;
  throw Error('Use a closer crop of the item and its readable label.');
 }catch(ex){throw Error(ex.message?.includes('crop')?ex.message:'This photo could not be opened. Try taking a new photo or choose JPEG/PNG.');}finally{image?.close?.();if(url)URL.revokeObjectURL(url);}
}
let library=null,controls=null,active=null,generation=0;
function stop(){generation++;controls?.stop();controls=null;const video=active?.querySelector('video');video?.srcObject?.getTracks().forEach(t=>t.stop());if(video)video.srcObject=null;active?.remove();active=null;}
function load(){if(root.ZXingBrowser)return Promise.resolve(root.ZXingBrowser);if(!library)library=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='vendor/zxing-browser-0.2.1.min.js';script.onload=()=>root.ZXingBrowser?resolve(root.ZXingBrowser):reject(Error('Barcode reader unavailable'));script.onerror=()=>{script.remove();library=null;reject(Error('Barcode reader could not load. Enter the printed digits instead.'));};document.head.append(script);});return library;}
function scan(container,onResult){
 stop();const token=generation,box=document.createElement('section');box.className='card capture-panel';box.id='barcodeScanPanel';active=box;
 box.innerHTML='<div class="head"><h3>Scan barcode</h3><button type="button" class="btn secondary" id="barcodeClose">Close scanner</button></div><p>Point the rear camera at the printed EAN/UPC. Search starts as soon as it is read. Images stay on this device.</p><video autoplay muted playsinline style="width:100%;max-height:260px"></video><p id="barcodeScanStatus" role="status">Starting camera…</p><input type="file" id="barcodeImage" accept="image/*" capture="environment" hidden><div class="toolbar"><button type="button" class="btn secondary" id="barcodeImageChoose">Take / choose barcode photo</button><input id="barcodeManual" class="input" inputmode="numeric" autocomplete="off" aria-label="Printed barcode digits" placeholder="Or enter the printed digits"><button type="button" class="btn primary" id="barcodeUse">Search barcode</button></div>';
 container.prepend(box);const status=box.querySelector('#barcodeScanStatus'),video=box.querySelector('video');
 const present=()=>generation===token&&box.isConnected;
 function found(raw){if(!present())return;let code;try{code=barcode(raw);}catch{return;}stop();onResult(code);}
 box.querySelector('#barcodeClose').onclick=stop;
 const manual=()=>{try{const code=barcode(box.querySelector('#barcodeManual').value);found(code);}catch(ex){status.textContent=ex.message;}};
 box.querySelector('#barcodeUse').onclick=manual;box.querySelector('#barcodeManual').onkeydown=ev=>{if(ev.key==='Enter'){ev.preventDefault();manual();}};
 box.querySelector('#barcodeImageChoose').onclick=()=>box.querySelector('#barcodeImage').click();
 box.querySelector('#barcodeImage').onchange=async ev=>{const file=ev.target.files[0];if(!file||!present())return;controls?.stop();controls=null;video.srcObject?.getTracks().forEach(t=>t.stop());status.textContent='Reading barcode photo…';let url;
  try{const z=await load();if(!present())return;url=URL.createObjectURL(file);const result=await new z.BrowserMultiFormatReader().decodeFromImageUrl(url);if(present())found(result.getText());if(present())status.textContent='No valid EAN/UPC found. Photograph the barcode straight on, or enter its digits.';}
  catch{if(present())status.textContent='No readable barcode. Try a clear, close photo of all the bars, or enter the digits.';}finally{if(url)URL.revokeObjectURL(url);}
 };
 (async()=>{try{const z=await load();if(!present())return;if(!navigator.mediaDevices?.getUserMedia)throw Error('Camera access unavailable');const reader=new z.BrowserMultiFormatReader();const controller=await reader.decodeFromConstraints({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280}}},video,(result)=>{if(result)found(result.getText());});if(!present()){controller.stop();return;}controls=controller;status.textContent='Hold the whole barcode steady inside the camera view.';}
 catch{if(present())status.textContent='Camera unavailable or permission denied. Choose a barcode photo or enter the printed digits.';}})();
}
const api={barcode,photo,scan,stop};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RetroCapture=api;
})(typeof globalThis!=='undefined'?globalThis:this);
