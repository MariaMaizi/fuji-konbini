'use strict';
// Price lookup is a catalog tool. Never call a language model for arithmetic.
const aliases={'oden:daikon':['萝卜','大根'],'oden:egg':['关东煮鸡蛋','炖鸡蛋'],'coffee:hot-coffee':['热咖啡'],'coffee:iced-coffee':['冰咖啡'],'coffee:cafe-latte':['拿铁'],'drinks:WATER':['矿泉水','水']};
function priceReply(input,catalog,memory={}){
 const text=require('./clerk-language.cjs').positiveText(input.message);
 if(!/多少钱|多少日元|什么价|价格|单价|合计|总价|一共.*钱|够(?:不够|吗)|找零|剩.*(?:钱|日元)|how much|price|total cost|afford|いくら|値段|価格|合計/i.test(text))return null;
 const l=input.language&&input.language!=='auto'?input.language:/[ぁ-んァ-ヶ]/u.test(text)?'ja':/[\u3400-\u9fff]/u.test(text)?'zh':'en';
 const memoryCopy=structuredClone(memory),byId=new Map(catalog.products.map(p=>[p.id,p]));
 const finish=(message,ids=[],total=null)=>({message,productIds:[],cardTitle:'Price details',context:input.state?.context||'afternoon',size:input.state?.size||'light',dietaryCaution:(memory.allergies||[]).length>0,sessionMemory:memoryCopy,language:l,source:'catalog',projectTotalJPY:total,priceSource:'japan_711_reference',priceItems:ids});
 const spans=[];
 for(const p of catalog.products){
  const names=[p.zh,p.ja,p.en,...(aliases[p.id]||[])].filter(n=>n&&n.length>1);
  for(const name of names){const at=text.toLowerCase().indexOf(name.toLowerCase());if(at>=0)spans.push({p,name,at,end:at+name.length});}
 }
 // Prefer a full name over a shorter alias occupying the same span.
 const matches=spans.filter(s=>!spans.some(t=>t!==s&&t.at<=s.at&&t.end>=s.end&&t.name.length>s.name.length));
 let selected=[...new Map(matches.map(s=>[s.p.id,s.p])).values()];
 if(matches.some(s=>matches.some(t=>s.p.id!==t.p.id&&s.at===t.at&&s.end===t.end))||selected.length>3)return finish({zh:'有多个包装或规格。请告诉我商品卡片上的完整名称，我再按对应商品算价。',ja:'複数の包装・規格があります。商品カードの完全な名前を教えてください。',en:'Several variants match. Please use the full product-card name.'}[l]);
 if(!selected.length&&/多少钱|how much|这些|这(?:个|份|款|些)|刚才|一共|合计|总价|够(?:不够|吗)|找零|these|this|total|afford|これ|合計/i.test(text))selected=(memory.requestedProductIds?.length?memory.requestedProductIds:memory.currentIds?.length?memory.currentIds:memory.inspectedIds?.length?memory.inspectedIds:input.currentProductIds||[]).map(id=>byId.get(id)).filter(Boolean);
 if(!matches.length&&selected.length>1&&/这(?:个|款)|\bthis\b|これ/i.test(text)&&!/这些|合计|总价|一共|total/i.test(text))return finish({zh:'你指的是哪一款？告诉我商品名称，我再查对应价格。',ja:'どの商品ですか？商品名を教えてください。',en:'Which item do you mean? Please give its name.'}[l]);
 if(!selected.length)return finish({zh:'你想查哪件商品的价格？告诉我商品卡片上的名称就可以。',ja:'どの商品の価格ですか？商品カードの名前を教えてください。',en:'Which item would you like priced? Please give its product-card name.'}[l]);
 if(/\d+\s*块/.test(text)&&!/日元|人民币/.test(text))return finish('你说的“块”是日元还是人民币？目前商品价格按日元计算。');
 if(/人民币|人民幣|RMB|CNY|ドル|USD|dollar/i.test(text))return finish({zh:'商品标价为日元。请提供日元预算，我再计算；这里还没有接入实时汇率。',ja:'価格は円表示です。円の予算を教えてください。',en:'Prices are in JPY. Please give a yen budget; live exchange rates are unavailable.'}[l]);
 const digits={'一':1,'二':2,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10};
 const lines=selected.map(p=>{
  const s=matches.find(s=>s.p.id===p.id);let q=1;
  const qty=s&&text.slice(Math.max(0,s.at-12),s.at).match(/(-?\d+(?:\.\d+)?|[一二两三四五六七八九十])\s*(?:个|份|杯|包|瓶|盒|串|袋|件)\s*$/);
  if(qty)q=Object.hasOwn(digits,qty[1])?digits[qty[1]]:Number(qty[1]);
  const after=s&&text.slice(s.end,s.end+16).match(/^\s*[×x*]\s*(\d+)/i);if(after)q=Number(after[1]);
  const suffix=s&&text.slice(s.end,s.end+16).match(/^\s*(-?\d+(?:\.\d+)?|[一二两三四五六七八九十])\s*(?:个|份|杯|包|瓶|盒|串|袋|件)/);
  if(suffix)q=Object.hasOwn(digits,suffix[1])?digits[suffix[1]]:Number(suffix[1]);
  const each=text.match(/每(?:样|种|款|件)\s*(?:买|要)?\s*(\d+|[一二两三四五六七八九十])\s*(?:个|份|杯|包|瓶|盒|串|袋|件)/);if(each)q=Object.hasOwn(digits,each[1])?digits[each[1]]:Number(each[1]);
  return {id:p.id,name:p[l]||p.en,quantity:q,unitJPY:p.projectPriceJPY,subtotalJPY:q*p.projectPriceJPY,type:p.priceSource};
 });
 if(lines.some(x=>!Number.isInteger(x.quantity)||x.quantity<1||x.quantity>100))return finish({zh:'请给出1到100件的整数数量。',ja:'数量は1〜100の整数で指定してください。',en:'Please give a whole-number quantity from 1 to 100.'}[l]);
 const total=lines.reduce((n,x)=>n+x.subtotalJPY,0);if(!Number.isFinite(total))throw Error('missing_reference_price');
 let message=lines.map(x=>l==='zh'?`${x.name}参考单价${x.unitJPY}日元${x.quantity>1?`，${x.quantity}份共${x.subtotalJPY}日元`:''}`:l==='ja'?`${x.name}：参考単価${x.unitJPY}円 × ${x.quantity}`:`${x.name}: reference ¥${x.unitJPY} × ${x.quantity}`).join(l==='en'?'; ':'；');
 message+=l==='zh'?`。合计${total}日元。`:l==='ja'?`。合計${total}円。`:`. Total ¥${total}.`;
 const stated=text.match(/(\d+)\s*(?:日元|円|JPY|yen)/i),budget=stated?Number(stated[1]):memory.budgetJPY;
 if(Number.isFinite(budget)&&/够|找零|剩|预算|afford|budget|予算/i.test(text))message+=l==='zh'?(budget>=total?`预算${budget}日元够，剩${budget-total}日元。`:`预算${budget}日元还差${total-budget}日元。`):l==='ja'?`予算との差額は${budget-total}円です。`:` Budget minus total: ¥${budget-total}.`;
 message+=l==='zh'?'这是本店参考价，部分按同类商品估价，实际日本门店价格可能不同。':l==='ja'?'参考・推定価格です。実店舗の価格とは異なる場合があります。':'These are reference/estimated prices; actual store prices may differ.';
 // A lookup does not change the recommended selection or dietary memory.
 return finish(message,lines,total);
}
module.exports={priceReply};
