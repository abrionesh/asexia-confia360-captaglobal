/* =====================================================================
   Ficha del negocio · Radar verificado (AsExIA)
   Extraído de radar-asexia.html (versión del 08/11/2026).
   NO es un módulo autónomo: depende de variables y funciones globales del
   resto de la app. Sirve para auditar y reutilizar.

   Dependencias globales:
     Estado:      S (estado raíz), REV (revisiones), RULES, CHK, ST, DEF, HIP
     Utilidades:  $, range, eur, T, mk, normN, toast, copy
     Capas:       Repo.save(), Cloud.ok(), Cloud.setRev(), render()
   ===================================================================== */

/* ---------- Utilidades de fecha y texto ---------- */
function today(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function fd(s){if(!s)return '';var a=s.split('-');return a[2]+'/'+a[1]+'/'+a[0]}
function nextLbl(p){var d=p.next.d,t=today();return (d<t?'vencida ':d===t?'hoy ':'')+fd(d)}
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function P(id){return S.p.filter(function(x){return x.id===id})[0]}
function vold(d){return !!d&&(Date.parse(today())-Date.parse(d))/864e5>30}
function lastV(p){var m='';for(var k in (p.v||{}))if(p.v[k]&&p.v[k].d>m)m=p.v[k].d;return m}
function ago(iso){if(!iso)return 'nunca';var m=Math.floor((Date.now()-Date.parse(iso))/60000);return m<1?'ahora':m<60?'hace '+m+' min':m<1440?'hace '+Math.floor(m/60)+' h':'hace '+Math.floor(m/1440)+' días'}

/* ---------- Verificaciones: modelo y registro ---------- */
function chkOf(k){return CHK.filter(function(c){return c[0]===k})[0]}
function vlab(k,v){return chkOf(k)[2].filter(function(x){return x[0]===v})[0][1]}
function setK(p,k,val,note,u,ts,cf){p.k[k]=val;p.v=p.v||{};var pv=p.v[k]||{l:[]},l=(pv.l||[]).slice();if(u)l.push({t:'Comprobación del '+fd(today()),u:u});p.v[k]={d:today(),l:l,note:note||'',ts:ts||'',cf:cf||''};p.vh=p.vh||[];p.vh.unshift({k:k,d:today(),val:val,note:note||'',u:u||'',ts:ts||'',cf:cf||''})}

/* ---------- Reglas, importes y recomendaciones ---------- */
function ver(p){return CHK.filter(function(c){return p.k[c[0]]}).length}
function tot(p){var a=0,b=0,m=0;opps(p).forEach(function(o){a+=+o.a||0;b+=+o.b||0;m+=+o.m||0});return{a:a,b:b,m:m}}
function why(p){var k=p.k,r=[];
if(k.web==="none")r.push("no he encontrado una web propia");
if(k.web==="broken")r.push("su web no carga");
if(k.web==="old")r.push("su web se ve anticuada");
if(k.res==="no"&&p.t==="Restaurante")r.push("no permite reservar online");if(k.res==="no"&&["Clínica","Peluquería","Gimnasio"].indexOf(p.t)>=0)r.push("no permite pedir cita online");
if(k.qr==="no"&&p.t==="Restaurante")r.push("no tiene carta digital");
if(k.gmb==="no")r.push("su ficha de Google está descuidada");
if(k.ig==="no")r.push("sus redes están paradas");
return r}
function opps(p){return RULES.filter(function(r){return (!r.t||r.t.indexOf(p.t)>=0)&&(!r.k||r.in.indexOf(p.k[r.k])>=0)&&(!r.minV||ver(p)>=r.minV)}).map(function(r){return T(r.s)}).filter(Boolean)}
function precio(o){return (o.b?range({a:o.a,b:o.b}):'')+(o.m?(o.b?' + ':'')+o.m+' €/mes':'')}
function motivo(p,o){var r=RULES.filter(function(x){return x.s===o.id})[0];var v=r&&r.k&&p.v&&p.v[r.k];if(v)return 'Verificado el '+fd(v.d)+(v.ts?' · fuente '+esc(v.ts)+', '+esc(v.cf||''):'');return 'Propuesta de valor, no una carencia verificada'}
function ofrecer(p){var o=opps(p).slice().sort(function(a,b){return ((b.b||0)+(b.m||0)*12)-((a.b||0)+(a.m||0)*12)}),h='';
if(o.length){o.slice(0,3).forEach(function(x,i){h+='<div class="opp"><div><b>'+(i?'Secundaria: ':'Principal: ')+esc(x.l)+'</b><em>'+motivo(p,x)+'</em></div><b>'+precio(x)+'</b></div>'})}
else h+='<p class="meta">Aún no hay carencias verificadas. Pulsa «Revisar este negocio» antes de ofrecer nada.</p>';
return h+'<p class="meta">Hipótesis por validar: '+esc(HIP[p.t]||HIP.Otro)+'.</p><p>'+esc(rec(p))+'</p>'}
function rec(p){return recR(p)+(p.t==='Clínica'?' Cuidado: es un centro sanitario. No trates datos de pacientes en la visita; automatizar con datos de salud exige contrato de encargado de tratamiento y alojamiento adecuado (RGPD), y la publicidad sanitaria está regulada.':'')}
function recR(p){if(p.rec)return p.rec;var r=why(p);return r.length?'Abre con lo verificado ('+r.join(', ')+'). Visita en horario valle (10:30-12:00 o 15:30-17:00), pide hablar con quien decide y propón una revisión gratuita de 15 minutos.':'Verifica primero web, reservas, carta QR, ficha de Google y redes (desde la acera o escaneando la carta en el local). Sin datos, no ofrezcas nada: pide solo una conversación breve.'}

/* ---------- Mensajes y guion de visita ---------- */
function pitch(p){var r=why(p);
var d=r.length?"Al revisar la presencia online de "+p.n+" he visto que "+r.join(", ").replace(/, ([^,]*)$/," y $1")+". ":"Estuve revisando la presencia online de "+p.n+". ";
return "Hola, soy Angel, de AsExIA. "+d+"Ayudo a negocios de "+p.c+" a resolver justo eso, con soluciones sencillas y precio cerrado. ¿Te cuento en 10 minutos qué haría en tu caso, sin compromiso?"}
function email(p){var r=why(p);return 'Asunto: Una idea para '+p.n+'\n\nHola,\n\nSoy Angel, de AsExIA, y vivo en Getafe. '+(r.length?'Revisando la presencia online de '+p.n+' he visto que '+r.join(', ')+'. ':'Estuve revisando la presencia online de '+p.n+'. ')+'Ayudo a negocios de la zona con soluciones sencillas y precio cerrado.\n\n¿Te parece si te enseño en 15 minutos qué haría en tu caso? Puedo pasarme por el local cuando mejor te venga.\n\nUn saludo,\nAngel · AsExIA · asexia.es'}
function visita(p){if(p.t==='Restaurante'||p.t==='Otro')return visitaR(p);var cl=p.t==='Clínica';return '1. Llegada: en horario valle. Entra como visitante, sin pedir cita ni información de ningún cliente'+(cl?' (los datos de salud son confidenciales).':'.')+'\n2. Observa: ¿cómo se pide cita o reserva (teléfono, WhatsApp, web)?, ¿hay lista de servicios y precios visible?, ¿su web se ve bien en el móvil?\n3. Apertura (30 s): «Soy Angel, de AsExIA, vivo en Getafe. Ayudo a negocios como el vuestro a captar y organizar clientes. ¿Hablo con quien gestiona el centro?»\n4. Una sola idea concreta, basada en lo que has visto. No hables de precios.\n5. Cierre: pide el email o WhatsApp de quien decide y fija 15 minutos. Deja tarjeta.\n6. Al salir: registra la visita en esta ficha y marca la próxima acción.'}
function visitaR(p){return '1. Llegada: en horario valle, sin prisa. Pide un café o una mesa para observar carta, reservas y wifi.\n2. Observa: ¿carta QR o en papel?, ¿cómo toman reservas?, ¿su web se ve bien en el móvil?\n3. Apertura (30 s): «Soy Angel, de AsExIA, vivo en Getafe. Ayudo a negocios como el vuestro con digitalización. ¿Hablo con quien lleva el local?»\n4. Una sola idea concreta, basada en lo que has visto. No hables de precios.\n5. Cierre: pide el email o WhatsApp de quien decide y fija 15 minutos. Deja tarjeta.\n6. Al salir: registra la visita en esta ficha y marca la próxima acción.'}
function seg(p){return 'Hola, soy Angel, de AsExIA. Te escribí hace unos días sobre '+p.n+'. No quiero molestarte: ¿te encaja que nos veamos 15 minutos esta semana? Si no es buen momento, dímelo y no insisto.'}
function brief(L){return 'Reverifica la presencia digital de estos negocios de Getafe con la metodología del catálogo y actualiza sus fichas en Radar verificado. Fecha: '+fd(today())+'.\n\nMÉTODO\n1. Busca cada negocio por nombre y dirección, nunca solo por el nombre. Contrasta teléfono y dirección juntos (cuidado con homónimos y con teléfonos de cadena de otro municipio).\n2. Prioriza fuentes del propio negocio (web oficial, perfiles enlazados desde su web), luego directorios y, por último, datos sin confirmar. Anota las fuentes rechazadas y el motivo.\n3. Web: comprueba HTTP y HTTPS por separado. Reservas: distingue directorio de página propia; no contactes ni pruebes reservas. WhatsApp solo si el negocio lo anuncia. No inventes emails.\n4. Un canal ausente se registra como «no encontrado» con fecha, no como inexistente.\n5. Para cada dato indica tipo de fuente (oficial, directorio, sin confirmar), confianza (confirmado, probable, sin confirmar) y enlace.\n6. Resume los cambios y las discrepancias, y publica el lote nuevo en la app.\n\nNEGOCIOS\n'+L.map(function(p){return '- '+p.n+' | '+(p.addr||'sin dirección')+' | tel '+(p.p||'sin dato')+' | web '+(p.w||'sin dato')+' | última verificación: '+(lastV(p)?fd(lastV(p)):'nunca')}).join('\n')}

/* ---------- Revisión de negocio (cola en la base de datos) ---------- */
function pedirRev(p){var txt=brief([p]);
if(!Cloud.ok()){copy(txt,'Encargo copiado: pégalo en el chat con Claude');return}
Cloud.setRev(p.id,{negocio:p.id,nombre:p.n,direccion:p.addr||'',estado:'pendiente',creada:new Date().toISOString(),pasos:['identidad','telefono','web','reservas','carta','ficha_google','redes','email','vigencia']}).then(function(){toast('Revisión solicitada. Dile a Claude: revisa las pendientes')},function(){copy(txt,'No se pudo guardar la petición; encargo copiado')})}
function cancelRev(p){if(Cloud.ok())Cloud.setRev(p.id,{negocio:p.id,nombre:p.n,estado:'cancelada',creada:(REV[p.id]&&REV[p.id].creada)||new Date().toISOString()}).then(function(){toast('Revisión cancelada')})}
function revBanner(p){var r=REV[p.id];if(!r)return '';var e=esc(r.estado||'');return '<div class="sec"><b>Revisión: '+e+'</b>'+(r.creada?' · '+fd(String(r.creada).slice(0,10)):'')+(r.resumen?'<p>'+esc(r.resumen)+'</p>':'')+((r.estado==='pendiente'||r.estado==='en curso')?'<p class="meta">'+(r.estado==='pendiente'?'Dile a Claude en el chat: «revisa las pendientes». ':'')+'</p><button data-revc="1">Cancelar revisión</button>':'')+'</div>'}

/* ---------- Bloques de la ficha ---------- */
function lk(a){return (a&&a.length)?a.map(function(x){return '<div class="opp"><a href="'+esc(x.u)+'" target="_blank" rel="noopener">'+esc(x.t)+'</a></div>'}).join(''):'<p class="meta">Ninguno encontrado.</p>'}
function sec(t,h){return '<div class="sec"><h2>'+t+'</h2>'+h+'</div>'}
function vrows(p){return CHK.map(function(c){var k=c[0],v=p.v&&p.v[k]||null,val=p.k[k];
var ls=v&&v.l&&v.l.length?v.l.map(function(x){return '<a href="'+esc(x.u)+'" target="_blank" rel="noopener" class="meta" style="display:block">'+esc(x.t)+'</a>'}).join(''):'';
var g='https://www.google.com/search?q='+encodeURIComponent(p.n+' '+p.c);
return '<div class="opp" style="display:block"><div style="display:flex;justify-content:space-between;gap:8px"><b>'+c[1]+'</b><span class="chip '+(val?'v':'u')+'">'+vlab(k,val)+'</span></div><div class="meta">'+(v?'Verificado el '+fd(v.d)+(vold(v.d)?' · <b style="color:var(--warn)">caducada: repetir</b>':'')+(v.ts?' · fuente '+esc(v.ts)+', '+esc(v.cf||''):'')+(v.note?' · '+esc(v.note):''):'Sin verificar')+'</div>'+ls
+'<button data-rv="'+k+'" style="margin-top:6px">Volver a verificar</button>'
+'<div id="rv-'+k+'" hidden style="margin-top:8px"><p class="meta">Revisa las fuentes y registra lo que ves hoy: <a href="'+g+'" target="_blank" rel="noopener">buscar en Google</a>'+(p.w?' · <a href="'+esc(/^https?:/i.test(p.w)?p.w:'https://'+p.w)+'" target="_blank" rel="noopener">abrir su web</a>':'')+'</p>'
+'<label>Resultado</label><select id="rvs-'+k+'">'+c[2].map(function(x){return '<option value="'+x[0]+'"'+(val===x[0]?' selected':'')+'>'+x[1]+'</option>'}).join('')+'</select>'
+'<label>Tipo de fuente</label><select id="rvt-'+k+'"><option value="oficial">Oficial (web o perfil del negocio)</option><option value="directorio">Directorio</option><option value="sin confirmar">Sin confirmar</option></select><label>Confianza</label><select id="rvc-'+k+'"><option>confirmado</option><option>probable</option><option>sin confirmar</option></select>'+'<label>Nota</label><input id="rvn-'+k+'" placeholder="Qué has comprobado"><label>Enlace de la fuente (opcional)</label><input id="rvu-'+k+'" type="url" placeholder="https://">'
+'<button class="pri" data-rs="'+k+'" style="margin-top:8px">Guardar verificación</button></div></div>'}).join('')}
function vhist(p){return (p.vh&&p.vh.length)?p.vh.map(function(h){return '<div class="log"><b>'+fd(h.d)+' · '+chkOf(h.k)[1]+(h.who?' (verificado por Claude)':'')+'</b> → '+vlab(h.k,h.val)+(h.ts?' · '+esc(h.ts)+' / '+esc(h.cf||''):'')+(h.note?' · '+esc(h.note):'')+(h.u?' · <a href="'+esc(h.u)+'" target="_blank" rel="noopener">fuente</a>':'')+'</div>'}).join(''):'<p class="meta">Aún no hay verificaciones registradas.</p>'}
function paintFi(){var p=P(S.fi);if(!p)return;var t=tot(p),o=opps(p);
var chips=CHK.map(function(c){var v=p.k[c[0]];return '<span class="chip '+(v?'v':'u')+'">'+c[1]+': '+c[2].filter(function(x){return x[0]===v})[0][1]+'</span>'}).join('');
var ol=o.length?o.map(function(x){return '<div class="opp"><div>'+esc(x.l)+'</div><b>'+(x.b?range({a:x.a,b:x.b}):'')+(x.m?(x.b?' + ':'')+x.m+' €/mes':'')+'</b></div>'}).join(''):'<p class="meta">Sin oportunidades verificadas todavía.</p>';
var dg=p.p?p.p.replace(/\D/g,''):'';var wa=dg?'https://wa.me/'+(dg.length===9?'34':'')+dg+'?text=':'';
function ta(id,tx,lab,ex){return '<label>'+lab+'</label><textarea class="pitch" id="'+id+'">'+esc(tx)+'</textarea><div class="row"><button data-cp="'+id+'">Copiar</button>'+(ex||'')+'</div>'}
var lg=(p.log||[]).map(function(l,i){return '<div class="log"><b>'+fd(l.d)+' · '+esc(l.tp)+'</b> '+esc(l.tx)+' <button data-dl="'+i+'" aria-label="Borrar entrada">×</button></div>'}).join('')||'<p class="meta">Aún no has registrado contactos.</p>';
var nx=p.next&&p.next.d?'<p><b>Próxima acción: '+nextLbl(p)+'</b> '+esc(p.next.tx||'')+' <button data-nd="1">Hecha</button></p>':'';
$('fiB').innerHTML='<div class="row" style="position:sticky;top:0;background:var(--bg);padding:6px 0;z-index:2"><button class="pri" data-rev="1">Revisar este negocio</button><button data-close="1">Volver a la lista</button></div>'+revBanner(p)+'<h2>'+esc(p.n)+'</h2><p class="meta">'+esc(p.t)+' · '+esc(p.addr||p.c)+(p.hrs?'<br>Horario: '+esc(p.hrs):'')+'</p><div class="row">'+(p.p?'<a href="tel:'+esc(p.p.replace(/\s/g,''))+'"><button>Llamar</button></a>':'')+(p.e?'<a href="mailto:'+esc(p.e)+'"><button>Email</button></a>':'')+'<a href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.n+' '+(p.addr||p.c))+'" target="_blank" rel="noopener"><button>Cómo llegar</button></a></div><p class="meta">'+esc(p.p||'Sin teléfono')+' · '+esc(p.e||'sin email')+' · '+esc(p.w||'sin web')+'</p>'
+sec('Análisis verificado',chips+ol+'<p class="meta">Potencial: '+range(t)+(t.m?' + '+t.m+' €/mes':'')+'</p>'+(p.nt?'<p style="white-space:pre-wrap">'+esc(p.nt)+'</p>':''))
+sec('Verificaciones',vrows(p)+ta('m-b',brief([p]),'Repetir las búsquedas con el método: copia este encargo y pégalo en el chat con Claude'))+sec('Qué ofrecer',ofrecer(p))
+sec('Mensajes y guion de visita',ta('m-v',visita(p),'Guion de visita presencial')+ta('m-w',pitch(p),'WhatsApp inicial',wa?'<a href="'+wa+encodeURIComponent(pitch(p))+'" target="_blank" rel="noopener"><button class="pri">Abrir en WhatsApp</button></a>':'')+ta('m-e',email(p),'Email',p.e?'<a href="mailto:'+esc(p.e)+'?subject='+encodeURIComponent('Una idea para '+p.n)+'"><button>Abrir email</button></a>':'')+ta('m-s',seg(p),'Seguimiento a los 3-4 días sin respuesta'))
+sec('Seguimiento (CRM)','<label>Estado</label><select id="fiSt">'+ST.map(function(s){return '<option'+(p.st===s?' selected':'')+'>'+s+'</option>'}).join('')+'</select>'+nx+'<div class="grid"><div><label>Fecha de la próxima acción</label><input type="date" id="fiND" value="'+esc(p.next&&p.next.d||'')+'"></div><div><label>Qué harás</label><input id="fiNT" value="'+esc(p.next&&p.next.tx||'')+'" placeholder="Visitar, llamar, enviar propuesta"></div></div><button id="fiNx">Guardar próxima acción</button>'
+'<div class="grid"><div><label>Registrar contacto</label><select id="fiTp"><option>Visita</option><option>Llamada</option><option>WhatsApp</option><option>Email</option><option>Nota</option></select></div><div><label>Qué pasó</label><input id="fiTx" placeholder="Resultado, con quién hablaste"></div></div><button class="pri" id="fiLog">Añadir al historial</button><div style="margin-top:8px">'+lg+'</div>')
+sec('Histórico de verificaciones',vhist(p))+sec('Fuentes consultadas',lk(p.src))+sec('Carta y PDF',lk(p.carta))}
function openFi(id){S.fi=id;paintFi();$('dFi').showModal()}

/* ---------- Datos de apoyo ---------- */
var HIP={'Restaurante':'reseñas, carta digital con QR, pedidos propios y cuadro de mandos','Clínica':'cita online, recordatorios por WhatsApp y CRM (sin datos de salud en la app)','Peluquería':'reservas online, recordatorios y bonos','Gimnasio':'altas online y gestión de socios','Comercio':'catálogo online y ficha de Google','Otro':'web, ficha de Google y automatización'};

/* ---------- Eventos de la ficha ---------- */
$('dFi').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;var p=P(S.fi),d=b.dataset;
if(d.rev){pedirRev(p);return}
if(d.revc){cancelRev(p);return}
if(d.rv){var fm=$('rv-'+d.rv);fm.hidden=!fm.hidden;return}
if(d.rs){var kk=d.rs,uu=$('rvu-'+kk).value.trim();if(uu&&!/^https?:\/\//i.test(uu)){toast('El enlace debe empezar por http:// o https://');return}setK(p,kk,$('rvs-'+kk).value,$('rvn-'+kk).value.trim(),uu,$('rvt-'+kk).value,$('rvc-'+kk).value);save();paintFi();render();toast('Verificación guardada');return}
if(d.cp){copy($(d.cp).value,'Copiado');return}
if(d.close){$('dFi').close();render();return}
if(b.id==='fiLog'){var tx=$('fiTx').value.trim();if(!tx){toast('Escribe qué ha pasado');return}p.log=p.log||[];p.log.unshift({d:today(),tp:$('fiTp').value,tx:tx});if(p.st==='Pendiente'&&$('fiTp').value!=='Nota')p.st='Contactado';save();paintFi();render();return}
if(b.id==='fiNx'){p.next={d:$('fiND').value,tx:$('fiNT').value.trim()};save();paintFi();render();toast('Próxima acción guardada');return}
if(d.dl!==undefined){p.log.splice(+d.dl,1);save();paintFi();render();return}
if(d.nd){p.next=null;save();paintFi();render()}});
$('dFi').addEventListener('change',function(e){if(e.target.id==='fiSt'){P(S.fi).st=e.target.value;save();render()}});

/* ---------- HTML del contenedor (en el cuerpo de la página) ----------
<dialog id="dFi"><div id="fiB"></div><div class="row"><button data-close="1">Cerrar ficha</button></div></dialog>
   ---------- CSS relacionado ----------
.crd{cursor:pointer}.cr{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.crd .pot{white-space:nowrap}
@media (max-width:700px){dialog#dFi{width:100vw;max-width:100vw;height:100vh;max-height:100vh;margin:0;border-radius:0}}
dialog#dFi{width:min(680px,96vw);max-height:92vh;overflow:auto}.sec{margin-top:18px}.log{border-bottom:1px dashed var(--line);padding:6px 0;font-size:14px}.log button{min-height:28px;padding:0 8px;float:right}a{color:var(--acc)}.sec .opp a{font-weight:600}
*/
