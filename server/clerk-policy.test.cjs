const {test}=require('node:test'),assert=require('node:assert/strict');
const {pricedCatalog,blankMemory,applyPolicy,policyPrompt}=require('./clerk-policy.cjs');
const {orchestrate}=require('./policy-fixture.cjs');
const {ask,createServer}=require('./clerk-server.cjs');
const catalog=pricedCatalog(require('../web/data/product-catalog.json'));
const input={message:'换一下',history:[],language:'zh',state:{context:'rain',size:'light',exclude:[],paused:false}};
const base=(ids=[],action='recommend',u={})=>({message:'好，换个选择。',productIds:ids,action,cardTitle:'For you',context:'afternoon',size:'light',dietaryCaution:false,updates:{addExclusions:[],removeExclusions:[],addAllergies:[],removeAllergies:[],summary:'午餐',budgetChange:'keep',budgetJPY:null,...u}});
const meal=['chilled:1_01','chilled:1_03'].filter(id=>catalog.products.some(p=>p.id===id));
const snacks=catalog.products.filter(p=>p.zone==='snacks'&&!/chips/i.test(p.en));
test('a greeting cannot trigger an unsolicited product selection',async()=>{
 let calls=0;const r=await orchestrate({input:{...input,message:'你好'},catalog,memory:blankMemory(),call:async()=>{calls++;return {...base([], 'recommend'),queries:['chocolate'],zones:['sweets'],count:1};}});assert.equal(calls,1);assert.equal(r.action,'chat');assert.deepEqual(r.productIds,[]);
});
test('two-stage append keeps the meal and budgets only remaining money; keep_one uses current IDs',async()=>{
 const m={...blankMemory(),currentIds:['chilled:1_01'],budgetJPY:450};let calls=0;
 const r=await orchestrate({input:{...input,message:'午餐先保留，我还想吃一点咸口零食'},catalog,memory:m,call:async messages=>{
  if(!calls++)return {...base([],'append'),queries:['crackers'],zones:['snacks'],count:1};
  assert.match(messages[0].content,/<= 130 JPY/);const id=catalog.products.find(p=>p.zone==='snacks'&&p.projectPriceJPY<=130).id;return {productIds:[id]};
 }});assert(r.productIds.includes('chilled:1_01'));assert(r.projectTotalJPY<=450);
 calls=0;const one=await orchestrate({input:{...input,message:'就一种就够了'},catalog,memory:r.sessionMemory,call:async()=>!calls++?{...base([],'keep_one'),count:1}:{productIds:['chilled:1_01']}});assert.deepEqual(one.productIds,['chilled:1_01']);
});
test('ungrounded names and wrong-language openers never appear in a purchase reply',()=>{
 const r=applyPolicy({...base(['oden:egg']),message:'试试抹茶大福，软糯香甜。'},input,catalog,blankMemory());assert(!r.message.includes('大福'));assert(r.message.includes('炖鸡蛋'));
 const en=applyPolicy({...base(['oden:egg']),message:'どうぞ。'},{...input,message:'Suggest something different',language:'en'},catalog,blankMemory());assert(!/[ぁ-ん]/u.test(en.message));
});
test('explicit yen budget persists even if the planner forgets to set it',()=>{const r=applyPolicy(base(['oden:egg'],'recommend'),{...input,message:'是1000日元，只有十分钟'},catalog,blankMemory());assert.equal(r.sessionMemory.budgetJPY,1000);assert.match(r.message,/150日元/);});
test('breakfast context cannot carry an afternoon opener',()=>{const r=applyPolicy({...base(['chilled:1_01']),context:'morning',message:'下午想吃点什么？'},{...input,message:'我想吃正常早餐'},catalog,blankMemory());assert(!r.message.includes('下午'));});
test('explicit hunger and thirst include a water candidate and produce food plus water',async()=>{
 let calls=0;const r=await orchestrate({input:{...input,message:'下午有点饿也很渴，不想喝甜饮料'},catalog,memory:blankMemory(),call:async messages=>{
  if(!calls++)return {...base([]),queries:['sandwich'],zones:['chilled'],count:2};
  assert(messages[0].content.includes('drinks:WATER'));const pool=JSON.parse(messages[0].content.split('CANDIDATES [id,name,JPY]: ')[1]);return {productIds:[pool.find(p=>p[0]!=='drinks:WATER')[0],'drinks:WATER']};
 }});assert(r.productIds.includes('drinks:WATER'));assert.equal(r.productIds.length,2);
});
test('all 603 prices are project estimates, original store price and images remain untouched',()=>{
 assert.equal(catalog.products.length,603);assert(catalog.products.every(p=>Number.isInteger(p.projectPriceJPY)&&p.projectPriceJPY>0&&p.price===null));
});
test('append and replace snack retain meals; total includes retained items',()=>{
 let r=applyPolicy(base(meal,'recommend',{budgetChange:'set',budgetJPY:1000}),input,catalog,blankMemory());
 r=applyPolicy(base([snacks[0].id],'append'),input,catalog,r.sessionMemory);
 assert.deepEqual(r.productIds,[...meal,snacks[0].id]);
 r=applyPolicy(base([snacks[1].id],'replace_snack'),input,catalog,r.sessionMemory);
 assert.deepEqual(r.productIds,[...meal,snacks[1].id]);
 assert.equal(r.projectTotalJPY,r.productIds.reduce((s,id)=>s+catalog.products.find(p=>p.id===id).projectPriceJPY,0));
 assert.throws(()=>applyPolicy(base([snacks[2].id],'append',{budgetChange:'set',budgetJPY:100}),input,catalog,blankMemory()),/budget_exceeded/);
});
test('persistent dislikes reject another packaging/variant even with empty chat history',()=>{
 const m=applyPolicy(base(['oden:egg'],'recommend',{addExclusions:['daikon','chips','coffee']}),input,catalog,blankMemory()).sessionMemory;
 for(const id of ['oden:daikon','snacks:KEPT_02','coffee:cafe-latte'])assert.throws(()=>applyPolicy(base([id]),input,catalog,m),/preference_mismatch/);
});
test('allergy survives time switch; location remains possible; explicit correction restores ordinary breakfast',()=>{
 let r=applyPolicy(base([],'recommend',{addAllergies:['caffeine']}),{...input,message:'咖啡因过敏'},catalog,blankMemory());
 assert.equal(r.dietaryCaution,true);
 assert.throws(()=>applyPolicy(base(meal),{...input,message:'改成下午'},catalog,r.sessionMemory),/dietary_pause/);
 const location=applyPolicy(base([],'locate'),{...input,message:'鸡蛋三明治在哪'},catalog,r.sessionMemory);assert.equal(location.dietaryCaution,true);
 assert.throws(()=>applyPolicy(base(meal,'recommend',{removeAllergies:['caffeine']}),input,catalog,r.sessionMemory),/unconfirmed_dietary_reset/);
 r=applyPolicy(base(meal,'recommend',{removeAllergies:['caffeine'],addExclusions:['coffee']}),{...input,message:'不是过敏，只是不喜欢咖啡'},catalog,r.sessionMemory);assert.equal(r.dietaryCaution,false);
 assert.throws(()=>applyPolicy(base(['coffee:hot-coffee']),input,catalog,r.sessionMemory),/preference_mismatch/);
 assert.throws(()=>applyPolicy(base(meal),{...input,message:'对咖啡因过敏'},catalog,blankMemory()),/dietary_pause/);
});
test('swap rejects history repeats, keep_one preserves a single exact SKU; names rendered from catalog',()=>{
 const m=applyPolicy(base(meal),input,catalog,blankMemory()).sessionMemory;
 assert.throws(()=>applyPolicy(base([meal[0]],'swap'),input,catalog,m),/repeated_product/);
 const r=applyPolicy(base([meal[0]],'keep_one'),input,catalog,m);
 assert.deepEqual(r.productIds,[meal[0]]);assert(r.message.includes(catalog.products.find(p=>p.id===meal[0]).zh));assert(!r.message.includes(meal[0]));
});
test('latest English selects English prompt and canonical names, not previous Japanese',()=>{
 const en={...input,language:'auto',message:'Something different please'};
 assert(policyPrompt(en,catalog,blankMemory()).includes('Use en for this turn'));
 const r=applyPolicy(base(meal),en,catalog,blankMemory());assert.equal(r.language,'en');assert(r.message.includes(catalog.products.find(p=>p.id===meal[0]).en));
});
test('production HTTP session survives absent history; failure does not commit unverified selections',async()=>{
 let n=0;
 const server=createServer({getConfig:()=>({provider:'bailian',key:'mock',model:'qwen-flash'}),logger:()=>{},fetchImpl:async()=>({ok:true,status:200,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify([ {...base([]),queries:['sandwich'],zones:['chilled'],count:2}, {productIds:meal,message:meal.map(id=>catalog.products.find(p=>p.id===id).zh).join('、')}, {...base([],'append'),queries:[snacks[0].en],zones:['snacks'],count:1}, {productIds:[snacks[0].id],message:[...meal,snacks[0].id].map(id=>catalog.products.find(p=>p.id===id).zh).join('、')} ][n++])}}]})})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const url='http://127.0.0.1:'+server.address().port+'/api/clerk';
 const send=async body=>(await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})).json();
 const a=await send({message:'午餐'}),b=await send({message:'再加零食',sessionId:a.sessionId});
 assert.equal(b.sessionId,a.sessionId);assert.deepEqual(b.productIds,[...meal,snacks[0].id]);assert(!('sessionMemory'in b));assert(!('updates'in b));
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test('bounded retrieval removes disliked variants before model selection; invented selection fails',async()=>{
 let step=0,selectionPrompt='';
 const r=await orchestrate({input,catalog,memory:{...blankMemory(),exclusions:['daikon','coffee','chips']},call:async messages=>{
  if(step++===0)return {...base([]),queries:['egg'],zones:['oden'],count:1};
  selectionPrompt=messages[0].content;return {productIds:['oden:egg']};
 }});
 assert.deepEqual(r.productIds,['oden:egg']);assert(!selectionPrompt.includes('"oden:daikon"'));assert(!selectionPrompt.includes('"coffee:hot-coffee"'));assert(!selectionPrompt.includes('"snacks:KEPT_02"'));
 let n=0;await assert.rejects(orchestrate({input,catalog,memory:blankMemory(),call:async()=>n++===0?{...base([]),queries:['egg'],zones:['oden'],count:1}:{productIds:['invented:food']}}),/unknown_product/);
});
test('a scene change offers label checks without clearing the allergy or repeating declaration',async()=>{
 let calls=0;const r=await orchestrate({input:{...input,message:'改成下午吃'},catalog,memory:{...blankMemory(),allergies:['caffeine']},call:async messages=>{
  if(++calls===1)return {...base([]),queries:['sandwich'],zones:['chilled'],count:1};
  const first=JSON.parse(messages[0].content.split('LABEL RECORDS: ')[1])[0];return {message:`可查看${first.name}的配料，具体包装未核实，不能确认适合你食用。`,inspectionIds:[first.id]};
 }});
 assert.equal(calls,2);assert.equal(r.dietaryCaution,true);assert.deepEqual(r.productIds,[]);assert.deepEqual(r.sessionMemory.allergies,['caffeine']);assert.equal(r.sessionMemory.pendingInspectionIds.length,1);
});
test('explicit allergy correction resumes selection and filters coffee before the second call',async()=>{
 let n=0;const r=await orchestrate({input:{...input,message:'不是过敏，只是不喜欢咖啡味'},catalog,memory:{...blankMemory(),allergies:['caffeine']},call:async messages=>{
  if(n++===0)return {...base([],'recommend',{addExclusions:['咖啡味']}),queries:['sandwich'],zones:['chilled'],count:1};
  assert(!messages[0].content.includes('"coffee:hot-coffee"'));return {productIds:[meal[0]]};
 }});assert.equal(r.dietaryCaution,false);assert.deepEqual(r.sessionMemory.exclusions,['coffee']);
});
test('warm retrieval cannot supply packaged pantry soup as prepared hot food',async()=>{
 let n=0;await orchestrate({input:{...input,message:'想吃热的'},catalog,memory:blankMemory(),call:async messages=>{
  if(n++===0)return {...base([]),queries:['soup'],zones:['pantry'],count:1,warmOnly:true};
  assert(!/"pantry:/.test(messages[0].content));return {productIds:['oden:egg']};
 }});
});
test('explicit health guarantee is corrected rather than repeated',()=>{
 const r=applyPolicy({...base(['oden:egg']),message:'这是助眠不长胖的夜宵。'},{...input,message:'什么能保证不长胖，还能让我睡得好？'},catalog,blankMemory());
 assert(r.message.startsWith('没有哪款食物能保证'));assert(!r.message.includes('这是助眠'));
});
test('free-tier exhaustion stops before selection and never retries or changes model',async()=>{
 let calls=0;const trace={};
 await assert.rejects(ask({message:'找午餐'},{catalog,cfg:{provider:'bailian',key:'mock',model:'qwen-flash'},policyMemory:blankMemory(),trace,fetchImpl:async()=>{calls++;return {ok:false,status:403,text:async()=>JSON.stringify({error:{code:'AllocationQuota.FreeTierOnly',message:'Free quota exhausted'}})};}}),/provider_usage_limit/);
 assert.equal(calls,1);assert.equal(trace.upstreamCalls,1);assert.equal(trace.upstreamStatus,403);
});

