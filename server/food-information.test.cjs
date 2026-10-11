const {test}=require('node:test'),assert=require('node:assert/strict');
const food=require('./food-agent.cjs'),policy=require('./clerk-policy.cjs'),info=require('./food-information.cjs');
const data=require('../web/data/project-food-information.json');
const raw=require('../web/data/product-catalog.json');
const catalog=policy.pricedCatalog(raw,{virtual:true}),all=catalog.products.map(food.facts);
const find=n=>all.find(p=>p.names.en===n);
test('603 IDs preserved; all 518 food labels have finite quantities and complete portion allocations',()=>{
 assert.equal(all.length,603);assert.deepEqual(catalog.products.map(p=>p.id),raw.products.map(p=>p.id));
 const edible=Object.values(data.items).filter(i=>i.food);assert.equal(edible.length,518);
 for(const i of edible){assert(Object.values(i.nutrition).every(Number.isFinite));assert(i.nutrition.sugar_g<=i.nutrition.carbs_g);assert(Math.abs(i.ingredients.portions.reduce((s,v)=>s+v.grams,0)-i.portion.amount)<0.02);assert(i.ingredients.portions.every(v=>v.grams>=0));assert(i.ingredients.completeWithinSimulation);}
});
test('plant milk recipe does not gain dairy merely from the English word Milk',()=>{
 const p=find('Almond Milk');assert(p);assert(!p.projectIngredients.contains.includes('milk'));assert(p.projectIngredients.contains.includes('almond'));assert.equal(p.nutrition.caffeine_mg,0);
 const almond=p.projectIngredients.portions.find(v=>v.name==='杏仁');assert(almond.grams<12);
});
test('milk has concrete serving values and supports a hot drink through a free warming service',()=>{
 const p=find('Milk');assert.equal(p.portion.amount,200);assert.equal(p.nutrition.kcal,131);assert.equal(p.nutrition.protein_g,7);
 const r=food.blankMemory().requirements;Object.assign(r,{temperature:'hot',slots:['drink'],avoid:['coffee']});assert.deepEqual(food.eligibility(p,r),[]);assert.equal(p.heating.waitSeconds,60);assert.equal(p.heating.surchargeJPY,0);assert.equal(p.heating.packageDirectMicrowave,false);
});
test('all frozen products remain solid frozen servings and cannot acquire a hot milk service',()=>{
 for(const p of catalog.products.filter(p=>p.zone.startsWith('ice'))){const i=p.projectFoodInfo;assert.equal(i.temperature,'frozen');assert.equal(i.portion.unit,'g');assert(!i.heating.available);}
});
test('allergies use independent requirements and reject contains or cross-contact without a blanket pause',()=>{
 const r=food.blankMemory().requirements;r.allergies=['鸡蛋'];assert(food.eligibility(find('Egg sandwich'),r).includes('allergy_conflict'));assert.deepEqual(food.eligibility(find('Milk'),r),[]);
 r.allergies=['杏仁'];assert(food.eligibility(find('Almond Milk'),r).includes('allergy_conflict'));
 r.allergies=['unknown ingredient'];assert(food.eligibility(find('Milk'),r).includes('allergy_unknown'));
});
test('300 kcal bento request is a real constraint conflict rather than missing nutrition',()=>{
 const r=food.blankMemory().requirements;r.nutritionLimits={kcal:{max:300}};
 const bentos=all.filter(p=>p.category==='bento');assert(bentos.length);for(const p of bentos){assert(food.eligibility(p,r).includes('nutrition_conflict:kcal'));assert(!food.eligibility(p,r).some(c=>c.startsWith('nutrition_unknown')));}
});
test('inferred warmth is pending, then explicitly confirmed; unrelated budget persists',()=>{
 const prev=food.blankMemory();prev.requirements.budget={amount:500,currency:'JPY'};const m=structuredClone(prev);m.requirements.temperature='hot';
 info.recordNeeds(m,prev,{intent:'clarify',patch:{temperature:'hot',states:['cold']},certainty:{temperature:'inferred'},evidence:{temperature:'有点冷',states:'有点冷'}},{message:'有点冷'});
 assert.equal(m.requirements.temperature,'any');assert.equal(m.information.hypotheses.temperature.status,'pending_confirmation');assert.equal(m.requirements.budget.amount,500);
 const next=structuredClone(m);next.requirements.temperature='hot';info.recordNeeds(next,m,{intent:'recommend',patch:{temperature:'hot',slots:['drink']},certainty:{temperature:'explicit'},evidence:{temperature:'热饮',slots:'热饮'}},{message:'我要热饮'});
 assert.equal(next.requirements.temperature,'hot');assert(!next.information.hypotheses.temperature);assert.equal(next.information.needs.temperature.sourceTurn,2);
});
test('delivery records only validated replies and keeps client-reported items separate',()=>{
 const m=food.blankMemory();info.recordNeeds(m,m,{patch:{}},{message:'午餐',currentProductIds:['old']});info.sent(m,{message:'牛奶',productIds:['drinks:MILK']},{message:'午餐'});
 const n=structuredClone(m);info.recordNeeds(n,m,{patch:{}},{message:'换一个',currentProductIds:['drinks:MILK']});assert.deepEqual(n.information.delivery.lastSentIds,['drinks:MILK']);assert.equal(n.information.delivery.history.length,1);assert.deepEqual(n.information.delivery.clientReportedIds,['drinks:MILK']);
});
test('unknown data, program contract, explicit conflict and unsupported claims are separate classes',()=>{
 assert.equal(info.classify('allergy_unknown'),'information_unknown');assert.equal(info.classify('change_evidence'),'internal_contract');assert.equal(info.classify('allergy_conflict'),'explicit_conflict');assert.equal(info.classify('unsupported_claim'),'unsupported_assertion');
});
test('formal self-check orchestration supplies complete project facts to its writer and delivers a hot milk recommendation',async()=>{
 const milk=find('Milk');const input={message:'要热牛奶，不要咖啡',language:'zh',history:[],state:{context:'rain',size:'light'}};let calls=0;
 const reply=await food.orchestrate({input,catalog,memory:food.blankMemory(),selfCheck:true,call:async messages=>{
  calls++;if(calls===1)return {intent:'recommend',operation:'replace',queries:[{text:'牛奶',category:'milk',slot:'drink',ids:[milk.id]}],patch:{temperature:'hot',slots:['drink'],avoid:['coffee']},evidence:{temperature:'热牛奶',slots:'热牛奶',avoid:'不要咖啡'},certainty:{temperature:'explicit',slots:'explicit',avoid:'explicit'},corrections:[],targetIds:[],clarification:null};
  assert(messages[0].content.includes('"kcal":131'));assert(messages[0].content.includes('"waitSeconds":60'));
  return {option:0,message:`${milk.names.zh}可以倒杯加热，约60秒。每份131千卡，蛋白质7克，咖啡因0毫克。`};
 }});assert.equal(calls,2);assert.deepEqual(reply.productIds,[milk.id]);assert.equal(reply.dietaryCaution,false);assert.equal(reply.informationScope,'project_virtual_store');assert.equal(reply.sessionMemory.information.delivery.history.length,1);
});
test('nutrient guard accepts a user target separately from actual product values and rejects fabricated numbers',()=>{
 const p=all.find(p=>p.category==='rice_ball'),r=food.blankMemory().requirements;r.nutritionLimits={kcal:{max:300}};
 const planned={options:[{ids:[p.id],totalJPY:p.priceJPY}],queryResults:[],reasons:[]},input={language:'zh',message:'300千卡以内的饭团'};
 assert(food.validateAnswer({option:0,message:`${p.names.zh}每份${p.nutrition.kcal}千卡，符合不超过300千卡的要求。`},planned,all,input,r));
 assert.throws(()=>food.validateAnswer({option:0,message:`${p.names.zh}每份999千卡。`},planned,all,input,r),/unsupported_nutrition_value/);
});
test('Auto language resolves writer language and product names for Chinese Japanese and English',async()=>{
 const milk=find('Milk');for(const [message,language]of [['我要喝点东西','zh'],['飲み物がほしい','ja'],['I want a drink','en']]){
  let calls=0;const result=await food.orchestrate({input:{message,language:'auto',history:[],state:{context:'rain',size:'light'}},catalog,memory:food.blankMemory(),selfCheck:true,call:async messages=>{
   if(++calls===1)return {intent:'recommend',operation:'replace',queries:[{text:'milk',category:'milk',slot:'drink',ids:[milk.id]}],patch:{slots:['drink']},evidence:{slots:message},corrections:[],targetIds:[],clarification:null};
   assert(messages[0].content.includes(`latest language (${language})`));const task=JSON.parse(messages[1].content);assert.equal(task.selectedItems[0].name,milk.names[language]);return {option:0,message:milk.names[language]};
  }});assert.equal(result.language,language);assert.deepEqual(result.productIds,[milk.id]);
 }
});
test('a system clarification cannot fail its own question validator and temperature gets a concrete question',()=>{
 const reply=require('./food-decision-reply.cjs').reply,input={message:'喝点',language:'auto'},r=food.blankMemory().requirements;
 for(const field of ['temperature','avoid']){const d={action:'clarify',uncertainties:[{field}],evidence:[],question:'需要确认本轮要改变的条件或商品对象；其他条件会保留。'};const message=reply(d,r,input);assert(food.validateAnswer({option:-1,message},{options:[],queryResults:[],reasons:[],decision:d},all,input,r));if(field==='temperature')assert.equal(message,'你想喝热的还是冷的？');}
});
test('missing optional query metadata is harmless; invalid enums and invented IDs still fail',()=>{
 const input={message:'有点冷，你有什么推荐吗',language:'zh'};
 const p={intent:'clarify',operation:'none',patch:{states:['cold']},queries:[],clarification:'想喝点还是吃点？'};
 assert.deepEqual(food.parsePlan(p,input,catalog,food.blankMemory()).plan.targetIds,[]);
 assert.throws(()=>food.parsePlan({...p,patch:{states:['invalid_state']}},input,catalog,food.blankMemory()),/food_schema/);
 assert.throws(()=>food.parsePlan({...p,queries:[{text:'drink',ids:['made-up']}]},input,catalog,food.blankMemory()),/unknown_product/);
});
test('compound and English blanket allergen-free statements cannot bypass protection',()=>{
 const p=find('Milk'),planned={options:[{ids:[p.id],totalJPY:p.priceJPY}],queryResults:[],reasons:[]},r=food.blankMemory().requirements;
 for(const message of [`${p.names.zh}不含咖啡因、糖及过敏原。`,`${p.names.en} has no allergens.`])assert.throws(()=>food.validateAnswer({option:0,message},planned,all,{message:'drink',language:message.startsWith(p.names.en)?'en':'zh'},r),/unsupported_food_claim/);
});
test('unavailable warming exposes no misleading microwave recipe and cannot be offered',()=>{
 const p=find('Sparkling Water');assert.deepEqual(p.heating,{available:false});const planned={options:[{ids:[p.id],totalJPY:p.priceJPY}],queryResults:[],reasons:[]};assert.throws(()=>food.validateAnswer({option:0,message:`${p.names.zh}可通过微波加热服务提供热饮。`},planned,all,{message:'喝点东西',language:'zh'},food.blankMemory().requirements),/unsupported_heating_claim/);
});
