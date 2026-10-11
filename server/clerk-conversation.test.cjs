const {test}=require('node:test'),assert=require('node:assert/strict');
const policy=require('./clerk-policy.cjs'),conversation=require('./clerk-conversation.cjs'),allergens=require('./clerk-allergens.cjs'),prices=require('./clerk-prices.cjs'),guidance=require('./clerk-allergy-guidance.cjs');
const catalog=policy.pricedCatalog(require('../web/data/product-catalog.json'));
const input=message=>({message,language:'zh',history:[{role:'assistant',content:'三文鱼饭团可以查看配料资料。'}],state:{context:'rain',size:'light'}});
const memory=()=>({...policy.blankMemory(),allergies:['mentaiko'],pendingInspectionIds:['chilled:1_06'],inspectedIds:['chilled:1_06']});
test('screenshot purchase and correction advance choice instead of replaying ingredient facts',async()=>{
 let m=memory();for(const text of ['OK，那我要三文鱼饭团吧','我说我要三文鱼饭团']){
  const r=await policy.orchestrate({input:input(text),catalog,memory:m,call:async()=>{throw Error('Unnecessary model request');}});
  assert.match(r.message,/三文鱼饭团/);assert(!r.message.includes('常见同类组成参考'));assert.match(r.message,/没有加入购物篮/);assert.deepEqual(r.productIds,[]);assert.deepEqual(r.sessionMemory.allergies,['mentaiko']);m=r.sessionMemory;
 }
 assert.deepEqual(m.requestedProductIds,['chilled:1_06']);assert.deepEqual(m.pendingInspectionIds,[]);
});
test('asking details after choosing, then price and location, each uses the correct remembered product',()=>{
 const chosen=conversation.reply(input('我要三文鱼饭团'),catalog,memory());const m=chosen.sessionMemory;
 assert.match(allergens.allergenReply(input('查一下它的配料'),catalog,m).message,/常见同类组成参考/);
 for(const text of ['这款多少钱','多少钱']){const r=prices.priceReply(input(text),catalog,m);assert.match(r.message,/三文鱼饭团/);assert(r.priceItems.length);}
 assert.match(conversation.reply(input('它在哪'),catalog,m).message,/三文鱼饭团/);
 assert.match(conversation.reply(input('它在哪'),catalog,m).message,/Browse/);
 assert.equal(allergens.allergenReply(input('它在哪'),catalog,m),null);
});
test('cancel clears choice and inspection only; it preserves the allergy and does not remove actual basket items',()=>{
 const m=conversation.reply(input('我要三文鱼饭团'),catalog,memory()).sessionMemory;
 for(const text of ['那算了','不要了','我不想要了','取消']){const r=conversation.reply(input(text),catalog,m);assert.deepEqual(r.sessionMemory.requestedProductIds,[]);assert.deepEqual(r.sessionMemory.allergies,['mentaiko']);assert(!r.message.includes('购物篮已'));}
});
test('explicit details win when purchase and inspection are both expressed; negatives do not become purchases',()=>{
 assert.match(allergens.allergenReply(input('我要三文鱼饭团，但先看看配料'),catalog,memory()).message,/常见同类组成参考/);
 assert.equal(conversation.reply(input('我不要三文鱼饭团'),catalog,memory()),null);
 assert.equal(allergens.allergenReply(input('我不要三文鱼饭团'),catalog,memory()),null);
 assert.equal(conversation.reply(input('我要三文鱼饭团'),catalog,policy.blankMemory()),null);
 assert.equal(conversation.reply(input('我要三文鱼饭团，但我对鱼过敏'),catalog,memory()),null);
});
test('allergy candidates respect dislikes and explicit flavor swaps instead of repeating the old inspection pair',()=>{
 const m={...memory(),exclusions:['plum'],pendingInspectionIds:['chilled:1_08','chilled:1_09']};
 const candidates=guidance.candidates(catalog,m,input('换一个其他口味的饭团'),{queries:['rice ball']});
 assert(candidates.length);assert(!candidates.some(p=>/plum/i.test(p.en)));assert(!candidates.some(p=>['chilled:1_06','chilled:1_08','chilled:1_09'].includes(p.id)));
});
test('requesting a named risk item never erases allergy or claims the item is safe',()=>{
 const r=conversation.reply(input('那我要明太子饭团'),catalog,memory());assert(r);assert.match(r.message,/涉及你的过敏限制/);assert(!r.message.includes('放心'));assert.deepEqual(r.productIds,[]);assert.deepEqual(r.sessionMemory.allergies,['mentaiko']);
});
test('currency clarification stops before selection, and confirmation resumes normally',async()=>{
 const plan={message:'先确认预算。',action:'recommend',queries:['rice ball'],zones:['chilled'],count:1,context:'afternoon',size:'full',updates:{summary:'午餐饭团',budgetChange:'keep',budgetJPY:null}};
 let calls=0;
 const r=await policy.orchestrate({input:input('我现在只有1000块，中午好饿'),catalog,memory:policy.blankMemory(),call:async()=>{calls++;return plan;}});
 assert.equal(calls,1);assert.equal(r.action,'chat');assert.deepEqual(r.productIds,[]);assert.equal(r.sessionMemory.currencyPending,true);assert.match(r.message,/日元还是人民币/);
 calls=0;
 const next=await policy.orchestrate({input:input('是1000日元，我想吃饭团'),catalog,memory:r.sessionMemory,call:async()=>++calls===1?plan:{productIds:['chilled:1_06'],message:'可以选三文鱼饭团，参考价213日元。'}});
 assert.equal(calls,2);assert.equal(next.sessionMemory.currencyPending,false);assert.equal(next.sessionMemory.budgetJPY,1000);assert.deepEqual(next.productIds,['chilled:1_06']);
});
test('closing and cancelling work without allergies, but thanks plus a new request is not swallowed',()=>{
 const m={...policy.blankMemory(),currentIds:['chilled:1_06']};
 const r=conversation.reply(input('谢谢，不用推荐了'),catalog,m);assert.match(r.message,/不客气/);assert.deepEqual(r.productIds,[]);assert.equal(r.dietaryCaution,false);
 assert.equal(conversation.reply(input('谢谢，再加一份零食'),catalog,m),null);
 assert.equal(conversation.reply(input('好的'),catalog,m),null);
 assert.deepEqual(conversation.reply(input('那算了'),catalog,m).sessionMemory.currentIds,[]);
});
