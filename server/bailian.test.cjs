const {test}=require('node:test'),assert=require('node:assert/strict');
const {ask,resolveConfig}=require('./clerk-server.cjs');
const catalog=require('../web/data/product-catalog.json');
const cfg={provider:'bailian',key:'test-secret',model:'qwen-flash'};
const body={message:'但是我不喜欢萝卜',history:[],language:'zh',state:{context:'afternoon',size:'light',exclude:[],paused:false}};
test('selection overrides still explicitly request JSON for the dated model',async()=>{
 const messages=[{role:'system',content:'Select an exact product ID.'},{role:'user',content:'Choose one.'}];
 const value={productIds:['oden:egg']};
 const result=await ask(body,{catalog,cfg:{...cfg,model:'qwen-flash-2025-07-28'},requestMessages:messages,rawReply:true,fetchImpl:async(u,o)=>{
  const p=JSON.parse(o.body);assert(p.messages.some(m=>/json/i.test(m.content)));assert.equal(p.response_format.type,'json_object');assert.equal(messages[0].content,'Select an exact product ID.');
  return {ok:true,status:200,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}]})};
 }});assert.deepEqual(result,value);
});
test('Bailian uses its own credential and non-thinking JSON protocol',async()=>{
 assert.equal(resolveConfig({CLERK_PROVIDER:'bailian'},{OPENAI_API_KEY:'unrelated'}).key,'');
 assert.equal(resolveConfig({CLERK_PROVIDER:'bailian',DASHSCOPE_API_KEY:'file'},{DASHSCOPE_API_KEY:'env'}).key,'env');
 const reply={message:'好，我们换掉萝卜。',productIds:['oden:egg'],cardTitle:'温暖小食',context:'afternoon',size:'light',dietaryCaution:false};
 const result=await ask(body,{catalog,cfg,fetchImpl:async(url,options)=>{
  assert.equal(url,'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions');
  const payload=JSON.parse(options.body);assert.equal(payload.enable_thinking,false);assert.equal(payload.response_format.type,'json_object');assert(!('thinking' in payload));assert(payload.messages.at(-1).content.includes(body.message));
  return {ok:true,status:200,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(reply)}}]})};
 }});assert.equal(result.cardTitle,'For you');assert.equal(result.provider,'bailian');assert.deepEqual(result.productIds,['oden:egg']);
});
test('Bailian free-tier stop is explicit and unselected models are rejected',async()=>{
 await assert.rejects(ask(body,{catalog,cfg,fetchImpl:async()=>({ok:false,status:403,text:async()=>JSON.stringify({error:{code:'AllocationQuota.FreeTierOnly',message:'Free quota exhausted'}})})}),/provider_usage_limit/);
 await assert.rejects(ask(body,{catalog,cfg:{...cfg,model:'other'}}),/selected_model_required/);
});
test('user-authorized dated Flash model is accepted, other models remain blocked',async()=>{
 const reply={message:'可以看看关东煮鸡蛋。',productIds:['oden:egg'],cardTitle:'For you',context:'afternoon',size:'light',dietaryCaution:false};
 let requestedModel;
 await ask(body,{catalog,cfg:{...cfg,model:'qwen-flash-2025-07-28'},fetchImpl:async(u,o)=>{requestedModel=JSON.parse(o.body).model;return {ok:true,status:200,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(reply)}}]})};}});
 assert.equal(requestedModel,'qwen-flash-2025-07-28');
});
test('Bailian preserves model text with bad UI metadata but rejects invented products',async()=>{
 const value={message:'好的，我们换一种搭配。',productIds:['oden:egg'],context:'breakfast',size:'small',dietaryCaution:false};
 const mock=v=>async()=>({ok:true,status:200,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(v)}}]})});
 const trace={provider:'bailian'};
 const result=await ask(body,{catalog,cfg,trace,fetchImpl:mock(value)});
 assert.equal(result.message,value.message);assert.equal(result.context,'afternoon');assert.equal(result.size,'light');assert.equal(result.cardTitle,'For you');assert.deepEqual(trace.normalizedFields,['cardTitle','context','size']);
 await assert.rejects(ask(body,{catalog,cfg,fetchImpl:mock({...value,productIds:['invented-item']})}),/unknown_product/);
});
