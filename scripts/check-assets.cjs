'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../web');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/product-catalog.json'),'utf8'));
const check=p=>assert(fs.existsSync(path.join(root,p)),`Missing runtime asset: ${p}`);
assert.equal(catalog.products.length,603);
assert.equal(new Set(catalog.products.map(p=>p.id)).size,603);
for(const p of catalog.products)if(p.image)check(p.image);
const sources=['app.js',...fs.readdirSync(path.join(root,'src')).filter(p=>p.endsWith('.js')||p.endsWith('.css')).map(p=>'src/'+p)];
for(const file of sources){
 const text=fs.readFileSync(path.join(root,file),'utf8');
 for(const m of text.matchAll(/(?:models|data|assets)\/[\w./-]+\.(?:glb|json|png|jpg|webp|svg)/g))check(m[0]);
}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const m of html.matchAll(/(?:src|href)="([^"?#]+)(?:[?#][^"]*)?"/g))if(!/^(https?:|data:|#)/.test(m[1]))check(m[1]);
const THREE=require('../web/vendor/three.min.js');
const names=new Set();
for(const file of fs.readdirSync(path.join(root,'models')).filter(x=>x.endsWith('.glb'))){
 const data=fs.readFileSync(path.join(root,'models',file));
 assert.equal(data.toString('ascii',0,4),'glTF');
 const gltf=JSON.parse(data.toString('utf8',20,20+data.readUInt32LE(12)));
 for(const node of gltf.nodes||[])if(node.name)names.add(THREE.PropertyBinding.sanitizeNodeName(node.name));
 for(const entry of [...(gltf.buffers||[]),...(gltf.images||[])])assert(!entry.uri||entry.uri.startsWith('data:'),`Unbundled GLB resource in ${file}`);
}
for(const p of catalog.products)assert(names.has(THREE.PropertyBinding.sanitizeNodeName(p.node)),`Missing modeled node: ${p.id}`);
console.log('PASS: 603 unique products and modeled nodes, catalog images, embedded GLB resources, model/data references and page dependencies.');
