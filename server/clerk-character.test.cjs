const {test}=require('node:test'),assert=require('node:assert/strict');
const {askWithModelFallback}=require('./clerk-server.cjs');
const catalog={products:[{id:'daily:soap',zh:'沐浴露',en:'Body wash',projectPriceJPY:300}]};
const body={message:'我要沐浴露',language:'zh'};
const cfg={provider:'bailian',model:'qwen-flash-character',fallbackModel:'qwen-flash-character-2026-02-26',key:'test'};
test('only exact free quota exhaustion switches once, preserving direct answer',async()=>{
 const calls=[],trace={};let switched;
 const answer=await askWithModelFallback(body,{catalog,cfg,trace,directReply:true,fetchImpl:async(url,options)=>{
  const p=JSON.parse(options.body);calls.push(p.model);assert(!Object.hasOwn(p,'enable_thinking'));
  if(calls.length===1)return {ok:false,status:403,text:async()=>JSON.stringify({error:{code:'AllocationQuota.FreeTierOnly',message:'Free quota exhausted'}})};
  return {ok:true,status:200,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify({message:'有沐浴露。',productIds:['daily:soap']})}}]})};
 }},m=>{switched=m});assert.deepEqual(calls,[cfg.model,cfg.fallbackModel]);assert.equal(switched,cfg.fallbackModel);assert.equal(answer.model,switched);assert.equal(answer.message,'有沐浴露。');assert.equal(trace.upstreamCalls,2);
});
for(const code of ['InvalidApiKey','Throttling','Arrearage'])test('does not switch on '+code,async()=>{
 let calls=0,switches=0;await assert.rejects(askWithModelFallback(body,{catalog,cfg,trace:{},directReply:true,fetchImpl:async()=>{calls++;return {ok:false,status:403,text:async()=>JSON.stringify({error:{code,message:'failure'}})};}},()=>{switches++;}));assert.equal(calls,1);assert.equal(switches,0);
});
