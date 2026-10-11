const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {ask,resolveConfig,createServer}=require('./clerk-server.cjs');
const {createClient}=require('../web/src/clerk-api.js');
const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'../web/data/product-catalog.json'),'utf8'));
const cfg={provider:'zhipu',key:'zhipu-test-only',model:'glm-4.7-flash'};
const body={message:'请推荐两样热食',language:'zh',history:[],state:{context:'rain',size:'light',exclude:[],paused:false}};
const reply={message:'先来点热乎的吧。',productIds:['oden:daikon','pantry:2_07'],cardTitle:'A warm little break',context:'rain',size:'light',dietaryCaution:false};
const mock=(value=reply,finish='stop')=>async()=>({ok:true,json:async()=>({choices:[{finish_reason:finish,message:{content:JSON.stringify(value),reasoning_content:'never display this'}}]})});
test('unknown catalog prices cannot become a model estimate; recommendation is preserved',async()=>{
 const trace={};const r=await ask({...body,message:'预算500日元，想吃热的但不要太油'},{catalog,cfg,trace,fetchImpl:mock({...reply,message:'萝卜和鸡蛋都是热的，可以试试。虽然不知道具体价格，但我相信500日元应该能买到一份。',productIds:['oden:daikon','oden:egg']})});
 assert(r.message.includes('萝卜和鸡蛋'));assert(!r.message.includes('应该能买到'));assert(r.message.includes('无法确认'));assert.deepEqual(r.productIds,['oden:daikon','oden:egg']);assert.equal(trace.pricingNoticeApplied,true);
});
test('JSON fences are accepted but invalid fields and invented products are still rejected with diagnostics',async()=>{
 const fenced=value=>async()=>({ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:'```json\n'+JSON.stringify(value)+'\n```'}}]})});
 assert.equal((await ask(body,{catalog,cfg,fetchImpl:fenced(reply)})).source,'llm');
 for(const [value,field,code] of [[{...reply,size:'small'},'size','invalid_model_response'],[{...reply,productIds:['made-up']},'unknown_product','unknown_product'],[{...reply,dietaryCaution:'false'},'dietaryCaution','invalid_model_response']]){
  const trace={};await assert.rejects(ask(body,{catalog,cfg,trace,fetchImpl:fenced(value)}),new RegExp(code));assert(trace.validationIssues.includes(field));
 }
 const trace={};await assert.rejects(ask(body,{catalog,cfg,trace,fetchImpl:async()=>({ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:'not JSON'}}]})})}),/invalid_model_response/);assert.deepEqual(trace.validationIssues,['json']);
});
test('Zhipu config never reuses an OpenAI key; missing key makes no request',async()=>{
 const empty=resolveConfig({CLERK_PROVIDER:'zhipu'},{OPENAI_API_KEY:'old-key'});assert.equal(empty.key,'');
 let called=false;await assert.rejects(ask(body,{catalog,cfg:empty,fetchImpl:async()=>{called=true;}}),/not_configured/);assert.equal(called,false);
 assert.throws(()=>resolveConfig({CLERK_PROVIDER:'unknown'}),/unsupported_provider/);
});
test('Zhipu uses official chat endpoint, JSON mode, disabled thinking and existing catalog IDs',async()=>{
 let payload;const result=await ask(body,{catalog,cfg,fetchImpl:async(url,options)=>{
  assert.equal(url,'https://open.bigmodel.cn/api/paas/v4/chat/completions');assert.equal(options.headers.Authorization,'Bearer '+cfg.key);
  payload=JSON.parse(options.body);return mock()();
 }});
 assert.equal(payload.model,'glm-4.7-flash');assert.equal(payload.thinking.type,'disabled');assert.equal(payload.response_format.type,'json_object');assert.equal(payload.max_tokens,1024);
 assert.equal(payload.messages[0].role,'system');assert(payload.messages[0].content.includes('sweets:3_01'));assert(!('text' in payload));assert(!('store' in payload));
 assert.equal(result.provider,'zhipu');assert.deepEqual(result.productIds,reply.productIds);assert(!JSON.stringify(result).includes('never display'));
});
test('Zhipu blocks paid model substitutions, bad IDs, truncation and dietary violations',async()=>{
 let calls=0;await assert.rejects(ask(body,{catalog,cfg:{...cfg,model:'glm-4.7-flashx'},fetchImpl:async()=>{calls++;}}),/free_model_required/);assert.equal(calls,0);
 await assert.rejects(ask(body,{catalog,cfg,fetchImpl:mock({...reply,productIds:['fake']})}),/unknown_product/);
 await assert.rejects(ask(body,{catalog,cfg,fetchImpl:mock(reply,'length')}),/incomplete_response/);
 await assert.rejects(ask({...body,state:{...body.state,paused:true}},{catalog,cfg,fetchImpl:mock()}),/dietary_pause/);
});
test('Zhipu busy, account rate limit and quota errors remain distinct and sanitized',async()=>{
 for(const [code,expected] of [['1305','model_busy'],['1302','rate_limit_exceeded'],['1308','provider_usage_limit'],['1310','provider_usage_limit']]){
  await assert.rejects(ask(body,{catalog,cfg,fetchImpl:async()=>({ok:false,status:429,json:async()=>({error:{code,message:cfg.key}})})}),e=>e.code===expected&&!e.message.includes(cfg.key));
 }
});
test('Zhipu HTTP and frontend preserve provider identity and reject concurrent requests',async()=>{
 let entered,release;const started=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
 const server=createServer({getConfig:()=>cfg,fetchImpl:async()=>{entered();await gate;return mock()();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{
  const client=createClient((url,options)=>fetch(base+url,options));assert.equal((await client.status()).provider,'zhipu');
  const first=client.reply(body,catalog.products);await started;
  await assert.rejects(client.reply(body,catalog.products),/local_rate_limit/);release();
  assert.equal((await first).products.length,2);
  assert.equal((await fetch(base+'/server/.env.zhipu')).status,404);
 }finally{release();server.closeAllConnections();await new Promise(r=>server.close(r));}
});

test('budget and cooking preferences reach LLM intact, without keyword routing',async()=>{
 const message='我今天下午有点累，预算500日元，想吃热的但不要太油';
 let payload;const answer=await ask({...body,message},{catalog,cfg,fetchImpl:async(url,opts)=>{payload=JSON.parse(opts.body);return mock({...reply,context:'afternoon'})();}});
 assert(payload.messages.at(-1).content.endsWith('Visitor says:\n'+message));
 assert.match(payload.messages[0].content,/do not invent prices/);
 assert.match(payload.messages[0].content,/NOT an allergy/);
 assert.equal(answer.source,'llm');
 const ui=fs.readFileSync(path.join(__dirname,'../web/src/clerk-ui.js'),'utf8');
 const flow=ui.slice(ui.indexOf('async function converse'),ui.indexOf("$('clerk-form').onsubmit"));
 assert(!flow.includes('E.reply(text,state)'),'failed model calls must not generate local substitute dialogue');
});

test('HTTP diagnostics prove upstream success without exposing private data',async()=>{
 const logs=[];const server=createServer({getConfig:()=>cfg,logger:entry=>logs.push(entry),fetchImpl:async()=>({ok:true,status:200,json:async()=>({id:'provider-proof-id',usage:{total_tokens:35},choices:[{finish_reason:'stop',message:{content:JSON.stringify(reply)}}]})})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{
  const data=await (await fetch(base+'/api/clerk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})).json();
  assert.equal(data.source,'llm');assert.equal(data.diagnostics.upstreamId,'provider-proof-id');assert.equal(data.diagnostics.usage.total_tokens,35);
  const status=await (await fetch(base+'/api/clerk/status')).json();assert.equal(status.lastRequest.outcome,'success');
  assert(!JSON.stringify([logs,status]).includes(cfg.key));assert(!JSON.stringify(logs).includes(body.message));
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});

test('timeouts and real provider errors are distinct, developer logs redact secrets',async()=>{
 const trace={};await assert.rejects(ask(body,{catalog,cfg,trace,fetchImpl:async()=>{throw new DOMException('timed out','TimeoutError');}}),/upstream_timeout/);assert.equal(trace.networkCode,'TimeoutError');
 const logs=[];const server=createServer({getConfig:()=>cfg,logger:entry=>logs.push({...entry}),fetchImpl:async()=>({ok:false,status:401,json:async()=>({error:{code:'1002',message:'Invalid credential '+cfg.key}})})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{
  const data=await (await fetch(base+'/api/clerk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})).json();
  assert.equal(data.error,'authentication_failed');assert.equal(data.diagnostics.upstreamStatus,401);assert.equal(data.diagnostics.upstreamCode,'1002');assert.equal(data.diagnostics.detail,undefined);
  assert(!JSON.stringify([data,logs]).includes(cfg.key));assert.match(logs[0].detail,/REDACTED/);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});

test('environment keys take precedence and key source is explicit',()=>{
 const file={CLERK_PROVIDER:'zhipu',ZHIPU_API_KEY:'file-test-key',ZHIPU_MODEL:'glm-4.7-flash'};
 const env=resolveConfig(file,{ZHIPU_API_KEY:'environment-test-key'},'server/.env.zhipu');
 assert.equal(env.key,'environment-test-key');assert.equal(env.keySource,'environment');
 assert.equal(resolveConfig(file,{},'server/.env.zhipu').keySource,'server/.env.zhipu');
 assert.equal(resolveConfig(file,{ZHIPU_API_KEY:' '}).key,'');
});

test('complete upstream error bodies are logged; visible diagnostics preserve the cause and redact credentials',async()=>{
 for(const isJson of [true,false]){
  const reason='Specific provider failure '+cfg.key+' '+ 'long detail '.repeat(70);
  const raw=isJson?JSON.stringify({error:{code:'1305',message:reason}}):'<html>'+reason+'</html>';
  const logs=[];
  const server=createServer({getConfig:()=>({...cfg,keySource:'environment'}),logger:t=>logs.push({...t}),fetchImpl:async()=>new Response(raw,{status:isJson?429:502})});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  try{
   const client=createClient((url,options)=>fetch(base+url,options));
   let failure;try{await client.reply(body,catalog.products);}catch(error){failure=error;}
   assert(failure);const d=failure.diagnostics;
   assert.equal(d.upstreamStatus,isJson?429:502);assert.equal(d.appStatus,503);assert.equal(d.keySource,'environment');
   assert(d.upstreamMessage.length>400);assert.equal(d.upstreamBody,undefined);assert(d.elapsedMs>=0);
   assert.equal(logs[0].upstreamBody,raw.replaceAll(cfg.key,'[REDACTED]'));
   assert(!JSON.stringify([failure.diagnostics,logs]).includes(cfg.key));
   const {diagnosticText}=require('../web/src/clerk-api.js');
   const visible=diagnosticText(failure);assert(visible.includes('Specific provider failure'));assert(visible.includes('Elapsed:'));assert(visible.includes('Source: local-app-backend'));
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
 }
});
