'use strict';
const https=require('node:https');
const http=require('node:http'),tls=require('node:tls');
const {Readable}=require('node:stream');
// The caller's abort signal covers DNS, connection, headers AND the streamed body.
// Avoid fetch's separate, shorter connection timeout; never retry a model request.
function providerFetch(url,options){
 return new Promise((resolve,reject)=>{
  const target=new URL(url);let agent;
  if(options.proxy){
   const proxy=new URL(options.proxy);
   if(proxy.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(proxy.hostname)||proxy.username||proxy.password)return reject(Object.assign(Error('Invalid local proxy configuration'),{code:'invalid_proxy'}));
   agent=new https.Agent({keepAlive:false});
   agent.createConnection=(_opts,callback)=>{
    // CONNECT sends only the target authority, never the provider API key.
    const authority=target.hostname+':'+(target.port||443);
    const tunnel=http.request({hostname:proxy.hostname,port:proxy.port||80,method:'CONNECT',path:authority,headers:{Host:authority},signal:options.signal});
    let settled=false;
    const finish=(error,socket)=>{if(settled)return;settled=true;callback(error,socket);};
    tunnel.on('error',error=>finish(error));
    tunnel.on('connect',(response,socket,head)=>{
     if(response.statusCode!==200){socket.destroy();return finish(Object.assign(Error('Local proxy CONNECT rejected: '+response.statusCode),{code:'proxy_connect_failed'}));}
     if(head.length)socket.unshift(head);
     // TLS remains end-to-end with normal certificate verification and original SNI.
     const secure=tls.connect({socket,servername:target.hostname});
     const abort=()=>secure.destroy(Object.assign(Error('Request aborted'),{code:'ABORT_ERR'}));
     options.signal?.addEventListener('abort',abort,{once:true});
     secure.once('close',()=>options.signal?.removeEventListener('abort',abort));
     secure.once('error',error=>finish(error));secure.once('secureConnect',()=>finish(null,secure));
     if(options.signal?.aborted)abort();
    });tunnel.end();
   };
  }
  const req=https.request(url,{method:options.method,headers:options.headers,signal:options.signal,agent},res=>{
   const body=Readable.toWeb(res);
   resolve({ok:res.statusCode>=200&&res.statusCode<300,status:res.statusCode,statusText:res.statusMessage,body,
    text:()=>new Response(body).text(),json:()=>new Response(body).json()});
  });
  req.on('error',reject);req.once('close',()=>agent?.destroy());req.end(options.body);
 });
}
// Extract only the JSON message string, never IDs, reasoning tokens or JSON syntax.
function partialMessage(raw){
 const match=/"message"\s*:\s*"/.exec(raw);if(!match)return '';
 const start=match.index+match[0].length;let end=start;
 for(let i=start;i<raw.length;i++){
  const c=raw[i];if(c==='"'){end=i;break;}
  if(c==='\\'){
   if(i+1>=raw.length)break;
   if(raw[i+1]==='u'){if(i+5>=raw.length)break;i+=5;}else i++;
  }
  end=i+1;
 }
 try{return JSON.parse('"'+raw.slice(start,end)+'"').replace(/[\uD800-\uDBFF]$/,'');}catch{return '';}
}
async function consumeZhipu(response,{onText,trace,redact,started}){
 const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',lines=[],raw='',finish='',done=false;
 const dispatch=()=>{
  if(!lines.length)return;const content=lines.join('\n');lines=[];
  if(content==='[DONE]'){done=true;return;}
  let data;try{data=JSON.parse(content);}catch{throw Object.assign(Error('invalid_model_response'),{code:'invalid_model_response'});}
  if(data.error){trace.upstreamBody=redact(content);trace.upstreamMessage=redact(data.error.message||content);trace.upstreamCode=redact(data.error.code);throw Object.assign(Error('upstream_stream_error'),{code:'upstream_stream_error'});}
  if(data.id)trace.upstreamId=redact(data.id);
  if(data.usage){trace.usage={};for(const k of ['prompt_tokens','completion_tokens','total_tokens'])if(Number.isFinite(data.usage[k]))trace.usage[k]=data.usage[k];}
  const choice=data.choices?.[0];if(choice?.finish_reason)finish=choice.finish_reason;
  const text=choice?.delta?.content;
  if(typeof text==='string'&&text){
   trace.firstTokenMs??=Date.now()-started;raw+=text;
   if(raw.length>64000)throw Object.assign(Error('invalid_model_response'),{code:'invalid_model_response'});
   const preview=partialMessage(raw);if(preview)onText(redact(preview));
  }
 };
 try{
  while(!done){const chunk=await reader.read();if(chunk.done)break;buffer+=decoder.decode(chunk.value,{stream:true});
   if(buffer.length>256000)throw Error('oversized_stream_event');
   let at;while((at=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,at).replace(/\r$/,'');buffer=buffer.slice(at+1);if(!line)dispatch();else if(line.startsWith('data:'))lines.push(line.slice(5).replace(/^ /,''));}
  }
  buffer+=decoder.decode();if(buffer.startsWith('data:'))lines.push(buffer.slice(5).trim());dispatch();
 }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 if(finish!=='stop')throw Object.assign(Error('incomplete_response'),{code:'incomplete_response'});
 return raw;
}
module.exports={providerFetch,partialMessage,consumeZhipu};
