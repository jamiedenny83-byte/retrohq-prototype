/* Themes and a decorative Easter egg. No stock or provider state is accessed. */
(() => {
  'use strict';
  const themes=['light','dark','retro'];
  let emblemTaps=0;
  const emblem=document.querySelector('#hqEmblem');
  function apply(theme){
    if(!themes.includes(theme))theme='light';
    document.documentElement.dataset.theme=theme;
    const picker=document.querySelector('#themeSelect');
    if(picker)picker.value=theme;
    emblemTaps=0;
    const egg=document.querySelector('#hqSecret');
    if(egg?.open)egg.close();
  }
  window.setRetroTheme=theme=>{
    if(!themes.includes(theme))return;
    apply(theme);
    try{localStorage.setItem('retrohq.theme',theme);}catch{}
  };
  window.toggleTheme=()=>window.setRetroTheme(document.documentElement.dataset.theme==='light'?'dark':'light');
  let saved='light';try{saved=localStorage.getItem('retrohq.theme')||'light';}catch{}
  apply(saved);
  function secret(){
    if(document.documentElement.dataset.theme!=='retro')return;
    let egg=document.querySelector('#hqSecret');
    if(!egg){
      egg=document.createElement('dialog');egg.id='hqSecret';egg.className='hq-secret';
      egg.setAttribute('aria-labelledby','hqSecretTitle');
      egg.innerHTML='<form method="dialog"><button class="btn secondary hq-secret-close" aria-label="Close secret stockroom">Close</button></form><span class="hq-secret-label">YOU FOUND THE SECRET STOCKROOM</span><img src="retro-buddy.svg" alt="An original smiling game cartridge mascot waving hello" width="220" height="220"><h2 id="hqSecretTitle">One more life for old games.</h2><p>I’m Cart. Keeper of the spares drawer.<br>There’s always room for another classic.</p><button type="button" class="btn primary" id="hqWave">Say hello</button><p id="hqSecretReply" role="status" aria-live="polite"></p>';
      document.body.append(egg);
      egg.querySelector('#hqWave').addEventListener('click',()=>{egg.querySelector('#hqSecretReply').textContent='Cart waves back. Your stockroom secret is safe.';egg.classList.remove('hq-wave');void egg.offsetWidth;egg.classList.add('hq-wave');});
      egg.addEventListener('close',()=>emblem?.focus());
    }
    if(!egg.open)egg.showModal();
  }
  emblem?.addEventListener('click',()=>{if(document.documentElement.dataset.theme==='retro'&&++emblemTaps>=5){emblemTaps=0;secret();}});
})();
