/* --- UTILS --- */
const $ = sel => document.querySelector(sel);
const LS = key => JSON.parse(localStorage.getItem(key) || '[]');
const SS = (key,val) => localStorage.setItem(key, JSON.stringify(val));
const toggleTheme = () => {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', dark ? 'light' : 'dark');
  SS('theme', dark ? 'light' : 'dark');
};

/* --- INIT THEME --- */
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

/* --- NAVIGATION --- */
const screens = $$('.screen');
const switchScreen = id => {
  screens.forEach(s => s.classList.toggle('active', s.id === id));
};
$$('[data-screen]').forEach(el => el.onclick = () => switchScreen(el.dataset.screen));
$('#createBtn').onclick = () => switchScreen('createPost');

/* --- ICONS --- */
feather.replace();

/* --- PROFIL --- */
const openProfile = () => $('#profileModal').classList.remove('hidden');
$('#userAvatar').onclick = openProfile;
$('#editProfileBtn').onclick = openProfile;

/* --- PROFIL FORM --- */
$('#profileForm').onsubmit = e => {
  e.preventDefault();
  const pseudo = $('#pseudoInput').value.trim();
  if(!pseudo) return alert('Pseudo requis');
  const profile = {pseudo, avatar: avatarDataURL, cover: coverDataURL};
  SS('profile', profile);
  applyProfile();
  $('#profileModal').classList.add('hidden');
};
let avatarDataURL='', coverDataURL='';
const loadProfile = () => {
  const p = JSON.parse(localStorage.getItem('profile') || '{}');
  if(p.avatar){ $('#userAvatar').src = p.avatar; avatarDataURL=p.avatar; }
  if(p.pseudo) $('#pseudoInput').value = p.pseudo;
};
loadProfile();
const applyProfile = () => {
  const p = JSON.parse(localStorage.getItem('profile') || '{}');
  if(p.pseudo) $('#editProfileBtn').style.display='none';
};

/* --- IMAGE CROP / ROTATE --- */
const handleCanvas = (file, canvas) => new Promise(res=>{
  const img=new Image();
  img.onload=()=>{
    const ctx=canvas.getContext('2d');
    canvas.width=300; canvas.height=300;
    ctx.clearRect(0,0,300,300);
    const scale=Math.min(canvas.width/img.width, canvas.height/img.height);
    const x=(canvas.width-img.width*scale)/2;
    const y=(canvas.height-img.height*scale)/2;
    ctx.save();
    ctx.translate(canvas.width/2,canvas.height/2);
    ctx.rotate(0); // rotation future
    ctx.drawImage(img,-img.width*scale/2,-img.height*scale/2,img.width*scale,img.height);
    ctx.restore();
    res(canvas.toDataURL());
  };
  img.src=URL.createObjectURL(file);
});
$('#avatarFile').onchange = async e=>{
  avatarDataURL = await handleCanvas(e.target.files[0], $('#avatarCanvas'));
};
$('#coverFile').onchange = async e=>{
  coverDataURL = await handleCanvas(e.target.files[0], $('#coverCanvas'));
};

/* --- EDITEUR --- */
const editor = $('#editor');
let mediaArray = [];
const insertHTML = html => document.execCommand('insertHTML', false, html);

/* Toolbar */
$('#editorToolbar').addEventListener('click', e=>{
  const cmd = e.target.closest('[data-cmd]')?.dataset.cmd;
  if(!cmd) return;
  switch(cmd){
    case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
      document.execCommand('formatBlock', false, cmd); break;
    case 'bold': case 'italic': case 'underline': document.execCommand(cmd); break;
    case 'blockquote': document.execCommand('formatBlock', false, 'blockquote'); break;
    case 'code': insertHTML('<pre><code contenteditable="true">// code</code></pre>'); break;
    case 'link':
      const url=prompt('URL ?'); if(!url) return;
      insertHTML(`<a href="${url}" target="_blank">${url}</a>`); break;
    case 'media':
      const inp=document.createElement('input');
      inp.type='file'; inp.accept='image/*,video/*,audio/*';
      inp.onchange=f=>{
        const file=f.target.files[0]; if(!file||file.size>500*1024*1024) return alert('Fichier > 500 Mo');
        const url=URL.createObjectURL(file);
        const tag=file.type.startsWith('image')?`<img src="${url}"/>`:
                 file.type.startsWith('video')?`<video controls src="${url}"></video>`:
                 `<audio controls src="${url}"></audio>`;
        insertHTML(tag);
        mediaArray.push({file,url});
      }; inp.click(); break;
    case 'audio':
      navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{
        const rec=new MediaRecorder(stream), chunks=[];
        rec.ondataavailable=e=>chunks.push(e.data);
        rec.onstop=()=>{
          const blob=new Blob(chunks,{type:'audio/webm'});
          const url=URL.createObjectURL(blob);
          insertHTML(`<audio controls src="${url}"></audio>`);
          mediaArray.push({file:blob,url});
        };
        rec.start();
        setTimeout(()=>rec.stop(), 5000); // 5s max
      });
      break;
    case 'embed':
      const embedUrl=prompt('URL YouTube / TikTok / FB / IG / X'); if(!embedUrl) return;
      let embed='';
      try{
        const u=new URL(embedUrl);
        if(u.hostname.includes('youtube.com')||u.hostname.includes('youtu.be')){
          const id=u.searchParams.get('v')||u.pathname.slice(1);
          embed=`<iframe width="100%" height="200" src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe>`;
        }
      }catch{alert('URL non supportée');}
      if(embed) insertHTML(embed);
      break;
  }
});
$('#fontSizeSel').onchange=e=>document.execCommand('fontSize', false, 7);
$('#fontFamilySel').onchange=e=>document.execCommand('fontName', false, e.target.value);
$('#txtColor').oninput=e=>document.execCommand('foreColor', false, e.target.value);
$('#bgColor').oninput=e=>document.execCommand('backColor', false, e.target.value);

/* --- PREVIEW --- */
$('#previewBtn').onclick=()=>{
  $('#previewRender').innerHTML=editor.innerHTML;
  $('#previewModal').classList.remove('hidden');
};
$('.close-modal').onclick=()=>$$('.modal').forEach(m=>m.classList.add('hidden'));
const $$ = sel => [...document.querySelectorAll(sel)];

/* --- POSTS --- */
const renderPosts = () => {
  const posts = LS('posts').sort((a,b)=>b.date-a.date);
  $('#postsList').innerHTML = posts.map(p=>`
    <div class="post">
      <div class="meta">${p.author} • ${new Date(p.date).toLocaleString()}</div>
      <div class="content">${p.content}</div>
      <div class="actions">
        <span><i data-feather="heart"></i> J’aime</span>
        <span><i data-feather="message-circle"></i> Commenter</span>
      </div>
    </div>
  `).join('');
  feather.replace();
};
renderPosts();

/* --- PUBLISH / DRAFT --- */
const savePost = (draft=false) => {
  const p = JSON.parse(localStorage.getItem('profile') || '{}');
  if(!p.pseudo) return alert('Complétez votre profil');
  const posts = LS('posts');
  posts.push({
    id:Date.now(),
    author:p.pseudo,
    content:editor.innerHTML,
    draft,
    date:Date.now()
  });
  SS('posts', posts);
  editor.innerHTML='';
  renderPosts();
  switchScreen('feed');
};
$('#publishBtn').onclick = () => savePost(false);
$('#draftBtn').onclick = () => savePost(true);
$('#darkToggle').onclick = toggleTheme;

/* --- SEARCH BTN --- */
$('#searchBtn').onclick = () => alert('Recherche non implémentée dans ce MVP');

/* --- INIT --- */
applyProfile();
