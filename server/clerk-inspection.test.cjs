const {test}=require('node:test'),assert=require('node:assert/strict');
const policy=require('./clerk-policy.cjs'),facts=require('./clerk-allergens.cjs');
const catalog=policy.pricedCatalog(require('../web/data/product-catalog.json'));
const input=message=>({message,language:'zh',history:[],state:{context:'rain',size:'light'}});
const plan=()=>({message:'好的',action:'recommend',queries:['rice ball'],zones:['chilled'],count:1,context:'afternoon',size:'light',updates:{summary:'想吃其他饭团',budgetChange:'keep',addExclusions:[],removeExclusions:[],addAllergies:[],removeAllergies:[]}});
test('offered inspection choices persist and screenshot follow-ups retrieve the chosen ingredients',async()=>{
 let calls=0;const offered=await policy.orchestrate({input:input('我还想吃饭团'),catalog,memory:{...policy.blankMemory(),allergies:['mentaiko']},call:async()=>++calls===1?plan():{message:'可以先查看梅子饭团和昆布饭团的配料，具体包装未核实，不能确认适合你食用。',inspectionIds:['chilled:1_08','chilled:1_09']}});
 assert.equal(calls,2);assert.deepEqual(offered.sessionMemory.pendingInspectionIds,['chilled:1_08','chilled:1_09']);
 let memory=offered.sessionMemory;
 for(const message of ['梅子饭团吧','不是说挑选梅子饭团看详细信息吗','这款的配料呢']){
  const result=await policy.orchestrate({input:input(message),catalog,memory,call:async()=>{throw Error('No model call for inspection');}});
  assert.match(result.message,/梅子/);assert.match(result.message,/米饭/);assert.match(result.message,/未核实/);assert(!result.message.includes('你还想找其他饭团'));assert.deepEqual(result.productIds,[]);assert.deepEqual(result.sessionMemory.allergies,['mentaiko']);memory=result.sessionMemory;
 }
});
test('ordinals resolve to offered label choices, separate from current edible product IDs',()=>{
 const memory={...policy.blankMemory(),allergies:['mentaiko'],currentIds:[],pendingInspectionIds:['chilled:1_08','chilled:1_09']};
 assert.match(facts.allergenReply(input('第一个吧'),catalog,memory).message,/梅子/);
 assert.match(facts.allergenReply(input('第二个呢'),catalog,memory).message,/昆布/);
 assert.equal(facts.allergenReply(input('不要梅子饭团'),catalog,memory),null);
 assert.equal(facts.allergenReply(input('我对梅子饭团过敏'),catalog,memory),null);
 assert.equal(facts.allergenReply(input('梅子饭团吧'),catalog,policy.blankMemory()),null);
});
test('old history-based inspection invitation resolves named choices without changing allergy',()=>{
 const i={...input('梅子饭团吧'),history:[{role:'assistant',content:'可以查看梅子饭团或昆布饭团的配料，请挑选一个标签查看详细信息。'}]};
 const result=facts.allergenReply(i,catalog,{...policy.blankMemory(),allergies:['mentaiko']});assert.match(result.message,/米饭/);assert.deepEqual(result.sessionMemory.allergies,['mentaiko']);
});
test('fresh allergy declarations still confirm once and clear stale inspection targets',async()=>{
 const result=await policy.orchestrate({input:input('我对芝麻过敏'),catalog,memory:{...policy.blankMemory(),pendingInspectionIds:['chilled:1_08'],inspectedIds:['chilled:1_08']},call:async()=>plan()});
 assert.match(result.message,/芝麻/);assert.deepEqual(result.sessionMemory.pendingInspectionIds,[]);assert.deepEqual(result.sessionMemory.inspectedIds,[]);
});
test('an inherited allergy and rice request classified as chat still advances to alternatives',async()=>{
 let calls=0;const result=await policy.orchestrate({input:input('我还想吃饭团'),catalog,memory:{...policy.blankMemory(),allergies:['mentaiko']},call:async()=>++calls===1?{...plan(),action:'chat'}:{message:'可以查看梅子饭团，具体包装未核实，不能确认适合你食用。',inspectionIds:['chilled:1_08']}});
 assert.equal(calls,2);assert.deepEqual(result.sessionMemory.pendingInspectionIds,['chilled:1_08']);assert.deepEqual(result.productIds,[]);
});
