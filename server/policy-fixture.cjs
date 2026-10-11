// Old retrieval tests use concise selection fixtures; supply the new reply field explicitly.
const policy=require('./clerk-policy.cjs');
function orchestrate(args){let n=0;const call=args.call;return policy.orchestrate({...args,call:async messages=>{
 const result=await call(messages);if(!n++||!Array.isArray(result.productIds)||result.message!==undefined)return result;
 const l=args.input.language==='en'?'en':'zh';
 const retained=JSON.parse(messages[0].content.match(/Retained items remain selected: (\[[^\n]*?\])\. Mention/)[1]);
 const ids=[...retained.map(p=>p[0]),...result.productIds];
 const total=ids.reduce((sum,id)=>sum+(args.catalog.products.find(p=>p.id===id)?.projectPriceJPY||0),0);
 return {...result,message:ids.map(id=>{const p=args.catalog.products.find(p=>p.id===id);return p?.[l]||p?.en||id;}).join('、')+`。合计${total}日元。`};
 }});}
module.exports={orchestrate};
