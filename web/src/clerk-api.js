(function(scope){
 'use strict';
 function diagnosticText(error){
  const d=error.diagnostics||{};
  const lines=['Request details · '+error.message];
  if(d.appStatus)lines.push('Application HTTP: '+d.appStatus);
  lines.push('Model HTTP: '+(d.upstreamStatus|| (d.upstreamAttempted?'No response received':'Not confirmed / not attempted')));
  if(d.upstreamCode||d.networkCode)lines.push('Error code: '+(d.upstreamCode||d.networkCode));
  if(d.upstreamMessage)lines.push('Reason: '+d.upstreamMessage);
  if(d.validationIssues?.length)lines.push('Reply validation: '+d.validationIssues.join(', '));
  if(Number.isFinite(d.elapsedMs))lines.push('Elapsed: '+(d.elapsedMs/1000).toFixed(2)+' s');
  if(d.provider)lines.push('Provider: '+d.provider+' / '+d.model);
  if(d.runtime)lines.push('Source: '+d.runtime+' · PID '+d.pid);
  if(d.keySource)lines.push('Key source: '+d.keySource);
  if(d.requestId)lines.push('Request ID: '+d.requestId);
  return lines.join('\n');
 }
 function createClient(fetchImpl=fetch){
  return {
   async status(){try{const r=await fetchImpl('/api/clerk/status',{signal:AbortSignal.timeout(4000)});if(!r.ok)return {configured:false,error:'status_unreachable'};const d=await r.json();return {configured:d.configured===true,provider:['openai','zhipu','bailian'].includes(d.provider)?d.provider:'',model:typeof d.model==='string'?d.model:'',keySource:d.keySource||'',lastRequest:d.lastRequest||null};}catch{return {configured:false,error:'status_unreachable'};}},
   async reply(body,products,{onText,onStatus}={}){
    const started=Date.now();let response,data;
    try{
     response=await fetchImpl('/api/clerk',{method:'POST',headers:{'Content-Type':'application/json',...(onText?{Accept:'text/event-stream'}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(105000)});
     if(response.ok&&response.headers?.get('content-type')?.includes('text/event-stream')){
      const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',kind='',lines=[];
      const dispatch=()=>{
       if(!lines.length)return;const packet=JSON.parse(lines.join('\n'));lines=[];
       if(kind==='error'){const error=Error(packet.error||'request_failed');error.sessionId=packet.sessionId;error.diagnostics={...packet.diagnostics,appStatus:response.status};throw error;}
       if(kind==='delta'&&typeof packet.text==='string')onText?.(packet.text);
       if(kind==='status')onStatus?.(packet);
       if(kind==='done')data=packet;
       kind='';
      };
      try{
       while(!data){const chunk=await reader.read();if(chunk.done)break;buffer+=decoder.decode(chunk.value,{stream:true});
        if(buffer.length>256000)throw Error('invalid_response');
        let at;while((at=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,at).replace(/\r$/,'');buffer=buffer.slice(at+1);if(!line)dispatch();else if(line.startsWith('event:'))kind=line.slice(6).trim();else if(line.startsWith('data:'))lines.push(line.slice(5).replace(/^ /,''));}
       }
       if(!data)throw Error('stream_interrupted');
      }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
     }else{
      try{data=await response.json();}catch{throw Error('invalid_response');}
      if(!response.ok){const error=Error(data.error||'request_failed');error.sessionId=data.sessionId;error.diagnostics={...data.diagnostics,appStatus:response.status};throw error;}
     }
    }catch(cause){
     const error=['TimeoutError','AbortError'].includes(cause.name)?Error('request_timeout'):cause instanceof TypeError?Error('route_unreachable'):cause;
     error.diagnostics={elapsedMs:Date.now()-started,...(response?{appStatus:response.status}:{}),...cause.diagnostics};throw error;
    }
    const byId=new Map(products.filter(p=>!p.unavailable).map(p=>[p.id,p]));
    if(!['openai','zhipu','bailian'].includes(data.provider)||typeof data.message!=='string'||!Array.isArray(data.productIds)||data.productIds.length>3||new Set(data.productIds).size!==data.productIds.length||data.productIds.some(id=>!byId.has(id)))throw Error('invalid_response');
    return {...data,products:data.productIds.map(id=>byId.get(id))};
   }
  };
 }
 scope.FujiClerkAPI={createClient,diagnosticText};if(typeof module!=='undefined')module.exports=scope.FujiClerkAPI;
})(typeof window!=='undefined'?window:globalThis);
