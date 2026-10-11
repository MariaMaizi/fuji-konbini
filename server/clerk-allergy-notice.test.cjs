const {test}=require('node:test'),assert=require('node:assert/strict');
const policy=require('./clerk-policy.cjs'),guidance=require('./clerk-allergy-guidance.cjs');
const catalog=policy.pricedCatalog(require('../web/data/product-catalog.json'));
const opts={input:{message:'我想吃饭团，但是我对明太子过敏',language:'zh',history:[]},catalog,memory:{...policy.blankMemory(),allergies:['mentaiko']},plan:{queries:['rice ball']},l:'zh'};
test('missing packaging notice is completed from known facts after validating the model choices',async()=>{
 let calls=0;const text='可以先查看梅子饭团和昆布饭团的标签。';
 const result=await guidance.alternatives({...opts,call:async()=>{calls++;return {message:text,inspectionIds:['chilled:1_08','chilled:1_09']};}});
 assert.equal(calls,1);assert(result.message.startsWith(text));assert.match(result.message,/具体包装和交叉接触尚未核实/);assert.match(result.message,/不能确认适合/);assert(result.verificationNoticeAdded);
});
test('natural equivalent verification wording does not require exact template words',async()=>{
 const text='可查看梅子饭团的标签，完整配料仍需核对，不能确认适合你食用。';
 const result=await guidance.alternatives({...opts,call:async()=>({message:text,inspectionIds:['chilled:1_08']})});assert.equal(result.message,text);assert(!result.verificationNoticeAdded);
});
test('notice completion cannot sanitize unsafe claims or fabricated products',async()=>{
 for(const message of ['梅子饭团可以放心吃。','梅子饭团不含明太子。','梅子饭团适合你。'])await assert.rejects(guidance.alternatives({...opts,call:async()=>({message,inspectionIds:['chilled:1_08']})}),e=>e.validationIssues.includes('allergy_unsupported_assurance'));
 await assert.rejects(guidance.alternatives({...opts,call:async()=>({message:'检查不存在的商品。',inspectionIds:['made-up']})}),/invalid_allergy_guidance/);
});
