const {orchestrate}=require('./policy-fixture.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict');
const policy=require('./clerk-policy.cjs'),rice=require('./clerk-rice.cjs'),allergens=require('./clerk-allergens.cjs');
const catalog=policy.pricedCatalog(require('../web/data/product-catalog.json'));
const input=text=>({message:text,history:[],language:'zh',state:{context:'afternoon',size:'light'}});
const plan={message:'好，看看这一款。',action:'recommend',queries:['rice ball'],zones:['chilled'],count:1,context:'afternoon',size:'light',cardTitle:'For you',updates:{summary:'饭团',budgetChange:'keep',addExclusions:[],removeExclusions:[],addAllergies:[],removeAllergies:[]}};
async function recommend(text,memory){let n=0;return orchestrate({input:input(text),catalog,memory,call:async messages=>{
 if(!n++)return structuredClone(plan);
 const pool=JSON.parse(messages[0].content.split('CANDIDATES [id,name,JPY]: ')[1]);
 assert(pool.every(p=>rice.isRice(catalog.products.find(x=>x.id===p[0]))));
 return {productIds:[pool[0][0]]};
}});}
test('fourteen existing rice flavors are reachable across repeated requests and swaps',async()=>{
 let memory=policy.blankMemory();const names=[];
 for(let i=0;i<14;i++){const r=await recommend(i?'其他口味的饭团呢':'推荐一个饭团',memory);memory=r.sessionMemory;names.push(catalog.products.find(p=>p.id===r.productIds[0]).en);assert(!r.message.includes(r.productIds[0]));}
 assert.equal(new Set(names).size,14);assert(names.includes('Mentaiko onigiri'));assert(names.includes('Salmon rice ball'));assert(names.includes('Yukari rice ball'));
});
test('explicit flavor is respected and a small yen budget still constrains variety',async()=>{
 const specific=await recommend('给我一个紫苏饭团',policy.blankMemory());assert.deepEqual(specific.productIds,['chilled:1_20']);
 const cheap=await recommend('推荐一个饭团',{...policy.blankMemory(),budgetJPY:118});assert(cheap.projectTotalJPY<=118);
});
test('a regular rice request also avoids recently suggested flavors',async()=>{
 const a=await recommend('推荐一个饭团',policy.blankMemory()),b=await recommend('推荐一个饭团',a.sessionMemory);
 assert.notDeepEqual(a.productIds,b.productIds);
});
test('soy/wheat in official egg reference is not presented as exact store verification',()=>{
 const r=allergens.allergenReply(input('炖鸡蛋的过敏原是什么？'),catalog,policy.blankMemory());
 assert.match(r.message,/鸡蛋.*小麦.*大豆/);assert.match(r.message,/同类参照/);assert.match(r.message,/具体包装.*未核实/);assert.deepEqual(r.productIds,[]);
});
test('unknown rice package and partial references never imply absence or suitability',()=>{
 const r=allergens.allergenReply(input('紫苏饭团的配料是什么？'),catalog,{...policy.blankMemory(),allergies:['soy']});
 assert(r.dietaryCaution);assert.match(r.message,/不能据此确认适合/);assert.deepEqual(r.sessionMemory.allergies,['soy']);
 const p=catalog.products.find(p=>p.allergenInfo.reference?.status==='partial_published_list');assert.match(allergens.facts(p),/部分标注类别/);
});
test('a new allergy declaration goes to the planner rather than bypassing memory update',()=>{
 assert.equal(allergens.allergenReply(input('我对鸡蛋过敏，炖鸡蛋的配料是什么？'),catalog,policy.blankMemory()),null);
 assert.equal(allergens.allergenReply(input('对鸡蛋过敏，炖鸡蛋的配料是什么？'),catalog,policy.blankMemory()),null);
 const r=allergens.allergenReply(input('紫苏饭团含咖啡因吗？'),catalog,policy.blankMemory());assert.match(r.message,/咖啡因含量未核实/);
});

