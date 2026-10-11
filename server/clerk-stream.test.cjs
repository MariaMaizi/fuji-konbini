const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createServer,ask}=require('./clerk-server.cjs');
const {partialMessage}=require('./clerk-stream.cjs');
const {createClient}=require('../web/src/clerk-api.js');
const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'../web/data/product-catalog.json')));
const cfg={provider:'zhipu',key:'offline-private-secret',model:'glm-4.7-flash'};
const body={message:'我今天下午有点累，预算500日元，想吃热的但不要太油',language:'zh'};
const reply={message:'来点热乎的吧。',productIds:['oden:daikon','oden:egg'],cardTitle:'A warm break',context:'afternoon',size:'light',dietaryCaution:false};
function packet(content,finish=null){return 'data: '+JSON.stringify({id:'stream-test',choices:[{delta:{content,reasoning_content:'PRIVATE REASONING'},finish_reason:finish}]})+'\r\n\r\n';}
function streamResponse(text){const bytes=new TextEncoder().encode(text);let i=0;return new Response(new ReadableStream({pull(c){if(i>=bytes.length)return c.close();c.enqueue(bytes.slice(i,i+=7));}}),{headers:{'Content-Type':'text/event-stream'}});}
async function serverTest(fetchImpl,run){const logs=[];const server=createServer({getConfig:()=>cfg,fetchImpl,logger:t=>logs.push(t)});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;try{await run(createClient((u,o)=>fetch(base+u,o)),logs);}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}}
test('partial JSON messages decode escapes without leaking structure',()=>{
 assert.equal(partialMessage('{"message":"hello\\nworld'),'hello\nworld');
 assert.equal(partialMessage('{"message":"a\\u4f60'),'a你');
 assert.equal(partialMessage('{"message":"a\\u4f'),'a');
 assert.equal(partialMessage('{"message":"ok","productIds":["x"]}'),'ok');
});
test('real route and production client emit deltas BEFORE upstream completes, then validate products',async()=>{
 let release,first;const gate=new Promise(r=>release=r),seen=new Promise(r=>first=r);const previews=[];
 await serverTest(async(url,opts)=>{assert.equal(JSON.parse(opts.body).stream,true);return new Response(new ReadableStream({async start(c){c.enqueue(new TextEncoder().encode(packet('{"message":"来点')));await gate;c.enqueue(new TextEncoder().encode(packet('热乎的吧。","productIds":["oden:daikon","oden:egg"],"cardTitle":"A warm break","context":"afternoon","size":"light","dietaryCaution":false}','stop')+'data: [DONE]\n\n'));c.close();}}),{headers:{'Content-Type':'text/event-stream'}});},async client=>{
  const pending=client.reply(body,catalog.products,{onText:t=>{previews.push(t);first();}});
  let timeout;try{await Promise.race([seen,new Promise((_,reject)=>timeout=setTimeout(()=>reject(Error('No early delta')),2000))]);assert.equal(previews[0],'来点');}finally{clearTimeout(timeout);release();}
  const result=await pending;assert.equal(result.source,'llm');assert.equal(result.products.length,2);assert.equal(result.diagnostics.streaming,true);assert(result.diagnostics.firstTokenMs>=0);assert(!previews.join('').includes('PRIVATE REASONING'));
 });
});
test('fragmented UTF-8 and CRLF upstream SSE produce intact final text',async()=>{
 const raw=JSON.stringify(reply),deltas=[];
 const result=await ask(body,{catalog,cfg,onText:t=>deltas.push(t),fetchImpl:async()=>streamResponse(packet(raw.slice(0,20))+packet(raw.slice(20),'stop')+'data: [DONE]\r\n\r\n')});
 assert.equal(result.message,reply.message);assert.equal(deltas.at(-1),reply.message);
});
test('streaming HTTP failure retains upstream status, cause and elapsed time',async()=>{
 await serverTest(async()=>new Response(JSON.stringify({error:{code:'1305',message:'Busy '+cfg.key}}),{status:429}),async client=>{
  await assert.rejects(client.reply(body,catalog.products,{onText:()=>{}}),e=>e.message==='model_busy'&&e.diagnostics.upstreamStatus===429&&e.diagnostics.elapsedMs>=0&&!JSON.stringify(e.diagnostics).includes(cfg.key));
 });
});
test('dropped streams and invalid IDs never produce a successful final result',async()=>{
 for(const [value,finish,expected] of [[reply,null,'incomplete_response'],[{...reply,productIds:['fake:sku']},'stop','unknown_product']]){
  await serverTest(async()=>streamResponse(packet(JSON.stringify(value),finish)),async client=>{
   await assert.rejects(client.reply(body,catalog.products,{onText:()=>{}}),e=>e.message===expected&&e.diagnostics.elapsedMs>=0);
  });
 }
});
test('client rejects a stream without terminal done/error and reports elapsed time',async()=>{
 const client=createClient(async()=>streamResponse('event: delta\ndata: {"text":"partial"}\n\n'));
 await assert.rejects(client.reply(body,catalog.products,{onText:()=>{}}),e=>e.message==='stream_interrupted'&&e.diagnostics.elapsedMs>=0);
});
