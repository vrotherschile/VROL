const DEFAULT_API="https://script.google.com/macros/s/AKfycbx0N2kVzt6DZK4Nofz9T--JuaqLzKODr4i6i0zUm9IWikxJUCuXtElXqcBjv7JCrAOC/exec";
const API=String(localStorage.getItem("VROL_API")||DEFAULT_API).trim();
let token=localStorage.getItem("VROL_TOKEN")||"", currentUser=null, state={};
try{currentUser=JSON.parse(localStorage.getItem("VROL_USER")||"null")}catch(e){currentUser=null}

const $=s=>document.querySelector(s);
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

/* ===== VROL Global Loading Controller ===== */
let _vrolLoadingCount=0;
let _vrolLoaderShownAt=0;
let _vrolHideTimer=null;
const VROL_LOADING_TEXT={
  login:"Verificando acceso…",
  publicData:"Cargando información pública…",
  dashboard:"Cargando panel…",
  getCharacterProfile:"Cargando ficha de personaje…",
  createCharacter:"Creando personaje…",
  applyCharacterInterview:"Procesando entrevista…",
  saveCharacterProfile:"Guardando ficha…",
  createAdvancedCharacter:"Creando personaje especializado…",
  spendCharacterExperience:"Guardando distribución de EXP…",
  buyTechnique:"Adquiriendo técnica…",
  assignTechnique:"Asignando técnica…",
  createTechnique:"Guardando técnica / habilidad…",
  createUniverse:"Creando universo…",
  updateUniverse:"Guardando universo…",
  createTable:"Creando mesa…",
  createSession:"Creando sesión…",
  default:"Procesando solicitud…"
};
function ensureVROLLoader(){
  let el=document.getElementById("vrolGlobalLoader");
  if(el)return el;
  if(!document.body)return null;
  el=document.createElement("div");
  el.id="vrolGlobalLoader";
  el.className="vrolLoader hidden";
  el.setAttribute("aria-live","polite");
  el.setAttribute("aria-busy","false");
  el.innerHTML=`<div class="vrolLoaderCard" role="status"><div class="vrolLoaderSpinner" aria-hidden="true"></div><div class="vrolLoaderTitle">VROL</div><div id="vrolLoaderMessage" class="vrolLoaderMessage">Procesando solicitud…</div><div class="vrolLoaderTrack"><div class="vrolLoaderBar"></div></div><div class="vrolLoaderHint">No cierres esta ventana mientras se procesa la solicitud.</div></div>`;
  document.body.appendChild(el);
  return el;
}
function showVROLLoader(message="Procesando solicitud…"){
  const el=ensureVROLLoader();
  if(!el)return;
  const msg=el.querySelector("#vrolLoaderMessage");
  if(msg)msg.textContent=message;
  _vrolLoadingCount++;
  clearTimeout(_vrolHideTimer);
  if(_vrolLoadingCount===1){
    _vrolLoaderShownAt=performance.now();
    el.classList.remove("hidden");
    el.setAttribute("aria-busy","true");
    document.body.classList.add("vrolLoadingActive");
  }
}
function hideVROLLoader(){
  _vrolLoadingCount=Math.max(0,_vrolLoadingCount-1);
  if(_vrolLoadingCount!==0)return;
  const el=document.getElementById("vrolGlobalLoader");
  const elapsed=performance.now()-_vrolLoaderShownAt;
  const wait=Math.max(0,220-elapsed);
  clearTimeout(_vrolHideTimer);
  _vrolHideTimer=setTimeout(()=>{
    if(_vrolLoadingCount!==0)return;
    if(el){
      el.classList.add("hidden");
      el.setAttribute("aria-busy","false");
    }
    document.body.classList.remove("vrolLoadingActive");
  },wait);
}
function setVROLLoaderMessage(message){
  const el=document.getElementById("vrolLoaderMessage");
  if(el)el.textContent=message;
}
function setVROLButtonBusy(button,busy){
  if(!button)return;
  if(busy){
    button.dataset.vrolOriginalText=button.innerHTML;
    button.disabled=true;
    button.innerHTML=`<span class="vrolInlineSpinner"></span> Procesando…`;
  }else if(button.dataset.vrolOriginalText!==undefined){
    button.disabled=false;
    button.innerHTML=button.dataset.vrolOriginalText;
    delete button.dataset.vrolOriginalText;
  }
}

function showLogin(){$("#loginModal").classList.remove("hidden");$("#loginUser").focus()}
function hideLogin(){$("#loginModal").classList.add("hidden")}
function closePanel(){window.location.href="index.html"}
async function api(action,data={}){
  if(API.includes("PEGAR_URL")) throw new Error("Configura la URL /exec de Apps Script en app.js.");
  showVROLLoader(VROL_LOADING_TEXT[action]||VROL_LOADING_TEXT.default);
  try{
    const r=await fetch(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action,...data,token})});
    if(!r.ok)throw new Error(`Error HTTP ${r.status}`);
    const j=await r.json();
    if(!j.ok) throw new Error(j.error||"Error de API");
    return j;
  }catch(e){
    throw e;
  }finally{
    hideVROLLoader();
  }
}
async function loadPublic(){
  try{
    const cacheKey="VROL_PUBLIC_CACHE_V1";
    const cached=JSON.parse(sessionStorage.getItem(cacheKey)||"null");
    const fresh=cached&&cached.savedAt&&(Date.now()-Number(cached.savedAt)<60000);
    if(fresh){renderPublic(cached.data);return;}
    const r=await api("publicData");
    try{sessionStorage.setItem(cacheKey,JSON.stringify({savedAt:Date.now(),data:r.data}));}catch(e){}
    renderPublic(r.data);
  }catch(e){
    console.warn("VROL API:",e.message);
    const msg=$("#apiStatus");
    if(msg) msg.textContent="API no disponible: "+e.message;
  }
}
function renderPublic(d){
  $("#mVisits").textContent=d.stats.visits;
  $("#mPlayers").textContent=d.stats.players;
  $("#mUniverses").textContent=d.stats.universes;
  $("#mTables").textContent=d.stats.tables;
  const banners=(d.banners||[]).filter(x=>x.active);
  $("#heroSlides").innerHTML=banners.map((b,i)=>`<div class="heroSlide" style="background-image:url('${esc(b.imageUrl)}');opacity:${i===0?1:0}"></div>`).join("");
  if(banners.length>1){let n=0;setInterval(()=>{const a=[...document.querySelectorAll(".heroSlide")];a.forEach(x=>x.style.opacity=0);n=(n+1)%a.length;a[n].style.opacity=1},5000)}
  $("#universeGrid").innerHTML=(d.universes||[]).map(u=>`
    <article class="card universeCard">
      <div class="universeImage">${u.imageUrl?`<img src="${esc(u.imageUrl)}" alt="Imagen de ${esc(u.name)}" loading="lazy">`:`<div class="universeImageFallback">VROL</div>`}</div>
      <div class="cardBody universeBody">
        <span class="tag">UNIVERSO ACTIVO</span>
        <h3>${esc(u.name)}</h3>
        <p>${esc(u.description||"Sin descripción pública.")}</p>
        <span class="mini">GM principal: ${esc(u.primaryGMName||"Por definir")}</span>
      </div>
    </article>`).join("")||`<div class="empty">Todavía no hay universos públicos.</div>`;
  $("#tableGrid").innerHTML=(d.tables||[]).map(t=>`
    <article class="card"><div class="cardBody"><span class="tag">${esc(t.status)}</span><h3>${esc(t.name)}</h3>
    <p>${esc(t.description||"Mesa de juego organizada.")}</p>
    <div class="tableMeta"><div><small>Universo</small><b>${esc(t.universeName)}</b></div>
    <div><small>GM</small><b>${esc(t.gmName)}</b></div><div><small>Jugadores</small><b>${t.playerCount}</b></div>
    <div><small>Actividad</small><b>${esc(t.activity||"Activa")}</b></div></div></div></article>`).join("")||`<div class="empty">No hay mesas activas publicadas.</div>`;
  const posts=(d.posts||[]).filter(x=>x.active);
  const featured=posts.find(x=>x.featured)||posts[0];
  $("#featured").innerHTML=featured?`<article class="featured"><div class="featuredImg" style="background-image:url('${esc(featured.imageUrl)}')"></div>
  <div class="featuredBody"><span class="tag">DESTACADA</span><h3>${esc(featured.title)}</h3><p>${esc(featured.description)}</p>
  ${featured.linkUrl?`<a class="btn primary" href="${esc(featured.linkUrl)}" target="_blank" rel="noopener">Ver publicación</a>`:""}</div></article>`:"";
  $("#postGrid").innerHTML=posts.filter(x=>x!==featured).map(p=>`<article class="card"><div class="cardImage" style="background-image:url('${esc(p.imageUrl)}')"></div><div class="cardBody"><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p>${p.linkUrl?`<a class="mini" href="${esc(p.linkUrl)}" target="_blank" rel="noopener">Ver más →</a>`:""}</div></article>`).join("");
  $("#videoGrid").innerHTML=(d.videos||[]).filter(x=>x.active).map(v=>{
    const id=youtubeId(v.youtubeUrl); return id?`<div class="video"><iframe src="https://www.youtube.com/embed/${id}" title="${esc(v.title)}" allowfullscreen loading="lazy"></iframe></div>`:"";
  }).join("")||`<div class="empty">No hay videos publicados.</div>`;
}
function youtubeId(url){const m=String(url||"").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/);return m?m[1]:""}

const loginForm = $("#loginForm");
if(loginForm){
  loginForm.addEventListener("submit",async e=>{
    e.preventDefault();$("#loginError").textContent="";
    try{const r=await api("login",{username:$("#loginUser").value.trim(),password:$("#loginPass").value});
      token=r.token;currentUser=r.user;localStorage.setItem("VROL_TOKEN",token);localStorage.setItem("VROL_USER",JSON.stringify(currentUser));hideLogin();openPanel();
    }catch(x){$("#loginError").textContent=x.message}
  });
}

function openPanel(){ window.location.href="app.html#dashboard"; }
function renderShell(){
  const menus=currentUser.role==="ADMIN"
    ? [["dashboard","Inicio"],["users","Usuarios"],["universes","Universos"],["characters","Personajes"],["techniques","Habilidades"],["tables","Mesas"],["sessions","Sesiones"],["site","Index / CMS"],["settings","Configuración"],["audit","Auditoría"]]
    : currentUser.role==="GM"
    ? [["dashboard","Inicio"],["universes","Mis universos"],["characters","Personajes"],["techniques","Habilidades"],["tables","Mis mesas"],["sessions","Sesiones"]]
    : [["dashboard","Inicio"],["characters","Mis personajes"],["tables","Mesas"],["sessions","Sesiones"]];
  const side=$("#appSide");
  if(!side)return;
  side.innerHTML=`<h3>VROL</h3><div class="user"><b>${esc(currentUser.username)}</b><small>${esc(currentUser.role)} · Player ${currentUser.playerLevel} · GM ${currentUser.gmLevel}</small></div>
  ${menus.map(m=>`<button class="sideBtn" data-view="${m[0]}" onclick="navigate('${m[0]}')">${m[1]}</button>`).join("")}
  <button class="sideBtn" onclick="logout()">Cerrar sesión</button>`;
  const label=$("#appUserLabel");
  if(label)label.textContent=`${currentUser.username} · ${currentUser.role}`;
}
async function navigate(view,updateHash=true){
  document.querySelectorAll(".sideBtn").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  if(updateHash && location.hash!==`#${view}`)history.replaceState(null,"",`#${view}`);
  const content=$("#content");
  if(!content)return;
  content.innerHTML=`<div class="notice">Cargando...</div>`;
  try{const r=await api("dashboard",{view});state=r.data;draw(view,r.data)}catch(e){content.innerHTML=`<div class="notice danger">${esc(e.message)}</div>`}
}
function head(title,sub,button=""){return `<div class="contentHeader"><div><h1>${title}</h1><p class="muted">${sub}</p></div>${button}</div>`}
function drawDashboard(d){
  const sheets=d.myCharacterSheets||[];
  const cards=sheets.map(s=>{
    const c=s.character,p=s.profile||{},uc=s.universeConfig||{};
    const pending=Number(p.experienceAvailable||0)>0;
    return `<article class="dashboardCharacterShortcut"><div class="shortcutIdentity"><span class="tag">${esc(c.universeName||"Universo")}</span><h3>${esc(c.name)}</h3><small>Edad ${esc(p.age||"—")} · ${esc(c.characterCode)}</small></div><div class="shortcutMeta"><span>EXP disponible</span><b class="${pending?"xpPending":""}">${Number(p.experienceAvailable||0).toLocaleString("es-CL")}</b></div><div class="shortcutActions"><button class="btn primary" onclick="openCharacterSheetById('${esc(c.id)}')">Ver ficha</button><button class="btn ghost" onclick="characterEditor('${esc(c.id)}')">Editar</button></div></article>`;
  }).join("");
  $("#content").innerHTML=head("Inicio","Accesos rápidos a tus personajes y actividad.")+`<div class="kpis">${Object.entries(d.stats||{}).map(([k,v])=>`<div class="kpi"><strong>${v}</strong><span>${esc(k)}</span></div>`).join("")}</div><div class="notice"><b>Tu identidad:</b> ${esc(currentUser.role)} · Player Level ${currentUser.playerLevel} · GM Level ${currentUser.gmLevel}<br><small>ADMIN, GM y PLAYER pueden poseer personajes. La propiedad se gestiona como jugador.</small></div><section class="profileSection dashboardCharactersSection"><div class="profileSectionHead"><h2>Mis personajes</h2><span>${sheets.length} personaje(s)</span></div><div class="dashboardCharacterShortcuts">${cards||`<div class="empty">Todavía no tienes personajes. Puedes crear uno desde <b>Personajes</b>.</div>`}</div></section>`;
}
function draw(view,d){
 if(view==="dashboard")return $("#content").innerHTML=head("Panel VROL","Resumen de tu actividad y permisos.")+`<div class="kpis">${Object.entries(d.stats).map(([k,v])=>`<div class="kpi"><strong>${v}</strong><span>${esc(k)}</span></div>`).join("")}</div><div class="notice"><b>Tu identidad:</b> ${esc(currentUser.role)} · Player Level ${currentUser.playerLevel} · GM Level ${currentUser.gmLevel}</div>`;
 if(view==="users")return drawUsers(d);
 if(view==="universes")return drawUniverses(d);
 if(view==="characters")return drawCharacters(d);
 if(view==="techniques")return drawTechniques(d);
 if(view==="tables")return drawTables(d);
 if(view==="sessions")return drawSessions(d);
 if(view==="site")return drawSite(d);
 if(view==="settings")return drawSettings(d);
 if(view==="audit")return drawAudit(d);
}
function drawUsers(d){$("#content").innerHTML=head("Usuarios","Administración de identidad, roles y progresión.",`<button class="btn primary" onclick="userForm()">+ Usuario</button>`)+`<div class="dataList">${d.users.map(u=>`<div class="dataRow"><div class="main"><b>${esc(u.username)}</b><small>${u.role} · Player ${u.playerLevel} · GM ${u.gmLevel}</small></div><span class="status">${u.active?"ACTIVO":"INACTIVO"}</span></div>`).join("")}</div>`}
function drawUniverses(d){
  state.universeGMOptions=d.gmOptions||state.universeGMOptions||[];
  $("#content").innerHTML=head("Universos",currentUser.role==="ADMIN"?"Administración global de universos.":"Universos que administras.",currentUser.role!=="PLAYER"?`<button class="btn primary" onclick="universeForm()">+ Universo</button>`:"")+`<div class="dataList">${d.universes.map(u=>`<div class="dataRow"><div class="main"><b>${esc(u.name)}</b><small>${esc(u.description||"")} · GM principal: ${esc(u.primaryGMUsername||"—")} · ${u.gmCount} GM(s)</small></div><div><span class="status">${esc(u.status)}</span>${currentUser.role==="ADMIN"?` <button class="btn ghost" onclick="editUniverse('${u.id}')">Editar</button>`:""}</div></div>`).join("")||`<div class="empty">No hay universos disponibles.</div>`}</div>`}
function drawCharacters(d){
  state.characters=d.characters||[];
  state.characterPlayers=d.characterPlayers||[];
  state.characterUniverses=d.characterUniverses||[];
  state.characterConfig=d.characterConfig||state.characterConfig||{};
  const canEdit=currentUser.role==="ADMIN"||currentUser.role==="GM";
  const createBtns=currentUser.role==="ADMIN"?`<button class="btn ghost" onclick="advancedCharacterForm()">+ Personaje avanzado</button> <button class="btn primary" onclick="characterForm()">+ Personaje</button>`:currentUser.role==="GM"?`<button class="btn primary" onclick="characterForm()">+ Personaje</button>`:`<button class="btn primary" onclick="characterForm()">+ Mi personaje</button>`;
  $("#content").innerHTML=head("Personajes","Los personajes pertenecen a un universo y su ficha se edita desde el sistema de personaje.",createBtns)+`<div class="dataList">${d.characters.map(c=>`<div class="dataRow"><div class="main"><b>${esc(c.name)}</b><small>Código ${esc(c.characterCode)} · ${esc(c.universeName)} · Jugador: ${esc(c.playerUsername||"Sin asignar")}</small></div><div class="rowActions"><span class="status">${esc(c.status)}</span>${canEdit?`<button class="btn ghost" onclick="editCharacter('${c.id}')">Editar</button>`:""}<button class="btn ghost" onclick="characterEditor('${c.id}')">Editar ficha</button><button class="btn ghost" onclick='openCharacterSheet(${JSON.stringify(c)})'>Ver ficha</button></div></div>`).join("")||`<div class="empty">No hay personajes.</div>`}</div>`
}

function drawTables(d){$("#content").innerHTML=head("Mesas","Cada mesa pertenece a un universo. El acceso es privado.",currentUser.role!=="PLAYER"?`<button class="btn primary" onclick="tableForm()">+ Mesa</button>`:"")+`<div class="dataList">${d.tables.map(t=>`<div class="dataRow"><div class="main"><b>${esc(t.name)}</b><small>${esc(t.universeName)} · GM ${esc(t.gmUsername)} · ${t.playerCount} jugador(es)</small></div><span class="status">${esc(t.status)}</span></div>`).join("")||`<div class="empty">No hay mesas.</div>`}</div>`}
function drawSessions(d){$("#content").innerHTML=head("Sesiones","Reuniones temporales pertenecientes a una mesa. Al cerrar una sesión, el GM asigna la misma EXP a cada personaje participante.",currentUser.role!=="PLAYER"?`<button class="btn primary" onclick="sessionForm()">+ Sesión</button>`:"")+`<div class="dataList">${d.sessions.map(s=>`<div class="dataRow"><div class="main"><b>${esc(s.title)}</b><small>${esc(s.tableName)} · ${esc(s.moduleTitle||"Sin módulo")} · ${esc(s.startAt)} → ${esc(s.endAt)} · ${esc(s.medium)}</small></div><div class="rowActions"><span class="status">${String(s.status||"OPEN")==="CLOSED"?"CERRADA":(s.durationMinutes+" min")}</span>${currentUser.role!=="PLAYER"&&String(s.status||"OPEN")!=="CLOSED"?`<button class="btn ghost" onclick="closeSessionUI('${s.id}')">Cerrar y asignar EXP</button>`:""}</div></div>`).join("")||`<div class="empty">No hay sesiones.</div>`}</div>`} 
function closeSessionUI(id){const raw=prompt("EXP que recibirá cada personaje participante. Debe ser múltiplo de 10:","100");if(raw===null)return;const xp=Number(raw);if(!xp||xp%10!==0){alert("La EXP debe ser un número mayor que 0 y múltiplo de 10.");return}(async()=>{try{const r=await api("closeSession",{id,xpAward:xp});alert(`Sesión cerrada. ${r.charactersAwarded} personaje(s) recibieron ${r.xpPerCharacter} EXP.`);navigate("sessions")}catch(e){alert(e.message)}})()}
function drawSite(d){
  const banners=Array.from({length:5},(_,i)=>d.banners.find(x=>Number(x.sortOrder)===i+1)||null);
  const videos=Array.from({length:4},(_,i)=>d.videos.find(x=>Number(x.sortOrder)===i+1)||null);
  const posts=[...(d.posts||[])].sort((a,b)=>Number(b.featured===true||b.featured==="true")-Number(a.featured===true||a.featured==="true")||Number(a.sortOrder||0)-Number(b.sortOrder||0));
  const bannerCard=(b,i)=>`<div class="cmsCard"><div class="cmsSlot">BANNER ${i+1}</div>${b?`<form class="cmsForm bannerEdit" data-id="${esc(b.id)}"><label>Título<input name="title" value="${esc(b.title||"")}"></label><label>Imagen URL 2:1<input name="imageUrl" type="url" value="${esc(b.imageUrl||"")}"></label><label>Estado<select name="active"><option value="true" ${String(b.active)==="true"?"selected":""}>Activo</option><option value="false" ${String(b.active)!=="true"?"selected":""}>Inactivo</option></select></label><div class="formActions"><button class="btn primary">Guardar</button></div></form>`:`<div class="cmsEmpty">Casilla disponible</div><form class="cmsForm bannerCreate" data-slot="${i+1}"><label>Título<input name="title" required></label><label>Imagen URL 2:1<input name="imageUrl" type="url" required></label><div class="formActions"><button class="btn primary">Agregar</button></div></form>`}</div>`;
  const videoCard=(v,i)=>`<div class="cmsCard"><div class="cmsSlot">VIDEO ${i+1}</div>${v?`<form class="cmsForm videoEdit" data-id="${esc(v.id)}"><label>Título<input name="title" value="${esc(v.title||"")}"></label><label>YouTube URL<input name="youtubeUrl" type="url" value="${esc(v.youtubeUrl||"")}"></label><label>Estado<select name="active"><option value="true" ${String(v.active)==="true"?"selected":""}>Activo</option><option value="false" ${String(v.active)!=="true"?"selected":""}>Inactivo</option></select></label><div class="formActions"><button class="btn primary">Guardar</button></div></form>`:`<div class="cmsEmpty">Casilla disponible</div><form class="cmsForm videoCreate" data-slot="${i+1}"><label>Título<input name="title" required></label><label>YouTube URL<input name="youtubeUrl" type="url" required></label><div class="formActions"><button class="btn primary">Agregar</button></div></form>`}</div>`;
  const postCard=p=>`<div class="cmsCard postCard"><div class="cmsSlot">${p.featured===true||p.featured==="true"?"⭐ PRINCIPAL":"PUBLICACIÓN"}</div><form class="cmsForm postEdit" data-id="${esc(p.id)}"><label>Título<input name="title" value="${esc(p.title||"")}"></label><label>Imagen URL<input name="imageUrl" type="url" value="${esc(p.imageUrl||"")}"></label><label>Destino web<input name="linkUrl" type="url" value="${esc(p.linkUrl||"")}"></label><label>Descripción<textarea name="description">${esc(p.description||"")}</textarea></label><label>Publicación principal<select name="featured"><option value="false" ${!(p.featured===true||p.featured==="true")?"selected":""}>No</option><option value="true" ${(p.featured===true||p.featured==="true")?"selected":""}>Sí</option></select></label><label>Estado<select name="active"><option value="true" ${String(p.active)==="true"?"selected":""}>Publicado</option><option value="false" ${String(p.active)!=="true"?"selected":""}>Oculto</option></select></label><div class="formActions"><button class="btn primary">Guardar</button></div></form></div>`;
  $("#content").innerHTML=head("Index / CMS","Administra el contenido público sin editar HTML.")+
  `<section class="cmsSection"><div class="sectionHead"><div><h2>Banners · 5 casillas</h2><p class="muted">Cada posición puede activarse, desactivarse o reemplazarse.</p></div></div><div class="cmsGrid">${banners.map(bannerCard).join("")}</div></section>
   <section class="cmsSection"><div class="sectionHead"><div><h2>Videos · 4 casillas</h2><p class="muted">Cada posición puede activarse o dejarse disponible.</p></div></div><div class="cmsGrid">${videos.map(videoCard).join("")}</div></section>
   <section class="cmsSection"><div class="sectionHead"><div><h2>Publicaciones</h2><p class="muted">La publicación principal aparece primero. Puedes ocultar cualquier publicación.</p></div></div><div class="cmsGrid postsGrid">${posts.map(postCard).join("")||`<div class="empty">No hay publicaciones.</div>`}</div>
   <div class="cmsCard"><div class="cmsSlot">NUEVA PUBLICACIÓN</div><form id="postForm" class="cmsForm">${field("Título","title")}${field("Imagen URL","imageUrl","url")}${field("Destino web","linkUrl","url")}<label>Descripción<textarea name="description"></textarea></label><label>Publicación principal<select name="featured"><option value="false">No</option><option value="true">Sí</option></select></label><div class="formActions"><button class="btn primary">Publicar</button></div></form></div></section>`;
  document.querySelectorAll(".bannerEdit").forEach(f=>f.onsubmit=async e=>{e.preventDefault();await api("updateBanner",{id:f.dataset.id,...formData(f)});navigate("site")});
  document.querySelectorAll(".videoEdit").forEach(f=>f.onsubmit=async e=>{e.preventDefault();await api("updateVideo",{id:f.dataset.id,...formData(f)});navigate("site")});
  document.querySelectorAll(".bannerCreate").forEach(f=>f.onsubmit=async e=>{e.preventDefault();await api("createBanner",{...formData(f)});navigate("site")});
  document.querySelectorAll(".videoCreate").forEach(f=>f.onsubmit=async e=>{e.preventDefault();await api("createVideo",{...formData(f)});navigate("site")});
  document.querySelectorAll(".postEdit").forEach(f=>f.onsubmit=async e=>{e.preventDefault();await api("updatePost",{id:f.dataset.id,...formData(f)});navigate("site")});
  $("#postForm").onsubmit=async e=>{e.preventDefault();await api("createPost",formData(e.target));navigate("site")}
}
function drawSettings(d){$("#content").innerHTML=head("Configuración","Parámetros globales administrados por Admin.")+`<form id="settingsForm" class="formGrid">${field("Nivel GM mínimo para crear universo","minGMUniverseLevel","number")}<div class="full formActions"><button class="btn primary">Guardar configuración</button></div></form>`;$("#settingsForm").elements.minGMUniverseLevel.value=d.minGMUniverseLevel;$("#settingsForm").onsubmit=async e=>{e.preventDefault();await api("saveSettings",formData(e.target));alert("Configuración guardada")}}
function drawAudit(d){$("#content").innerHTML=head("Auditoría","Registro de acciones administrativas y operacionales.")+`<div class="dataList">${d.logs.map(x=>`<div class="dataRow"><div class="main"><b>${esc(x.action)}</b><small>${esc(x.username)} · ${esc(x.timestamp)} · ${esc(x.detail)}</small></div><span class="mini">${esc(x.role)}</span></div>`).join("")}</div>`}
function field(label,name,type="text"){return `<label>${label}<input name="${name}" type="${type}" required></label>`}
function formData(f){return Object.fromEntries(new FormData(f).entries())}
function userForm(){ $("#content").innerHTML=head("Nuevo usuario","Crea una identidad VROL.")+`<form id="uf" class="formGrid">${field("Usuario","username")}${field("Contraseña","password","password")}<label>Rol<select name="role"><option>PLAYER</option><option>GM</option><option>ADMIN</option></select></label>${field("Player Level 0-100","playerLevel","number")}${field("GM Level 0-100","gmLevel","number")}<div class="full formActions"><button class="btn primary">Crear usuario</button></div></form>`;$("#uf").onsubmit=async e=>{e.preventDefault();try{await api("createUser",formData(e.target));navigate("users")}catch(x){alert(x.message)}}}
function gmOptionsHtml(selected=""){
  const options=state.universeGMOptions||[];
  return `<label>Responsable principal<select name="primaryGMUsername"><option value="">Por definir</option>${options.map(g=>`<option value="${esc(g.username)}" ${String(g.username)===String(selected)?"selected":""}>${esc(g.username)} · ${esc(g.role||"GM")}${g.role==="GM"?" · Nivel "+esc(g.gmLevel):""}</option>`).join("")}</select></label>`;
}
function universeForm(){
  const dons=CHARACTER_ELEMENTS;
  const q6Defaults=[["1er Don","2do Don","3er Don","4to Don"],["5to Don","6to Don","7mo Don","8vo Don"],["9no Don","10mo Don","1er Don","2do Don"],["3er Don","4to Don","5to Don","6to Don"]];
  $("#content").innerHTML=head("Nuevo universo","ADMIN puede crear universos y configurar su lenguaje propio.")+`<form id="uf" class="formGrid">
  ${field("Nombre","name")}
  ${gmOptionsHtml()}
  <label>Imagen del universo (URL)<input name="imageUrl" type="url" placeholder="https://..." ></label>
  <label>Nombre visible de Energía<input name="energyName" value="Energía" placeholder="Energía"></label>
  <label>Nombre visible de Habilidad<input name="techniqueName" value="Habilidad" placeholder="Habilidad"></label>
  <label>Nombre de la categoría de Dones<input name="donesCategoryName" value="Dones" placeholder="Dones"></label>
  <div class="full"><div class="profileSectionHead"><h3>Nombres de las 10 características de Dones</h3><span>Genéricos por defecto · personalizables por universo</span></div><div class="formGrid compact">${dons.map((n,i)=>`<label>${esc(n)}<input name="donesName${i}" value="${esc(n)}"></label>`).join("")}</div></div>
  <div class="full"><div class="profileSectionHead"><h3>Pregunta 6 · Dones</h3><span>Editable por universo</span></div><label class="full">Pregunta<textarea name="q6Title" rows="2">¿Qué tipo de dones te gustaría poseer?</textarea></label><div class="interviewConfigGrid">${Array.from({length:4},(_,r)=>`<div class="interviewConfigRow"><b>Opción ${r+1}</b>${[0,1,2,3].map(c=>`<label>${[30,27,23,20][c]}%<input name="q6_${r}_${c}" value="${esc(q6Defaults[r][c]||dons[c])}"></label>`).join("")}</div>`).join("")}</div></div>
  <label class="full">Descripción<textarea name="description"></textarea></label>
  <div class="full formActions"><button class="btn primary">Crear universo</button></div></form>`;
  $("#uf").onsubmit=async e=>{e.preventDefault();try{const fd=formData(e.target);fd.donesNames=dons.map((_,i)=>fd["donesName"+i]);fd.interviewQ6={title:fd.q6Title,choices:Array.from({length:4},(_,r)=>({no:r+1,dones:[0,1,2,3].map(c=>fd[`q6_${r}_${c}`])}))};await api("createUniverse",fd);navigate("universes");loadPublic()}catch(x){alert(x.message)}}}

async function editUniverse(id){
  try{
    const r=await api("getUniverse",{id});
    const u=r.data;
    const dons=u.donesNames||CHARACTER_ELEMENTS;
    const q6=u.interviewQ6||{title:"¿Qué tipo de dones te gustaría poseer?",choices:[]};
    const q6Rows=Array.from({length:4},(_,row)=>{
      const vals=(q6.choices&&q6.choices[row]&&q6.choices[row].dones)||[];
      return `<div class="interviewConfigRow"><b>Opción ${row+1}</b>${[0,1,2,3].map(col=>`<label>${[30,27,23,20][col]}%<input name="q6_${row}_${col}" value="${esc(vals[col]||dons[col]||CHARACTER_ELEMENTS[col])}"></label>`).join("")}</div>`;
    }).join("");
    const gmList=(u.assignedGMs||[]).map(g=>`<div class="dataRow"><div class="main"><b>${esc(g.username)}</b><small>GM autorizado para mesas y cambios del universo.</small></div><button class="btn ghost" onclick="manageUniverseGMUI('${esc(u.id)}','REMOVE','${esc(g.username)}')">Quitar</button></div>`).join("");
    $("#content").innerHTML=head("Administrar universo",esc(u.name),`<button class="btn ghost" onclick="navigate('universes')">← Volver</button>`)+`
      <form id="uf" class="formGrid">
        ${gmOptionsHtml(u.primaryGMUsername)}
        <label>Imagen del universo (URL)<input name="imageUrl" type="url" value="${esc(u.imageUrl||"")}" placeholder="https://..."></label>
        <label>Nombre visible de Energía<input name="energyName" value="${esc(u.energyName||"Energía")}"></label>
        <label>Nombre visible de Habilidad<input name="techniqueName" value="${esc(u.techniqueName||"Habilidad")}"></label>
        <label>Nombre de la categoría de Dones<input name="donesCategoryName" value="${esc(u.donesCategoryName||"Dones")}"></label>
        <div class="full"><div class="profileSectionHead"><h3>Nombres de las 10 características de Dones</h3><span>El universo define su propio lenguaje</span></div><div class="formGrid compact">${CHARACTER_ELEMENTS.map((n,i)=>`<label>${esc(n)}<input name="donesName${i}" value="${esc(dons[i]||n)}"></label>`).join("")}</div></div>
        <div class="full"><div class="profileSectionHead"><h3>Pregunta 6 · Dones</h3><span>Editable para este universo</span></div><label class="full">Pregunta<textarea name="q6Title" rows="2">${esc(q6.title||"¿Qué tipo de dones te gustaría poseer?")}</textarea></label><div class="interviewConfigGrid">${q6Rows}</div></div>
        <label>Estado<select name="status"><option>ACTIVE</option><option>INACTIVE</option></select></label>
        <label class="full">Descripción<textarea name="description">${esc(u.description||"")}</textarea></label>
        <div class="full formActions"><button class="btn primary">Guardar cambios</button><button type="button" class="btn" onclick="deleteUniverse('${esc(u.id)}')">Eliminar</button></div>
      </form>
      <section class="editorCard"><div class="profileSectionHead"><h3>GMs autorizados para este universo</h3><span>ADMIN · narrar, crear mesas y operar a nivel GM</span></div>
        <div class="formGrid compact"><label>GM<select id="universeGMSelect">${(state.universeGMOptions||[]).map(g=>`<option value="${esc(g.username)}">${esc(g.username)} · ${esc(g.role)} · GM ${esc(g.gmLevel)}</option>`).join("")}</select></label><div class="formActions"><button type="button" class="btn primary" onclick="manageUniverseGMUI('${esc(u.id)}','ADD')">+ Añadir GM</button></div></div>
        <div id="universeGMList" class="dataList">${gmList||`<div class="empty">No hay GMs adicionales asignados.</div>`}</div>
      </section>`;
    $("#uf").elements.status.value=u.status;
    $("#uf").onsubmit=async function(e){
      e.preventDefault();
      try{
        const fd=formData(e.target);
        fd.donesNames=CHARACTER_ELEMENTS.map((_,i)=>fd["donesName"+i]);
        fd.interviewQ6={title:fd.q6Title,choices:Array.from({length:4},(_,row)=>({no:row+1,dones:[0,1,2,3].map(col=>fd[`q6_${row}_${col}`])}))};
        await api("updateUniverse",{id,...fd});
        navigate("universes");
        loadPublic();
      }catch(x){alert(x.message);}
    };
  }catch(e){alert(e.message);}
}
function manageUniverseGMUI(universeId,mode,username){
  const user=username||$("#universeGMSelect")?.value;if(!user)return alert("Selecciona un GM.");
  (async()=>{try{await api("manageUniverseGM",{universeId,username:user,mode});alert(mode==="ADD"?"GM añadido al universo.":"GM retirado del universo.");editUniverse(universeId)}catch(e){alert(e.message)}})();
}
async function deleteUniverse(id){if(confirm("Se marcará como eliminado y se conservará el registro.")){await api("deleteUniverse",{id});navigate("universes");loadPublic()}}
function characterForm(preselectedUniverse=""){
  const players=state.characterPlayers||[], universes=state.characterUniverses||[];
  const isPlayer=currentUser.role==="PLAYER";
  const playerField=isPlayer?`<div class="notice full">Jugador: <b>${esc(currentUser.username)}</b>. En VROL, ADMIN, GM y PLAYER pueden ser propietarios/jugadores de personajes. JO permite un solo personaje por jugador dentro de cada universo.</div>`:`<label>Jugador<select name="playerUsername"><option value="${esc(currentUser.username)}">${esc(currentUser.username)} · ${esc(currentUser.role)} (yo)</option>${players.filter(p=>String(p.username)!==String(currentUser.username)).map(p=>`<option value="${esc(p.username)}">${esc(p.username)} · ${esc(p.role||"PLAYER")}</option>`).join("")}</select></label>`;
  $("#content").innerHTML=head("Crear personaje","La creación normal comienza inmediatamente con la entrevista de creación.")+`<form id="cf" class="formGrid">${playerField}<label>Universo<select name="universeId" required><option value="">Seleccionar universo...</option>${universes.map(u=>`<option value="${esc(u.id)}" ${String(u.id)===String(preselectedUniverse)?"selected":""}>${esc(u.name)}</option>`).join("")}</select></label><div class="full notice"><b>Importante:</b> al continuar se reservará tu único personaje para este universo y comenzarás directamente la entrevista. La edad, identidad, EXP inicial y perfil genético se definirán dentro de la entrevista.</div><div class="full formActions"><button class="btn primary">Comenzar entrevista de creación</button></div></form>`;
  $("#cf").onsubmit=async e=>{e.preventDefault();try{const fd=formData(e.target);fd.draft=true;const r=await api("createCharacter",fd);characterEditor(r.id)}catch(x){alert(x.message)}};
}

async function advancedCharacterForm(){
  if(currentUser.role!=="ADMIN")return alert("Solo ADMIN puede usar el creador avanzado.");
  const players=state.characterPlayers||[],universes=state.characterUniverses||[];
  const groups=[['core',['Salud','Energía',...CHARACTER_TRAITS]],['talents',CHARACTER_CAPACITIES.slice(0,8)],['knowledge',CHARACTER_CAPACITIES.slice(8)],['tree',CHARACTER_TREE],['elements',CHARACTER_ELEMENTS]];
  const rows=groups.flatMap(([cat,names])=>names.map(name=>`<label class="adminXpRow"><span>${esc(name)}<small>${esc(categoryLabel(cat))}</small></span><input class="adminXpInput" data-cat="${cat}" data-target="${esc(name)}" type="number" min="0" max="1000" step="10" value="100"></label>`)).join('');
  const traitRows=CHARACTER_TRAITS.map(n=>`<label class="adminXpRow limitRow"><span>${esc(n)}<small>Límite genético</small></span><input class="creationLimitInput" data-limit-cat="traits" data-limit-target="${esc(n)}" type="number" min="0" max="10" step="1" value="8"></label>`).join('');
  const treeRows=CHARACTER_TREE.map(n=>`<label class="adminXpRow limitRow"><span>${esc(n)}<small>Límite genético</small></span><input class="creationLimitInput" data-limit-cat="tree" data-limit-target="${esc(n)}" type="number" min="0" max="10" step="1" value="8"></label>`).join('');
  const html=head("Creador avanzado","ADMIN · creación sin entrevista y con límites personalizados.",`<button class="btn ghost" onclick="navigate('characters')">← Volver</button>`)+`<section class="editorCard adminAdvancedCard"><div class="profileSectionHead"><h3>Creación administrativa</h3><span>ADMIN · puede personalizar límites</span></div><div class="formGrid compact"><label>Nombre<input id="advName"></label><label>Edad inicial<select id="advAge">${Array.from({length:41},(_,i)=>i+10).map(a=>`<option value="${a}">${a} años · ${creationExpText(a)} EXP</option>`).join('')}</select></label><label>Jugador<select id="advPlayer"><option value="">Seleccionar jugador...</option>${players.map(p=>`<option value="${esc(p.username)}">${esc(p.username)}</option>`).join('')}</select></label><label>Universo<select id="advUniverse"><option value="">Seleccionar universo...</option>${universes.map(u=>`<option value="${esc(u.id)}">${esc(u.name)}</option>`).join('')}</select></label><label class="full">Descripción<textarea id="advDescription"></textarea></label></div>
  <section class="profileSection"><div class="profileSectionHead"><h3>Límites genéticos de creación</h3><span id="limit48Status">48 / 48 puntos</span></div><p class="muted">Por defecto cada grupo suma 48 puntos. ADMIN puede definir una distribución personalizada. Activar “Romper 48” permite personajes no humanos o excepcionales y habilita hasta 60 puntos.</p><label class="choiceCard"><input id="advBreak48" type="checkbox" onchange="updateAdvancedLimitTotals()"><span><b>Romper límite genético de 48</b><small>Solo ADMIN · permite 49–60 puntos y elimina el tope de 4 puntos por objetivo durante la creación avanzada.</small></span></label><div class="limitGrid"><div><h4>Capacidades Principales</h4><div class="adminXpGrid">${traitRows}</div><strong id="traitLimitTotal">48 / 48</strong></div><div><h4>Árbol de Energía</h4><div class="adminXpGrid">${treeRows}</div><strong id="treeLimitTotal">48 / 48</strong></div></div></section>
  <div class="xpCounterCard"><span>EXP total asignada</span><strong id="advXpTotal">0 EXP</strong><small>Se actualiza mientras asignas EXP.</small></div><div class="adminXpGrid">${rows}</div><section class="profileSection"><div class="profileSectionHead"><h3>Habilidades avanzadas</h3><span>Creación administrativa</span></div><div id="advSkills"></div><button type="button" class="btn" onclick="addAdvancedSkillRow()">+ Técnica / Habilidad</button></section><div class="formActions"><button class="btn primary" onclick="submitAdvancedCharacter()">Crear personaje avanzado</button></div></section>`;
  $("#content").innerHTML=html;
  document.querySelectorAll('.adminXpInput').forEach(el=>el.addEventListener('input',updateAdvancedXpTotal));
  document.querySelectorAll('.creationLimitInput').forEach(el=>el.addEventListener('input',updateAdvancedLimitTotals));
  updateAdvancedXpTotal();updateAdvancedLimitTotals();
}
function updateAdvancedLimitTotals(){
  const sum=cat=>[...document.querySelectorAll(`.creationLimitInput[data-limit-cat="${cat}"]`)].reduce((n,e)=>n+Math.max(0,Math.min(10,Number(e.value||0))),0);
  const t=sum('traits'),tr=sum('tree'),broken=$("#advBreak48")?.checked;
  if($("#traitLimitTotal"))$("#traitLimitTotal").textContent=`${t} / ${broken?'60':'48'} puntos`;
  if($("#treeLimitTotal"))$("#treeLimitTotal").textContent=`${tr} / ${broken?'60':'48'} puntos`;
  const status=$("#limit48Status");if(status)status.textContent=`Capacidades ${t}/48 · Árbol ${tr}/48`;
}

function addAdvancedSkillRow(){
  const box=$("#advSkills");if(!box)return;const i=box.children.length;const row=document.createElement("div");row.className="formGrid compact advancedSkillRow";row.innerHTML=`<label>Habilidad ${i+1}<input class="advSkillName" placeholder="Nombre"></label><label>EXP<input class="advSkillExp" type="number" min="0" max="1000" step="10" value="0"></label><button type="button" class="btn ghost" onclick="this.parentElement.remove();updateAdvancedXpTotal()">Quitar</button>`;box.appendChild(row);}

function updateAdvancedXpTotal(){let total=0;document.querySelectorAll('.adminXpInput').forEach(el=>{let n=Math.max(0,Math.min(1000,Math.round(Number(el.value||0)/10)*10));el.value=n;total+=n;});document.querySelectorAll('.advSkillExp').forEach(el=>{let n=Math.max(0,Math.min(1000,Math.round(Number(el.value||0)/10)*10));el.value=n;total+=n;});const out=$("#advXpTotal");if(out)out.textContent=total.toLocaleString('es-CL')+' EXP';}
function submitAdvancedCharacter(){
  const allocations={core:{},talents:{},knowledge:{},tree:{},elements:{},skills:{}};
  document.querySelectorAll('.adminXpInput').forEach(el=>allocations[el.dataset.cat][el.dataset.target]=Math.max(0,Math.min(1000,Math.round(Number(el.value||0)/10)*10)));
  const advancedSkills=[...document.querySelectorAll('.advancedSkillRow')].map(r=>({name:r.querySelector('.advSkillName')?.value.trim(),exp:Math.max(0,Math.min(1000,Math.round(Number(r.querySelector('.advSkillExp')?.value||0)/10)*10))})).filter(x=>x.name);
  const break48=$("#advBreak48")?.checked||false;
  const traitCaps=Object.fromEntries([...document.querySelectorAll('.creationLimitInput[data-limit-cat="traits"]')].map(e=>[e.dataset.limitTarget,Math.max(0,Math.min(10,Number(e.value||0)))]));
  const treeCaps=Object.fromEntries([...document.querySelectorAll('.creationLimitInput[data-limit-cat="tree"]')].map(e=>[e.dataset.limitTarget,Math.max(0,Math.min(10,Number(e.value||0)))]));
  const traitTotal=Object.values(traitCaps).reduce((a,b)=>a+b,0),treeTotal=Object.values(treeCaps).reduce((a,b)=>a+b,0);
  if(!break48&&(traitTotal!==48||treeTotal!==48))return alert('Los límites genéticos deben sumar exactamente 48 puntos.');
  if(break48&&(traitTotal<49||traitTotal>60||treeTotal<49||treeTotal>60))return alert('Al romper 48, cada grupo debe sumar entre 49 y 60 puntos.');
  const payload={name:$("#advName").value.trim(),age:Number($("#advAge").value),playerUsername:$("#advPlayer").value,universeId:$("#advUniverse").value,description:$("#advDescription").value,allocations,advancedSkills,break48,traitCaps,treeCaps,traitCapTotal:traitTotal,treeCapTotal:treeTotal,breakReason:break48?'ADMIN: personaje con límite genético personalizado superior a 48':''};
  if(!payload.name||!payload.playerUsername||!payload.universeId)return alert('Completa nombre, jugador y universo.');
  (async()=>{try{const r=await api('createAdvancedCharacter',payload);alert(`Personaje avanzado creado. Código: ${r.characterCode} · EXP asignada: ${Number(r.totalSpent||0).toLocaleString('es-CL')}`);navigate('characters');}catch(e){alert(e.message)}})();
}

async function editCharacter(id){
  const r=await api("dashboard",{view:"characters"}),data=r.data,x=(data.characters||[]).find(y=>y.id===id);
  if(!x)return alert("Personaje no encontrado");
  const players=data.characterPlayers||[],universes=data.characterUniverses||[],canChangeUniverse=currentUser.role==="ADMIN";
  $("#content").innerHTML=head("Editar personaje",esc(x.name),`<button class="btn ghost" onclick="navigate('characters')">← Volver</button>`)+
  `<form id="cf" class="formGrid">
    ${field("Nombre","name")}
    <label>Jugador<select name="playerUsername" required><option value="">Seleccionar jugador...</option>${players.map(p=>`<option value="${esc(p.username)}" ${String(p.username)===String(x.playerUsername)?"selected":""}>${esc(p.username)}</option>`).join("")}</select></label>
    <label>Universo<select name="universeId" ${canChangeUniverse?"":"disabled"} required>${universes.map(u=>`<option value="${esc(u.id)}" ${String(u.id)===String(x.universeId)?"selected":""}>${esc(u.name)}</option>`).join("")}</select>${canChangeUniverse?"":"<small class='muted'>Solo ADMIN puede cambiar el universo.</small>"}</label>
    <label class="full">Descripción<textarea name="description">${esc(x.description||"")}</textarea></label>
    <div class="full formActions"><button class="btn primary">Guardar cambios</button></div>
  </form>`;
  $("#cf").elements.name.value=x.name||"";
  $("#cf").onsubmit=async e=>{e.preventDefault();const payload={id,...formData(e.target)};if(!canChangeUniverse)payload.universeId=x.universeId;try{await api("updateCharacter",payload);navigate("characters")}catch(err){alert(err.message)}}
}

const CHARACTER_TRAITS=["Fuerza","Velocidad","Resistencia","Inteligencia","Voluntad","Aura"];
const CHARACTER_CAPACITIES=["Alerta","Armas","Atletismo","Carisma","Combate","Emoción","Expresión","Sigilo","Ciencias","Cocina","Comercio","Investigación","Historia","Ocultismo","Política","Supervivencia"];
const CHARACTER_SPECIALTIES={
  "Alerta":["Percepción","Reacción","Vigilancia","Detección"],
  "Armas":["Blancas","Fuego","Pesadas","Improvisadas"],
  "Atletismo":["Acrobacia","Carrera","Fuerza","Resistencia"],
  "Carisma":["Liderazgo","Persuasión","Sedución","Intimidación"],
  "Combate":["Cuerpo a Cuerpo","Defensa","Táctica","Pelea"],
  "Emoción":["Empatía","Control","Inspiración","Terror"],
  "Expresión":["Arte","Actuación","Escritura","Oratoria"],
  "Sigilo":["Ocultación","Infiltración","Robo","Rastreo"],
  "Ciencias":["Quím-Físic","Ingeniería","Medicina","Tecnología"],
  "Cocina":["Preparación","Nutrición","Repostería","Supervivencia"],
  "Comercio":["Negociación","Mercado","Finanzas","Logística"],
  "Investigación":["Análisis","Búsqueda","Forense","Documentación"],
  "Historia":["Antigua","Moderna","Militar","Cultural"],
  "Ocultismo":["Ninjutsu","Hechicería","Secretismo","Religiones"],
  "Política":["Gobierno","Diplomacia","Leyes","Estrategia"],
  "Supervivencia":["Ciudades","Militar","Intemperie","Bestias"]
};
const CHARACTER_TREE=["Poder","Forma","Cantidad","Rapidez","Distancia","Efecto"];
const TECHNIQUE_TREE_BASE=["Poder","Forma","Cantidad","Rapidez","Distancia"];
const CHARACTER_ELEMENTS=["1er Don","2do Don","3er Don","4to Don","5to Don","6to Don","7mo Don","8vo Don","9no Don","10mo Don"];

function expView(exp){const n=Math.max(0,Math.min(1000,Number(exp)||0));return {exp:n,domain:Math.round(n/10),base:Math.min(10,Math.floor(n/100))};}
function domainBar(domain){return `<div class="domainBar"><span style="width:${Math.max(0,Math.min(100,Number(domain)||0))}%"></span></div>`}
function lifeBar(current,total){
  const t=Math.max(0,Number(total||0)),c=Math.max(0,Math.min(t,Number(current||0))),pct=t?Math.round(c/t*100):0;
  return `<div class="lifeBar"><span style="width:${pct}%"></span></div><small class="lifeMeta">${c} / ${t} · ${pct}%</small>`;
}
function characterStatCard(name,obj,specialty="",withSpecialty=false,dataKey="",limit=null,editableId=""){
  const v=expView(obj?.exp||0),base=v.base,selected=Array.isArray(obj?.specialties)?obj.specialties:(specialty?[specialty]:[]);
  const opts=CHARACTER_SPECIALTIES[name]||[],thresholds=[3,5,7,9];
  const specialtyHtml=withSpecialty?`<div class="inlineSpecialties"><span>Especialidades · desbloqueo 3 / 5 / 7 / 9</span><div class="specialtyOptions">${opts.map((x,i)=>{const unlocked=base>=3,isSel=selected.includes(x);return `<button type="button" class="specialtyOption ${isSel?"selected":""} ${unlocked?"":"locked"}" data-capacity="${esc(dataKey||name)}" ${unlocked&&editableId?`onclick="toggleSpecialtyUI('${esc(editableId)}','${esc(dataKey||name)}','${esc(x)}',this)"`:"disabled"} title="${unlocked?"Disponible":"Requiere 3 puntos base"}>${esc(x)}</button>`}).join("")}</div></div>`:"";
  return `<div class="profileStat"><div class="profileStatName"><span>${esc(name)}</span>${limit!==null?`<b class="statLimit">Límite ${limit}</b>`:""}</div><div class="profileStatValue"><b>${v.base}</b><span>${v.domain}%</span><small>${v.exp.toLocaleString("es-CL")} EXP</small></div>${domainBar(v.domain)}${specialtyHtml}</div>`;
}
function characterSection(title,items,map,specialties=false,displayNames={},limits={},editableId=""){
  const totalExp=items.reduce((n,k)=>n+Number(map?.[k]?.exp||0),0);
  return `<section class="profileSection"><div class="profileSectionHead"><h3>${esc(title)}</h3><span>EXP invertida: ${totalExp.toLocaleString("es-CL")}</span></div><div class="profileStats">${items.map(n=>characterStatCard(displayNames[n]||n,map?.[n],map?.[n]?.specialty,specialties,n,limits?.[n]??null,editableId)).join("")}</div></section>`;
}
function creationExpText(age){
  const a=Math.max(10,Math.min(50,Number(age)||10)),rows={10:10000,20:14000,30:17000,40:19000,50:20000},pts=[10,20,30,40,50];
  let lo=10,hi=50;for(let i=0;i<pts.length;i++){if(pts[i]<=a)lo=pts[i];if(pts[i]>=a){hi=pts[i];break;}}
  const total=lo===hi?rows[lo]:Math.round(rows[lo]+((a-lo)/(hi-lo))*(rows[hi]-rows[lo]));
  return total.toLocaleString("es-CL");
}
function categoryLabel(k,universeConfig={}){return ({core:"Salud / Energía / Capacidades Principales",talents:"Talentos",knowledge:"Conocimientos",tree:"Árbol de Energía",elements:(universeConfig.donesCategoryName||"Dones"),skills:"Habilidades"})[k]||k}
function characterEditor(id){
  (async()=>{
    try{
      const r=await api("getCharacterProfile",{id});
      const d=r.data, p=d.profile, c=d.character;
      // La configuración de entrevista debe provenir del universo del personaje.
      // No dependemos de la configuración que pudiera quedar en memoria desde otra vista/universo.
      state.characterConfig=d.characterConfig||state.characterConfig||{};
      const cfg=state.characterConfig||{};
      const interview=cfg.interview||[];
      const canAdmin=currentUser.role==="ADMIN";
      let html=head("Editar ficha de personaje",esc(c.name),`<button class="btn ghost" onclick="navigate('characters')">← Volver</button>`);
      html+=`<div class="characterEditor">
        <section class="editorCard"><div class="profileSectionHead"><h3>Identidad</h3><span>${p.creationComplete?"Creación completada":"Configuración inicial"}</span></div>
          <div class="formGrid compact"><label>Nombre<input id="ceName" value="${esc(c.name||"")}"></label>
          <label>Edad inicial<select id="ceAge" ${p.creationComplete&&!canAdmin?"disabled":""}>${Array.from({length:41},(_,i)=>i+10).map(a=>`<option value="${a}" ${a===p.age?"selected":""}>${a} años · ${creationExpText(a)} EXP</option>`).join("")}</select><small class="muted">Experiencia de creación: <b id="creationExpPreview">${Number(p.creationExp||0).toLocaleString("es-CL")}</b> EXP</small></label>
          <label>Origen<input id="ceOrigin" value="${esc(c.origin||"")}"></label><label>Personalidad<input id="cePersonality" value="${esc(c.personality||"")}"></label>
          <label class="full">Apariencia<textarea id="ceAppearance">${esc(c.appearance||"")}</textarea></label><label class="full">Motivación<textarea id="ceMotivation">${esc(c.motivation||"")}</textarea></label>
          <label class="full">Descripción<textarea id="ceDescription">${esc(c.description||"")}</textarea></label></div>
          <div class="formActions"><button class="btn primary" onclick="saveCharacterIdentity('${c.id}')">Guardar identidad</button></div>
        </section>`;
      const uc=d.universeConfig||{};
      if(!p.creationComplete){
        const ageOptions=Array.from({length:41},(_,i)=>i+10).map(a=>`<option value="${a}" ${Number(p.age)===a?"selected":""}>${a} años · ${creationExpText(a)} EXP total · ${(Number(creationExpText(a).replace(/\./g,'').replace(/,/g,''))).toLocaleString("es-CL")} EXP libres</option>`).join("");
        html+=`<section class="editorCard interviewCard"><div class="profileSectionHead"><h3>Entrevista de Creación</h3><span>Paso 1 · Identidad y perfil natural</span></div><p class="muted">La creación normal comienza con esta entrevista. Primero establecerás la identidad de tu personaje y su edad; después responderás las 6 preguntas de la entrevista. La edad determina tu presupuesto total. La entrevista determina límites genéticos y la distribución ponderada de la EXP de creación.</p><div class="formGrid compact interviewIdentity"><label>Nombre del personaje<input id="interviewName" value="${esc(c.name==="Sin nombre"?"":c.name)}" required></label><label>Edad inicial<select id="interviewAge">${ageOptions}</select><small>EXP total: <b id="interviewExpTotal">${Number(p.creationExp||10000).toLocaleString("es-CL")}</b> · EXP libres: <b id="interviewExpFree">${Number(p.freeCreationExp||p.creationExp||0).toLocaleString("es-CL")}</b></small></label><label>Origen<input id="interviewOrigin" value="${esc(c.origin||"")}" placeholder="Origen, lugar o procedencia"></label><label>Personalidad<input id="interviewPersonality" value="${esc(c.personality||"")}" placeholder="Rasgos principales de personalidad"></label><label class="full">Apariencia<textarea id="interviewAppearance" placeholder="Descripción física y elementos visuales importantes">${esc(c.appearance||"")}</textarea></label><label class="full">Motivación inicial<textarea id="interviewMotivation" placeholder="Qué busca, qué desea conseguir o qué lo mueve">${esc(c.motivation||"")}</textarea></label><label class="full">Descripción / historia inicial<textarea id="interviewDescription" placeholder="Una breve descripción narrativa del personaje">${esc(c.description||"")}</textarea></label></div><div class="profileSection"><div class="profileSectionHead"><h3>Perfil natural</h3><span>Se determina con la primera respuesta</span></div><p class="muted">La primera respuesta define los límites genéticos. Las preguntas siguientes distribuyen la EXP de creación según las ponderaciones del sistema VROL.</p></div>${interview.map(q=>`<fieldset class="interviewQuestion"><legend>${q.no}. ${esc(q.title)}</legend><p>${esc(q.text)}</p><div class="choiceGrid">${q.choices.map(ch=>`<label class="choiceCard"><input type="radio" name="q${q.no}" value="${ch.no}"><span><b>${esc(ch.text)}</b></span></label>`).join("")}</div></fieldset>`).join("")}<div class="formActions"><button class="btn primary" onclick="submitCharacterInterview('${c.id}')">Finalizar entrevista y continuar</button></div></section>`;
        html+=`</div>`;
        $("#content").innerHTML=html;
        const ageEl=$("#interviewAge");
        const updateInterviewExp=()=>{const total=Number(creationExpText(ageEl.value).replace(/\./g,'').replace(/,/g,''));$("#interviewExpTotal").textContent=total.toLocaleString("es-CL");$("#interviewExpFree").textContent=total.toLocaleString("es-CL")};
        if(ageEl)ageEl.onchange=updateInterviewExp;
        updateInterviewExp();
        return;
      }
      html+=`<section class="editorCard"><div class="profileSectionHead"><h3>Experiencia Disponible</h3><span>EXP ganada: ${Number(p.experienceEarned||0).toLocaleString("es-CL")}</span></div><div class="xpHero"><strong>${Number(p.experienceAvailable||0).toLocaleString("es-CL")}</strong><span>EXP Disponible</span></div><div class="xpPools">${Object.entries(d.categoryPools||{}).map(([k,v])=>`<div class="xpPool"><b>${esc(categoryLabel(k,uc))}</b><span>${v.remaining.toLocaleString("es-CL")} / ${v.pool.toLocaleString("es-CL")}</span><small>${Math.round(((v.pool-v.remaining)/(v.pool||1))*100)}% utilizado</small></div>`).join("")}</div></section>`;
      const lim=d.creationLimits||{}; const dh=d.derived?.health??100, de=d.derived?.energy??100; const limitsPending=!p.creationComplete && String(p.creationMode)!=="ADMIN_ADVANCED";
      html+=`<section class="editorCard"><div class="profileSectionHead"><h3>Límites de creación y valores derivados</h3><span>${limitsPending?'Se determinan por la entrevista':(lim.override?'Límite genético personalizado / ADMIN':'Límite genético 48 puntos')}</span></div><div class="derivedGrid"><div class="derivedCard"><span>Salud máxima</span><b>${dh}</b><small>100 base + fórmula SUR · EXP Salud: ${Number(p.healthExp||0)}/1000</small></div><div class="derivedCard"><span>Energía máxima</span><b>${de}</b><small>100 base + fórmula SUR · EXP Energía: ${Number(p.energyExp||0)}/1000</small></div></div>${limitsPending?`<p class="muted">La primera pregunta establecerá automáticamente los 48 puntos de límites genéticos de las Capacidades Principales y sus 48 puntos homólogos del Árbol de la Energía.</p>`:`<div class="limitGrid"><div><h4>Capacidades · ${lim.traitTotal||48}/${lim.override?lim.traitTotal||48:48}</h4><div class="limitChips">${Object.entries(lim.traits||{}).map(([k,v])=>`<span class="specialtyChip">${esc(k)}: ${v}</span>`).join('')}</div></div><div><h4>Árbol · ${lim.treeTotal||48}/${lim.override?lim.treeTotal||48:48}</h4><div class="limitChips">${Object.entries(lim.tree||{}).map(([k,v])=>`<span class="specialtyChip">${esc(k)}: ${v}</span>`).join('')}</div></div></div>`}</section>`;
      if(!p.creationComplete){
        html+=`<section class="editorCard interviewCard"><div class="profileSectionHead"><h3>Entrevista de Creación</h3><span>Distribución inicial de EXP</span></div><p class="muted">La entrevista es universal para cualquier universo. Tus respuestas determinan límites genéticos y distribución de la EXP inicial.</p><div id="interviewForm">${interview.map(q=>`<fieldset class="interviewQuestion"><legend>${q.no}. ${esc(q.title)}</legend><p>${esc(q.text)}</p><div class="choiceGrid">${q.choices.map(ch=>`<label class="choiceCard"><input type="radio" name="q${q.no}" value="${ch.no}"><span><b>${esc(ch.text)}</b></span></label>`).join("")}</div></fieldset>`).join("")}<div class="formActions"><button class="btn primary" onclick="submitCharacterInterview('${c.id}')">Finalizar entrevista y asignar ${Number(p.creationExp||0).toLocaleString("es-CL")} EXP</button></div></div></section>`;
      } else {
        html+=`<section class="editorCard"><div class="profileSectionHead"><h3>Comprar desarrollo</h3><span>Siempre en múltiplos de 10 EXP</span></div><div class="purchaseGrid"><label>Área<select id="xpCategory">${Object.keys(d.categoryPools||{}).map(k=>`<option value="${k}">${esc(categoryLabel(k,uc))}</option>`).join("")}</select></label><label>Objetivo<select id="xpTarget"></select></label><label>EXP a gastar<input id="xpAmount" type="number" min="10" step="10" value="10"></label><div class="formActions"><button class="btn primary" onclick="spendCharacterXP('${c.id}')">Comprar EXP</button></div></div><small class="muted">La entrevista reserva el 15% de la EXP total para Habilidades. El 85% restante se distribuye mediante sus seis preguntas y sus ponderaciones.</small></section>`;
      }
      html+=characterSection("Capacidades Principales",CHARACTER_TRAITS,d.traits,false,{},lim.traits||{},c.id);
      html+=characterSection("Talentos",CHARACTER_CAPACITIES.slice(0,8),d.capacities,true,{},{} ,c.id);html+=characterSection("Conocimientos",CHARACTER_CAPACITIES.slice(8),d.capacities,true,{},{} ,c.id);
      html+=characterSection("Árbol de la Energía",CHARACTER_TREE,d.tree,false,{},lim.tree||{},c.id);
      html+=characterSection(uc.donesCategoryName||"Dones",CHARACTER_ELEMENTS,d.elements,false,Object.fromEntries(CHARACTER_ELEMENTS.map((k,i)=>[k,(uc.donesNames||CHARACTER_ELEMENTS)[i]||k])));
      html+=`<section class="editorCard"><div class="profileSectionHead"><h3>Salud y ${esc(uc.energyName||"Energía")}</h3><span>Estado actual / total</span></div><div class="vitalsGrid"><div class="vitalCard"><div><span>Salud Actual / Total</span><b>${Number(d.vitals?.currentHealth??d.derived?.health??100)} / ${Number(d.derived?.health??100)}</b></div>${lifeBar(d.vitals?.currentHealth??d.derived?.health??100,d.derived?.health??100)}</div><div class="vitalCard"><div><span>${esc(uc.energyName||"Energía")} Actual / Total</span><b>${Number(d.vitals?.currentEnergy??d.derived?.energy??100)} / ${Number(d.derived?.energy??100)}</b></div>${lifeBar(d.vitals?.currentEnergy??d.derived?.energy??100,d.derived?.energy??100)}</div></div><div class="formGrid compact"><label>EXP Salud<input id="healthExp" type="number" min="0" max="1000" step="10" value="${Number(p.healthExp||0)}"></label><label>EXP ${esc(uc.energyName||"Energía")}<input id="energyExp" type="number" min="0" max="1000" step="10" value="${Number(p.energyExp||0)}"></label></div><div class="formActions"><button class="btn" onclick="saveCharacterIdentity('${c.id}',true)">Guardar Salud / ${esc(uc.energyName||"Energía")}</button></div></section>`;
      if(currentUser.role==="ADMIN")html+=`<section class="editorCard adminDirectCard"><div class="profileSectionHead"><h3>Administración directa de EXP</h3><span>Solo ADMIN · sin límite global</span></div><p class="muted">Permite corregir o construir personajes avanzados directamente. Cada objetivo conserva el máximo de 1.000 EXP.</p><div class="adminXpGrid">${CHARACTER_TRAITS.concat(["Salud","Energía"]).map(n=>`<label class="adminXpRow"><span>${esc(n)}</span><input class="directXpInput" data-cat="core" data-target="${esc(n)}" type="number" min="0" max="1000" step="10" value="${Number((d.traits||{})[n]?.exp||0)}"></label>`).join("")}${CHARACTER_CAPACITIES.slice(0,8).map(n=>`<label class="adminXpRow"><span>${esc(n)}</span><input class="directXpInput" data-cat="talents" data-target="${esc(n)}" type="number" min="0" max="1000" step="10" value="${Number((d.capacities||{})[n]?.exp||0)}"></label>`).join("")}${CHARACTER_CAPACITIES.slice(8).map(n=>`<label class="adminXpRow"><span>${esc(n)}</span><input class="directXpInput" data-cat="knowledge" data-target="${esc(n)}" type="number" min="0" max="1000" step="10" value="${Number((d.capacities||{})[n]?.exp||0)}"></label>`).join("")}${CHARACTER_TREE.map(n=>`<label class="adminXpRow"><span>${esc(n)}</span><input class="directXpInput" data-cat="tree" data-target="${esc(n)}" type="number" min="0" max="1000" step="10" value="${Number((d.tree||{})[n]?.exp||0)}"></label>`).join("")}${CHARACTER_ELEMENTS.map(n=>`<label class="adminXpRow"><span>${esc(n)}</span><input class="directXpInput" data-cat="elements" data-target="${esc(n)}" type="number" min="0" max="1000" step="10" value="${Number((d.elements||{})[n]?.exp||0)}"></label>`).join("")}</div><section class="profileSection"><div class="profileSectionHead"><h3>Habilidades existentes</h3><span>Edición directa ADMIN</span></div><div class="skillList">${(d.skills||[]).map(sk=>`<div class="skillRow adminSkillEdit"><input class="adminSkillName" data-id="${esc(sk.id)}" value="${esc(sk.name||"")}"><input class="adminSkillExp" data-id="${esc(sk.id)}" type="number" min="0" max="1000" step="10" value="${Number(sk.exp||0)}"></div>`).join("")||`<div class="empty">No hay técnicas ni habilidades existentes.</div>`}</div></section><section class="profileSection"><div class="profileSectionHead"><h3>Límites manuales</h3><span>ADMIN</span></div><label class="choiceCard"><input id="editBreak48" type="checkbox" ${lim.override?"checked":""}><span><b>Romper límite de 48</b><small>Permite 49–60 puntos por grupo.</small></span></label><div class="limitGrid"><div><h4>Capacidades</h4><div class="adminXpGrid">${CHARACTER_TRAITS.map(n=>`<label class="adminXpRow limitRow"><span>${esc(n)}</span><input class="editLimitInput" data-cat="traits" data-target="${esc(n)}" type="number" min="0" max="10" value="${Number(lim.traits?.[n]||8)}"></label>`).join("")}</div></div><div><h4>Árbol</h4><div class="adminXpGrid">${CHARACTER_TREE.map(n=>`<label class="adminXpRow limitRow"><span>${esc(n)}</span><input class="editLimitInput" data-cat="tree" data-target="${esc(n)}" type="number" min="0" max="10" value="${Number(lim.tree?.[n]||8)}"></label>`).join("")}</div></div></div></section><div class="formActions"><button class="btn primary" onclick="saveAdminCharacterStats('${c.id}')">Guardar EXP administrativa</button></div></section>`;
      html+=`<section class="editorCard"><div class="profileSectionHead"><h3>Habilidades</h3><span>Desarrollo individual</span></div><div class="skillList">${(d.skills||[]).map(sk=>`<div class="skillRow"><div><b>${esc(sk.name)}</b><small>${Number(sk.exp||0)}/1000 EXP</small></div><div class="skillBar"><span style="width:${Math.min(100,Number(sk.exp||0)/10)}%"></span></div></div>`).join("")||`<div class="empty">Todavía no hay habilidades.</div>`}</div><div class="formGrid compact skillForm"><label>Nueva técnica / habilidad<input id="newSkillName" placeholder="Ej. Kenjutsu"></label><label>EXP inicial<input id="newSkillExp" type="number" min="10" max="1000" step="10" value="10"></label><div class="formActions"><button class="btn" onclick="addCharacterSkillUI('${c.id}')">Añadir técnica / habilidad</button></div></div></section>`;
      html+=renderTechniqueSection(c,d,uc);
      html+=`<section class="editorCard"><div class="profileSectionHead"><h3>Historial de experiencia</h3><span>${(d.xpLogs||[]).length} movimientos</span></div><div class="dataList compactList">${(d.xpLogs||[]).slice(-30).reverse().map(x=>`<div class="dataRow"><div class="main"><b>${esc(x.sourceType||"MOVIMIENTO")}</b><small>${esc(x.note||"")} · ${esc(x.category||"")}</small></div><span class="status">${Number(x.amount||0)>0?"+":""}${Number(x.amount||0)} EXP</span></div>`).join("")||`<div class="empty">Sin movimientos todavía.</div>`}</div></section>`;
      html+=`</div>`;
      $("#content").innerHTML=html;
      const ageEl=$("#ceAge"), preview=$("#creationExpPreview"); if(ageEl&&preview)ageEl.onchange=()=>preview.textContent=creationExpText(ageEl.value);
      if(p.creationComplete){setupXPTargets(d);} 
      document.querySelectorAll(".specialtySelect").forEach(el=>el.onchange=()=>saveCharacterSpecialties(c.id));
    }catch(e){$("#content").innerHTML=`<div class="notice danger">${esc(e.message)}</div>`}
  })();
}
function saveAdminCharacterStats(id){
  if(currentUser.role!=="ADMIN")return alert("Solo ADMIN puede utilizar esta función.");
  const allocations={core:{},talents:{},knowledge:{},tree:{},elements:{},skills:{}};document.querySelectorAll('.directXpInput').forEach(el=>allocations[el.dataset.cat][el.dataset.target]=Math.max(0,Math.min(1000,Math.round(Number(el.value||0)/10)*10)));
  const skills=[...document.querySelectorAll(".adminSkillEdit")].map(row=>({id:row.querySelector(".adminSkillExp")?.dataset.id,name:row.querySelector(".adminSkillName")?.value.trim(),exp:Number(row.querySelector(".adminSkillExp")?.value||0)})).filter(x=>x.id&&x.name);
  const traits=Object.fromEntries([...document.querySelectorAll(".editLimitInput[data-cat=\"traits\"]")].map(e=>[e.dataset.target,Number(e.value||0)]));
  const tree=Object.fromEntries([...document.querySelectorAll(".editLimitInput[data-cat=\"tree\"]")].map(e=>[e.dataset.target,Number(e.value||0)]));
  const break48=$("#editBreak48")?.checked||false;
  const traitTotal=Object.values(traits).reduce((a,b)=>a+b,0), treeTotal=Object.values(tree).reduce((a,b)=>a+b,0);
  if(!break48&&(traitTotal!==48||treeTotal!==48))return alert("Los límites genéticos deben sumar exactamente 48 puntos.");
  if(break48&&(traitTotal<49||traitTotal>60||treeTotal<49||treeTotal>60))return alert("Al romper 48, cada grupo debe sumar entre 49 y 60 puntos.");
  (async()=>{try{const r=await api("adminSetCharacterStats",{id,allocations,skills,creationLimits:{break48,traits,tree,traitTotal,treeTotal,reason:break48?"ADMIN: límite genético personalizado superior a 48":"Límites manuales de creación"}});alert("EXP administrativa guardada. Total: "+Number(r.totalExp||0).toLocaleString("es-CL")+" EXP");characterEditor(id)}catch(e){alert(e.message)}})();
}
function saveCharacterIdentity(id,includeHealth=false){
  (async()=>{try{const specialties=[...document.querySelectorAll('.specialtySelect')].map(x=>({capacity:x.dataset.capacity,specialty:x.value}));const payload={id,name:$("#ceName")?.value,description:$("#ceDescription")?.value,origin:$("#ceOrigin")?.value,appearance:$("#ceAppearance")?.value,personality:$("#cePersonality")?.value,motivation:$("#ceMotivation")?.value,age:Number($("#ceAge")?.value||10),specialties};if(includeHealth){payload.healthExp=Number($("#healthExp")?.value||0);payload.energyExp=Number($("#energyExp")?.value||0)}const r=await api("saveCharacterProfile",payload);alert("Ficha guardada.");characterEditor(id)}catch(e){alert(e.message)}})();}
function saveCharacterSpecialties(id){
  const specialties=[...document.querySelectorAll('.specialtySelect')].map(x=>({capacity:x.dataset.capacity,specialty:x.value}));
  api("saveCharacterProfile",{id,specialties}).catch(e=>alert(e.message));
}
function toggleSpecialtyUI(characterId,capacity,specialty,button){
  button.classList.toggle("selected");
  const selected=[...document.querySelectorAll(`.specialtyOption[data-capacity="${CSS.escape(capacity)}"]`)].filter(x=>x.classList.contains("selected")).map(x=>x.textContent.trim());
  const base=Number(button.closest(".profileStat")?.querySelector(".profileStatValue b")?.textContent||0);
  const maxUnlocked=base>=9?4:base>=7?3:base>=5?2:base>=3?1:0;
  if(selected.length>maxUnlocked){button.classList.toggle("selected");return alert("La capacidad permite hasta "+maxUnlocked+" especialidad(es) según su puntuación base.");}
  api("saveCharacterProfile",{id:characterId,specialties:[{capacity,specialties:selected}]}).catch(e=>alert(e.message));
}
function submitCharacterInterview(id){
  (async()=>{
    const cfg=state.characterConfig||{};
    const qs=Array.isArray(cfg.interview)?cfg.interview:[];
    if(qs.length!==6){alert("No se pudo cargar la configuración completa de la entrevista para este universo. Recarga la ficha e inténtalo nuevamente.");return;}
    const answers=qs.map(q=>{const el=document.querySelector(`input[name="q${q.no}"]:checked`);return {questionNo:q.no,choiceNo:el?Number(el.value):0}});
    if(answers.some(x=>!x.choiceNo)){alert("Debes responder las 6 preguntas de la entrevista.");return}
    const name=$("#interviewName")?.value.trim();
    if(!name){alert("Debes indicar el nombre del personaje.");return}
    try{
      await api("applyCharacterInterview",{id,name,age:Number($("#interviewAge")?.value||10),origin:$("#interviewOrigin")?.value.trim(),appearance:$("#interviewAppearance")?.value.trim(),personality:$("#interviewPersonality")?.value.trim(),motivation:$("#interviewMotivation")?.value.trim(),description:$("#interviewDescription")?.value.trim(),answers});
      alert("Entrevista completada. El personaje ya puede continuar con su distribución de EXP.");
      characterEditor(id);
    }catch(e){alert(e.message)}
  })();
}
function setupXPTargets(d){
  const cat=$("#xpCategory"), target=$("#xpTarget"); if(!cat||!target)return;
  const fill=()=>{const k=cat.value;let names=[];if(k==="core")names=CHARACTER_TRAITS.concat(["Salud","Energía"]);else if(k==="talents")names=CHARACTER_CAPACITIES.slice(0,8);else if(k==="knowledge")names=CHARACTER_CAPACITIES.slice(8);else if(k==="tree")names=CHARACTER_TREE;else if(k==="elements"){const labels=d.universeConfig?.donesNames||CHARACTER_ELEMENTS;target.innerHTML=CHARACTER_ELEMENTS.map((n,i)=>`<option value="${esc(n)}">${esc(labels[i]||n)}</option>`).join("");return;}else if(k==="skills")names=(d.skills||[]).map(x=>x.name);target.innerHTML=names.map(n=>`<option>${esc(n)}</option>`).join("");};cat.onchange=fill;fill();
}
function addCharacterSkillUI(id){
  const name=$("#newSkillName")?.value.trim(),exp=Number($("#newSkillExp")?.value||0);
  if(!name){alert("Indica el nombre de la técnica o habilidad.");return;}
  (async()=>{try{await api("addCharacterSkill",{id,name,exp});characterEditor(id)}catch(e){alert(e.message)}})();
}
function spendCharacterXP(id){
  (async()=>{try{const r=await api("spendCharacterExperience",{id,category:$("#xpCategory").value,target:$("#xpTarget").value,amount:Number($("#xpAmount").value||0)});alert("EXP asignada correctamente.");characterEditor(id)}catch(e){alert(e.message)}})();
}
async function openCharacterSheet(c){
  try{const r=await api("getCharacterProfile",{id:c.id});return openCharacterSheetData(r.data);}catch(e){$("#content").innerHTML=`<div class="notice danger">${esc(e.message)}</div>`;return;}
}
async function openCharacterSheetData(d){
  const c=d.character,p=d.profile,uc=d.universeConfig||{},derived=d.derived||{},vitals=d.vitals||{};
  const body=vitals.bodyHealth||{};
  const core=d.traits||{},caps=d.capacities||{},tree=d.tree||{},elements=d.elements||{};
  const talentNames=CHARACTER_CAPACITIES.slice(0,8),knowledgeNames=CHARACTER_CAPACITIES.slice(8);
  const limitTraits=d.creationLimits?.traits||{},limitTree=d.creationLimits?.tree||{};
  const traitOptions=CHARACTER_TRAITS.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join("");
  const secondOptions=[...talentNames,...knowledgeNames].map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join("");
  const bodyLabels={Cabeza:"Cabeza",BrazoIzquierdo:"Brazo izquierdo",BrazoDerecho:"Brazo derecho",Tronco:"Tronco",PiernaIzquierda:"Pierna izquierda",PiernaDerecha:"Pierna derecha"};
  const bodyCards=Object.entries(bodyLabels).map(([k,label])=>{const b=body[k]||{current:0,total:0,percent:0};return `<div class="bodyHealthCard"><div><b>${esc(label)}</b><span>${b.percent}% de Salud</span></div>${lifeBar(b.current,b.total)}</div>`}).join("");
  $("#content").innerHTML=head("Ficha de personaje",esc(c.name),`<button class="btn ghost" onclick="navigate('characters')">← Volver</button>`)+`<div class="characterSheet">
    <section class="combinedRollCard"><div><span class="tag">TIRADA SUR</span><h3>Rasgo + Talento / Conocimiento + D10</h3><small>El resultado entero se convierte directamente a porcentaje SUR.</small></div><div class="combinedRollControls"><select id="rollTrait">${traitOptions}</select><span>+</span><select id="rollSkill">${secondOptions}</select><span>+</span><span class="d10Badge">D10</span><button class="btn primary" onclick="rollCombinedCharacter('${esc(c.id)}')">Lanzar</button><div id="combinedRollResult" class="combinedRollResult">—</div></div></section>
    <div class="profileHero"><div class="profilePortrait"><div>VROL</div></div><div class="profileIdentity"><span class="tag">PERSONAJE · ${esc(c.status)}</span><h2>${esc(c.name)}</h2><p>Edad inicial: ${p.age} · ${esc(c.universeName||"Universo")}</p><small>Código: ${esc(c.characterCode)} · Jugador: ${esc(c.playerUsername||"Sin asignar")}</small><p class="profileHistory">${esc(c.description||"Sin historia registrada.")}</p></div></div>
    <section class="profileSection"><div class="profileSectionHead"><h3>Salud y ${esc(uc.energyName||"Energía")}</h3><span>Estado actual</span></div><div class="vitalsGrid"><div class="vitalCard"><div><span>Salud Actual</span><b>${Number(vitals.currentHealth??derived.health??100)}</b><small>Salud Total · ${Number(derived.health??100)}</small></div>${lifeBar(vitals.currentHealth??derived.health??100,derived.health??100)}</div><div class="vitalCard"><div><span>${esc(uc.energyName||"Energía")} Actual</span><b>${Number(vitals.currentEnergy??derived.energy??100)}</b><small>${esc(uc.energyName||"Energía")} Total · ${Number(derived.energy??100)}</small></div>${lifeBar(vitals.currentEnergy??derived.energy??100,derived.energy??100)}</div></div></section>
    <section class="profileSection"><div class="profileSectionHead"><h3>Partes del cuerpo</h3><span>Distribución de Salud Total</span></div><div class="bodyHealthGrid">${bodyCards}</div></section>
    <div class="derivedGrid"><div class="derivedCard"><span>Iniciativa</span><b>${Number(derived.initiative||0).toFixed(2).replace(/\.00$/,"")}</b><small>Velocidad + Inteligencia</small></div><div class="derivedCard"><span>Alerta Natural</span><b>${Number(derived.naturalAlert||0).toFixed(2).replace(/\.00$/,"")}</b><small>Inteligencia + Alerta</small></div><div class="derivedCard"><span>EXP Disponible</span><b>${Number(p.experienceAvailable||0).toLocaleString("es-CL")}</b><small>15% reservado para Habilidades + excedentes de límites</small></div></div>
    ${characterSection("Capacidades Principales",CHARACTER_TRAITS,core,false,{},limitTraits)}
    ${characterSection("Talentos",talentNames,caps,true,{},{},"")}
    ${characterSection("Conocimientos",knowledgeNames,caps,true,{},{},"")}
    ${characterSection("Árbol de la Energía",CHARACTER_TREE,tree,false,{},limitTree)}
    ${characterSection(uc.donesCategoryName||"Dones",CHARACTER_ELEMENTS,elements,false,Object.fromEntries(CHARACTER_ELEMENTS.map((k,i)=>[k,(uc.donesNames||CHARACTER_ELEMENTS)[i]||k])))}
    ${renderTechniqueSheetSection(d,uc)}
    <section class="profileSection"><div class="profileSectionHead"><h3>Habilidades</h3><span>${(d.skills||[]).length}</span></div><div class="skillList">${(d.skills||[]).map(sk=>`<div class="skillRow"><div><b>${esc(sk.name)}</b><small>${Number(sk.exp||0)} EXP</small></div><div class="skillBar"><span style="width:${Math.min(100,Number(sk.exp||0)/10)}%"></span></div></div>`).join("")||`<span class="muted">Sin habilidades registradas.</span>`}</div></section>
    <section class="profileSection"><div class="profileSectionHead"><h3>Especialidades activadas</h3><span>Talentos y Conocimientos</span></div><div class="specialtyChips">${Object.entries(caps||{}).flatMap(([k,v])=>(v.specialties||[]).map(s=>`<span class="specialtyChip">${esc(k)}: ${esc(s)}</span>`)).join("")||`<span class="muted">Sin especialidades activadas.</span>`}</div></section>
  </div>`;
}
function rollCombinedCharacter(id){
  const trait=$("#rollTrait")?.value,skill=$("#rollSkill")?.value,result=$("#combinedRollResult");if(!trait||!skill||!result)return;
  (async()=>{try{const r=await api("getCharacterProfile",{id});const d=r.data;const t=Math.floor(Number(d.traits?.[trait]?.exp||0)/100);const s=Math.floor(Number(d.capacities?.[skill]?.exp||0)/100);const d10=Math.floor(Math.random()*10)+1;const total=t+s+d10;result.innerHTML=`<b>${total}</b><span>${total*10}%</span><small>${esc(trait)} ${t} + ${esc(skill)} ${s} + D10 ${d10}</small>`;}catch(e){alert(e.message)}})();
}
function renderTechniqueSection(c,d,uc){const techs=d.techniques||[];const p=d.profile||{};const isOwner=String(c?.playerUserId||"")===String(currentUser.userId);const canGM=currentUser.role==="ADMIN"||currentUser.role==="GM";return `<section class="editorCard techniqueLibraryCard"><div class="profileSectionHead"><h3>${esc(uc.techniqueName||"Técnicas")} y Habilidades</h3><span>Biblioteca del universo · ${techs.length} disponible(s)</span></div><p class="muted">Nivel 1–5 · dominio máximo 100/200/300/400/500 EXP · precisión por dominio y hasta 1–5 efectos sobre el campo Efecto.</p><div class="techniqueList">${techs.map(t=>{const cfg=state.characterConfig?.techniqueLevels?.find(x=>Number(x.level)===Number(t.level))||{};const bought=t.owned&&Number(t.characterTechniqueExp||0)>0;return `<div class="techniqueCard"><div><span class="tag">NIVEL ${t.level}</span><h4>${esc(t.name)}</h4><p>${esc(t.description||"Sin descripción")}</p><small>${t.expMax} EXP · precisión +1 cada ${t.precisionStep} EXP · máximo ${t.maxEnergy} ${esc(uc.energyName||"Energía")} · ${t.maxEffects} efecto(s)</small></div><div class="techniqueActions">${isOwner&&!bought?`<button class="btn primary" onclick="buyTechniqueUI('${c.id}','${t.id}')">Comprar · ${t.expMax} EXP</button>`:bought?`<span class="status">ADQUIRIDA</span>`:canGM?`<button class="btn ghost" onclick="assignTechniqueUI('${c.id}','${t.id}')">Asignar</button>`:`<span class="status">DISPONIBLE</span>`}</div></div>`}).join("")||`<div class="empty">No hay técnicas disponibles en este universo.</div>`}</div></section>`;}
function renderTechniqueSheetSection(d,uc){return `<section class="profileSection"><div class="profileSectionHead"><h3>${esc(uc.techniqueName||"Técnicas")} y Habilidades adquiridas</h3><span>${(d.techniques||[]).filter(t=>t.owned&&Number(t.characterTechniqueExp||0)>0).length}</span></div><div class="techniqueList">${(d.techniques||[]).filter(t=>t.owned&&Number(t.characterTechniqueExp||0)>0).map(t=>`<div class="techniqueCard"><div><span class="tag">NIVEL ${t.level}</span><h4>${esc(t.name)}</h4><p>${esc(t.description||"")}</p><small>${t.characterTechniqueExp}/${t.expMax} EXP · precisión máxima ${t.precisionAtMax}</small></div></div>`).join("")||`<span class="muted">Sin técnicas adquiridas.</span>`}</div></section>`;}
function buyTechniqueUI(characterId,techniqueId){(async()=>{try{await api("buyTechnique",{characterId,techniqueId});alert("Técnica adquirida.");characterEditor(characterId)}catch(e){alert(e.message)}})();}
function assignTechniqueUI(characterId,techniqueId){(async()=>{try{await api("assignTechnique",{characterId,techniqueId});alert("Técnica asignada al personaje.");characterEditor(characterId)}catch(e){alert(e.message)}})();}
function drawTechniques(d){
  const can=currentUser.role==="ADMIN"||currentUser.role==="GM";if(!can)return;
  state.techniques=d.techniques||[];state.techniqueUniverses=d.universes||[];
  const universeCards=state.techniqueUniverses.map(u=>`<button class="universeLibraryButton" onclick="openTechniqueUniverse('${esc(u.id)}')"><span>${esc(u.name)}</span><small>${state.techniques.filter(t=>String(t.universeId)===String(u.id)).length} habilidad(es)</small></button>`).join("");
  $("#content").innerHTML=head("Habilidades","Biblioteca separada por universo. Las habilidades se ordenan alfabéticamente dentro de cada universo.",`<button class="btn primary" onclick="techniqueForm()">+ Crear Habilidad</button>`)+`<section class="editorCard"><div class="profileSectionHead"><h3>Universos</h3><span>Selecciona un universo para abrir su biblioteca</span></div><div class="universeLibraryGrid">${universeCards||`<div class="empty">No hay universos disponibles.</div>`}</div></section>`;
}
function openTechniqueUniverse(universeId){
  const u=state.techniqueUniverses.find(x=>String(x.id)===String(universeId)),items=state.techniques.filter(t=>String(t.universeId)===String(universeId)).sort((a,b)=>String(a.name).localeCompare(String(b.name),"es"));
  $("#content").innerHTML=head("Habilidades",esc(u?.name||"Universo"),`<button class="btn ghost" onclick="navigate('techniques')">← Universos</button> <button class="btn primary" onclick="techniqueForm('${esc(universeId)}')">+ Crear Habilidad</button>`)+`<div class="dataList">${items.map(t=>`<div class="dataRow"><div class="main"><b>${esc(t.name)}</b><small>Nivel ${t.level} · ${t.expMax} EXP · máximo ${t.maxEnergy} ${esc(u?.energyName||"Energía")} · ${t.maxEffects} efecto(s)</small><small>${esc(t.description||"Sin descripción")}</small></div><div class="rowActions"><span class="status">${t.active===true||String(t.active)==="true"?"ACTIVA":"INACTIVA"}</span><button class="btn ghost" onclick="editTechniqueForm('${esc(t.id)}')">Editar</button></div></div>`).join("")||`<div class="empty">No hay habilidades creadas en este universo.</div>`}</div>`;
}

function techniqueForm(preselectedUniverse=""){const us=state.techniqueUniverses||[];$("#content").innerHTML=head("Nueva Habilidad","Se guarda dentro de un universo y utiliza el modelo de niveles 1–5.",`<button class="btn ghost" onclick="navigate('techniques')">← Volver</button>`)+`<section class="editorCard"><div class="formGrid compact"><label>Nombre<input id="tecName"></label><label>Universo<select id="tecUniverse">${us.map(u=>`<option value="${esc(u.id)}" ${String(u.id)===String(preselectedUniverse)?"selected":""}>${esc(u.name)}</option>`).join("")}</select></label><label>Nivel<select id="tecLevel">${[1,2,3,4,5].map(l=>`<option value="${l}">Nivel ${l} · ${l*100} EXP · ${l*20} Energía · ${l} efecto(s)</option>`).join("")}</select></label><label class="full">Descripción<textarea id="tecDescription"></textarea></label></div><div class="profileSection"><div class="profileSectionHead"><h3>5 capacidades base del Árbol</h3><span>El campo Efecto se administra mediante los efectos inferiores.</span></div><div class="formGrid compact">${TECHNIQUE_TREE_BASE.map(n=>`<label>${esc(n)}<input class="tecTree" data-name="${n}" type="number" min="0" max="10" step="1" value="0"></label>`).join("")}</div></div><div class="profileSection"><div class="profileSectionHead"><h3>Efectos</h3><span>Máximo según nivel</span></div><div id="tecEffects"></div><button type="button" class="btn" onclick="addTechniqueEffectRow()">+ Añadir efecto</button></div><div class="notice">Costo sugerido por efecto: 4, 8, 12, 16 y 20 de Energía según su posición. El costo total debe quedar dentro del máximo del nivel.</div><div class="formActions"><button class="btn primary" onclick="submitTechnique()">Crear Habilidad</button></div></section>`;$("#tecLevel").onchange=()=>renderTechniqueEffectRows();renderTechniqueEffectRows();}
function renderTechniqueEffectRows(){const level=Number($("#tecLevel")?.value||1),box=$("#tecEffects");if(!box)return;const count=level;box.innerHTML=Array.from({length:count},(_,i)=>`<div class="techEffectRow"><label>Efecto ${i+1}<input class="tecEffectName" data-index="${i}" placeholder="Nombre del efecto"></label><label>Descripción<input class="tecEffectDesc" data-index="${i}" placeholder="Qué hace"></label><label>Modo / regla<input class="tecEffectMode" data-index="${i}" placeholder="Pendiente de definición"></label><label>Costo de Energía<input class="tecEffectCost" data-index="${i}" type="number" min="0" max="100" value="${(i+1)*4}"></label></div>`).join("");}
function addTechniqueEffectRow(){const level=Number($("#tecLevel")?.value||1);if(level<5){$("#tecLevel").value=String(level+1);renderTechniqueEffectRows();}else alert("Nivel 5 ya permite los 5 efectos.");}
function editTechniqueForm(id){
  const t=state.techniques.find(x=>String(x.id)===String(id));if(!t)return alert("Habilidad no encontrada.");
  const us=state.techniqueUniverses||[],tree=JSON.parse(t.treeBaseJson||"{}"),effects=JSON.parse(t.effectsJson||"[]");
  $("#content").innerHTML=head("Editar Habilidad",esc(t.name),`<button class="btn ghost" onclick="openTechniqueUniverse('${esc(t.universeId)}')">← Volver</button>`)+`<section class="editorCard"><div class="formGrid compact"><label>Nombre<input id="tecName" value="${esc(t.name)}"></label><label>Universo<select id="tecUniverse">${us.map(u=>`<option value="${esc(u.id)}" ${String(u.id)===String(t.universeId)?"selected":""}>${esc(u.name)}</option>`).join("")}</select></label><label>Nivel<select id="tecLevel">${[1,2,3,4,5].map(l=>`<option value="${l}" ${Number(t.level)===l?"selected":""}>Nivel ${l} · ${l*100} EXP · ${l*20} Energía · ${l} efecto(s)</option>`).join("")}</select></label><label class="full">Descripción<textarea id="tecDescription">${esc(t.description||"")}</textarea></label></div><div class="profileSection"><div class="profileSectionHead"><h3>5 capacidades base del Árbol</h3><span>El campo Efecto se administra mediante los efectos.</span></div><div class="formGrid compact">${TECHNIQUE_TREE_BASE.map(n=>`<label>${esc(n)}<input class="tecTree" data-name="${n}" type="number" min="0" max="10" step="1" value="${Number(tree[n]||0)}"></label>`).join("")}</div></div><div class="profileSection"><div class="profileSectionHead"><h3>Efectos</h3><span>Máximo según nivel</span></div><div id="tecEffects"></div><button type="button" class="btn" onclick="addTechniqueEffectRow()">+ Añadir efecto</button></div><div class="formActions"><button class="btn primary" onclick="updateTechniqueUI('${esc(t.id)}')">Guardar Habilidad</button></div></section>`;
  $("#tecLevel").onchange=()=>renderTechniqueEffectRows();
  renderTechniqueEffectRows();
  effects.forEach((e,i)=>{const rows=[...document.querySelectorAll(".techEffectRow")];const r=rows[i];if(r){r.querySelector(".tecEffectName").value=e.name||"";r.querySelector(".tecEffectDesc").value=e.description||"";r.querySelector(".tecEffectMode").value=e.mode||"";r.querySelector(".tecEffectCost").value=Number(e.energyCost||0);}});
}
function updateTechniqueUI(id){
  const effects=[...document.querySelectorAll(".techEffectRow")].map((r,i)=>({name:r.querySelector(".tecEffectName")?.value.trim()||`Efecto ${i+1}`,description:r.querySelector(".tecEffectDesc")?.value.trim()||"",mode:r.querySelector(".tecEffectMode")?.value.trim()||"",formula:"",energyCost:Number(r.querySelector(".tecEffectCost")?.value||0)}));
  const tree=Object.fromEntries([...document.querySelectorAll(".tecTree")].map(e=>[e.dataset.name,Number(e.value||0)]));
  const payload={id,name:$("#tecName").value.trim(),universeId:$("#tecUniverse").value,level:Number($("#tecLevel").value),description:$("#tecDescription").value,treeBase:tree,effects,active:true};
  if(!payload.name)return alert("Indica el nombre.");
  (async()=>{try{await api("updateTechnique",payload);alert("Habilidad actualizada.");navigate("techniques")}catch(e){alert(e.message)}})();
}
function submitTechnique(){const effects=[...document.querySelectorAll('.techEffectRow')].map((r,i)=>({name:r.querySelector('.tecEffectName')?.value.trim()||`Efecto ${i+1}`,description:r.querySelector('.tecEffectDesc')?.value.trim()||"",mode:r.querySelector('.tecEffectMode')?.value.trim()||"",formula:"",energyCost:Number(r.querySelector('.tecEffectCost')?.value||0)}));const tree=Object.fromEntries([...document.querySelectorAll('.tecTree')].map(e=>[e.dataset.name,Number(e.value||0)]));const payload={name:$("#tecName").value.trim(),universeId:$("#tecUniverse").value,level:Number($("#tecLevel").value),description:$("#tecDescription").value,treeBase:tree,effects};if(!payload.name)return alert("Indica el nombre.");(async()=>{try{await api('createTechnique',payload);alert('Técnica / habilidad creada.');navigate('techniques')}catch(e){alert(e.message)}})();}
function rollQuickDice(){const input=$("#quickDiceExpr"),out=$("#quickDiceResult");if(!input||!out)return;const expr=input.value.trim().replace(/\s+/g,"");const m=expr.match(/^(\d+)d(\d+)([+-]\d+)?$/i);if(!m){out.textContent="Formato inválido";return;}const count=Math.max(1,Math.min(100,Number(m[1]))),faces=Math.max(2,Math.min(1000,Number(m[2]))),mod=Number(m[3]||0);let rolls=[],sum=0;for(let i=0;i<count;i++){const r=1+Math.floor(Math.random()*faces);rolls.push(r);sum+=r;}out.textContent=`${rolls.join(" + ")}${mod?` ${mod>0?"+":"-"} ${Math.abs(mod)}`:""} = ${sum+mod}`;}
async function tableForm(){
  try{
    const r=await api("dashboard",{view:"universes"});
    const universes=r.data.universes||[];
    $("#content").innerHTML=head("Nueva mesa","Solo puede crearse dentro de un universo administrado por el GM.")+
    `<form id="tf" class="formGrid">
      ${field("Nombre","name")}
      <label>Universo<select name="universeId" required><option value="">Seleccionar universo...</option>${universes.map(u=>`<option value="${esc(u.id)}">${esc(u.name)}</option>`).join("")}</select></label>
      <label class="full">Descripción<textarea name="description"></textarea></label>
      <div class="full formActions"><button class="btn primary">Crear mesa</button></div>
    </form>`;
    $("#tf").onsubmit=async e=>{
      e.preventDefault();
      try{
        await api("createTable",formData(e.target));
        navigate("tables");
        loadPublic();
      }catch(x){alert(x.message)}
    };
  }catch(e){$("#content").innerHTML=`<div class="notice danger">${esc(e.message)}</div>`}
}

async function sessionForm(){
  try{
    const r=await api("dashboard",{view:"sessions"});
    const tableChars=r.data.tableCharacters||{};
    const tables=Object.keys(tableChars).map(id=>({id,name:(r.data.sessions.find(x=>String(x.tableId)===String(id))?.tableName||id)}));
    const tableOptions=tables.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join("");
    const firstTable=tables[0]?.id||"";
    const participantHtml=id=>(tableChars[id]||[]).map(c=>`<label class="choiceCard participantChoice"><input type="checkbox" name="characterIds" value="${esc(c.id)}"><span><b>${esc(c.name)}</b><small>${esc(c.playerUsername||"")} · ${esc(c.characterCode||"")}</small></span></label>`).join("")||`<div class="empty">Esta mesa todavía no tiene personajes miembros.</div>`;
    const renderParticipants=()=>{const id=$("#sfTable")?.value||firstTable;const box=$("#sessionParticipants");if(box)box.innerHTML=participantHtml(id)};
    $("#content").innerHTML=head("Nueva sesión","Una sesión es una reunión temporal. Puedes declarar participantes concretos; si no seleccionas ninguno, al cerrar se considera a todos los miembros activos de la mesa.")+`<form id="sf" class="formGrid"><label>Mesa<select id="sfTable" name="tableId" required>${tableOptions}</select></label>${field("Título","title")}${field("Inicio","startAt","datetime-local")}${field("Término","endAt","datetime-local")}${field("Módulo / capítulo","moduleTitle")}<label>Modalidad<select name="medium"><option value="ONLINE">ONLINE</option><option value="PRESENCIAL">PRESENCIAL</option></select></label><div class="full"><div class="profileSectionHead"><h3>Participantes invitados</h3><span>Opcional</span></div><div id="sessionParticipants" class="choiceGrid"></div></div><div class="full formActions"><button class="btn primary">Crear sesión</button></div></form>`;
    $("#sfTable").onchange=renderParticipants;renderParticipants();
    $("#sf").onsubmit=async e=>{e.preventDefault();try{const fd=formData(e.target);fd.characterIds=[...e.target.querySelectorAll('input[name="characterIds"]:checked')].map(x=>x.value);await api("createSession",fd);navigate("sessions")}catch(x){alert(x.message)}};
  }catch(e){$("#content").innerHTML=`<div class="notice danger">${esc(e.message)}</div>`}
}
async function logout(){try{await api("logout")}catch(e){}localStorage.removeItem("VROL_TOKEN");localStorage.removeItem("VROL_USER");token="";currentUser=null;window.location.href="index.html"}

document.addEventListener("DOMContentLoaded",()=>ensureVROLLoader());

if($("#authApp")){
  if(!token||!currentUser){window.location.href="index.html";}
  else{
    try{
      renderShell();
      const initial=(location.hash||"#dashboard").slice(1)||"dashboard";
      navigate(initial,false);
    }catch(err){
      const content=$("#content");
      if(content) content.innerHTML=`<div class="notice danger"><b>Error al cargar el panel.</b><br>${esc(err.message||err)}</div>`;
      console.error("VROL app boot:",err);
    }
  }
}else{
  loadPublic();
}