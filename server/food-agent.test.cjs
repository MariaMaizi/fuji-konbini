const {test}=require('node:test'),assert=require('node:assert/strict');
const food=require('./food-agent.cjs'),policy=require('./clerk-policy.cjs'),server=require('./clerk-server.cjs');
const catalog=policy.pricedCatalog(require('../web/data/product-catalog.json')),all=catalog.products.map(food.facts);
const input=message=>({message,language:'zh',history:[],state:{context:'rain',size:'light'}});
const plan=(patch={},more={})=>({intent:'recommend',operation:'replace',queries:[],patch,corrections:[],targetIds:[],clarification:null,...more});
const query=(category,slot='main',ids=[])=>({text:category,category,slot,ids});
test('validated allergy survives writer failure via HTTP session and is supplied to the next turn',async()=>{
 let phase=0,sawAllergy=false;
 const fetchImpl=async(url,options)=>{
  const text=JSON.parse(options.body).messages[0].content;let value;
  if(text.includes('intent parser')){if(phase===0)value=plan({allergies:['fish']});else {sawAllergy=text.includes('"allergies":["fish"]');value=plan({}, {intent:'acknowledge',operation:'none'});}}
  else {value=phase===0?{option:-1,message:'可以放心吃。'}:{option:-1,message:'好的。'};phase++;}
  return {ok:true,status:200,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}]})};
 };
 const app=server.createServer({foodAgent:true,getConfig:()=>({provider:'bailian',model:'qwen-flash',key:'test'}),fetchImpl,logger:()=>{}});await new Promise(r=>app.listen(0,'127.0.0.1',r));
 try{
  const url='http://127.0.0.1:'+app.address().port+'/api/clerk';
  const first=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input('我对鱼过敏'))});const failed=await first.json();assert.equal(first.status,502);assert(failed.sessionId);
  const next=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...input('谢谢'),sessionId:failed.sessionId})});assert.equal(next.status,200);assert(sawAllergy);assert((await next.json()).dietaryCaution);
 }finally{await new Promise(r=>app.close(r));}
});
test('taxonomy covers dietary goals and current-state dimensions; facts do not invent nutrients or vegetarian certification',()=>{
 assert.equal(food.schema.goals.length,9);assert.equal(all.length,603);assert(all.every(p=>Object.values(p.nutrition).every(n=>n===null)));assert(all.every(p=>p.dietary.vegetarian===null));
 assert(!all.filter(p=>p.category==='nonfood').some(p=>p.mealRoles.length));
});
test('full meal combines three distinct roles within total budget and respects multiple exclusions',()=>{
 const m=food.blankMemory();Object.assign(m.requirements,{budget:{amount:650,currency:'JPY'},slots:['main','drink','dessert'],goals:['high_protein'],avoid:['coffee'],noFried:true});
 const r=food.planOptions(all,plan(),m);assert(r.options.length);for(const o of r.options){assert.equal(o.ids.length,3);assert(o.totalJPY<=650);assert(new Set(o.ids).size===3);assert(o.ids.some(id=>all.find(p=>p.id===id).mealRoles.includes('main')));assert(o.ids.every(id=>!all.find(p=>p.id===id).tags.includes('coffee')));}
});
test('catalog absence, budget conflict and missing nutrition/diet labels produce distinct fallback reasons',()=>{
 let m=food.blankMemory();m.requirements.budget={amount:10,currency:'JPY'};
 const absent=food.planOptions(all,plan({}, {queries:[query('ingredient_rice')]}),m);assert.equal(absent.reasons[0].code,'not_in_catalog');
 const budget=food.planOptions(all,plan(),m);assert.equal(budget.reasons[0].code,'budget_conflict');assert(!budget.options.length);
 m=food.blankMemory();m.requirements.nutritionLimits={kcal:{max:300}};
 const nutrition=food.planOptions(all,plan(),m);assert(!nutrition.options.length);assert(nutrition.reasons[0].missingFields.includes('nutrition_unknown:kcal'));
 m=food.blankMemory();m.requirements.diet='vegetarian';assert(!food.planOptions(all,plan(),m).options.length);
});
test('partial meal does not relax budget or dietary restrictions and explicitly lists missing roles',()=>{
 const m=food.blankMemory();m.requirements.slots=['main','drink','side'];m.requirements.budget={amount:250,currency:'JPY'};
 const r=food.planOptions(all,plan(),m);assert(r.reasons.length);assert(r.options.every(o=>o.totalJPY<=250));assert(r.options.every(o=>!o.complete&&o.missingSlots.length));
 m.requirements.allergies=['milk'];assert(!food.planOptions(all,plan(),m).options.length);
});
test('session patches preserve unrelated restrictions and require evidence for allergy corrections',()=>{
 let m=food.blankMemory();Object.assign(m.requirements,{budget:{amount:500,currency:'JPY'},allergies:['milk'],avoid:['coffee']});
 const next=food.parsePlan(plan({scenes:['dinner']}),input('改成晚餐'),catalog,m).memory;assert.deepEqual(next.requirements.allergies,['milk']);assert.equal(next.requirements.budget.amount,500);
 assert.throws(()=>food.parsePlan(plan({allergies:[]}),input('改成晚餐'),catalog,m),/unconfirmed_dietary_reset/);
 const p=plan({allergies:[],avoid:['coffee','milk']},{corrections:[{field:'allergies',evidence:'不是过敏'}]});assert.deepEqual(food.parsePlan(p,input('不是过敏，只是不喜欢牛奶'),catalog,m).memory.requirements.allergies,[]);
});
test('append retains original meal and totals it, keep/remove preserve exact previous IDs',()=>{
 let m=food.blankMemory();m.currentIds=['chilled:1_06'];m.requirements.budget={amount:500,currency:'JPY'};
 const added=food.planOptions(all,plan({}, {operation:'append',queries:[query('water','drink')]}),m);assert(added.options.length);assert(added.options[0].ids.includes('chilled:1_06'));assert(added.options[0].totalJPY===321);
 m.currentIds=added.options[0].ids;assert.deepEqual(food.planOptions(all,plan({}, {operation:'keep',targetIds:['chilled:1_06']}),m).options[0].ids,['chilled:1_06']);
 assert.deepEqual(food.planOptions(all,plan({}, {operation:'remove',targetIds:['drinks:WATER']}),m).options[0].ids,['chilled:1_06']);
});
test('unconfirmed currency yields a clarification reason, never purchase cards',()=>{
 const m=food.blankMemory();m.requirements.budget={amount:1000,currency:'UNKNOWN'};const r=food.planOptions(all,plan(),m);assert(!r.options.length);assert.equal(r.reasons[0].code,'currency_unconfirmed');
});
test('comparison and location do not turn into eating suitability recommendations',()=>{
 const m=food.blankMemory();m.requirements.allergies=['fish'];const r=food.planOptions(all,plan({}, {intent:'compare',queries:[query(null,null,['chilled:1_06','chilled:1_08'])]}),m);assert(!r.options.length);assert.equal(r.queryResults[0].ids.length,2);
});
test('availability absence is explicit and never described as a budget problem',()=>{
 const m=food.blankMemory();m.requirements.budget={amount:1,currency:'JPY'};
 const r=food.planOptions(all,plan({}, {intent:'availability',queries:[query('ingredient_rice',null)]}),m);
 assert.equal(r.reasons[0].code,'not_in_catalog');assert(!r.options.length);
});
test('role query ranks ingredient evidence without requiring a literal high-protein product name',()=>{
 const m=food.blankMemory();m.requirements.goals=['high_protein'];
 const r=food.planOptions(all,plan({}, {queries:[{text:'high-protein food',category:null,ids:[],slot:'main'}]}),m);
 assert(r.options.length);assert(r.options[0].ids.every(id=>all.find(p=>p.id===id).mealRoles.includes('main')));
 assert(all.find(p=>p.id===r.options[0].ids[0]).goalEvidence.some(e=>e.goal==='protein_source'));
});
test('replace drink preserves main, avoids the previous drink and respects the complete basket budget',()=>{
 const m=food.blankMemory();m.currentIds=['chilled:1_06','drinks:WATER'];m.requirements.budget={amount:600,currency:'JPY'};
 const r=food.planOptions(all,plan({}, {operation:'replace_slot',queries:[query('drink','drink')]}),m);
 assert(r.options.length);assert(r.options.every(o=>o.ids.includes('chilled:1_06')&&!o.ids.includes('drinks:WATER')&&o.totalJPY<=600));
});
test('unknown nutrient threshold can be acknowledged without presenting a fabricated product value',()=>{
 const m=food.blankMemory();m.requirements.nutritionLimits={kcal:{max:300}};
 const r=food.planOptions(all,plan(),m);
 const result=food.validateAnswer({option:0,message:'无法确认是否低于300千卡，当前缺少包装营养数据。'},r,all,input('低于300千卡'),m.requirements);
 assert.deepEqual(result.ids,[]);assert.equal(result.option,-1);
});
test('unknown product IDs and unsupported nutrition/basket promises are rejected',()=>{
 assert.throws(()=>food.parsePlan(plan({}, {targetIds:['invented']}),input('吃饭'),catalog,food.blankMemory()),/unknown_product/);
 const m=food.blankMemory(),p=food.planOptions(all,plan({}, {queries:[query(null,'main',['chilled:1_06'])]}),m);
 for(const message of ['三文鱼饭团含30g protein。','三文鱼饭团已加入购物篮。','三文鱼饭团新鲜健康。'])assert.throws(()=>food.validateAnswer({option:0,message},p,all,input('推荐饭团'),m.requirements));
});
test('new pipeline exposes structured requirements and candidate evidence, without legacy routing',async()=>{
 let calls=0;const r=await food.orchestrate({input:input('午餐500日元，不要咖啡'),catalog,memory:food.blankMemory(),call:async messages=>{
 if(++calls===1){assert(messages[0].content.includes('intent parser'));return plan({budget:{amount:500,currency:'JPY'},avoid:['coffee'],slots:['main','drink']});}
 const s=JSON.parse(messages[0].content.split('FACTS AND ALREADY VALIDATED OPTIONS ')[1]);const o=s.options[0];return {option:0,message:o.ids.map(id=>catalog.products.find(p=>p.id===id).zh).join('＋')+'组成主食和饮品，参考合计'+o.totalJPY+'日元。'};
 }});assert.equal(calls,2);assert.equal(r.foodEvaluation.version,55);assert(r.projectTotalJPY<=500);assert(r.sessionMemory.requirements.avoid.includes('coffee'));
});
test('production HTTP food mode uses taxonomy, retains session constraints, and records evaluation',async()=>{
 let calls=0;const fetchImpl=async(url,options)=>{
  const body=JSON.parse(options.body),text=body.messages[0].content;let value;
  if(text.includes('intent parser'))value=plan({budget:{amount:500,currency:'JPY'}},{intent:'availability',operation:'none',queries:[query('ingredient_rice',null)]});
  else value={option:-1,message:'当前项目目录没有收录大米，无法确认这里有售。'};
  calls++;return {ok:true,status:200,json:async()=>({id:'mock',choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}],usage:{total_tokens:10}})};
 };
 const app=server.createServer({foodAgent:true,getConfig:()=>({provider:'bailian',model:'qwen-flash',key:'test'}),fetchImpl,logger:()=>{}});await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
 try{const url='http://127.0.0.1:'+app.address().port+'/api/clerk';const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input('这里有大米吗'))});const data=await r.json();assert.equal(r.status,200);assert.equal(calls,2);assert(data.sessionId);assert(data.foodEvaluation);assert.deepEqual(data.productIds,[]);}finally{await new Promise(resolve=>app.close(resolve));}
});
