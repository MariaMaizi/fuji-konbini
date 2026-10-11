const {test}=require('node:test'),assert=require('node:assert/strict');
const policy=require('./clerk-policy.cjs'),conversation=require('./clerk-conversation.cjs'),availability=require('./clerk-availability.cjs'),prices=require('./clerk-prices.cjs'),drinks=require('./clerk-drinks.cjs');
const catalog=policy.pricedCatalog(require('../web/data/product-catalog.json'));
const input=message=>({message,language:'zh',history:[],state:{context:'afternoon',size:'light'}});
test('cancelling one request and choosing another is not a blanket cancellation',()=>{
 for(const message of ['咖啡不要了，换成三文鱼饭团','取消饮料，饭团保留'])assert.equal(conversation.reply(input(message),catalog,{...policy.blankMemory(),currentIds:['coffee:hot-coffee','chilled:1_06']}),null);
 assert(conversation.reply(input('那算了，不要了'),catalog,policy.blankMemory()));
});
test('negation without punctuation does not erase a later affirmative food request',()=>{
 for(const message of ['不想喝咖啡了想吃饭团','不喝咖啡而是想吃一个饭团','不要热饮，改成一个饭团']){
  const r=drinks.intent(message,{purchaseTarget:'drink',purchaseTemperature:'hot'});assert.equal(r.purchaseTarget,'food');assert.equal(r.purchaseTemperature,null);
 }
});
test('combined and qualified availability questions go to semantic planning, not a single keyword answer',()=>{
 for(const message of ['有饭团和牛奶吗','有没有不太甜的饮料','有无糖牛奶吗'])assert.equal(availability.reply(input(message),catalog,policy.blankMemory()),null);
});
test('availability then singular price keeps the exact product referent; unresolved pronouns ask',()=>{
 const r=availability.reply(input('有三文鱼饭团吗'),catalog,policy.blankMemory());assert.deepEqual(r.sessionMemory.inspectedIds,['chilled:1_06']);
 assert.match(prices.priceReply(input('这款多少钱'),catalog,r.sessionMemory).message,/三文鱼饭团/);
 assert.match(availability.reply(input('有这个吗'),catalog,policy.blankMemory()).message,/哪件商品/);
 assert.match(prices.priceReply(input('这款多少钱'),catalog,{...policy.blankMemory(),currentIds:['chilled:1_06','coffee:hot-coffee']}).message,/哪一款/);
});
test('negated products are not added to a positive price query',()=>{
 const r=prices.priceReply(input('不要热咖啡，我想问三文鱼饭团多少钱'),catalog,policy.blankMemory());assert.deepEqual(r.priceItems.map(p=>p.id),['chilled:1_06']);
});
test('only keep the meal removes snack from selection, preserves budget, and does not change basket',()=>{
 const m={...policy.blankMemory(),currentIds:['chilled:1_07','snacks:KEPT_13'],budgetJPY:500};
 const r=conversation.reply(input('零食不要了，只保留饭团'),catalog,m);assert.deepEqual(r.productIds,['chilled:1_07']);assert.deepEqual(r.sessionMemory.currentIds,r.productIds);assert.equal(r.sessionMemory.budgetJPY,500);assert.match(r.message,/不会修改购物篮/);
});
test('ordinary location pronoun uses catalog facts without choosing a new product',()=>{
 const r=conversation.reply(input('它在哪'),catalog,{...policy.blankMemory(),inspectedIds:['chilled:1_06']});assert.match(r.message,/三文鱼饭团在/);assert.deepEqual(r.productIds,[]);assert.equal(r.dietaryCaution,false);
});
test('prose mentioning an excluded coffee negatively is not an extra recommendation',()=>{
 const plan={message:'不喝热咖啡的话，可以选三文鱼饭团。',action:'recommend',productIds:['chilled:1_06'],naturalReply:true,context:'afternoon',size:'light',updates:{summary:'饭团',budgetChange:'keep',addExclusions:['coffee']}};
 assert.match(policy.applyPolicy(plan,input('不想喝咖啡了想吃饭团'),catalog,policy.blankMemory()).message,/三文鱼饭团/);
 assert.throws(()=>policy.applyPolicy({...plan,message:'可以选三文鱼饭团和热咖啡。'},input('不想喝咖啡了想吃饭团'),catalog,policy.blankMemory()),/selection_mismatch/);
});
test('explicit replacement removes old purchase context before generation but keeps budget and exclusions',async()=>{
 let calls=0;const r=await policy.orchestrate({input:input('不想喝咖啡了想吃饭团'),catalog,memory:{...policy.blankMemory(),currentIds:['drinks:MILK'],summary:'饭团和牛奶',budgetJPY:500,exclusions:['daikon']},call:async messages=>{
  if(++calls===1)return {message:'换一个选择。',action:'recommend',queries:['rice ball'],zones:['chilled'],count:1,context:'afternoon',size:'light',updates:{summary:'饭团和牛奶',budgetChange:'keep'}};
  const memory=JSON.parse(messages[0].content.split('\nMEMORY: ')[1].split('\nPLAN: ')[0]);assert.deepEqual(memory.currentIds,[]);assert.equal(memory.summary,'不想喝咖啡了想吃饭团');assert.equal(memory.budgetJPY,500);assert.deepEqual(memory.exclusions,['daikon']);return {productIds:['chilled:1_06'],message:'可以选三文鱼饭团。'};
 }});assert.deepEqual(r.productIds,['chilled:1_06']);assert.equal(r.sessionMemory.summary,'不想喝咖啡了想吃饭团');
});
