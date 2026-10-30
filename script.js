(function(){
  var KEY = 'ferreteria-inventario-v1';
  var cop = new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0});
  var $ = function(id){return document.getElementById(id)};
  var items = [], editing = null;

  var seed = [
    {name:'Martillo de uña 16 oz',code:'HER-001',cat:'Herramientas',stock:14,min:5,cost:18000,price:28000},
    {name:'Destornillador de estría #2',code:'HER-002',cat:'Herramientas',stock:3,min:6,cost:6500,price:11000},
    {name:'Tornillo drywall 1” (caja x100)',code:'TOR-001',cat:'Tornillería',stock:40,min:15,cost:5200,price:9000},
    {name:'Cemento gris 50 kg',code:'CON-001',cat:'Construcción',stock:22,min:20,cost:29500,price:36000},
    {name:'Pintura blanca vinilo galón',code:'PIN-001',cat:'Pinturas',stock:2,min:4,cost:48000,price:65000},
    {name:'Cable THHN #12 (metro)',code:'ELE-001',cat:'Eléctrico',stock:180,min:50,cost:2100,price:3200},
    {name:'Tubo PVC 1/2” x 6 m',code:'PLO-001',cat:'Plomería',stock:30,min:10,cost:9800,price:15500},
    {name:'Candado 40 mm',code:'SEG-001',cat:'Seguridad',stock:9,min:4,cost:12000,price:21000}
  ];

  function load(){
    try{
      var raw = localStorage.getItem(KEY);
      if(raw){ items = JSON.parse(raw); return; }
    }catch(e){}
    items = seed.map(function(s,i){ s.id = 's'+i; return s; });
  }
  function save(){ try{ localStorage.setItem(KEY, JSON.stringify(items)); }catch(e){} }
  function esc(s){ return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]}); }
  function isLow(p){ return p.stock <= p.min; }

  var CKEY='ferreteria-categorias-v1', categories=[], DEFCATS=['Herramientas','Tornillería','Construcción','Pinturas','Eléctrico','Plomería','Seguridad'];
  function loadC(){try{categories=JSON.parse(localStorage.getItem(CKEY)||'null')||DEFCATS.slice()}catch(e){categories=DEFCATS.slice()}}
  function saveC(){try{localStorage.setItem(CKEY,JSON.stringify(categories))}catch(e){}}
  function catList(){var s={};categories.concat(items.map(function(p){return p.cat})).forEach(function(c){if(c)s[c]=1});var l=Object.keys(s).sort(function(a,b){return a.localeCompare(b,'es')});return l.length?l:['Sin categoría']}
  function cats(){return catList()}
  function cleanName(s){return String(s||'').trim().replace(/\s+/g,' ').slice(0,30)}
  function hasCat(n,ex){return catList().some(function(c){return c!==ex&&c.toLowerCase()===n.toLowerCase()})}
  function baseCats(){return catList().filter(function(c){return c!=='Sin categoría'||items.some(function(p){return p.cat===c})})}
  function renderCatMgr(){
    $('catList').innerHTML=catList().map(function(c){var n=items.filter(function(p){return p.cat===c}).length;
      return '<div class="hrow" data-c="'+esc(c)+'"><div><b>'+esc(c)+'</b><small>'+n+' producto'+(n===1?'':'s')+'</small></div><div><button class="ghost" data-a="ren" style="min-height:32px;padding:2px 10px">Renombrar</button> <button class="ghost" data-a="del" style="min-height:32px;padding:2px 10px">Quitar</button></div></div>'}).join('');
  }
  function afterCat(){saveC();save();fillCats();render();renderCatMgr()}
  $('bCats').onclick=function(){if(typeof can==='function'&&!can('invEdit'))return;renderCatMgr();$('catDlg').showModal()};
  $('catClose').onclick=function(){$('catDlg').close()};
  function addCat(){var n=cleanName($('catNew').value);if(!n)return;if(hasCat(n))return alert('Esa categoría ya existe.');
    categories=baseCats();categories.push(n);$('catNew').value='';afterCat()}
  $('catAddBtn').onclick=addCat;
  $('catNew').addEventListener('keydown',function(e){if(e.key==='Enter')addCat()});
  $('catList').addEventListener('click',function(e){
    var b=e.target.closest('button');if(!b)return;var c=b.closest('.hrow').getAttribute('data-c');
    if(b.getAttribute('data-a')==='ren'){
      return ask('Nuevo nombre para «'+c+'»:',c,function(v){var n=cleanName(v);if(!n||n===c)return;
      if(hasCat(n,c)&&!confirm('Ya existe «'+n+'». ¿Unir ambas categorías?'))return;
      var f=$('cat').value;
      categories=baseCats().map(function(x){return x===c?n:x}).filter(function(x,i,a){return a.indexOf(x)===i});
      items.forEach(function(p){if(p.cat===c)p.cat=n});
      afterCat();if(f===c){$('cat').value=n;render()}});
    }
    var k=items.filter(function(p){return p.cat===c}).length;
    if(k){
      if(c==='Sin categoría')return alert('Primero cambia esos productos a otra categoría.');
      if(!confirm('«'+c+'» tiene '+k+' producto'+(k===1?'':'s')+'. Pasarán a «Sin categoría». ¿Continuar?'))return;
      items.forEach(function(p){if(p.cat===c)p.cat='Sin categoría'});
    }else if(!confirm('¿Quitar la categoría «'+c+'»?'))return;
    categories=baseCats().filter(function(x){return x!==c});afterCat();
  });
  function addStep(el,n,t){var d=document.createElement('div');d.className='step';d.innerHTML='<span>'+n+'</span>'+t;el.parentNode.insertBefore(d,el)}
  addStep($('sq').parentNode,1,'Elige los productos y la cantidad');
  addStep($('sCust').closest('.fgrid'),2,'Datos del cliente y forma de pago');
  addStep($('sTot'),3,'Revisa el total y emite la factura');
  function cats_old(){
    var set = {}; items.forEach(function(p){ set[p.cat]=1; });
    return Object.keys(set).sort(function(a,b){return a.localeCompare(b,'es')});
  }
  function fillCats(){
    var cur = $('cat').value, list = cats();
    $('cat').innerHTML = '<option value="">Todas las categorías</option>' +
      list.map(function(c){return '<option>'+esc(c)+'</option>'}).join('');
    $('cat').value = list.indexOf(cur) > -1 ? cur : '';
    var fc=$('fCat'),fv=fc.value;fc.innerHTML=list.map(function(c){return '<option value="'+esc(c)+'">'+esc(c)+'</option>'}).join('');if(list.indexOf(fv)>-1)fc.value=fv;
  }

  function render(){
    fillCats();
    var q = $('q').value.trim().toLowerCase(), c = $('cat').value, low = $('onlyLow').checked;
    var list = items.filter(function(p){
      return (!q || (p.name+' '+p.code).toLowerCase().indexOf(q) > -1) && (!c || p.cat === c) && (!low || isLow(p));
    }).sort(function(a,b){ return (isLow(b)-isLow(a)) || a.name.localeCompare(b.name,'es'); });

    var showCost = isAdmin();
    document.querySelectorAll('th.cst').forEach(function(t){ t.hidden = !showCost; });
    $('rows').innerHTML = list.map(function(p){
      return '<tr class="'+(isLow(p)?'low':'')+'" data-id="'+p.id+'">' +
        '<td><div class="pname">'+esc(p.name)+(isLow(p)?'<span class="tag">'+(p.stock===0?'Agotado':'Reponer')+'</span>':'')+'</div><div class="code">'+esc(p.code||'Sin código')+'</div></td>' +
        '<td>'+esc(p.cat)+'</td>' +
        '<td class="n"><span class="stock"><button class="ed" data-a="dec" aria-label="Restar una unidad">−</button><b class="'+(p.stock===0?'z':isLow(p)?'l':'o')+'">'+p.stock+'</b><button class="ed" data-a="inc" aria-label="Sumar una unidad">+</button></span></td>' +
        '<td class="n">'+p.min+'</td>' +
        (showCost?'<td class="n cst">'+cop.format(p.cost)+'</td>':'') +
        '<td class="n">'+cop.format(p.price)+'</td>' +
        '<td class="ed"><div class="acts"><button class="ghost" data-a="edit">Editar</button><button class="ghost" data-a="del">Eliminar</button></div></td></tr>';
    }).join('');
    $('empty').hidden = list.length > 0;

    var units=0,cost=0,sale=0,lowN=0;
    items.forEach(function(p){ units+=p.stock; cost+=p.stock*p.cost; sale+=p.stock*p.price; if(isLow(p)) lowN++; });
    $('sProd').textContent = items.length;
    $('sUnits').textContent = units.toLocaleString('es-CO');
    $('sCost').textContent = showCost ? cop.format(cost) : '';
    $('sSale').textContent = showCost ? cop.format(sale) : '';
    $('sLow').textContent = lowN;
  }

  function pctVal(){ return parseFloat(String($('fPct').value).replace(',','.'))||0; }
  function fmtPct(n){ return (Math.round(n*10)/10).toString().replace('.',','); }
  function formPrice(){
    var cost=parseM($('fCost').value);
    return $('fPriceT').value==='p' ? Math.round(cost*(1+pctVal()/100)) : parseM($('fPrice').value);
  }
  function priceInfo(){
    var cost=parseM($('fCost').value), price=formPrice(), el=$('fPriceInfo');
    if(!isAdmin()){ el.innerHTML=''; return; }
    if($('fPriceT').value==='p'){
      el.innerHTML='Precio de venta: <b>'+cop.format(price)+'</b>'+(cost>0?' · Ganancia por unidad: '+cop.format(price-cost):' · Escribe el costo para calcularlo');
    }else{
      el.innerHTML=(cost>0&&price>0)?'Ganancia: <b>'+fmtPct((price-cost)/cost*100)+'%</b> sobre el costo · '+cop.format(price-cost)+' por unidad':'';
    }
  }
  function priceMode(init){
    var m=$('fPriceT').value, cost=parseM($('fCost').value);
    if(!init){
      if(m==='p'){ $('fPct').value = (cost>0)? fmtPct((parseM($('fPrice').value)-cost)/cost*100) : ''; }
      else { $('fPrice').value = fmtDots(String(Math.max(0,formPriceFromPct()))); }
    }
    $('lPriceV').style.display = m==='v' ? '' : 'none';
    $('lPriceP').style.display = m==='p' ? '' : 'none';
    $('fPrice').required = (m==='v');
    $('fPct').required = (m==='p');
    priceInfo();
  }
  function formPriceFromPct(){ return Math.round(parseM($('fCost').value)*(1+pctVal()/100)); }
  $('fPriceT').addEventListener('change', function(){ priceMode(false); });
  $('fPct').addEventListener('input', function(){ this.value=this.value.replace(/[^\d.,]/g,''); priceInfo(); });
  $('fCost').addEventListener('input', priceInfo);
  $('fPrice').addEventListener('input', priceInfo);

  function openForm(p){
    editing = p ? p.id : null;
    $('dTitle').textContent = p ? 'Editar producto' : 'Nuevo producto';
    $('fName').value = p ? p.name : '';
    $('fCode').value = p ? p.code : '';
    $('fCat').value = p ? p.cat : ($('cat').value || $('fCat').options[0].value);
    $('fStock').value = p ? p.stock : 0;
    $('fMin').value = p ? p.min : 5;
    var adm = isAdmin();
    $('lCost').style.display = adm ? '' : 'none';
    $('lPriceT').style.display = adm ? '' : 'none';
    $('fCost').required = adm;
    $('fCost').value = (p && adm) ? fmtDots(String(Math.round(p.cost))) : '';
    $('fPrice').value = p ? fmtDots(String(Math.round(p.price))) : '';
    $('fPriceT').value = (adm && p && p.pm==='p') ? 'p' : 'v';
    $('fPct').value = (adm && p && p.pm==='p' && p.pct!=null) ? String(p.pct).replace('.',',') : '';
    priceMode(true);
    $('dlg').showModal();
    $('fName').focus();
  }

  $('rows').addEventListener('click', function(e){
    var b = e.target.closest('button'); if(!b) return;
    if(!can('invEdit'))return;var id = b.closest('tr').getAttribute('data-id');
    var p = items.filter(function(x){return x.id===id})[0]; if(!p) return;
    var a = b.getAttribute('data-a');
    if(a==='inc') p.stock++;
    else if(a==='dec') p.stock = Math.max(0,p.stock-1);
    else if(a==='edit') return openForm(p);
    else if(a==='del'){
      if(!confirm('¿Eliminar «'+p.name+'»? Esta acción no se puede deshacer.')) return;
      items = items.filter(function(x){return x.id!==id});
    }
    save(); render();
  });

  $('f').addEventListener('submit', function(e){
    e.preventDefault();
    var data = {
      name:$('fName').value.trim(), code:$('fCode').value.trim(), cat:$('fCat').value.trim(),
      stock:Math.max(0,parseInt($('fStock').value,10)||0), min:Math.max(0,parseInt($('fMin').value,10)||0),
      cost:Math.max(0,parseM($('fCost').value)), price:Math.max(0,formPrice())
    };
    if(!isAdmin()){
      var old = editing ? items.filter(function(x){return x.id===editing})[0] : null;
      data.cost = old ? old.cost : 0;
      data.pm='v'; data.pct=null;
    } else if($('fPriceT').value==='p'){ data.pm='p'; data.pct=Math.max(0,pctVal()); } else { data.pm='v'; data.pct=null; }
    if(editing){
      items.forEach(function(p){ if(p.id===editing) Object.assign(p,data); });
    }else{
      data.id = 'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
      items.push(data);
    }
    save(); $('dlg').close(); render();
  });

  $('add').onclick = function(){ if(!can('invEdit'))return; openForm(null); };
  $('cancel').onclick = function(){ $('dlg').close(); };
  ['q','cat','onlyLow'].forEach(function(id){ $(id).addEventListener('input', render); });

  var NAME='Ferretería Universal del Fleje', SKEY='ferreteria-ventas-v1', sales=[], cfg={name:'',nit:'',res:'',next:1}, cart=[], curInv=null, customers=[], closures=[], expenses=[];
  function loadS(){try{var r=JSON.parse(localStorage.getItem(SKEY)||'null');if(r){sales=r.sales||[];customers=r.customers||[];closures=r.closures||[];expenses=r.expenses||[];Object.assign(cfg,r.cfg||{});}}catch(e){}}
  function saveS(){try{localStorage.setItem(SKEY,JSON.stringify({sales:sales,cfg:cfg,customers:customers,closures:closures,expenses:expenses}));}catch(e){}}
  function label(p){return (p.code?p.code+' - ':'')+p.name}
  function findP(v){v=v.trim().toLowerCase();return items.find(p=>label(p).toLowerCase()===v)||items.find(p=>p.name.toLowerCase()===v||(p.code||'').toLowerCase()===v)}
  function fmtDots(s){return String(s).replace(/\D/g,'').replace(/\B(?=(\d{3})+(?!\d))/g,'.')}
  function parseM(v){return parseFloat(String(v).replace(/\./g,'').replace(',','.'))||0}
  function numOf(v,t){return t==='v'?parseM(v):(parseFloat(String(v).replace(',','.'))||0)}
  function reflow(inp,mode){var d=inp.value.replace(/\./g,'');inp.value=mode==='v'?fmtDots(d):d}
  function isMoney(t){
    if(t.classList.contains('money'))return true;
    if(t.id==='sDiscV')return $('sDiscT').value==='v';
    if(t.id==='sLd')return $('sLt').value==='v';
    if(t.classList.contains('ld')){var s=t.parentNode.querySelector('.lt');return !!s&&s.value==='v'}
    return false}
  document.addEventListener('input',function(e){
    var t=e.target;if(t.tagName!=='INPUT'||!isMoney(t))return;
    var pos=t.selectionStart||0,n=t.value.slice(0,pos).replace(/\D/g,'').length,v=fmtDots(t.value);t.value=v;
    var i=0,k=0;for(;i<v.length&&k<n;i++){if(/\d/.test(v[i]))k++}
    try{t.setSelectionRange(i,i)}catch(x){}
  });
  function lineDisc(l){var g=l.qty*l.price,v=Math.max(0,+l.dv||0);return l.dt==='v'?Math.min(v,g):Math.round(g*Math.min(v,100)/100)}
  function calc(lines,mode){var g=lines.reduce((a,l)=>a+l.qty*l.price,0),ld=lines.reduce((a,l)=>a+lineDisc(l),0),b=g-ld,dt=$('sDiscT').value,dv=Math.max(0,numOf($('sDiscV').value,$('sDiscT').value)),d=ld+(dt==='p'?Math.round(b*Math.min(dv,100)/100):Math.min(dv,b)),t=g-d,sub=t,tax=0,total=t;
    if(mode==='inc'){sub=Math.round(t/1.19);tax=t-sub}else if(mode==='add'){tax=Math.round(t*.19);total=t+tax}
    return {gross:g,disc:d,sub:sub,tax:tax,total:total}}
  function renderSales(){
    $('plist').innerHTML=items.filter(p=>p.stock>0).map(p=>'<option value="'+esc(label(p))+'">').join('');
    $('cart').innerHTML=cart.map((l,i)=>'<tr data-i="'+i+'"><td>'+esc(l.name)+'</td><td class="n">'+l.qty+'</td><td class="n">'+cop.format(l.price)+'</td><td class="n"><span class="ldw"><input class="ld" type="text" inputmode="decimal" autocomplete="off" value="'+(l.dv?(l.dt==='v'?fmtDots(String(Math.round(l.dv))):l.dv):'')+'" placeholder="0" aria-label="Descuento"><select class="lt" aria-label="Tipo"><option value="p"'+(l.dt==='v'?'':' selected')+'>%</option><option value="v"'+(l.dt==='v'?' selected':'')+'>$</option></select></span></td><td class="n">'+cop.format(l.qty*l.price-lineDisc(l))+'</td><td><button class="ghost" aria-label="Quitar">×</button></td></tr>').join('');
    $('cartEmpty').hidden=cart.length>0;
    var c=calc(cart,$('sIva').value);
    $('sTot').innerHTML=(c.disc?'<div>Valor productos '+cop.format(c.gross)+'</div><div>Descuento -'+cop.format(c.disc)+'</div>':'')+'<div>Subtotal '+cop.format(c.sub)+'</div><div>IVA 19% '+cop.format(c.tax)+'</div><div><b>Total '+cop.format(c.total)+'</b></div>';
    $('hist').innerHTML=histHTML();
    $('bName').value=cfg.name;$('bNit').value=cfg.nit;$('bRes').value=cfg.res;$('bNext').value=cfg.next;renderCust();
  }
  function head(sub){return '<div class="ihead"><img class="ilogo" src="logo.png" alt="" onerror="this.remove()"><div class="ibiz"><h2>'+esc(cfg.name||NAME)+'</h2>'+(sub||'')+'</div></div>'}
  function invHTML(s){
    var legal=s.type==='e'
      ?'Representación gráfica de control interno. Para que la factura electrónica tenga validez ante la DIAN debe emitirse y validarse con un proveedor tecnológico autorizado.'
      :'Conserve esta factura como soporte de su compra.';
    function f(l,v){return v?'<div><span>'+l+'</span><b>'+esc(v)+'</b></div>':''}
    return '<div class="invoice inv2">'+
    '<div class="ihead"><img class="ilogo" src="logo.png" alt="" onerror="this.remove()"><div class="ibiz"><h2>'+esc(cfg.name||NAME)+'</h2><div>NIT '+esc(cfg.nit||'sin registrar')+'</div>'+(cfg.res?'<div class="small">'+esc(cfg.res)+'</div>':'')+'</div>'+
      '<div class="ibox"><span>'+(s.type==='e'?'Factura electrónica de venta':'Factura de venta')+'</span><b>No. '+s.num+'</b>'+(s.void?'<em>ANULADA</em>':'')+'</div></div>'+
    '<div class="imeta">'+f('Fecha',new Date(s.date).toLocaleString('es-CO'))+f('Forma de pago',s.pay)+f('Cliente',s.cust)+f('Cédula / NIT',s.doc)+f('Teléfono',s.phone)+f('Correo',s.email)+f('Atendido por',s.by)+'</div>'+
    '<table class="itbl"><thead><tr><th>Producto</th><th class="n">Cant.</th><th class="n">V. unitario</th><th class="n">Valor</th></tr></thead><tbody>'+
    s.lines.map(l=>'<tr><td>'+esc(l.name)+(l.disc?'<div class="small">Descuento '+(l.dt==='p'?l.dv+'% ':'')+'(-'+cop.format(l.disc)+')</div>':'')+'</td><td class="n">'+l.qty+'</td><td class="n">'+cop.format(l.price)+'</td><td class="n">'+cop.format(l.qty*l.price)+'</td></tr>').join('')+'</tbody></table>'+
    '<div class="itot">'+(s.disc?'<div><span>Valor productos</span><span>'+cop.format(s.gross)+'</span></div><div><span>Descuento</span><span>-'+cop.format(s.disc)+'</span></div>':'')+'<div><span>Subtotal</span><span>'+cop.format(s.sub)+'</span></div><div><span>IVA 19%</span><span>'+cop.format(s.tax)+'</span></div><div class="grand"><span>TOTAL</span><span>'+cop.format(s.total)+'</span></div></div>'+
    '<div class="ithanks">¡Gracias por su compra!</div><div class="legal">'+legal+'</div></div>';
  }
  function invText(s){if(s.text)return s.text;
    return [(cfg.name||NAME)+' - NIT '+(cfg.nit||''),(s.type==='e'?'Factura electrónica ':'Factura ')+s.num,new Date(s.date).toLocaleString('es-CO'),'Cliente: '+s.cust+' ('+s.doc+')'+(s.phone?' Tel. '+s.phone:''),''].concat(
      s.lines.map(l=>l.qty+' x '+l.name+'  '+cop.format(l.qty*l.price)+(l.disc?' (desc. -'+cop.format(l.disc)+')':'')),['',...(s.disc?['Descuento -'+cop.format(s.disc)]:[]),'Subtotal '+cop.format(s.sub),'IVA '+cop.format(s.tax),'TOTAL '+cop.format(s.total)]).join('\n');
  }
  function showInv(s){curInv=s;$('invWa').hidden=$('invMail').hidden=s.type!=='e';$('invBody').innerHTML=invHTML(s);if(!$('invDlg').open)$('invDlg').showModal();}

  function findC(d){d=(d||'').trim();return customers.find(c=>c.doc===d)}
  function hint(c){var n=sales.filter(s=>s.doc===c.doc&&!s.void).length;$('cHint').textContent='Cliente guardado: '+c.name+' ('+n+(n===1?' compra anterior)':' compras anteriores)')}
  function renderCust(){
    $('nList').innerHTML=customers.map(c=>'<option value="'+esc(c.name)+'">').join('');
    $('cList').innerHTML=customers.map(c=>'<option value="'+esc(c.doc)+'" label="'+esc(c.name)+'">').join('');
    $('custList').innerHTML=customers.length?customers.map(c=>{var m=sales.filter(s=>s.doc===c.doc&&!s.void);
      return '<div class="hrow" data-doc="'+esc(c.doc)+'"><div><b>'+esc(c.name)+'</b><small>'+esc(c.doc)+(c.phone?' - Tel. '+esc(c.phone):'')+(c.email?' - '+esc(c.email):'')+' - '+m.length+' compra'+(m.length===1?'':'s')+' - '+cop.format(m.reduce((a,s)=>a+s.total,0))+'</small></div><div><button class="ghost" data-a="useC" style="min-height:30px;padding:2px 8px">Usar</button> <button class="ghost" data-a="delC" style="min-height:30px;padding:2px 8px">Quitar</button></div></div>'}).join(''):'<div class="empty">Los clientes se guardan solos al emitir una factura.</div>';
  }
  $('sDoc').addEventListener('input',function(){var c=findC(this.value);if(c){$('sCust').value=c.name;$('sPhone').value=c.phone||'';$('sEmail').value=c.email||'';hint(c)}else $('cHint').textContent=''});
  $('sCust').addEventListener('input',function(){var v=this.value.trim().toLowerCase(),c=customers.find(x=>x.name.toLowerCase()===v);if(c){$('sDoc').value=c.doc;$('sPhone').value=c.phone||'';$('sEmail').value=c.email||'';hint(c)}});
  $('custList').addEventListener('click',function(e){
    var b=e.target.closest('button');if(!b)return;
    var c=findC(b.closest('.hrow').getAttribute('data-doc'));if(!c)return;
    if(b.getAttribute('data-a')==='useC'){$('sCust').value=c.name;$('sDoc').value=c.doc;$('sPhone').value=c.phone||'';$('sEmail').value=c.email||'';hint(c);drawer(false);$('sq').focus();return}
    if(!confirm('¿Quitar a '+c.name+' de los clientes guardados? Sus facturas anteriores no se borran.'))return;
    customers=customers.filter(x=>x!==c);saveS();renderCust();
  });

  function openSales(){return sales.filter(s=>!s.void&&!s.closed)}
  function openExp(){return expenses.filter(g=>!g.closed)}
  function sumExp(l){return l.reduce((a,g)=>a+g.amount,0)}
  function gastosHTML(c){return (c.gastos&&c.gastos.length)?'<h3 style="margin:14px 0 4px">Gastos</h3>'+c.gastos.map(g=>'<div class="hrow"><span>'+esc(g.desc)+' <small>'+esc(g.pay)+'</small></span><b>'+cop.format(g.amount)+'</b></div>').join(''):''}
  function renderGastos(){var l=openExp(),t=sumExp(l);
    $('gList').innerHTML=l.length?l.map(g=>'<div class="hrow" data-id="'+g.id+'"><div><b>'+esc(g.desc)+'</b><small>'+esc(g.pay)+' - '+new Date(g.date).toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})+'</small></div><div>'+cop.format(g.amount)+' <button class="ghost" style="min-height:30px;padding:2px 8px" aria-label="Quitar gasto">×</button></div></div>').join('')+'<div class="hrow"><span>Total gastos</span><b>'+cop.format(t)+'</b></div>':'<div class="empty">Aún no hay gastos registrados hoy.</div>'}
  function agg(list){var r={n:list.length,units:0,disc:0,tax:0,total:0,pay:{},prod:{}};
    list.forEach(s=>{r.disc+=s.disc||0;r.tax+=s.tax;r.total+=s.total;r.pay[s.pay]=(r.pay[s.pay]||0)+s.total;
      s.lines.forEach(l=>{r.units+=l.qty;var o=r.prod[l.name]||(r.prod[l.name]={name:l.name,qty:0,total:0});o.qty+=l.qty;o.total+=l.qty*l.price})});return r}
  function merge(list){var r={exp:0,n:0,units:0,disc:0,tax:0,total:0,pay:{},prod:{}};
    list.forEach(c=>{r.exp+=c.exp||0;r.n+=c.n;r.units+=c.units;r.disc+=c.disc;r.tax+=c.tax;r.total+=c.total;
      Object.keys(c.pay).forEach(k=>r.pay[k]=(r.pay[k]||0)+c.pay[k]);
      Object.keys(c.prod).forEach(k=>{var o=r.prod[k]||(r.prod[k]={name:c.prod[k].name,qty:0,total:0});o.qty+=c.prod[k].qty;o.total+=c.prod[k].total})});return r}
  function plist(r){return Object.keys(r.prod).map(k=>r.prod[k]).sort((a,b)=>b.total-a.total)}
  function fmtDate(k){return new Date(k+'T12:00:00').toLocaleDateString('es-CO',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
  function monthName(m){return new Date(m+'-15T12:00:00').toLocaleDateString('es-CO',{month:'long',year:'numeric'})}
  function reportHTML(r,op){
    return '<section class="stats"><div class="stat"><b>'+r.n+'</b><span>Facturas</span></div><div class="stat"><b>'+r.units+'</b><span>Unidades vendidas</span></div><div class="stat"><b>'+cop.format(r.total)+'</b><span>Total vendido</span></div></section>'+
    '<div class="hrow"><span>Descuentos dados</span><b>'+cop.format(r.disc)+'</b></div><div class="hrow"><span>IVA incluido en el total</span><b>'+cop.format(r.tax)+'</b></div>'+(r.exp!=null?'<div class="hrow"><span>Gastos</span><b>'+cop.format(r.exp)+'</b></div><div class="hrow"><span>Neto (vendido menos gastos)</span><b>'+cop.format(r.total-r.exp)+'</b></div>':'')+
    '<h3 style="margin:14px 0 4px">Por forma de pago</h3>'+Object.keys(r.pay).map(k=>'<div class="hrow"><span>'+esc(k)+'</span><b>'+cop.format(r.pay[k])+'</b></div>').join('')+
    '<details class="vend"'+(op?' open':'')+'><summary>Qué se vendió ('+plist(r).length+')</summary><table style="min-width:0"><thead><tr><th>Producto</th><th class="n">Cant.</th><th class="n">Valor</th></tr></thead><tbody>'+
    plist(r).map(o=>'<tr><td>'+esc(o.name)+'</td><td class="n">'+o.qty+'</td><td class="n">'+cop.format(o.total)+'</td></tr>').join('')+'</tbody></table></details>';
  }
  function cuadreHTML(d){
    var exp=d.base+d.cashSales-d.cashExp,has=d.counted!=null,diff=has?d.counted-exp:0;
    function row(l,v,c){return '<div class="hrow"><span>'+l+'</span><b'+(c?' style="color:'+c+'"':'')+'>'+v+'</b></div>'}
    return '<div class="cuadre"><h3>Cuadre: caja vs. sistema</h3>'+
      row('Total vendido (según el sistema)',cop.format(d.total))+row('Gastos del día (−)',cop.format(d.exp))+row('<b>Neto: vendido menos gastos</b>',cop.format(d.total-d.exp))+
      '<div class="csub">Efectivo que debería haber en la caja</div>'+
      (d.base?row('Base inicial',cop.format(d.base)):'')+row('Ventas en efectivo',cop.format(d.cashSales))+row('Gastos pagados en efectivo (−)',cop.format(d.cashExp))+row('<b>Efectivo esperado</b>',cop.format(exp))+
      (d.total-d.cashSales?row('Otros medios (no entran a caja)',cop.format(d.total-d.cashSales)):'')+
      (has?row('Efectivo contado',cop.format(d.counted))+'<div class="cdiff '+(diff===0?'ok':'bad')+'">'+(diff===0?'✔ La caja cuadra con el sistema':diff>0?'Sobran '+cop.format(diff):'Faltan '+cop.format(-diff))+'</div>':'')+'</div>'}
  function closeCuadre(c){var g=(c.gastos||[]).filter(x=>x.pay==='Efectivo').reduce((a,x)=>a+x.amount,0);return {total:c.total,exp:c.exp||0,cashSales:c.pay['Efectivo']||0,cashExp:g,base:c.base||0,counted:c.cash==null?null:c.cash}}
  function openCuadre(){var l=openExp(),r=agg(openSales()),cs=$('cCash').value;return {total:r.total,exp:sumExp(l),cashSales:r.pay['Efectivo']||0,cashExp:sumExp(l.filter(g=>g.pay==='Efectivo')),base:parseM($('cBase').value),counted:cs===''?null:Math.max(0,parseM(cs))}}
  function renderCuadre(){$('cuadre').innerHTML=cuadreHTML(openCuadre())}
  function cashLine(c){if(c.cash==null)return '';var d=c.cash-c.expected;return 'Efectivo esperado '+cop.format(c.expected)+', contado '+cop.format(c.cash)+(d===0?': cuadra':d>0?': sobran '+cop.format(d):': faltan '+cop.format(-d))}
  function closureHTML(c){return head('<div>Cierre de caja</div>')+'<div>'+esc(fmtDate(c.date))+'</div><div class="small">Facturas '+c.from+' a '+c.to+' - cerrada '+new Date(c.closedAt).toLocaleString('es-CO')+'</div>'+reportHTML(c,1)+cuadreHTML(closeCuadre(c))+gastosHTML(c)+invList(c)}
  function closureText(c){var L=[(cfg.name||NAME)+' - Cierre de caja',fmtDate(c.date),'Facturas '+c.from+' a '+c.to,'','Facturas: '+c.n,'Unidades: '+c.units,'TOTAL VENDIDO: '+cop.format(c.total),'Descuentos: '+cop.format(c.disc),'IVA incluido: '+cop.format(c.tax),'Gastos: '+cop.format(c.exp||0),'Neto: '+cop.format(c.total-(c.exp||0)),'','Por forma de pago:'];
    Object.keys(c.pay).forEach(k=>L.push(k+': '+cop.format(c.pay[k])));L.push('','Qué se vendió:');
    plist(c).forEach(o=>L.push(o.qty+' x '+o.name+'  '+cop.format(o.total)));
    if(c.gastos&&c.gastos.length){L.push('','Gastos:');c.gastos.forEach(g=>L.push(g.desc+' ('+g.pay+'): '+cop.format(g.amount)))}L.push('','CUADRE DE CAJA');if(c.base)L.push('Base inicial: '+cop.format(c.base));L.push('Ventas en efectivo: '+cop.format(c.pay['Efectivo']||0));if(c.cash!=null)L.push(cashLine(c));return L.join('\n')}
  function rowH(s){return '<div class="hrow" data-id="'+s.id+'"><div class="'+(s.void?'void':'')+'"><b>'+s.num+'</b> '+(s.type==='e'?'(electrónica)':'(física)')+'<small>'+esc(s.cust)+' - '+new Date(s.date).toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})+'</small></div><div style="text-align:right"><div class="'+(s.void?'void':'')+'">'+cop.format(s.total)+'</div><button class="ghost" data-a="ver" style="min-height:30px;padding:2px 8px">Ver</button> '+(s.void||s.closed?'':'<button class="ghost adm" data-a="anular" style="min-height:30px;padding:2px 8px">Anular</button>')+'</div></div>'}
  function dayG(title,list,open){var v=list.filter(s=>!s.void),t=v.reduce((a,s)=>a+s.total,0);
    return '<details class="dayg"'+(open?' open':'')+'><summary><span>'+title+'</span><span class="dsum">'+v.length+' fact. - '+cop.format(t)+'</span></summary>'+(list.length?list.map(rowH).join(''):'<div class="empty">Aún no hay facturas hoy.</div>')+'</details>'}
  function histHTML(){
    var td=new Date().toDateString(),open=sales.filter(s=>!s.closed);
    var h=open.some(s=>new Date(s.date).toDateString()!==td)?'<div class="hrow" style="color:var(--accent);font-weight:600">Hay facturas de días anteriores sin cerrar. Haz el cierre de caja.</div>':'';
    h+=dayG('Hoy - '+new Date().toLocaleDateString('es-CO',{day:'numeric',month:'long'}),open,true);
    closures.slice().sort((a,b)=>a.closedAt<b.closedAt?1:-1).forEach(function(c){
      var l=sales.filter(s=>s.closed===c.id);
      if(l.length)h+=dayG(new Date(c.date+'T12:00:00').toLocaleDateString('es-CO',{weekday:'long',day:'numeric',month:'long'}),l,false)});
    return h}
  function invList(c){var l=sales.filter(s=>s.closed===c.id);return l.length?'<h3 style="margin:14px 0 4px">Facturas de este cierre</h3>'+l.map(s=>'<div class="hrow"><span class="'+(s.void?'void':'')+'">'+s.num+' - '+esc(s.cust)+(s.void?' (anulada)':'')+'</span><span class="'+(s.void?'void':'')+'">'+cop.format(s.total)+' <button class="ghost noprint" data-inv="'+s.id+'" style="min-height:28px;padding:2px 8px">Ver</button></span></div>').join(''):''}
  $('invBody').addEventListener('click',function(e){var b=e.target.closest('[data-inv]');if(!b)return;var s=sales.find(x=>x.id===b.getAttribute('data-inv'));if(s)showInv(s)});
  function showHtml(h,t){curInv={text:t};$('invWa').hidden=$('invMail').hidden=true;$('invBody').innerHTML='<div class="invoice">'+h+'</div>';if(!$('invDlg').open)$('invDlg').showModal()}
  function renderCaja(){
    var r=agg(openSales());
    r.exp=sumExp(openExp());renderGastos();$('cajaOpen').innerHTML=(r.n||r.exp)?reportHTML(r):'<div class="empty">Aún no hay ventas sin cerrar. Cuando emitas facturas, aparecerán aquí.</div>';
    $('cClose').disabled=!(r.n||r.exp);renderCuadre();
    var seen={};closures.forEach(c=>seen[c.date.slice(0,7)]=1);
    var ms=Object.keys(seen).sort().reverse(),cur=$('cMonth').value;
    $('cMonth').innerHTML=ms.length?ms.map(m=>'<option value="'+m+'">'+monthName(m)+'</option>').join(''):'<option value="">Sin cierres</option>';
    if(ms.indexOf(cur)>-1)$('cMonth').value=cur;
    renderMonth();
  }
  function renderMonth(){
    var m=$('cMonth').value,list=closures.filter(c=>c.date.slice(0,7)===m).sort((a,b)=>a.closedAt<b.closedAt?-1:1);
    if(!list.length){$('cMonthSum').innerHTML='<div class="empty">Cuando cierres tu primera caja, el resumen del mes aparecerá aquí.</div>';$('cDays').innerHTML='';return}
    var acc=0;
    $('cMonthSum').innerHTML='<div class="small" style="color:var(--muted)">'+list.length+' cierre'+(list.length===1?'':'s')+' en el mes</div>'+reportHTML(merge(list));
    $('cDays').innerHTML=list.map(c=>{acc+=c.total;return '<tr data-id="'+c.id+'"><td>'+new Date(c.date+'T12:00:00').toLocaleDateString('es-CO',{weekday:'short',day:'numeric',month:'short'})+'</td><td class="n">'+c.n+'</td><td class="n">'+cop.format(c.total)+'</td><td class="n"><b>'+cop.format(acc)+'</b></td><td><button class="ghost" style="min-height:30px;padding:2px 8px">Ver</button></td></tr>'}).join('');
  }
  $('cMonth').onchange=renderMonth;
  function setMonthOpen(o){
    $('cMonthBody').style.display=o?'':'none';
    $('cMonthT').textContent=o?'Ocultar ▲':'Mostrar ▼';
    $('cMonthT').setAttribute('aria-expanded',o?'true':'false');
    try{localStorage.setItem('ferreteria-resumen-mes',o?'1':'0')}catch(e){}
  }
  $('cMonthT').onclick=function(){setMonthOpen($('cMonthBody').style.display==='none')};
  (function(){var o=true;try{o=localStorage.getItem('ferreteria-resumen-mes')!=='0'}catch(e){}setMonthOpen(o)})();
  $('cCash').addEventListener('input',renderCuadre);$('cBase').addEventListener('input',renderCuadre);
  $('cDays').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;var id=b.closest('tr').getAttribute('data-id'),c=closures.find(x=>x.id===id);if(c)showHtml(closureHTML(c),closureText(c))});
  $('cClose').onclick=function(){
    var list=openSales(),gl=openExp();if(!list.length&&!gl.length)return;
    var r=agg(list),d=new Date((list[0]||{date:gl[0].date}).date),key=d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);
    var cs=$('cCash').value,cash=cs===''?null:Math.max(0,parseM(cs)),ge=sumExp(gl),gc=sumExp(gl.filter(g=>g.pay==='Efectivo'));
    if(!confirm('¿Cerrar la caja con '+r.n+' factura'+(r.n===1?'':'s')+' por '+cop.format(r.total)+' y gastos por '+cop.format(ge)+'? Comenzará un día nuevo en cero.'))return;
    var c=Object.assign(r,{id:'c'+Date.now(),date:key,closedAt:new Date().toISOString(),from:list.length?list[list.length-1].num:'-',to:list.length?list[0].num:'-',cash:cash,base:parseM($('cBase').value),expected:parseM($('cBase').value)+(r.pay['Efectivo']||0)-gc,exp:ge,gastos:gl.map(g=>({desc:g.desc,amount:g.amount,pay:g.pay}))});
    closures.push(c);sales.filter(s=>!s.closed).forEach(s=>{s.closed=c.id});gl.forEach(g=>{g.closed=c.id});$('cCash').value='';$('cBase').value='';
    saveS();renderSales();renderCaja();showHtml(closureHTML(c),closureText(c));
  };
  $('tCaja').onclick=function(){$('vInv').hidden=true;$('vSales').hidden=true;$('vCaja').hidden=false;$('tInv').setAttribute('aria-pressed',false);$('tSales').setAttribute('aria-pressed',false);this.setAttribute('aria-pressed',true);renderCaja()};
  function drawer(o){$('two').classList.toggle('open',o)}
  $('dOpen').onclick=function(){drawer(true)};
  $('dClose').onclick=function(){drawer(false)};
  $('dtF').onclick=$('dtC').onclick=function(){var c=this.id==='dtC';$('hist').hidden=c;$('custList').hidden=!c;$('dtF').setAttribute('aria-pressed',!c);$('dtC').setAttribute('aria-pressed',c)};
  document.addEventListener('keydown',function(e){if(e.key==='Escape')drawer(false)});
  $('sDiscT').onchange=function(){reflow($('sDiscV'),this.value);renderSales()};$('sDiscV').oninput=renderSales;$('sLt').onchange=function(){reflow($('sLd'),this.value)};
  $('tInv').onclick=$('tSales').onclick=function(){
    var sales_=this.id==='tSales';
    $('vInv').hidden=sales_;$('vSales').hidden=!sales_;$('vCaja').hidden=true;$('tCaja').setAttribute('aria-pressed',false);
    $('tInv').setAttribute('aria-pressed',!sales_);$('tSales').setAttribute('aria-pressed',sales_);
    if(sales_)renderSales();
  };
  $('sAdd').onclick=function(){
    var p=findP($('sq').value),q=parseInt($('sQty').value,10)||0;
    if(!p)return alert('Elige un producto de la lista.');
    if(q<1)return alert('La cantidad debe ser al menos 1.');
    var ex=cart.find(l=>l.pid===p.id),tot=q+(ex?ex.qty:0);
    if(tot>p.stock)return alert('Solo hay '+p.stock+' unidades de «'+p.name+'».');
    var dt0=$('sLt').value,dv0=Math.max(0,numOf($('sLd').value,dt0));if(ex){ex.qty=tot;if(dv0){ex.dv=dv0;ex.dt=dt0}}else cart.push({pid:p.id,name:p.name,qty:q,price:p.price,dv:dv0,dt:dt0});
    $('sq').value='';$('sQty').value=1;$('sLd').value='';renderSales();$('sq').focus();
  };
  $('cart').addEventListener('change',function(e){var tr=e.target.closest('tr');if(!tr)return;var l=cart[+tr.getAttribute('data-i')];if(!l)return;
    if(e.target.classList.contains('ld'))l.dv=Math.max(0,numOf(e.target.value,l.dt==='v'?'v':'p'));else if(e.target.classList.contains('lt'))l.dt=e.target.value;else return;renderSales()});
  $('cart').addEventListener('click',function(e){var tr=e.target.closest('tr');if(!tr||!e.target.closest('button'))return;cart.splice(+tr.getAttribute('data-i'),1);renderSales();});
  $('sIva').onchange=renderSales;
  ['bName','bNit','bRes','bNext'].forEach(function(id){$(id).addEventListener('input',function(){
    cfg.name=$('bName').value;cfg.nit=$('bNit').value;cfg.res=$('bRes').value;cfg.next=Math.max(1,parseInt($('bNext').value,10)||1);saveS();});});
  $('sIssue').onclick=function(){
    if(!cart.length)return alert('Agrega al menos un producto.');
    var sendCh=$('sType').value==='e'?$('sSend').value:'no';
    if(sendCh==='wa'&&!phoneCO($('sPhone').value||(findC($('sDoc').value)||{}).phone))return $('cliDet').open=true,alert('Para enviar por WhatsApp escribe el celular del cliente (10 dígitos, ej. 3001234567) o elige «No enviar ahora».');
    if(sendCh==='mail'&&!emailOk($('sEmail').value||(findC($('sDoc').value)||{}).email))return $('cliDet').open=true,alert('Para enviar por correo escribe el correo electrónico del cliente (ej. cliente@correo.com) o elige «No enviar ahora».');
    var mode=$('sIva').value,c=calc(cart,mode);
    var s={id:'v'+Date.now(),num:'FV-'+('0000'+cfg.next).slice(-4),date:new Date().toISOString(),type:$('sType').value,
      cust:$('sCust').value.trim()||(findC($('sDoc').value)||{}).name||'Consumidor final',doc:$('sDoc').value.trim()||'222222222222',phone:$('sPhone').value.trim()||(findC($('sDoc').value)||{}).phone||'',email:$('sEmail').value.trim()||(findC($('sDoc').value)||{}).email||'',pay:$('sPay').value,mode:mode,by:me?me.name:'',
      lines:cart.map(l=>({pid:l.pid,name:l.name,qty:l.qty,price:l.price,dv:l.dv||0,dt:l.dt||'p',disc:lineDisc(l)})),gross:c.gross,disc:c.disc,sub:c.sub,tax:c.tax,total:c.total};
    cart.forEach(l=>{var p=items.find(x=>x.id===l.pid);if(p)p.stock=Math.max(0,p.stock-l.qty);});
    cfg.next++;sales.unshift(s);cart=[];
    if(s.doc!=='222222222222'&&s.cust!=='Consumidor final'){var k=findC(s.doc);if(k){k.name=s.cust;if(s.phone)k.phone=s.phone;if(s.email)k.email=s.email}else customers.push({doc:s.doc,name:s.cust,phone:s.phone,email:s.email});}
    $('sCust').value='';$('sDoc').value='';$('sPhone').value='';$('sEmail').value='';$('cliDet').open=false;$('sDiscV').value='';$('cHint').textContent='';
    save();saveS();render();renderSales();showInv(s);if(sendCh!=='no')sendInv(s,sendCh);
  };
  $('hist').addEventListener('click',function(e){
    var b=e.target.closest('button');if(!b)return;
    var s=sales.find(x=>x.id===b.closest('.hrow').getAttribute('data-id'));if(!s)return;
    if(b.getAttribute('data-a')==='ver')return showInv(s);
    if(!can('void'))return alert('No tienes permiso para anular facturas.');
    if(s.closed)return alert('Esta factura ya pertenece a una caja cerrada y no se puede anular.');
    if(!confirm('¿Anular la factura '+s.num+'? Las unidades volverán al inventario.'))return;
    s.void=true;s.voidBy=me?me.name:'';s.lines.forEach(l=>{var p=items.find(x=>x.id===l.pid);if(p)p.stock+=l.qty;});
    save();saveS();render();renderSales();
  });
  $('invPrint').onclick=function(){try{window.print()}catch(e){alert('No se pudo abrir la impresión. Usa Copiar texto o la captura de pantalla.')}};
  $('invCopy').onclick=function(){
    try{navigator.clipboard.writeText(invText(curInv)).then(function(){$('invCopy').textContent='Copiado'},function(){alert(invText(curInv))})}catch(e){alert(invText(curInv))}
  };
  $('invClose').onclick=function(){$('invCopy').textContent='Copiar texto';$('invDlg').close();};

  function phoneCO(v){var d=String(v||'').replace(/\D/g,'');if(d.length===12&&d.slice(0,2)==='57')d=d.slice(2);return /^3\d{9}$/.test(d)?'57'+d:''}
  function emailOk(v){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v||'').trim())}
  function sendInv(s,ch){
    var m=invText(s)+'\n\nGracias por su compra.';
    if(ch==='mail'){
      var goM=function(em){var sub='Factura '+(s.type==='e'?'electrónica ':'')+s.num+' - '+(cfg.name||NAME);location.href='mailto:'+em.trim()+'?subject='+encodeURIComponent(sub)+'&body='+encodeURIComponent(m)};
      if(emailOk(s.email))return goM(s.email);
      return ask('Correo electrónico del cliente:','',function(v){if(!emailOk(v))return alert('Correo no válido. Ejemplo: cliente@correo.com');s.email=String(v).trim();var k=findC(s.doc);if(k)k.email=s.email;saveS();goM(s.email)},'email');
    }
    var go=function(ph){window.open('https://wa.me/'+ph+'?text='+encodeURIComponent(m),'_blank')};
    var ph=phoneCO(s.phone);if(ph)return go(ph);
    ask('Celular del cliente (10 dígitos, ej. 3001234567):','',function(v){var p=phoneCO(v);if(!p)return alert('Número no válido. Debe tener 10 dígitos y empezar por 3.');s.phone=String(v).trim();saveS();go(p)});
  }
  var askCb=null;
  function ask(m,d,cb,t){askCb=cb;$('askIn').type=t||'text';$('askMsg').textContent=m;$('askIn').value=d||'';$('askDlg').showModal();$('askIn').focus();$('askIn').select()}
  $('askOk').onclick=function(){var f=askCb,v=$('askIn').value;askCb=null;$('askDlg').close();if(f)f(v)};
  $('askNo').onclick=function(){askCb=null;$('askDlg').close()};
  $('askIn').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();$('askOk').click()}});
  $('invWa').onclick=function(){sendInv(curInv,'wa')};
  $('invMail').onclick=function(){sendInv(curInv,'mail')};
  $('sType').onchange=function(){$('sendBox').hidden=this.value!=='e';if(this.value==='e')$('cliDet').open=true};
  function addGasto(){
    var d=$('gDesc').value.trim(),a=parseM($('gAmt').value);
    if(!d)return alert('Escribe en qué fue el gasto.');
    if(a<=0)return alert('Escribe el valor del gasto.');
    expenses.push({id:'g'+Date.now(),date:new Date().toISOString(),desc:d,amount:a,pay:$('gPay').value});
    $('gDesc').value='';$('gAmt').value='';saveS();renderCaja();$('gDesc').focus();
  }
  $('gAdd').onclick=addGasto;
  $('gAmt').addEventListener('keydown',function(e){if(e.key==='Enter')addGasto()});
  $('gList').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;
    var g=expenses.find(x=>x.id===b.closest('.hrow').getAttribute('data-id'));
    if(!g||!confirm('¿Quitar el gasto «'+g.desc+'»?'))return;
    expenses=expenses.filter(x=>x!==g);saveS();renderCaja();
  });

  /* ===== Usuarios y seguridad (con restricción de único admin inicial) ===== */
  var UKEY='ferreteria-usuarios-v1', users=[], rec=null, hist=[], me=null, fails=0, lockUntil=0, idle=null, sessStart=0;
  function loadU(){try{var r=JSON.parse(localStorage.getItem(UKEY)||'null');if(r){users=r.users||[];rec=r.rec||null;hist=r.hist||[]}}catch(e){}}
  function saveU(){try{localStorage.setItem(UKEY,JSON.stringify({users:users,rec:rec,hist:hist}))}catch(e){}}
  function isAdmin(){return !!me&&me.role==='admin'}
  var PERMS=[['inv','📦 Ver el inventario'],['invEdit','✏️ Crear, editar y eliminar productos, ajustar existencias y categorías'],['sales','🧾 Vender y ver facturas'],['void','🚫 Anular facturas'],['caja','💰 Cierre de caja y gastos']],
      PSHORT={inv:'Inventario',invEdit:'Editar inventario',sales:'Ventas',void:'Anular facturas',caja:'Caja'},
      DEFP={inv:true,sales:true};
  function can(k){if(k==='costs')return isAdmin();return isAdmin()||(!!me&&!!(me.perms||DEFP)[k])}
  function tabOk(n){return n==='users'?isAdmin():n==='inv'?can('inv'):n==='sales'?can('sales'):n==='caja'?can('caja'):false}
  function firstTab(){return ['inv','sales','caja','users'].filter(tabOk)[0]||null}
  function applyPerms(){
    var b=document.body;b.classList.toggle('noEdit',!can('invEdit'));b.classList.toggle('noCost',!isAdmin());
    [['tInv','inv'],['tSales','sales'],['tCaja','caja'],['tUsers','users']].forEach(function(t){$(t[0]).style.display=tabOk(t[1])?'':'none'});
  }
  function permsHTML(perms){var p=perms||DEFP;return PERMS.map(function(x){return '<label style="display:flex;flex-direction:row;gap:8px;align-items:center;font-weight:500;margin:6px 0"><input type="checkbox" data-p="'+x[0]+'"'+(p[x[0]]?' checked':'')+' style="width:18px;height:18px;min-height:0;accent-color:var(--accent)"> '+x[1]+'</label>'}).join('')}
  function readPerms(box){var o={};box.querySelectorAll('input[data-p]').forEach(function(i){o[i.getAttribute('data-p')]=i.checked});delete o.costs;if(!o.inv){o.invEdit=false}if(!o.sales)o.void=false;return o}
  function permSummary(u){var p=u.perms||DEFP,l=Object.keys(PSHORT).filter(function(k){return p[k]}).map(function(k){return PSHORT[k]});return l.length?l.join(', '):'ninguno'}
  function b64(b){return btoa(String.fromCharCode.apply(null,new Uint8Array(b)))}
  function unb64(t){return Uint8Array.from(atob(t),function(c){return c.charCodeAt(0)})}
  async function hashPw(pw,saltB64){
    var salt=saltB64?unb64(saltB64):crypto.getRandomValues(new Uint8Array(16));
    var k=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveBits']);
    var bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:salt,iterations:150000,hash:'SHA-256'},k,256);
    return {salt:b64(salt),hash:b64(bits)};
  }
  function genCode(){var a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',r=crypto.getRandomValues(new Uint8Array(12)),o='';for(var i=0;i<12;i++){o+=a[r[i]%a.length];if(i%4===3&&i<11)o+='-'}return o}
  function msg(id,t){$(id).textContent=t}
  function lkShow(id){['lkSetup','lkLogin','lkCode','lkRec'].forEach(function(k){$(k).hidden=k!==id});var f=$(id).querySelector('input');if(f)setTimeout(function(){f.focus()},0)}
  function waitMsg(){var w=Math.ceil((lockUntil-Date.now())/1000);return 'Demasiados intentos. Espera '+w+' segundos.'}
  function failed(){fails++;if(fails>=5)lockUntil=Date.now()+30000*Math.min(fails-4,10)}
  function logEv(type){
    if(!me)return;var now=Date.now();
    hist.push({id:'h'+now+Math.random().toString(36).slice(2,5),uid:me.id,name:me.name,user:me.user,type:type,at:new Date(now).toISOString(),dur:type==='in'?0:(sessStart?now-sessStart:0)});
    if(hist.length>1000)hist=hist.slice(-1000);saveU();
  }
  function bump(){clearTimeout(idle);if(me)idle=setTimeout(function(){logout('idle')},600000)}
  ['click','keydown','mousemove'].forEach(function(ev){document.addEventListener(ev,bump,true)});
  function showTab(n){
    if(!tabOk(n))return;
    var m={inv:['tInv','vInv'],sales:['tSales','vSales'],caja:['tCaja','vCaja'],users:['tUsers','vUsers']};
    Object.keys(m).forEach(function(k){var v=$(m[k][1]);v.hidden=k!==n;v.classList.remove('view-enter');$(m[k][0]).setAttribute('aria-pressed',k===n)});
    var cur=$(m[n][1]);void cur.offsetWidth;cur.classList.add('view-enter');
    if(n==='sales')renderSales();else if(n==='caja')renderCaja();else if(n==='users')renderUsers();
  }
  $('tInv').onclick=function(){showTab('inv')};$('tSales').onclick=function(){showTab('sales')};
  $('tCaja').onclick=function(){showTab('caja')};$('tUsers').onclick=function(){showTab('users')};
  function applyRole(){
    document.body.classList.toggle('vend',!isAdmin());document.body.classList.remove('locked');$('lock').hidden=true;
    $('whoName').textContent='👤 '+me.name+' ('+(isAdmin()?'Administrador':'Vendedor')+')';
    sessStart=Date.now();logEv('in');
    applyPerms();render();renderSales();
    var ft=firstTab();if(!ft){alert('Este usuario no tiene accesos asignados. Habla con el administrador.');logout('out');return}
    showTab(ft);bump();
  }
  function logout(why){
    if(me)logEv(why==='idle'?'idle':'out');
    me=null;sessStart=0;cart=[];clearTimeout(idle);render();
    ['invDlg','catDlg','dlg','askDlg'].forEach(function(i){if($(i).open)$(i).close()});drawer(false);
    document.body.classList.add('locked');$('lock').hidden=false;$('lkPass').value='';msg('lkErr','');lkShow('lkLogin');
  }
  async function doLogin(){
    if(Date.now()<lockUntil)return msg('lkErr',waitMsg());
    var u=$('lkUser').value.trim().toLowerCase(),p=$('lkPass').value,x=users.find(function(a){return a.user===u&&a.active!==false}),ok=false;
    try{if(x){var h=await hashPw(p,x.salt);ok=h.hash===x.hash}else await hashPw(p)}catch(e){return msg('lkErr','Este equipo no permite crear contraseñas seguras.')}
    if(!ok){failed();return msg('lkErr',Date.now()<lockUntil?waitMsg():'Usuario o contraseña incorrectos.')}
    fails=0;me=x;$('lkPass').value='';msg('lkErr','');applyRole();
  }
  async function doSetup(){
    var hasAdmin = users.some(function(u){ return u.role === 'admin'; });
    if(hasAdmin) return msg('stErr','Ya existe un administrador registrado.');

    var n=$('stName').value.trim(),u=$('stUser').value.trim().toLowerCase(),p=$('stPass').value;
    if(!n||!u)return msg('stErr','Escribe tu nombre y un usuario.');
    if(!/^[a-z0-9._-]{3,20}$/.test(u))return msg('stErr','El usuario debe tener de 3 a 20 letras o números, sin espacios ni tildes.');
    if(p.length<6)return msg('stErr','La contraseña debe tener al menos 6 caracteres.');
    if(p!==$('stPass2').value)return msg('stErr','Las contraseñas no coinciden.');
    
    var h=await hashPw(p),code=genCode(),rh=await hashPw(code.replace(/-/g,''));
    users.push({id:'u'+Date.now(),name:n,user:u,role:'admin',salt:h.salt,hash:h.hash,active:true});
    rec={salt:rh.salt,hash:rh.hash};
    saveU();
    
    me=users[users.length-1];
    $('stPass').value=$('stPass2').value='';
    $('recCode').textContent=code;
    lkShow('lkCode');
  }
  async function doRecover(){
    if(Date.now()<lockUntil)return msg('rcErr',waitMsg());
    var u=$('rcUser').value.trim().toLowerCase(),c=$('rcCode').value.toUpperCase().replace(/[^A-Z0-9]/g,''),p=$('rcPass').value,x=users.find(function(a){return a.user===u&&a.role==='admin'});
    if(p.length<6)return msg('rcErr','La nueva contraseña debe tener al menos 6 caracteres.');
    var ok=false;if(x&&rec){var h=await hashPw(c,rec.salt);ok=h.hash===rec.hash}
    if(!ok){failed();return msg('rcErr',Date.now()<lockUntil?waitMsg():'El usuario o el código no son correctos.')}
    var n=await hashPw(p),code=genCode(),rh=await hashPw(code.replace(/-/g,''));
    x.salt=n.salt;x.hash=n.hash;x.active=true;rec={salt:rh.salt,hash:rh.hash};saveU();fails=0;
    me=x;$('rcPass').value=$('rcCode').value='';msg('rcErr','');$('recCode').textContent=code;lkShow('lkCode');
  }
  $('stGo').onclick=doSetup;$('lkGo').onclick=doLogin;$('rcGo').onclick=doRecover;
  $('codeGo').onclick=function(){$('recCode').textContent='';applyRole()};
  $('lkForgot').onclick=function(){msg('lkErr','');lkShow('lkRec')};$('rcBack').onclick=function(){lkShow('lkLogin')};
  ['lkUser','lkPass'].forEach(function(i){$(i).addEventListener('keydown',function(e){if(e.key==='Enter')doLogin()})});
  ['stName','stUser','stPass','stPass2'].forEach(function(i){$(i).addEventListener('keydown',function(e){if(e.key==='Enter')doSetup()})});
  ['rcUser','rcCode','rcPass'].forEach(function(i){$(i).addEventListener('keydown',function(e){if(e.key==='Enter')doRecover()})});
  $('bOut').onclick=function(){logout('out')};
  window.addEventListener('pagehide',function(){if(me)logEv('close')});
  window.addEventListener('pageshow',function(e){if(e.persisted&&me){sessStart=Date.now();logEv('in')}});
  $('bPass').onclick=function(){
    ask('Contraseña actual:','',async function(cur){
      var h=await hashPw(cur,me.salt);if(h.hash!==me.hash)return alert('La contraseña actual no es correcta.');
      ask('Nueva contraseña (mínimo 6 caracteres):','',function(n1){
        if(n1.length<6)return alert('La contraseña debe tener al menos 6 caracteres.');
        ask('Repite la nueva contraseña:','',async function(n2){
          if(n1!==n2)return alert('No coinciden. No se cambió la contraseña.');
          var nh=await hashPw(n1);me.salt=nh.salt;me.hash=nh.hash;saveU();alert('Contraseña cambiada.');
        },'password');
      },'password');
    },'password');
  };
  function renderUsers(){
    $('uList').innerHTML=users.map(function(u){var self=me&&u.id===me.id,sm='style="min-height:30px;padding:2px 8px"';
      return '<div class="hrow" data-id="'+u.id+'"><div class="'+(u.active===false?'void':'')+'"><b>'+esc(u.name)+'</b><small>'+esc(u.user)+' - '+(u.role==='admin'?'Administrador':'Vendedor')+(u.role==='admin'?'':' - Accesos: '+permSummary(u))+(u.active===false?' - desactivado':'')+(self?' - (tú)':'')+'</small></div><div>'+(u.role==='admin'?'':'<button class="ghost" data-a="perm" '+sm+'>Permisos</button> ')+'<button class="ghost" data-a="pw" '+sm+'>Nueva contraseña</button>'+(self?'':' <button class="ghost" data-a="tog" '+sm+'>'+(u.active===false?'Activar':'Desactivar')+'</button> <button class="ghost" data-a="del" style="min-height:30px;padding:2px 8px;color:#b42318;border-color:#b42318">Eliminar</button>')+'</div></div>'}).join('');
    var n=users.filter(function(x){return x.active===false&&(!me||x.id!==me.id)}).length;
    $('uBulk').innerHTML=n?'<button class="ghost" style="color:#b42318;border-color:#b42318">Eliminar los '+n+' usuario'+(n===1?'':'s')+' desactivado'+(n===1?'':'s')+'</button>':'';
    renderHist();
  }
  var EV={in:'Entró al sistema',out:'Salió (cerró sesión)',idle:'Salida automática por inactividad',close:'Salió de la página (cerró o recargó)'};
  function fmtDur(ms){if(!ms)return '-';var m=Math.round(ms/60000);if(m<1)return 'menos de 1 min';if(m<60)return m+' min';return Math.floor(m/60)+' h '+(m%60)+' min'}
  function renderHist(){
    var sel=$('hUser'),cur=sel.value,seen={},opts=['<option value="">Todos los usuarios</option>'];
    hist.forEach(function(h){if(!seen[h.uid]){seen[h.uid]=1;opts.push('<option value="'+esc(h.uid)+'">'+esc(h.name)+' ('+esc(h.user)+')</option>')}});
    sel.innerHTML=opts.join('');if(seen[cur])sel.value=cur;
    var l=hist.filter(function(h){return !sel.value||h.uid===sel.value}).slice().reverse().slice(0,300);
    $('hRows').innerHTML=l.map(function(h){return '<tr><td>'+new Date(h.at).toLocaleString('es-CO')+'</td><td>'+esc(h.name)+' <small style="color:var(--muted)">'+esc(h.user)+'</small></td><td>'+(h.type==='in'?'🟢 ':'🔴 ')+EV[h.type]+'</td><td class="n">'+(h.type==='in'?'-':fmtDur(h.dur))+'</td></tr>'}).join('');
    $('hEmpty').hidden=l.length>0;$('hClear').disabled=!hist.length;
  }
  $('hUser').onchange=renderHist;
  $('hClear').onclick=function(){if(!isAdmin()||!hist.length)return;if(!confirm('¿Borrar todo el historial de entradas y salidas? No se puede deshacer.'))return;hist=[];saveU();renderHist()};
  $('uBulk').addEventListener('click',function(e){
    var b=e.target.closest('button');if(!b||!isAdmin())return;
    var off=users.filter(function(x){return x.active===false&&x.id!==me.id});if(!off.length)return;
    if(!confirm('¿Eliminar a '+off.length+' usuario'+(off.length===1?'':'s')+' desactivado'+(off.length===1?'':'s')+'? Sus facturas y su historial no se borran.'))return;
    users=users.filter(function(x){return off.indexOf(x)<0});saveU();renderUsers();
  });
  $('uList').addEventListener('click',function(e){
    var b=e.target.closest('button');if(!b||!isAdmin())return;
    var u=users.find(function(x){return x.id===b.closest('.hrow').getAttribute('data-id')});if(!u)return;var a=b.getAttribute('data-a');
    if(a==='perm')return openPerm(u);
    if(a==='pw')return ask('Nueva contraseña para '+u.name+' (mínimo 6 caracteres):','',async function(v){if(v.length<6)return alert('La contraseña debe tener al menos 6 caracteres.');var h=await hashPw(v);u.salt=h.salt;u.hash=h.hash;saveU();alert('Contraseña actualizada.')},'password');
    if(u.id===me.id)return;
    if(a==='tog'){u.active=(u.active===false);saveU();renderUsers();return}
    if(a==='del'){if(!confirm('¿Eliminar al usuario «'+u.name+'» ('+u.user+')? Ya no podrá entrar. Sus facturas y su historial no se borran.'))return;users=users.filter(function(x){return x!==u});saveU();renderUsers()}
  });
  $('uAdd').onclick=async function(){
    if(!isAdmin())return;
    var n=$('uName').value.trim(),u=$('uUser').value.trim().toLowerCase(),p=$('uPass').value,r=$('uRole').value;
    if(!n||!u)return alert('Escribe el nombre y el usuario.');
    if(!/^[a-z0-9._-]{3,20}$/.test(u))return alert('El usuario debe tener de 3 a 20 letras o números, sin espacios ni tildes.');
    if(users.some(function(x){return x.user===u}))return alert('Ese usuario ya existe.');
    if(p.length<6)return alert('La contraseña debe tener al menos 6 caracteres.');
    var h=await hashPw(p);users.push({id:'u'+Date.now(),name:n,user:u,role:r==='admin'?'admin':'vend',perms:r==='admin'?null:readPerms($('uPermsBody')),salt:h.salt,hash:h.hash,active:true});
    saveU();$('uName').value=$('uUser').value=$('uPass').value='';$('uPermsBody').innerHTML=permsHTML(DEFP);renderUsers();
  };
  var permUser=null;
  function openPerm(u){permUser=u;$('pdTitle').textContent='Permisos de '+u.name;$('pdBody').innerHTML=permsHTML(u.perms)+'<p class="hint" style="margin-top:8px">Los cambios se aplican la próxima vez que esta persona entre.</p>';$('permDlg').showModal()}
  $('pdCancel').onclick=function(){$('permDlg').close()};
  $('pdSave').onclick=function(){if(!permUser||!isAdmin())return;permUser.perms=readPerms($('pdBody'));saveU();$('permDlg').close();renderUsers()};
  $('uPermsBody').innerHTML=permsHTML(DEFP);
  $('uRole').onchange=function(){$('uPerms').style.display=this.value==='vend'?'':'none'};

  function initAuth(){
    var hasAdmin = users.some(function(u){ return u.role === 'admin'; });
    if(!hasAdmin){
      lkShow('lkSetup');
    } else {
      lkShow('lkLogin');
    }
  }

  load();loadS();loadC();loadU();render();renderSales();initAuth();
})();