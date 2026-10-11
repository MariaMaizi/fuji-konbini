const {test}=require('node:test'),assert=require('node:assert/strict');
const {orchestrate,applyPolicy,blankMemory,pricedCatalog}=require('./clerk-policy.cjs');
const catalog=pricedCatalog(require('../web/data/product-catalog.json'));
const input=message=>({message,language:'zh',history:[],state:{context:'afternoon',size:'light'}});
const meal=catalog.products.find(p=>p.en==='Plum rice ball');
const snack=catalog.products.find(p=>p.zone==='snacks'&&p.projectPriceJPY<200);
const plan=()=>({message:'好的。',action:'recommend',queries:['rice ball'],zones:['chilled'],count:1,context:'afternoon',size:'light',cardTitle:'For you',updates:{summary:'午餐饭团和零食',budgetChange:'keep',addExclusions:[],removeExclusions:[],addAllergies:[],removeAllergies:[]}});
const value=(message,ids)=>({...plan(),message,productIds:ids,naturalReply:true});
test('final natural prose is preserved verbatim without appending template names',async()=>{
 let n=0;const message=`想吃一个饭团的话，可以看看${meal.zh}，这次就选这一款。`;
 const r=await orchestrate({input:input('想吃一个饭团'),catalog,memory:blankMemory(),call:async()=>!n++?plan():{productIds:[meal.id],message}});
 assert.equal(r.message,message);assert.equal(n,2);assert(!('naturalReply'in r));
});
test('append preserves rice ball even when planner proposes replace; total includes retained food',async()=>{
 let n=0;const total=meal.projectPriceJPY+snack.projectPriceJPY;
 const message=`${meal.zh}先保留，再加一份${snack.zh}，参考价合计${total}日元，包含同类估价。`;
 const r=await orchestrate({input:input('再加一份零食，饭团保留'),catalog,memory:{...blankMemory(),currentIds:[meal.id],budgetJPY:500},call:async()=>!n++?{...plan(),queries:['crackers'],zones:['snacks']}: {productIds:[snack.id],message}});
 assert.deepEqual(r.productIds,[meal.id,snack.id]);assert.equal(r.message,message);
});
test('only water clears stale food summary and old hot constraint without clearing allergy or dislike',async()=>{
 let n=0;const water=catalog.products.find(p=>p.id==='drinks:WATER');
 const r=await orchestrate({input:input('不是加零食，我现在只想喝水'),catalog,memory:{...blankMemory(),currentIds:[meal.id,snack.id],summary:'午餐饭团加零食',exclusions:['coffee'],purchaseTemperature:'hot'},call:async messages=>{
 if(!n++)return {...plan(),action:'append',warmOnly:true};
 const pool=JSON.parse(messages[0].content.split('CANDIDATES [id,name,JPY]: ')[1]);assert.deepEqual(pool.map(p=>p[0]),[water.id]);return {productIds:[water.id],message:`那就选${water.zh}，这次不搭配食物。`};
 }});assert.deepEqual(r.productIds,[water.id]);assert(!r.sessionMemory.summary.includes('饭团'));assert.equal(r.sessionMemory.purchaseTemperature,null);assert.deepEqual(r.sessionMemory.exclusions,['coffee']);
 const a=applyPolicy({...plan(),action:'chat',productIds:[]},input('现在只想喝水'),catalog,{...blankMemory(),allergies:['soy']});assert.deepEqual(a.sessionMemory.allergies,['soy']);
});
test('mismatched prose, invented selection and incorrect totals fail instead of being rewritten',()=>{
 assert.throws(()=>applyPolicy(value('推荐鸡蛋三明治。',[meal.id]),input('饭团'),catalog,blankMemory()),/selection_mismatch/);
 assert.throws(()=>applyPolicy(value(`${meal.zh}和${snack.zh}。`,[meal.id]),input('饭团'),catalog,blankMemory()),/selection_mismatch/);
 assert.throws(()=>applyPolicy(value(`${meal.zh}，合计999日元。`,[meal.id]),input('饭团'),catalog,blankMemory()),/budget_exceeded/);
 assert.throws(()=>applyPolicy(value(`${meal.zh}。`,['invented']),input('饭团'),catalog,blankMemory()),/unknown_product/);
});
test('allergy claims are blocked while ordinary natural recommendation remains intact',()=>{
 assert.throws(()=>applyPolicy(value(`${meal.zh}不含过敏原。`,[meal.id]),input('饭团'),catalog,blankMemory()),/dietary_pause/);
 const text=`没有哪款食物能保证改善睡眠。可以看看${meal.zh}。`;
 assert.equal(applyPolicy(value(text,[meal.id]),input('保证睡眠'),catalog,blankMemory()).message,text);
});
test('failed final stage does not mutate the previous session',async()=>{
 const memory={...blankMemory(),currentIds:[meal.id]},before=structuredClone(memory);let n=0;
 await assert.rejects(orchestrate({input:input('再加一份零食，饭团保留'),catalog,memory,call:async messages=>!n++?plan():{productIds:[JSON.parse(messages[0].content.split('CANDIDATES [id,name,JPY]: ')[1])[0][0]],message:'错误商品名'}}),/selection_mismatch/);assert.deepEqual(memory,before);
});
test('planner cannot invent a hot-only constraint on an ordinary rice-ball request',async()=>{
 let n=0;const r=await orchestrate({input:input('想吃一个饭团'),catalog,memory:blankMemory(),call:async()=>!n++?{...plan(),warmOnly:true}:{productIds:[meal.id],message:`可以看看${meal.zh}。`}});assert.equal(r.warmOnly,false);assert.deepEqual(r.productIds,[meal.id]);
});
test('retained IDs repeated by the model are accepted once without treating them as new purchases',async()=>{
 let n=0;const total=meal.projectPriceJPY+snack.projectPriceJPY;
 const r=await orchestrate({input:input('再加一份零食，饭团保留'),catalog,memory:{...blankMemory(),currentIds:[meal.id]},call:async()=>!n++?{...plan(),queries:['crackers'],zones:['snacks']}:{productIds:[meal.id,snack.id],message:`保留${meal.zh}，再加${snack.zh}，合计${total}日元。`}});assert.deepEqual(r.productIds,[meal.id,snack.id]);assert.equal(r.projectTotalJPY,total);
});
test('missing price only adds a calculated fact and keeps the model wording',()=>{
 const text=`可以看看${meal.zh}，这次选一个就好。`;
 const r=applyPolicy(value(text,[meal.id]),input('饭团'),catalog,{...blankMemory(),budgetJPY:500});assert(r.message.startsWith(text));assert.match(r.message,/参考价合计190日元/);
});
test('stated budget is not mistaken for an invented product price',()=>{
 const text=`${meal.zh}，总共190日元，还在500日元预算内。`;
 assert.equal(applyPolicy(value(text,[meal.id]),input('饭团'),catalog,{...blankMemory(),budgetJPY:500}).message,text);
 assert.throws(()=>applyPolicy(value(`${meal.zh}，总共500日元预算内。`,[meal.id]),input('饭团'),catalog,{...blankMemory(),budgetJPY:500}),/budget_exceeded/);
});
