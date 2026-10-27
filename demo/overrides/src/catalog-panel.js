/* Product presentation shared by recommendations and the searchable store directory. */
(function(){
 const el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
 const zoneFor=p=>Fuji.catalog.zones.find(z=>z.id===p.zone);
 const coffee='<svg viewBox="0 0 120 120" aria-hidden="true"><ellipse cx="60" cy="103" rx="29" ry="4" fill="#d3cdbb"/><path d="M34 32h52l-7 65H41Z" fill="#fffaf1" stroke="#435f48" stroke-width="2"/><path d="M32 29q28-9 56 0v8H32Z" fill="#435f48"/><path d="M38 55h44v23H38Z" fill="#435f48"/><path d="m49 68 10-10 13 10M50 20c-8-8 8-8 0-16m20 16c-8-8 8-8 0-16" stroke="#789078" fill="none" stroke-width="2"/></svg>';
 function artwork(p){
  const box=el('span','catalog-art');if(p.imageBackground)box.style.backgroundColor=p.imageBackground;
  if(p.image){const img=el('img');img.src=p.image;img.alt=p.displayEn||p.en;img.loading='lazy';img.width=p.imageWidth||400;img.height=p.imageHeight||320;box.append(img);if(p.imageKind==='user-ai-reference')box.classList.add('approved-label');if(p.zone==='sweets')box.classList.add('sweets-label');}
  else if(p.zone==='coffee')box.innerHTML=coffee;
  else {box.classList.add('pending');box.innerHTML='<svg viewBox="0 0 80 80" aria-hidden="true"><path d="m19 26 21-10 21 10v29L40 66 19 55Zm0 0 21 11 21-11M40 37v29" fill="none" stroke="currentColor" stroke-width="2"/></svg>';}
  return box;
 }
 function productRow(p,onLocate,onAdd,showCategory=true){
  const row=el('article','catalog-product');row.dataset.productId=p.id;
  row.append(artwork(p));const info=el('div','catalog-product-copy');
  const name=el('h4','product-title',p.displayEn||p.en);name.lang='en';info.append(name);
  if(Number.isInteger(p.projectPriceJPY)){const label=el('small','product-image-note','¥'+p.projectPriceJPY+' · '+(p.priceSource==='official_analog'?'Reference price':'Estimate'));label.title=p.priceReference?.note||'Reference / estimated price';info.append(label);}
  const zone=zoneFor(p);if(showCategory&&onAdd)info.append(el('p','product-location',zone.en));
  if(!p.image&&p.zone!=='coffee')info.append(el('small','product-image-note','Image pending'));
  const actions=el('div','product-row-actions');
  const find=el('button','product-find','Find');find.type='button';find.title=p.displayEn||p.en;find.setAttribute('aria-label','Find '+p.en);find.disabled=p.unavailable;find.onclick=()=>onLocate(p);actions.append(find);
  if(onAdd){const add=el('button','product-add','＋ Add');add.type='button';add.setAttribute('aria-label','Add '+p.en+' to basket');add.disabled=p.unavailable;add.onclick=()=>onAdd(p);actions.append(add);}
  info.append(actions);row.append(info);return row;
 }
 Fuji.renderProductCards=function(products,onLocate,onAdd){const host=document.getElementById('clerk-products');host.replaceChildren(...products.map(p=>productRow(p,onLocate,onAdd,false)));host.style.gridTemplateColumns=`repeat(${Math.max(1,products.length)},minmax(0,1fr))`;};
 Fuji.enhanceClerkCatalog=function(api,ctx,actions){
  const panel=document.getElementById('clerk-panel'),body=document.getElementById('clerk-body'),composer=document.getElementById('clerk-form');
  const preferences=el('details','clerk-preferences'),preferencesLabel=el('summary','','Preferences');
  preferencesLabel.id='clerk-preferences-label';preferences.append(preferencesLabel);
  body.querySelectorAll('.clerk-chips').forEach(group=>preferences.append(group));
  body.insertBefore(preferences,document.getElementById('clerk-card'));
  const refreshPreferences=()=>{preferencesLabel.textContent='Preferences · '+{morning:'Morning',afternoon:'Afternoon',rain:'Rain',night:'Night'}[api.state.context]+' · '+(api.state.size==='full'?'A full meal':'A light bite');};
  refreshPreferences();preferences.addEventListener('click',()=>requestAnimationFrame(refreshPreferences));
  const pairTools=document.querySelector('.clerk-card-actions');pairTools.classList.add('clerk-pair-tools');panel.insertBefore(pairTools,composer);
  document.getElementById('swap-pair').textContent='↻ Swap';
  document.getElementById('swap-pair').setAttribute('aria-label','Try another pairing');
  document.getElementById('find-pair').textContent='⌖ Find in store';
  document.getElementById('find-pair').setAttribute('aria-label','Find first item in store');
  document.getElementById('add-pair').textContent='＋ Add pairing';
  document.getElementById('add-pair').setAttribute('aria-label','Add pairing to basket');
  const tabs=el('div','clerk-view-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Clerk panel view');
  const chat=el('button','','For you'),browse=el('button','','Browse');
  chat.id='clerk-chat-tab';browse.id='clerk-browse-tab';chat.type=browse.type='button';
  [chat,browse].forEach(b=>b.setAttribute('role','tab'));chat.setAttribute('aria-controls','clerk-body');browse.setAttribute('aria-controls','catalog-pane');
  body.setAttribute('role','tabpanel');body.setAttribute('aria-labelledby',chat.id);tabs.append(chat,browse);panel.insertBefore(tabs,body);
  const catalog=el('section','catalog-pane');catalog.id='catalog-pane';catalog.hidden=true;catalog.setAttribute('role','tabpanel');catalog.setAttribute('aria-labelledby',browse.id);
  const form=el('div','catalog-filters');
  const label=el('label','','Search products');label.htmlFor='catalog-search';
  const input=el('input');input.id='catalog-search';input.type='search';input.placeholder='Search by name…';input.autocomplete='off';input.maxLength=120;input.onfocus=actions.stopWalking;
  const select=el('select');select.id='catalog-zone';select.setAttribute('aria-label','Product category');
  const all=el('option','','All categories');all.value='';select.append(all);
  Fuji.catalog.zones.forEach(z=>{const o=el('option','',z.en+' · '+z.count);o.value=z.id;select.append(o);});
  const count=el('p','catalog-count');count.setAttribute('role','status');count.id='catalog-count';
  form.append(label,input,select,count);catalog.append(form);
  const results=el('div','catalog-results');results.id='catalog-results';catalog.append(results);
  const pager=el('div','catalog-pagination'),prev=el('button','','← Previous'),next=el('button','','Next →'),pageLabel=el('span');
  prev.type=next.type='button';pager.append(prev,pageLabel,next);catalog.append(pager);
  catalog.append(el('p','catalog-disclaimer','Scene catalog · Reference prices · Ingredients unverified'));
  panel.insertBefore(catalog,pairTools);
  let page=0;const pageSize=12;
  function render(){
   const query=input.value.trim().normalize('NFKC').toLocaleLowerCase();
   const filtered=Fuji.catalog.products.filter(p=>(!select.value||p.zone===select.value)&&(!query||[p.en,p.displayEn,p.ja,p.zh,p.id,...(p.searchAliases||[])].filter(Boolean).join(' ').normalize('NFKC').toLocaleLowerCase().includes(query)));
   const max=Math.max(1,Math.ceil(filtered.length/pageSize));page=Math.min(page,max-1);
   count.textContent=filtered.length+' '+(filtered.length===1?'item':'items')+(query?' found':'');
   results.replaceChildren(...filtered.slice(page*pageSize,(page+1)*pageSize).map(p=>productRow(p,api.locate,actions.addProduct,!select.value)));
   if(!filtered.length)results.append(el('p','catalog-empty','No matches. Try another name or category.'));
   pageLabel.textContent=(page+1)+' / '+max;prev.disabled=page===0;next.disabled=page>=max-1;results.scrollTop=0;
  }
  input.oninput=select.onchange=()=>{page=0;render();};prev.onclick=()=>{page--;render();};next.onclick=()=>{page++;render();};
  function view(isCatalog){body.hidden=isCatalog;catalog.hidden=!isCatalog;composer.hidden=isCatalog;pairTools.hidden=isCatalog;chat.setAttribute('aria-selected',String(!isCatalog));browse.setAttribute('aria-selected',String(isCatalog));chat.tabIndex=isCatalog?-1:0;browse.tabIndex=isCatalog?0:-1;if(isCatalog)render();}
  chat.onclick=()=>view(false);browse.onclick=()=>view(true);
  tabs.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const show=e.key==='End'||(e.key!=='Home'&&catalog.hidden);view(show);(show?browse:chat).focus();}};
  view(false);
  // Model coordinates are a location target; choose a nearby safe aisle cell before walking.
  api.catalogValidation=Fuji.catalog.validation;
 };
})();

