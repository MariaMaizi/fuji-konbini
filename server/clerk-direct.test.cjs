const {test}=require('node:test'),assert=require('node:assert/strict'),{ask}=require('./clerk-server.cjs');
const direct=require('./clerk-direct.cjs'),policy=require('./clerk-policy.cjs');
const catalog=policy.pricedCatalog(require('../web/data/product-catalog.json'),{virtual:true});
const input={message:'我要沐浴露',language:'zh',history:[],state:{context:'rain',size:'light'}};
test('direct trial preserves unsupported prose exactly and maps only existing UI cards',()=>{
 const raw={message:'测试原始回答：预算和温度没有通过后端核验。',productIds:['made-up','daily:6_08','daily:6_08']};const out=direct.display(raw,input,catalog,{provider:'bailian',model:'qwen-plus'});
 assert.equal(out.message,raw.message);assert.deepEqual(out.modelProductIds,raw.productIds);assert.deepEqual(out.productIds,['daily:6_08']);assert.equal(out.replyMode,'direct');
});
test('direct route makes one model call for household goods and bypasses the food pipeline',async()=>{
 let calls=0;const raw={message:'多芬沐浴露可以在日用品区找到。',productIds:['daily:7_07']};const out=await ask(input,{catalog,cfg:{provider:'bailian',model:'qwen-plus',key:'test'},foodAgent:true,selfCheck:true,policyMemory:require('./food-agent.cjs').blankMemory(),directReply:true,fetchImpl:async(url,options)=>{
  calls++;const body=JSON.parse(options.body);assert(body.messages[0].content.includes('household goods'));assert(!body.messages[0].content.includes('intent parser'));assert(body.messages[0].content.includes('daily:7_07'));return {ok:true,status:200,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(raw)}}]})};
 }});assert.equal(calls,1);assert.equal(out.message,raw.message);assert.deepEqual(out.productIds,raw.productIds);
});
