const API=localStorage.getItem("VROL_API")||"https://script.google.com/macros/s/AKfycbx0N2kVzt6DZK4Nofz9T--JuaqLzKODr4i6i0zUm9IWikxJUCuXtElXqcBjv7JCrAOC/exec";
let token=localStorage.getItem("VROL_TOKEN")||"", currentUser=null, state={};

const $=s=>document.querySelector(s);
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function showLogin(){$("#loginModal").classList.remove("hidden");$("#loginUser").focus()}
function hideLogin(){$("#loginModal").classList.add("hidden")}
function closePanel(){$("#panelModal").classList.add("hidden")}
async function api(action,data={}){
  if(API.includes("PEGAR_URL")) throw new Error("Configura la URL /exec de Apps Script en app.js.");
  const r=await fetch(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action,...data,token})});
  const j=await r.json();
  if(!j.ok) throw new Error(j.error||"Error de API");
  return j;
}
async function loadPublic(){
  try{
    const r=await api("publicData"); renderPublic(r.data);
  }catch(e){console.warn(e.message)}
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

$("#loginForm").addEventListener("submit",async e=>{
  e.preventDefault();$("#loginError").textContent="";
  try{const r=await api("login",{username:$("#loginUser").value.trim(),password:$("#loginPass").value});
    token=r.token;currentUser=r.user;localStorage.setItem("VROL_TOKEN",token);hideLogin();openPanel();
  }catch(x){$("#loginError").textContent=x.message}
});

function openPanel(){ $("#panelModal").classList.remove("hidden"); renderShell(); navigate("dashboard"); }
function renderShell(){
  const menus=currentUser.role==="ADMIN"
    ? [["dashboard","Inicio"],["users","Usuarios"],["universes","Universos"],["characters","Personajes"],["tables","Mesas"],["sessions","Sesiones"],["site","Index / CMS"],["settings","Configuración"],["audit","Auditoría"]]
    : currentUser.role==="GM"
    ? [["dashboard","Inicio"],["universes","Mis universos"],["characters","Personajes"],["tables","Mis mesas"],["sessions","Sesiones"]]
    : [["dashboard","Inicio"],["characters","Mis personajes"],["tables","Mesas"],["sessions","Sesiones"]];
  $("#panel").innerHTML=`<div class="panel"><aside class="side"><h3>VROL</h3><div class="user"><b>${esc(currentUser.username)}</b><small>${esc(currentUser.role)} · Player ${currentUser.playerLevel} · GM ${currentUser.gmLevel}</small></div>
  ${menus.map(m=>`<button class="sideBtn" data-view="${m[0]}" onclick="navigate('${m[0]}')">${m[1]}</button>`).join("")}
  <button class="sideBtn" onclick="logout()">Cerrar sesión</button></aside><main class="content" id="content"></main></div>`;
}
async function navigate(view){
  document.querySelectorAll(".sideBtn").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  $("#content").innerHTML=`<div class="notice">Cargando...</div>`;
  try{const r=await api("dashboard",{view});state=r.data;draw(view,r.data)}catch(e){$("#content").innerHTML=`<div class="notice danger">${esc(e.message)}</div>`}
}
function head(title,sub,button=""){return `<div class="contentHeader"><div><h1>${title}</h1><p class="muted">${sub}</p></div>${button}</div>`}
function draw(view,d){
 if(view==="dashboard")return $("#content").innerHTML=head("Panel VROL","Resumen de tu actividad y permisos.")+`<div class="kpis">${Object.entries(d.stats).map(([k,v])=>`<div class="kpi"><strong>${v}</strong><span>${esc(k)}</span></div>`).join("")}</div><div class="notice"><b>Tu identidad:</b> ${esc(currentUser.role)} · Player Level ${currentUser.playerLevel} · GM Level ${currentUser.gmLevel}</div>`;
 if(view==="users")return drawUsers(d);
 if(view==="universes")return drawUniverses(d);
 if(view==="characters")return drawCharacters(d);
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
function drawCharacters(d){$("#content").innerHTML=head("Personajes","Los personajes pertenecen a un universo y no reciben nivel en VROL Core.",currentUser.role!=="PLAYER"?`<button class="btn primary" onclick="characterForm()">+ Personaje</button>`:"")+`<div class="dataList">${d.characters.map(c=>`<div class="dataRow"><div class="main"><b>${esc(c.name)}</b><small>Código ${esc(c.characterCode)} · ${esc(c.universeName)} · Jugador: ${esc(c.playerUsername||"Sin asignar")}</small></div><div class="rowActions"><span class="status">${esc(c.status)}</span><button class="btn ghost" onclick='openCharacterSheet(${JSON.stringify(c)})'>Ver ficha</button></div></div>`).join("")||`<div class="empty">No hay personajes.</div>`}</div>`}
function drawTables(d){$("#content").innerHTML=head("Mesas","Cada mesa pertenece a un universo. El acceso es privado.",currentUser.role!=="PLAYER"?`<button class="btn primary" onclick="tableForm()">+ Mesa</button>`:"")+`<div class="dataList">${d.tables.map(t=>`<div class="dataRow"><div class="main"><b>${esc(t.name)}</b><small>${esc(t.universeName)} · GM ${esc(t.gmUsername)} · ${t.playerCount} jugador(es)</small></div><span class="status">${esc(t.status)}</span></div>`).join("")||`<div class="empty">No hay mesas.</div>`}</div>`}
function drawSessions(d){$("#content").innerHTML=head("Sesiones","Reuniones temporales pertenecientes a una mesa.",currentUser.role!=="PLAYER"?`<button class="btn primary" onclick="sessionForm()">+ Sesión</button>`:"")+`<div class="dataList">${d.sessions.map(s=>`<div class="dataRow"><div class="main"><b>${esc(s.title)}</b><small>${esc(s.tableName)} · ${esc(s.moduleTitle||"Sin módulo")} · ${esc(s.startAt)} → ${esc(s.endAt)} · ${esc(s.medium)}</small></div><span class="status">${s.durationMinutes} min</span></div>`).join("")||`<div class="empty">No hay sesiones.</div>`}</div>`}
function drawSite(d){$("#content").innerHTML=head("Index / CMS","Administra el contenido público sin editar HTML.")+`
<div class="two"><div><h3>Banners · máximo 5</h3><form id="bannerForm" class="formGrid">${field("Título","title")}${field("Imagen URL 2:1","imageUrl","url")}<div class="full formActions"><button class="btn primary">Agregar banner</button></div></form></div>
<div><h3>Videos · máximo 4</h3><form id="videoForm" class="formGrid">${field("Título","title")}${field("YouTube URL","youtubeUrl","url")}<div class="full formActions"><button class="btn primary">Agregar video</button></div></form></div></div>
<h3>Publicación</h3><form id="postForm" class="formGrid">${field("Título","title")}${field("Imagen URL","imageUrl","url")}${field("Destino web","linkUrl","url")}<label class="full">Descripción<textarea name="description"></textarea></label><label>Publicación principal<select name="featured"><option value="false">No</option><option value="true">Sí</option></select></label><div class="full formActions"><button class="btn primary">Publicar</button></div></form>
<div class="notice">Los cambios se escriben directamente en Google Sheets mediante Apps Script y se reflejan en el Index al recargar.</div>`;
$("#bannerForm").onsubmit=async e=>{e.preventDefault();await api("createBanner",formData(e.target));navigate("site")};
$("#videoForm").onsubmit=async e=>{e.preventDefault();await api("createVideo",formData(e.target));navigate("site")};
$("#postForm").onsubmit=async e=>{e.preventDefault();await api("createPost",formData(e.target));navigate("site")}}
function drawSettings(d){$("#content").innerHTML=head("Configuración","Parámetros globales administrados por Admin.")+`<form id="settingsForm" class="formGrid">${field("Nivel GM mínimo para crear universo","minGMUniverseLevel","number")}<div class="full formActions"><button class="btn primary">Guardar configuración</button></div></form>`;$("#settingsForm").elements.minGMUniverseLevel.value=d.minGMUniverseLevel;$("#settingsForm").onsubmit=async e=>{e.preventDefault();await api("saveSettings",formData(e.target));alert("Configuración guardada")}}
function drawAudit(d){$("#content").innerHTML=head("Auditoría","Registro de acciones administrativas y operacionales.")+`<div class="dataList">${d.logs.map(x=>`<div class="dataRow"><div class="main"><b>${esc(x.action)}</b><small>${esc(x.username)} · ${esc(x.timestamp)} · ${esc(x.detail)}</small></div><span class="mini">${esc(x.role)}</span></div>`).join("")}</div>`}
function field(label,name,type="text"){return `<label>${label}<input name="${name}" type="${type}" required></label>`}
function formData(f){return Object.fromEntries(new FormData(f).entries())}
function userForm(){ $("#content").innerHTML=head("Nuevo usuario","Crea una identidad VROL.")+`<form id="uf" class="formGrid">${field("Usuario","username")}${field("Contraseña","password","password")}<label>Rol<select name="role"><option>PLAYER</option><option>GM</option><option>ADMIN</option></select></label>${field("Player Level 0-100","playerLevel","number")}${field("GM Level 0-100","gmLevel","number")}<div class="full formActions"><button class="btn primary">Crear usuario</button></div></form>`;$("#uf").onsubmit=async e=>{e.preventDefault();try{await api("createUser",formData(e.target));navigate("users")}catch(x){alert(x.message)}}}
function gmOptionsHtml(selected=""){
  const options=state.universeGMOptions||[];
  return `<label>GM principal<select name="primaryGMUsername"><option value="">Por definir</option>${options.map(g=>`<option value="${esc(g.username)}" ${String(g.username)===String(selected)?"selected":""}>${esc(g.username)} · GM ${esc(g.gmLevel)}</option>`).join("")}</select></label>`;
}
function universeForm(){
  $("#content").innerHTML=head("Nuevo universo","Admin puede crear libremente. GM requiere el nivel configurado.")+`<form id="uf" class="formGrid">
  ${field("Nombre","name")}
  ${gmOptionsHtml()}
  <label>Imagen del universo (URL)<input name="imageUrl" type="url" placeholder="https://..." ></label>
  <label class="full">Descripción<textarea name="description"></textarea></label>
  <div class="full formActions"><button class="btn primary">Crear universo</button></div></form>`;
  $("#uf").onsubmit=async e=>{e.preventDefault();try{await api("createUniverse",formData(e.target));navigate("universes");loadPublic()}catch(x){alert(x.message)}}}
async function editUniverse(id){
  const r=await api("getUniverse",{id}),u=r.data;
  $("#content").innerHTML=head("Administrar universo",esc(u.name))+`<form id="uf" class="formGrid">
  ${gmOptionsHtml(u.primaryGMUsername)}
  <label>Imagen del universo (URL)<input name="imageUrl" type="url" value="${esc(u.imageUrl||"")}" placeholder="https://..." ></label>
  <label>Estado<select name="status"><option>ACTIVE</option><option>INACTIVE</option></select></label>
  <label class="full">Descripción<textarea name="description">${esc(u.description||"")}</textarea></label>
  <div class="full formActions"><button class="btn primary">Guardar cambios</button><button type="button" class="btn" onclick="deleteUniverse('${u.id}')">Eliminar</button></div></form>`;
  $("#uf").elements.status.value=u.status;
  $("#uf").onsubmit=async e=>{e.preventDefault();try{await api("updateUniverse",{id,...formData(e.target)});navigate("universes");loadPublic()}catch(x){alert(x.message)}}}
async function deleteUniverse(id){if(confirm("Se marcará como eliminado y se conservará el registro.")){await api("deleteUniverse",{id});navigate("universes");loadPublic()}}
function characterForm(){ $("#content").innerHTML=head("Nuevo personaje","El personaje nace dentro de un universo y no tiene nivel VROL Core.")+`<form id="cf" class="formGrid">${field("Nombre","name")}${field("Jugador (username)","playerUsername")}${field("Universo (ID)","universeId")}<label class="full">Descripción<textarea name="description"></textarea></label><div class="full formActions"><button class="btn primary">Crear personaje</button></div></form>`;$("#cf").onsubmit=async e=>{e.preventDefault();try{const r=await api("createCharacter",formData(e.target));alert("Personaje creado. Código: "+r.characterCode);navigate("characters")}catch(x){alert(x.message)}}}

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
const CHARACTER_ELEMENTS=["Material","Inmaterial","Especial","Mixto","Liberado","Agua","Fuego","Rayo","Tierra","Viento"];

function charStorageKey(c){return "VROL_CHARACTER_PROFILE_"+String(c.id||c.characterCode||c.name)}
function defaultCharacterProfile(c){
  const blank=()=>({exp:0,domain:0,base:0});
  return {
    identity:{name:c.name||"",age:c.age||"",rank:c.rank||"",history:c.history||"",imageUrl:c.imageUrl||""},
    traits:Object.fromEntries(CHARACTER_TRAITS.map(x=>[x,blank()])),
    capacities:Object.fromEntries(CHARACTER_CAPACITIES.map(x=>[x,blank()])),
    specialties:{},
    tree:Object.fromEntries(CHARACTER_TREE.map(x=>[x,blank()])),
    elements:Object.fromEntries(CHARACTER_ELEMENTS.map(x=>[x,blank()])),
    healthExp:0, energyExp:0
  };
}
function getCharacterProfile(c){
  try{
    const saved=JSON.parse(localStorage.getItem(charStorageKey(c))||"null");
    return saved||defaultCharacterProfile(c);
  }catch(e){return defaultCharacterProfile(c)}
}
function domainBase(exp){
  const n=Math.max(0,Math.min(1000,Number(exp)||0));
  return {exp:n,domain:Math.round(n/10),base:n===0?0:Math.min(10,Math.ceil(n/100))};
}
function domainBar(domain){return `<div class="domainBar"><span style="width:${Math.max(0,Math.min(100,Number(domain)||0))}%"></span></div>`}
function profileStatRow(name,obj){
  const v=obj||domainBase(0);
  return `<div class="profileStat"><div class="profileStatName">${esc(name)}</div><div class="profileStatValue"><b>${v.base}</b><span>${v.domain}%</span></div>${domainBar(v.domain)}</div>`;
}
function profileSection(title, items, profile, key){
  return `<section class="profileSection"><div class="profileSectionHead"><h3>${esc(title)}</h3><span>EXP 0–1000</span></div><div class="profileStats">${items.map(n=>profileStatRow(n,profile[key]?.[n])).join("")}</div></section>`;
}
function calcCharacterDerived(profile){
  const r=profile.traits||{};
  const resistencia=r["Resistencia"]?.base||0;
  const aura=r["Aura"]?.base||0;
  const voluntad=r["Voluntad"]?.base||0;
  const health=Math.round(resistencia*aura*(Number(profile.healthExp||0)/100));
  const energy=Math.round(voluntad*aura*(Number(profile.energyExp||0)/100));
  return {health,energy};
}
function openCharacterSheet(c){
  const p=getCharacterProfile(c), d=calcCharacterDerived(p);
  const specialties=Object.entries(p.specialties||{}).map(([k,v])=>`<span class="specialtyChip">${esc(k)}: ${esc(v)}</span>`).join("")||`<span class="muted">Sin especialidades seleccionadas.</span>`;
  $("#content").innerHTML=head("Ficha de personaje",esc(c.name),`<button class="btn ghost" onclick="navigate('characters')">← Volver</button>`)+`
  <div class="characterSheet">
    <div class="profileHero">
      <div class="profilePortrait">${p.identity.imageUrl?`<img src="${esc(p.identity.imageUrl)}" alt="Imagen de ${esc(c.name)}">`:`<div>VROL</div>`}</div>
      <div class="profileIdentity">
        <span class="tag">PERSONAJE · ${esc(c.status)}</span>
        <h2>${esc(p.identity.name||c.name)}</h2>
        <p>${esc(p.identity.rank||"Rango no definido")} · ${esc(c.universeName||"Universo")}</p>
        <small>Código: ${esc(c.characterCode)} · Jugador: ${esc(c.playerUsername||"Sin asignar")}</small>
        <p class="profileHistory">${esc(p.identity.history||c.description||"Sin historia registrada.")}</p>
      </div>
    </div>
    <div class="derivedGrid">
      <div class="derivedCard"><span>Salud máxima</span><b>${d.health}</b><small>EXP Salud: ${Number(p.healthExp||0)} / 1000</small></div>
      <div class="derivedCard"><span>Energía máxima</span><b>${d.energy}</b><small>EXP Energía: ${Number(p.energyExp||0)} / 1000</small></div>
    </div>
    ${profileSection("Rasgos Principales",CHARACTER_TRAITS,p,"traits")}
    ${profileSection("Técnicas y Talentos de Combate",CHARACTER_CAPACITIES.slice(0,8),p,"capacities")}
    ${profileSection("Conocimientos Principales",CHARACTER_CAPACITIES.slice(8),p,"capacities")}
    <section class="profileSection"><div class="profileSectionHead"><h3>Especialidades</h3><span>4 por capacidad</span></div><div class="specialtyGrid">${CHARACTER_CAPACITIES.map(k=>`<div class="specialtyBox"><b>${esc(k)}</b><div>${CHARACTER_SPECIALTIES[k].map(s=>`<button class="specialtyOption ${p.specialties?.[k]===s?"selected":""}" onclick='selectCharacterSpecialty(${JSON.stringify(c)},${JSON.stringify(k)},${JSON.stringify(s)})'>${esc(s)}</button>`).join("")}</div></div>`).join("")}</div></section>
    ${profileSection("Árbol de Energía",CHARACTER_TREE,p,"tree")}
    <section class="profileSection"><div class="profileSectionHead"><h3>Elementos / Dones</h3><span>10 dimensiones</span></div><div class="elementGrid">${CHARACTER_ELEMENTS.map(n=>`<div class="elementCard"><span>${esc(n)}</span><b>${p.elements?.[n]?.base||0}</b><small>${p.elements?.[n]?.domain||0}%</small></div>`).join("")}</div></section>
    <section class="profileSection"><div class="profileSectionHead"><h3>Dados</h3><span>Visual de tiradas</span></div>
      <div class="dicePanel">
        <div><select id="diceTrait">${CHARACTER_TRAITS.map(x=>`<option>${esc(x)}</option>`).join("")}</select>
        <select id="diceCapacity">${CHARACTER_CAPACITIES.map(x=>`<option>${esc(x)}</option>`).join("")}</select>
        <select id="diceSpecialty"><option value="">Sin especialidad</option></select>
        <button class="btn primary" onclick='rollCharacterDie(${JSON.stringify(c)})'>Tirar D10</button></div>
        <div id="diceResult" class="diceResult">Esperando tirada…</div>
      </div>
    </section>
  </div>`;
  const cap=$("#diceCapacity");
  const sp=$("#diceSpecialty");
  function refreshSpecialties(){
    sp.innerHTML=`<option value="">Sin especialidad</option>`+(CHARACTER_SPECIALTIES[cap.value]||[]).map(s=>`<option>${esc(s)}</option>`).join("");
  }
  cap.onchange=refreshSpecialties; refreshSpecialties();
}
function selectCharacterSpecialty(c,capacity,specialty){
  const p=getCharacterProfile(c);
  p.specialties=p.specialties||{};
  p.specialties[capacity]=specialty;
  localStorage.setItem(charStorageKey(c),JSON.stringify(p));
  openCharacterSheet(c);
}
function rollCharacterDie(c){
  const p=getCharacterProfile(c);
  const trait=$("#diceTrait").value, capacity=$("#diceCapacity").value, specialty=$("#diceSpecialty").value;
  const traitBase=p.traits?.[trait]?.base||0, capBase=p.capacities?.[capacity]?.base||0;
  let min=1;
  if(specialty){
    const dom=p.capacities?.[capacity]?.domain||0;
    min=dom<=20?1:dom<=40?2:dom<=60?3:dom<=80?4:5;
  }
  const d10=Math.floor(Math.random()*(11-min))+min;
  const total=traitBase+capBase+d10;
  $("#diceResult").innerHTML=`<div class="diceNumber">${d10}</div><div><b>${esc(trait)} ${traitBase} + ${esc(capacity)} ${capBase} + D10 ${d10}</b><br><span>Resultado total: <strong>${total}</strong>${specialty?` · Especialidad: ${esc(specialty)} (mín. D10 ${min})`:""}</span></div>`;
}

function tableForm(){ $("#content").innerHTML=head("Nueva mesa","Solo puede crearse dentro de un universo administrado por el GM.") + `<form id="tf" class="formGrid">${field("Nombre","name")}${field("Universo (ID)","universeId")}<label class="full">Descripción<textarea name="description"></textarea></label><div class="full formActions"><button class="btn primary">Crear mesa</button></div></form>`;$("#tf").onsubmit=async e=>{e.preventDefault();try{await api("createTable",formData(e.target));navigate("tables");loadPublic()}catch(x){alert(x.message)}}}
function sessionForm(){ $("#content").innerHTML=head("Nueva sesión","Una sesión es una reunión temporal de una mesa.") + `<form id="sf" class="formGrid">${field("Mesa (ID)","tableId")}${field("Título","title")}${field("Inicio","startAt","datetime-local")}${field("Término","endAt","datetime-local")}${field("Módulo / capítulo","moduleTitle")}<label>Modalidad<select name="medium"><option>ONLINE</option><option>PRESENCIAL</option></select></label><div class="full formActions"><button class="btn primary">Crear sesión</button></div></form>`;$("#sf").onsubmit=async e=>{e.preventDefault();try{await api("createSession",formData(e.target));navigate("sessions")}catch(x){alert(x.message)}}}
async function logout(){try{await api("logout")}catch(e){}localStorage.removeItem("VROL_TOKEN");token="";currentUser=null;closePanel()}
loadPublic();