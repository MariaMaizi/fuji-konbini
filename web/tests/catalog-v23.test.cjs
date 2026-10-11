const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),data=JSON.parse(fs.readFileSync(path.join(root,'data/product-catalog.json'),'utf8'));
const E=require('../src/clerk-engine.js');E.configure(data);
assert.equal(E.products.length,603);assert.equal(new Set(E.products.map(p=>p.id)).size,603);
assert.equal(data.zones.reduce((n,z)=>n+z.count,0),603);
for(const p of E.products){assert(p.id&&p.node&&p.anchor&&p.en&&p.zh);assert(p.center.length===3&&p.center.every(Number.isFinite));assert(p.stand.length===2&&p.stand.every(Number.isFinite));assert.equal(p.price,null);assert.equal(p.allergens,null);if(p.image)assert(fs.existsSync(path.join(root,p.image)));}
assert.equal(E.products.filter(p=>p.imageKind==='user-ai-reference').length,285);
const approved=E.products.filter(p=>p.imageKind==='user-ai-reference');
assert.equal(new Set(approved.map(p=>p.image)).size,285);
for(const p of approved){assert(!p.imageCrop);assert(p.imageWidth>0&&p.imageHeight>0);}
assert.equal(approved.filter(p=>p.image.includes('approved-v24/')).length,35);
const pantry=approved.filter(p=>p.image.includes('pantry-v28/'));assert.equal(pantry.length,38);
for(const p of pantry){assert.equal(p.zone,'pantry');assert(p.node.startsWith('PANTRY_V20_SKU_'+p.id.split(':')[1]));assert(p.imageSource.crop.length===4);}
const sweets=E.products.filter(p=>p.zone==='sweets');assert.equal(sweets.length,64);
for(const p of sweets){assert(p.image.includes('sweets-v25/'));assert(p.ja&&p.displayEn);assert.equal(p.imageKind,'user-ai-reference');assert(p.node.startsWith('SWEETS_V21_SKU_'+p.id.split(':')[1]));assert(p.imageSource.crop.length===4);}
assert.notEqual(sweets.find(p=>p.id==='sweets:4_03').image,sweets.find(p=>p.id==='sweets:5_12').image);
for(const p of E.products.filter(p=>p.imageCrop)){
 const [x,y,w,h,iw,ih]=p.imageCrop;assert(x>=0&&y>=0&&w>0&&h>0&&x+w<=iw&&y+h<=ih);
 assert.equal(p.generationStatus,'user-approved');
}
const ids=new Set(E.products.map(p=>p.id));
for(const scenario of data.scenarios){
 for(const recipe of scenario.recipes)recipe.forEach(id=>assert(ids.has(id)));
 for(let variant=0;variant<15;variant++)for(const size of ['light','full']){
  const chosen=E.choose({...E.createState(),context:scenario.id,variant,size});
  assert(chosen.length>=2&&chosen.length<=(size==='full'?3:2));assert.equal(new Set(chosen.map(p=>p.id)).size,chosen.length);assert(chosen.every(p=>p.featured));
 }
}
const state=E.createState('en');state.context='afternoon';E.reply('No caffeine please',state);E.reply('No sweets please',state);
for(let v=0;v<12;v++){state.variant=v;assert(E.choose(state).every(p=>!p.tags.includes('caffeine')&&!p.tags.includes('sweet')));}
assert.equal(E.reply('I have a milk allergy',state).products.length,0);
const multi=E.createState('zh');E.reply('晚上很饿，有点累，不要咖啡，也不要甜的',multi);
assert.equal(multi.context,'night');assert.equal(multi.size,'full');assert(multi.exclude.includes('caffeine')&&multi.exclude.includes('sweet'));
assert(E.choose(multi).every(p=>!p.tags.includes('caffeine')&&!p.tags.includes('sweet')));
const japanese=E.createState('ja');E.reply('夜はしっかり食べたい。カフェインなしで',japanese);
assert.equal(japanese.context,'night');assert.equal(japanese.size,'full');assert(japanese.exclude.includes('caffeine'));
console.log('PASS: 603 unique catalog entries, 19 categories, image paths, curated recipes, exclusions, unknown ingredients.');
