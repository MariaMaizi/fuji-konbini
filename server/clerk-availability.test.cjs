const {test}=require('node:test'),assert=require('node:assert/strict');
const policy=require('./clerk-policy.cjs'),availability=require('./clerk-availability.cjs');
const catalog=policy.pricedCatalog(require('../web/data/product-catalog.json'));
const input=message=>({message,language:'zh',history:[{role:'user',content:'想喝水果味的饮料'},{role:'assistant',content:'选了混合果汁。'}],state:{context:'afternoon',size:'light'}});
test('availability replaces stale fruit intent and does not assert real inventory',async()=>{
 for(const text of ['这里有酒卖吗','我说有酒卖吗这里','有没有啤酒','有葡萄酒吗','有清酒吗']){
  const memory={...policy.blankMemory(),summary:'午后水果饮料',purchaseTarget:'drink',purchaseTemperature:'hot',currentIds:['drinks:WATER'],allergies:['milk']};
  const r=await policy.orchestrate({input:input(text),catalog,memory,call:async()=>{throw Error('Unexpected model call');}});
  assert.match(r.message,/没有收录/);assert(!r.message.includes('果汁'));assert.deepEqual(r.productIds,[]);assert.deepEqual(r.sessionMemory.allergies,['milk']);assert.deepEqual(r.sessionMemory.currentIds,[]);assert.equal(r.sessionMemory.purchaseTemperature,null);
 }
});
test('available categories list real catalog names, not stock or allergy suitability',()=>{
 const r=availability.reply(input('有没有饭团'),catalog,policy.blankMemory());assert.match(r.message,/收录了饭团/);assert.match(r.message,/库存还需/);assert.deepEqual(r.productIds,[]);
 assert.equal(availability.reply(input('有牛奶卖吗，我对牛奶过敏'),catalog,policy.blankMemory()),null);
 assert(!availability.reply(input('那有果汁吗'),catalog,policy.blankMemory()).message.includes('果汁、果汁'));
});
test('short Chinese product names cannot hide an unselected retained juice claim',()=>{
 const plan={message:'选择昆布饭团，保留原有的果汁。',action:'recommend',productIds:['chilled:1_09'],naturalReply:true,context:'afternoon',size:'light',updates:{summary:'饭团',budgetChange:'keep'}};
 assert.throws(()=>policy.applyPolicy(plan,input('改成一个饭团吧'),catalog,policy.blankMemory()),/selection_mismatch/);
});
test('unknown simple product queries say catalog absence, not budget; ingredient names do not match flavored meals',()=>{
 for(const [text,label]of [['这里有大米吗','大米'],['这里有酱油吗','酱油'],['有没有鲜苹果','鲜苹果'],['卖不卖榴莲','榴莲']]){
  const r=availability.reply(input(text),catalog,{...policy.blankMemory(),budgetJPY:10});assert(r);assert(r.message.includes(label));assert.match(r.message,/没有收录/);assert(!r.message.includes('预算'));assert.deepEqual(r.productIds,[]);assert.equal(r.sessionMemory.budgetJPY,10);
 }
 const r=availability.reply(input('这里有酱油拉面吗'),catalog,policy.blankMemory());assert.match(r.message,/收录了酱油拉面/);assert(!r.message.includes('没有收录'));
});
test('catalog categories remain queryable and constrained requests stay with the planner',()=>{
 assert.match(availability.reply(input('有没有饮料'),catalog,policy.blankMemory()).message,/收录了/);
 assert.equal(availability.reply(input('有100日元以内的饭团吗'),catalog,policy.blankMemory()),null);
 assert.equal(availability.reply(input('有没有适合我吃的东西'),catalog,policy.blankMemory()),null);
});
test('specific juice query survives drink routing; beer does not get replaced by juice',async()=>{
 for(const query of ['juice','beer']){
  let calls=0;
  const plan={message:'看看目录。',action:'recommend',queries:[query],zones:['drinks'],count:1,context:'afternoon',size:'light',updates:{summary:'饮品',budgetChange:'keep',budgetJPY:null}};
  const r=await policy.orchestrate({input:input(query==='juice'?'想喝果汁':'想喝啤酒'),catalog,memory:policy.blankMemory(),call:async messages=>{
   if(++calls===1)return plan;
   const pool=JSON.parse(messages[0].content.split('CANDIDATES [id,name,JPY]: ')[1]);assert(pool.every(p=>/juice/i.test(catalog.products.find(x=>x.id===p[0]).en)));return {productIds:[pool[0][0]],message:pool[0][1]+'。'};
  }});
  if(query==='beer'){assert.equal(calls,1);assert.deepEqual(r.productIds,[]);}else assert.equal(calls,2);
 }
});
