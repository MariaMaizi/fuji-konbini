const {test}=require('node:test'),assert=require('node:assert/strict');
const {orchestrate,pricedCatalog,blankMemory}=require('./clerk-policy.cjs');
const guidance=require('./clerk-allergy-guidance.cjs');
const catalog=pricedCatalog(require('../web/data/product-catalog.json'));
const input=message=>({message,language:'zh',history:[],state:{context:'afternoon',size:'light'}});
const plan=()=>({message:'已有部分资料。',action:'recommend',queries:['rice ball'],zones:['chilled'],count:1,context:'afternoon',size:'light',cardTitle:'For you',updates:{summary:'饭团',budgetChange:'keep',addExclusions:[],removeExclusions:[],addAllergies:['unverified_allergy'],removeAllergies:[]}});
test('a named allergy is retained specifically even if the planner only emits an unknown allergy',async()=>{
 let calls=0;const r=await orchestrate({input:input('我对明太子过敏'),catalog,memory:blankMemory(),call:async()=>{calls++;return plan();}});
 assert.equal(calls,1);assert.deepEqual(r.sessionMemory.allergies,['mentaiko']);assert.match(r.message,/对明太子过敏/);assert.match(r.message,/其他饭团/);assert.deepEqual(r.productIds,[]);assert(r.dietaryCaution);
});
test('other options lead to grounded label-inspection help rather than the same blanket refusal',async()=>{
 let n=0;const text='我记得你对明太子过敏。可以先查看梅子饭团和昆布饭团的配料资料；具体包装尚未核实，不能确认适合你食用。想先查哪一款？';
 const r=await orchestrate({input:input('可以给我其他推荐吗'),catalog,memory:{...blankMemory(),allergies:['mentaiko'],summary:'饭团'},call:async messages=>{
 if(!n++)return {...plan(),updates:{...plan().updates,addAllergies:[]}};
 assert(messages[0].content.includes('明太子'));assert(!messages[0].content.includes('"id":"chilled:1_10"'));return {message:text,inspectionIds:['chilled:1_08','chilled:1_09']};
 }});assert.equal(n,2);assert.equal(r.message,text);assert.deepEqual(r.productIds,[]);assert.deepEqual(r.inspectionIds,['chilled:1_08','chilled:1_09']);assert(r.dietaryCaution);
});
test('unsafe reassurances or missing unknown-package notice never become food recommendations',async()=>{
 for(const message of ['梅子饭团可以放心吃，尚未核实。','梅子饭团不含明太子，尚未核实。']){
 await assert.rejects(guidance.alternatives({input:input('其他推荐'),catalog,memory:{...blankMemory(),allergies:['mentaiko']},plan:plan(),l:'zh',call:async()=>({message,inspectionIds:['chilled:1_08']})}),/invalid_allergy_guidance/);
 }
});
test('negative safety notice is accepted but a reassurance after the comma is still blocked',async()=>{
 const opts={input:input('其他推荐'),catalog,memory:{...blankMemory(),allergies:['peanut']},plan:plan(),l:'zh'};
 const r=await guidance.alternatives({...opts,call:async()=>({message:'可查看梅子饭团，具体包装未核实，无法确认是否安全。',inspectionIds:['chilled:1_08']})});assert.match(r.message,/无法确认/);
 await assert.rejects(guidance.alternatives({...opts,call:async()=>({message:'可查看梅子饭团，具体包装未核实，无法确认是否安全，但可以放心吃。',inspectionIds:['chilled:1_08']})}),/invalid_allergy_guidance/);
});
test('fish names and declared item names cannot appear among inspection candidates',()=>{
 const pool=guidance.candidates(catalog,{...blankMemory(),allergies:['fish'],summary:'饭团'},input('其他饭团'),plan());
 assert(pool.length);assert(!pool.some(p=>/tuna|salmon|mentaiko/i.test(p.en)));
});
test('an unspecified allergy asks one useful clarification and retains the allergy state',async()=>{
 const r=await orchestrate({input:input('我过敏，可以推荐其他的吗'),catalog,memory:blankMemory(),call:async()=>plan()});
 assert.match(r.message,/哪种食材/);assert(r.dietaryCaution);assert.deepEqual(r.productIds,[]);
});
test('Chinese, English and Japanese declarations identify mentaiko without broadening to all fish',()=>{
 for(const text of ['我对明太子过敏','I am allergic to mentaiko','明太子にアレルギーがあります'])assert.deepEqual(guidance.declaration(text),['mentaiko']);
 assert.deepEqual(guidance.declaration('不是过敏，只是不喜欢明太子'),[]);
});
test('multiple allergy types use the same evidence classification, not allergy-specific replies',()=>{
 for(const term of ['mentaiko','egg','milk','soy','peanut','wheat','sesame','fish','未知调味料']){
 const memory={...blankMemory(),allergies:[term],summary:'饭团'};
 const pool=guidance.candidates(catalog,memory,input('其他推荐'),plan());assert(pool.every(p=>guidance.assess(p,[term]).status==='needs_verification'));assert.deepEqual(memory.allergies,[term]);
 }
 assert.equal(guidance.assess(catalog.products.find(p=>p.id==='chilled:1_07'),['egg']).status,'avoid_pending_check');
 assert.equal(guidance.assess(catalog.products.find(p=>p.id==='chilled:1_08'),['mentaiko']).status,'needs_verification');
});
test('session A allergy does not leak to independent session B; multiple restrictions remain distinct',async()=>{
 const a=await orchestrate({input:input('我对花生和鸡蛋过敏'),catalog,memory:blankMemory(),call:async()=>plan()});
 const b=await orchestrate({input:input('我对牛奶过敏'),catalog,memory:blankMemory(),call:async()=>plan()});
 assert.deepEqual(a.sessionMemory.allergies,['peanut','egg']);assert.deepEqual(b.sessionMemory.allergies,['milk']);
 assert.deepEqual(guidance.declaration('我对芝麻过敏'),['sesame']);
});
test('allergen facts inspection still uses catalog-only reference data and preserves the allergy',()=>{
 const r=require('./clerk-allergens.cjs').allergenReply(input('梅子饭团的配料是什么'),catalog,{...blankMemory(),allergies:['mentaiko']});
 assert.match(r.message,/常见同类组成参考/);assert.match(r.message,/未核实/);assert.deepEqual(r.productIds,[]);assert.deepEqual(r.sessionMemory.allergies,['mentaiko']);
});
test('production HTTP sessions keep different customers allergies isolated',async()=>{
 const server=require('./clerk-server.cjs').createServer({getConfig:()=>({provider:'bailian',key:'mock-key',model:'qwen-flash'}),logger:()=>{},fetchImpl:async(url,options)=>{const prompt=JSON.parse(options.body).messages[0].content;const value=prompt.includes('LABEL RECORDS:')?{message:'考虑到你的花生过敏，可以查看梅子饭团的配料；具体包装未核实，不能确认适合你食用。',inspectionIds:['chilled:1_08']}:plan();return {ok:true,status:200,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}]})};}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
 const send=async(message,sessionId)=>(await fetch('http://127.0.0.1:'+server.address().port+'/api/clerk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,sessionId,language:'zh'})})).json();
 const a=await send('我对花生过敏'),b=await send('我对牛奶过敏');assert.notEqual(a.sessionId,b.sessionId);assert.match(a.message,/花生/);assert(!a.message.includes('牛奶'));assert.match(b.message,/牛奶/);assert(!b.message.includes('花生'));
 const again=await send('改成下午吃',a.sessionId);assert.match(again.message,/花生/);assert(!again.message.includes('牛奶'));assert(again.dietaryCaution);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
