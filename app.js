const API=localStorage.getItem("VROL_API")||"PEGAR_URL_APPS_SCRIPT_AQUI";
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
function drawCharacters(d){
  const canCreate=currentUser.role!=="PLAYER"||true;
  $("#content").innerHTML=head("Personajes","Ficha base VROL · los personajes pertenecen a un universo.",`<button class="btn primary" onclick="characterForm()">+ Crear personaje</button>`)+`<div class="dataList">${d.characters.map(c=>`<div class="dataRow characterRow"><div class="main"><b>${esc(c.name)}</b><small>Código ${esc(c.characterCode)} · ${esc(c.universeName)} · Jugador: ${esc(c.playerUsername||"Sin asignar")}</small></div><div><span class="status">${esc(c.status)}</span> <button class="btn ghost" onclick="viewCharacter('${c.id}')">Abrir ficha</button></div></div>`).join("")||`<div class="empty">No hay personajes.</div>`}</div>`;
}
async function viewCharacter(id){
  try{const r=await api("getCharacter",{id});drawCharacterProfile(r.data)}catch(e){alert(e.message)}
}
const CHARACTER_TRAITS=["Fuerza","Velocidad","Resistencia","Inteligencia","Voluntad","Aura"];
const CHARACTER_CAPS=["Alerta","Armas","Atletismo","Carisma","Combate","Emocion","Expresion","Sigilo","Ciencias","Cocina","Comercio","Investigacion","Historia","Ocultismo","Politica","Supervivencia"];
const CHARACTER_TREE=["Poder","Forma","Cantidad","Rapidez","Distancia","Efecto"];
const CHARACTER_ELEMENTS=["Material","Inmaterial","Especial","Mixto","Liberado","Agua","Fuego","Rayo","Tierra","Viento"];
const SPECIALTIES={Alerta:["Percepción","Reacción","Vigilancia","Detección"],Armas:["Cuerpo","Proyectiles","Defensa","Desarme"],Atletismo:["Carrera","Salto","Acrobacia","Escalada"],Carisma:["Persuasión","Liderazgo","Engaño","Intimidación"],Combate:["Ataque","Defensa","Táctica","Desarme"],Emocion:["Empatía","Control","Convicción","Manipulación"],Expresion:["Oratoria","Actuación","Música","Escritura"],Sigilo:["Ocultación","Infiltración","Emboscada","Escape"],Ciencias:["Física","Ingeniería","Medicina","Tecnología"],Cocina:["Gastronomía","Nutrición","Conservación","Repostería"],Comercio:["Negociación","Ventas","Finanzas","Logística"],Investigacion:["Análisis","Interrogación","Forense","Rastreo"],Historia:["Arqueología","Genealogía","Cronología","Antigüedad"],Ocultismo:["Ninjutsu","Hechicería","Secretismo","Religiones"],Politica:["Diplomacia","Gobierno","Estrategia","Intriga"],Supervivencia:["Ciudades","Militar","Intemperie","Bestias"]};
function pctBase(x){const d=Math.max(0,Math.min(100,Number(x?.domain||0)));return Math.max(1,Math.min(10,Math.ceil(d/10)||1))}
function barHTML(label,item,kind){const domain=Math.max(0,Math.min(100,Number(item?.domain||0)));const base=kind==="element"?Math.max(1,Math.min(10,Number(item?.base||pctBase(item)))):Math.max(1,Math.min(10,Number(item?.base||pctBase(item))));return `<div class="statCard"><div class="statTop"><b>${esc(label)}</b><span>${base} / 10</span></div><div class="progress"><i style="width:${domain}%"></i></div><div class="statBottom"><span>${domain}% dominio</span><span>EXP ${Math.round(domain*10)} / 1000</span></div></div>`}
function drawCharacterProfile(c){
  const p=c.profile||{};
  const traits=p.traits||{},caps=p.capacities||{},tree=p.tree||{},els=p.elements||{};
  $("#content").innerHTML=head(`Ficha: ${esc(c.name)}`,`${esc(c.universeName)} · ${esc(c.characterCode)}`,`<button class="btn ghost" onclick="navigate('characters')">← Volver</button>`)+`
  <div class="characterHero"><div class="characterPortrait">${c.imageUrl?`<img src="${esc(c.imageUrl)}" alt="${esc(c.name)}">`:`<div>VROL</div>`}</div><div><span class="tag">${esc(c.characterCode)}</span><h2>${esc(c.name)}</h2><p>${esc(c.description||"Sin descripción.")}</p><div class="characterMeta"><span>Edad: ${c.age||"—"}</span><span>Rango: ${esc(c.rank||"—")}</span><span>Jugador: ${esc(c.playerUsername||"—")}</span></div></div></div>
  <div class="characterTabs"><button class="sideBtn active" onclick="characterSection('inform',this)">Inform</button><button class="sideBtn" onclick="characterSection('salud',this)">Salud</button><button class="sideBtn" onclick="characterSection('rasgos',this)">Rasgos</button><button class="sideBtn" onclick="characterSection('conoci',this)">Conocimientos</button><button class="sideBtn" onclick="characterSection('arbol',this)">Árbol</button><button class="sideBtn" onclick="characterSection('elementos',this)">Elementos</button><button class="sideBtn" onclick="characterSection('dados',this)">Dados</button></div>
  <div id="characterSection"></div>`;
  window._character={...c,profile:p};characterSection('inform');
}
function characterSection(which,btn){
  document.querySelectorAll('.characterTabs .sideBtn').forEach(x=>x.classList.remove('active'));if(btn)btn.classList.add('active');
  const c=window._character,p=c.profile||{},el=$("#characterSection");
  if(which==='inform')return el.innerHTML=`<div class="profileBlock"><h3>Historia</h3><p class="longText">${esc(c.history||"Sin historia registrada.")}</p></div><div class="notice">La ficha base separa identidad, estado y progresión mecánica. El nivel de personaje no pertenece al VROL Core.</div>`;
  if(which==='salud')return el.innerHTML=healthPanel(c);
  if(which==='rasgos')return el.innerHTML=`<div class="sectionMini"><h3>Rasgos Principales</h3><div class="statGrid">${CHARACTER_TRAITS.map(k=>barHTML(k,p.traits?.[k]||{},'trait')).join('')}</div></div>`;
  if(which==='conoci')return el.innerHTML=`<div class="sectionMini"><h3>Talentos y Conocimientos</h3><div class="statGrid">${CHARACTER_CAPS.map(k=>barHTML(k,p.capacities?.[k]||{},'cap')).join('')}</div></div><div class="specialtyGrid">${CHARACTER_CAPS.map(k=>`<div class="specialtyCard"><b>${esc(k)}</b><div>${(SPECIALTIES[k]||[]).map((sp,i)=>`<span class="specialty">${esc(sp)} · ${specialtyMinFor(p.capacities?.[k]?.domain||0)}</span>`).join('')}</div></div>`).join('')}</div>`;
  if(which==='arbol')return el.innerHTML=`<div class="sectionMini"><h3>Árbol de Energía</h3><div class="statGrid">${CHARACTER_TREE.map(k=>barHTML(k,p.tree?.[k]||{},'tree')).join('')}</div><div class="notice">Máximo natural por nodo: 10. El Árbol completo tiene 60 puntos estructurales.</div></div>`;
  if(which==='elementos')return el.innerHTML=`<div class="sectionMini"><h3>Elementos / Dones</h3><div class="statGrid">${CHARACTER_ELEMENTS.map(k=>barHTML(k,p.elements?.[k]||{},'element')).join('')}</div><div class="notice">Los elementos son propios del universo. Esta ficha base incorpora los 10 elementos definidos para la beta.</div></div>`;
  if(which==='dados'){el.innerHTML=dicePanel(c);$("#diceCap").addEventListener('change',refreshDiceSpecs);return;}
}
function healthPanel(c){const p=c.profile||{},r=p.traits?.Resistencia?.base||1,a=p.traits?.Aura?.base||1,w=p.traits?.Voluntad?.base||1;const health=r*a*10,energy=w*a*10;return `<div class="healthGrid"><div class="healthCard"><span>Salud máxima</span><b>${health}</b><small>Resistencia × Aura × (1000/100)</small></div><div class="healthCard"><span>Energía máxima</span><b>${energy}</b><small>Voluntad × Aura × (1000/100)</small></div></div><div class="bodyGrid">${[['Cabeza',10],['Brazo izquierdo',10],['Brazo derecho',10],['Pierna izquierda',15],['Pierna derecha',15],['Torso',40]].map(x=>`<div class="bodyPart"><b>${x[0]}</b><span>${Math.round(health*x[1]/100)} / ${Math.round(health*x[1]/100)}</span><small>${x[1]}%</small></div>`).join('')}</div><div class="notice">La distribución corporal de Salud sigue la estructura del PDF: cabeza 10%, brazos 10% cada uno, piernas 15% cada una y torso 40%.</div>`}
function specialtyMinFor(domain){const d=Number(domain||0);return d<=20?1:d<=40?2:d<=60?3:d<=80?4:5}
function dicePanel(c){const p=c.profile||{};return `<div class="dicePanel"><div class="diceHeader"><span>VROL · SISTEMA DE TIRADAS</span><b>Tirada = Rasgo + Capacidad + D10</b></div><div class="diceGrid"><label>Rasgo<select id="diceTrait">${CHARACTER_TRAITS.map(k=>`<option>${esc(k)}</option>`).join('')}</select></label><label>Capacidad<select id="diceCap">${CHARACTER_CAPS.map(k=>`<option>${esc(k)}</option>`).join('')}</select></label><label>Especialidad<select id="diceSpec"><option value="">Sin especialidad</option>${(SPECIALTIES[CHARACTER_CAPS[0]]||[]).map(s=>`<option>${esc(s)}</option>`).join('')}</select></label><button class="btn primary" onclick="rollCharacterDice()">Lanzar D10</button></div><div class="diceResult"><div class="d10">?</div><div><span>Resultado</span><strong id="diceTotal">—</strong><small id="diceBreakdown">Selecciona una combinación y lanza.</small></div></div><div class="notice">Una especialidad no suma +2/+3/+4/+5: eleva el mínimo del D10 según su dominio. Un 1 puede ser una complicación severa y un 10 no es crítico universal.</div></div>`}
function refreshDiceSpecs(){const cap=$("#diceCap")?.value;if(!cap)return;$("#diceSpec").innerHTML=`<option value="">Sin especialidad</option>${(SPECIALTIES[cap]||[]).map(s=>`<option>${esc(s)}</option>`).join('')}`}
async function rollCharacterDice(){const c=window._character,p=c.profile||{};refreshDiceSpecs();const t=$("#diceTrait").value,cap=$("#diceCap").value,spec=$("#diceSpec").value;const trait=Number(p.traits?.[t]?.base||1),capacity=Number(p.capacities?.[cap]?.base||1),domain=Number(p.capacities?.[cap]?.domain||0);let d10=Math.floor(Math.random()*10)+1;if(spec)d10=Math.max(d10,specialtyMinFor(domain));const total=trait+capacity+d10;$(".d10").textContent=d10;$("#diceTotal").textContent=total;$("#diceBreakdown").textContent=`${t} ${trait} + ${cap} ${capacity} + D10 ${d10}${spec?` · ${spec} · mínimo ${specialtyMinFor(domain)}`:''}`}
async function characterForm(){
  const universeData=state.universes?.length?state.universes:(await api("dashboard",{view:"universes"})).data.universes||[]; state.universes=universeData;
  if(currentUser.role!=="PLAYER"){try{state.users=state.users?.length?state.users:(await api("dashboard",{view:"users"})).data.users}catch(e){}}
  const universeOptions=(universeData||[]).map(u=>`<option value="${esc(u.id)}">${esc(u.name)}</option>`).join('');
  const playerOptions=(state.users||[]).filter(u=>u.role==='PLAYER'&&u.active).map(u=>`<option value="${esc(u.username)}">${esc(u.username)}</option>`).join('');
  const playerField=currentUser.role==='PLAYER'?`<input type="hidden" name="playerUsername" value="${esc(currentUser.username)}">`:`<label>Jugador<select name="playerUsername"><option value="">Sin asignar</option>${playerOptions}</select></label>`;
  $("#content").innerHTML=head("Crear personaje","Ficha base. La encuesta automática se incorporará sobre esta misma estructura cuando definamos sus preguntas y ponderaciones.")+`<form id="cf" class="formGrid">${field("Nombre","name")}${playerField}<label>Universo<select name="universeId" required>${universeOptions}</select></label>${field("Edad","age","number")}${field("Rango / oficio","rank")}${field("Imagen URL","imageUrl","url")}<label class="full">Descripción<textarea name="description"></textarea></label><label class="full">Historia<textarea name="history"></textarea></label><div class="full formActions"><button class="btn primary">Crear ficha base</button></div></form>`;
  $("#cf").onsubmit=async e=>{e.preventDefault();try{const r=await api("createCharacter",formData(e.target));alert("Personaje creado. Código: "+r.characterCode);navigate("characters")}catch(x){alert(x.message)}}
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
async function characterForm(){ $("#content").innerHTML=head("Nuevo personaje","El personaje nace dentro de un universo y no tiene nivel VROL Core.")+`<form id="cf" class="formGrid">${field("Nombre","name")}${field("Jugador (username)","playerUsername")}${field("Universo (ID)","universeId")}<label class="full">Descripción<textarea name="description"></textarea></label><div class="full formActions"><button class="btn primary">Crear personaje</button></div></form>`;$("#cf").onsubmit=async e=>{e.preventDefault();try{const r=await api("createCharacter",formData(e.target));alert("Personaje creado. Código: "+r.characterCode);navigate("characters")}catch(x){alert(x.message)}}}
function tableForm(){ $("#content").innerHTML=head("Nueva mesa","Solo puede crearse dentro de un universo administrado por el GM.") + `<form id="tf" class="formGrid">${field("Nombre","name")}${field("Universo (ID)","universeId")}<label class="full">Descripción<textarea name="description"></textarea></label><div class="full formActions"><button class="btn primary">Crear mesa</button></div></form>`;$("#tf").onsubmit=async e=>{e.preventDefault();try{await api("createTable",formData(e.target));navigate("tables");loadPublic()}catch(x){alert(x.message)}}}
function sessionForm(){ $("#content").innerHTML=head("Nueva sesión","Una sesión es una reunión temporal de una mesa.") + `<form id="sf" class="formGrid">${field("Mesa (ID)","tableId")}${field("Título","title")}${field("Inicio","startAt","datetime-local")}${field("Término","endAt","datetime-local")}${field("Módulo / capítulo","moduleTitle")}<label>Modalidad<select name="medium"><option>ONLINE</option><option>PRESENCIAL</option></select></label><div class="full formActions"><button class="btn primary">Crear sesión</button></div></form>`;$("#sf").onsubmit=async e=>{e.preventDefault();try{await api("createSession",formData(e.target));navigate("sessions")}catch(x){alert(x.message)}}}
async function logout(){try{await api("logout")}catch(e){}localStorage.removeItem("VROL_TOKEN");token="";currentUser=null;closePanel()}
loadPublic();