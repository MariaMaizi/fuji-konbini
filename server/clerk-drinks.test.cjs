const {orchestrate}=require('./policy-fixture.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict');
const {blankMemory,pricedCatalog,applyPolicy}=require('./clerk-policy.cjs');
const catalog=pricedCatalog(require('../web/data/product-catalog.json'));
const input=message=>({message,language:'zh',history:[],state:{context:'rain',size:'light'}});
const plan=()=>({message:'来点暖的吧，热饮选一个。',action:'recommend',queries:['soup'],zones:['oden'],warmOnly:true,count:1,cardTitle:'For you',context:'rain',size:'light',updates:{summary:'暖一点',budgetChange:'keep',addExclusions:[],removeExclusions:[],addAllergies:[],removeAllergies:[]}});
test('cold alone clarifies food versus drink, then drink-only follow-up retains heat',async()=>{
 let calls=0;const a=await orchestrate({input:input('有点冷'),catalog,memory:blankMemory(),call:async()=>{calls++;return plan();}});
 assert.equal(calls,1);assert.deepEqual(a.productIds,[]);assert.match(a.message,/热饮.*吃点热的/);assert.equal(a.sessionMemory.purchaseTemperature,'hot');
 let n=0;const b=await orchestrate({input:input('我要喝的'),catalog,memory:a.sessionMemory,call:async messages=>{
  if(!n++)return plan();const pool=JSON.parse(messages[0].content.split('CANDIDATES [id,name,JPY]: ')[1]);
  assert(pool.every(p=>['coffee:hot-coffee','coffee:cafe-latte'].includes(p[0])));assert(!messages[0].content.includes('oden:atsuage'));return {productIds:['coffee:hot-coffee']};
 }});assert.deepEqual(b.productIds,['coffee:hot-coffee']);
});
test('hot drink validation rejects a hot solid even if a model selects it',()=>{
 assert.throws(()=>applyPolicy({...plan(),productIds:['oden:atsuage']},input('想喝热饮'),catalog,blankMemory()),/drink_type_mismatch/);
});
test('no suitable hot drink produces an honest empty response, not oden or heated bottles',async()=>{
 let calls=0;const r=await orchestrate({input:input('我要喝热的'),catalog,memory:{...blankMemory(),exclusions:['coffee']},call:async()=>{calls++;return plan();}});
 assert.equal(calls,1);assert.deepEqual(r.productIds,[]);assert.match(r.message,/没有.*热饮/);assert.match(r.message,/瓶装.*未确认/);
});
test('changing to food releases drink-only constraints; a cold drink clears hot filtering',async()=>{
 const old={...blankMemory(),purchaseTarget:'drink',purchaseTemperature:'hot'};
 let n=0;const food=await orchestrate({input:input('还是吃一个饭团吧'),catalog,memory:old,call:async()=>!n++?{...plan(),warmOnly:false,queries:['rice ball'],zones:['chilled']}:{productIds:['chilled:1_06']}});
 assert.deepEqual(food.productIds,['chilled:1_06']);assert.equal(food.sessionMemory.purchaseTarget,'food');
 n=0;const cold=await orchestrate({input:input('我想喝冷的'),catalog,memory:old,call:async messages=>{
  if(!n++)return plan();assert(!messages[0].content.includes('"coffee:hot-coffee"'));return {productIds:['drinks:WATER']};
 }});assert.deepEqual(cold.productIds,['drinks:WATER']);
});

