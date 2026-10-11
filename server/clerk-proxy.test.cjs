const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
const {providerFetch}=require('./clerk-stream.cjs'),{resolveConfig}=require('./clerk-server.cjs');
test('proxy is explicit per application; environment takes precedence and blank disables it',()=>{
 assert.equal(resolveConfig({CLERK_HTTPS_PROXY:'http://127.0.0.1:7890'},{}).proxy,'http://127.0.0.1:7890');
 assert.equal(resolveConfig({CLERK_HTTPS_PROXY:'http://127.0.0.1:7890'},{CLERK_HTTPS_PROXY:''}).proxy,'');
 assert.equal(resolveConfig({},{}).proxy,'');
});
test('CONNECT failure is returned once without leaking the API credential to the proxy',async()=>{
 const server=http.createServer();let calls=0;
 server.on('connect',(req,socket)=>{calls++;assert.equal(req.url,'example.com:443');assert.equal(req.headers.authorization,undefined);socket.end('HTTP/1.1 407 Proxy Authentication Required\r\n\r\n');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{await assert.rejects(providerFetch('https://example.com',{method:'POST',headers:{Authorization:'Bearer test-private-secret'},body:'{}',proxy:'http://127.0.0.1:'+server.address().port,signal:AbortSignal.timeout(1000)}),/CONNECT rejected: 407/);assert.equal(calls,1);}finally{await new Promise(r=>server.close(r));}
});
test('abort covers a proxy that never acknowledges CONNECT',async()=>{
 const server=http.createServer();let socket;
 server.on('connect',(_req,s)=>{socket=s;});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{await assert.rejects(providerFetch('https://example.com',{method:'GET',headers:{},proxy:'http://127.0.0.1:'+server.address().port,signal:AbortSignal.timeout(100)}),e=>e.code==='ABORT_ERR');}finally{socket?.destroy();await new Promise(r=>server.close(r));}
});
test('non-local or credential-bearing proxy URLs are rejected before any connection',async()=>{
 for(const proxy of ['http://remote.example:7890','http://user:secret@127.0.0.1:7890'])await assert.rejects(providerFetch('https://example.com',{method:'GET',headers:{},proxy}),e=>e.code==='invalid_proxy');
});
