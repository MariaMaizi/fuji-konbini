'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const data=require('./clerk-ingredients.cjs').load(),policy=require('./clerk-policy.cjs'),guidance=require('./clerk-allergy-guidance.cjs');
const catalog=policy.pricedCatalog(require('../web/data/product-catalog.json'));
const get=name=>catalog.products.find(p=>p.en===name);
test('every catalog SKU has a scoped record and every food profile resolves primary-source provenance',()=>{
 assert.equal(Object.keys(data.items).length,603);assert.equal(catalog.products.filter(p=>p.ingredientInfo.status==='reference_only').length,518);
 for(const p of catalog.products){const info=p.ingredientInfo;assert(info);assert.equal(info.exactIngredients,null);
  if(info.status==='not_food'){assert.equal(info.profile,null);continue;}
  assert.equal(info.exactPackageVerified,false);assert.equal(info.complete,false);assert(info.profile);assert(info.sources.length);
  for(const s of info.sources){assert.match(s.url,/^https:\/\//);assert(s.summary);}
 }
});
test('classification handles checkout nonfood, partial meal names, branded snacks and substring traps',()=>{
 for(const n of ['Wet Tissues','Battery','Charge Cable'])assert.equal(get(n).ingredientInfo.status,'not_food');
 for(const [n,id]of [['Chicken Paitan','noodle'],['Black Garlic Tonkotsu','noodle'],['Calbee Consomme','chips'],['Meiji Almond','chocolate'],['Meiji Milk Chocolate','chocolate'],['Meiji milk','milk'],['Mandarin jelly','jelly'],['Butter Chicken','curry'],['Vongole bianco','pasta']])assert.equal(get(n).ingredientInfo.profileId,id,n);
 assert(!get('Corn dog').ingredientInfo.nameClues.zh.includes('玉米'));
 assert(!get('Soy Milk').ingredientInfo.nameClues.zh.includes('乳原料'));
});
test('ingredient inspection is concrete, catalog-only and cannot assert allergy suitability',()=>{
 const input={message:'昆布饭团的配料是什么',language:'zh',state:{context:'rain',size:'light'}};
 const r=require('./clerk-allergens.cjs').allergenReply(input,catalog,{...policy.blankMemory(),allergies:['soy']});
 assert(r);assert.match(r.message,/米饭/);assert.match(r.message,/昆布/);assert.match(r.message,/酱油/);assert.match(r.message,/未核实/);assert.match(r.message,/不能据此确认/);
 assert.deepEqual(r.productIds,[]);assert.deepEqual(r.sessionMemory.allergies,['soy']);assert.equal(r.source,'catalog');assert(r.ingredientItems[0].sourceUrls.length);
});
test('compound ingredient reference flags apply consistently but absence never means safe',()=>{
 for(const term of ['soy','wheat']){const r=guidance.assess(get('Kombu onigiri'),[term]);assert.equal(r.status,'avoid_pending_check');assert(r.evidence.ingredientReference.includes(term));}
 assert.equal(guidance.assess(get('Plum rice ball'),['peanut']).status,'needs_verification');
 assert.equal(guidance.assess(get('Wet Tissues'),['soy']).status,'not_food');
});
test('reference-brand summaries remain separate from exact store-package ingredient fields',()=>{
 const p=get('Meiji Milk Chocolate');assert(p.ingredientInfo.officialAnalogSummary);assert.equal(p.ingredients,null);
 for(const l of ['zh','en','ja']){const text=require('./clerk-allergens.cjs').facts(p,l);assert(text.length>40);assert(/未核实|unverified|未確認/.test(text));}
});
test('HTTP ingredient queries neither invoke an upstream model nor create edible recommendation cards',async()=>{
 let calls=0;const server=require('./clerk-server.cjs').createServer({getConfig:()=>({provider:'bailian',key:'mock-key',model:'qwen-flash-2025-07-28'}),logger:()=>{},fetchImpl:async()=>{calls++;throw Error('unexpected model call');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const response=await fetch(`http://127.0.0.1:${server.address().port}/api/clerk`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'昆布饭团的配料是什么',language:'zh',history:[],state:{context:'rain',size:'light',paused:false}})});const result=await response.json();assert.equal(response.status,200);assert.match(result.message,/昆布/);assert.deepEqual(result.productIds,[]);assert.equal(calls,0);}finally{await new Promise(r=>server.close(r));}
});
