window.Fuji=window.Fuji||{};
Fuji.loadProductCatalog=async function(world){
 const response=await fetch('data/product-catalog.json?v=73.1');
 if(!response.ok)throw Error('Product catalog could not load');
 const data=await response.json();
 const priceResponse=await fetch('data/project-prices.json?v=38.1');
 if(!priceResponse.ok)throw Error('Project prices could not load');
 const prices=await priceResponse.json();
 data.products.forEach(p=>{p.projectPriceJPY=prices.prices[p.id];p.priceSource=prices.items?.[p.id]?.type||'project_estimate';p.priceReference=prices.items?.[p.id]||null;});
 const names=new Set();world.root.traverse(o=>names.add(o.name));
 const missing=[];
 data.products.forEach(p=>{
  p.node=THREE.PropertyBinding.sanitizeNodeName(p.node);
  p.unavailable=!names.has(p.node);if(p.unavailable)missing.push(p.id);
 });
 data.validation={total:data.products.length,matched:data.products.length-missing.length,missing};
 Fuji.catalog=data;FujiClerkEngine.configure(data);
 return data;
};
