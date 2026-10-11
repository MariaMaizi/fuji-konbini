'use strict';
const fs=require('node:fs'),path=require('node:path');
const file=path.resolve(__dirname,'../web/data/product-allergens.json');
function load(){return JSON.parse(fs.readFileSync(file,'utf8'));}
const labels={'卵':'鸡蛋','乳':'乳','小麦':'小麦','大豆':'大豆','えび':'虾','かに':'蟹','落花生':'花生','そば':'荞麦','くるみ':'核桃','ごま':'芝麻','さけ':'鲑鱼','さば':'鲭鱼','ゼラチン':'明胶','鶏肉':'鸡肉','豚肉':'猪肉','牛肉':'牛肉','アーモンド':'杏仁'};
function facts(p,l='zh'){
 const info=p.allergenInfo||{},r=info.reference,name=p[l]||p.en;
 if(info.verificationStatus==='not_food')return {zh:`${name}属于非食品，不能作为可食用商品推荐。`,ja:`${name}は食品ではありません。`,en:`${name} is not a food product.`}[l];
 const list=/^(?:partial_)?published_list$/.test(r?.status||'')?r.listedAllergensJA:null;
 const ingredients=require('./clerk-ingredients.cjs').facts(p,l);
 if(ingredients){return `${name}：${ingredients} ${l==='zh'?'上述资料只用于了解商品。具体包装的完整配料、复合配料和交叉接触尚未核实，不能据此确认适合过敏者食用。':l==='ja'?'該当包装の全原材料・複合原料・交差接触は未確認で、アレルギーへの適合は判断できません。':'The exact package, full compound ingredients and cross-contact remain unverified; allergy suitability is not established.'}${list?(l==='zh'?` 官方7-Eleven同类参照款已读取的过敏原${r.status==='partial_published_list'?'（仅取得部分标注类别）':''}：${list.length?list.map(a=>labels[a]||a).join('、'):'未列出，不代表无过敏原'}。`:l==='ja'?` 公式類似品の取得済みアレルゲン：${list.join('・')||'記載なし（不含の証明ではありません）'}。`:` Read allergen entries for the official analogue: ${list.join(', ')||'no entries, not proof of absence'}.`):''}`;}
 if(l==='zh')return `${name}：${list?`日本7-Eleven官方同类参照“${r.name}”已读取的过敏原标注为${list.length?list.map(a=>labels[a]||a).join('、'):'未列出（不代表无过敏风险）'}${r.status==='partial_published_list'?'，仅取得部分标注类别':''}。`:'尚未取得可核对的过敏原清单。'}本店具体包装的完整配料及交叉接触信息仍未核实，不能据此确认适合过敏者食用。${/咖啡因/.test(name)?'咖啡因含量亦未核实。':''}`;
 if(l==='ja')return `${name}：${list?`セブン‐イレブンの類似商品「${r.name}」のアレルゲン表示は${list.join('・')||'記載なし'}です。`:'確認可能なアレルゲン表示はありません。'}店内の該当包装と交差接触は未確認のため、アレルギーへの適合は判断できません。`;
 return `${name}: ${list?`the official analogous product "${r.name}" lists ${list.join(', ')||'no entries (not proof of absence)'}.`:'No verifiable allergen list is available.'} The exact store package, full ingredients and cross-contact remain unverified; this does not establish allergy suitability.`;
}
function allergenReply(input,catalog,memory){
 const text=input.message;
 if(['choose','locate','cancel','correction','price'].includes(require('./clerk-conversation.cjs').intent(text)))return null;
 const explicitDetails=require('./clerk-conversation.cjs').intent(text)==='details'||/过敏原|过敏信息|配料|详细信息|详情|成分|含.*(?:蛋|乳|奶|麦|豆|花生|芝麻|咖啡因)|allergens?|ingredients?|details?|アレルゲン|原材料|詳しく/i.test(text);
 // Inspection is separate from edible recommendations. Keep the offered label choices.
 const pending=(memory.pendingInspectionIds||[]).filter(id=>catalog.products.some(p=>p.id===id));
 const historyInspection=memory.allergies.length>0&&(input.history||[]).slice(-6).some(h=>h.role==='assistant'&&/查看|检查|配料|inspect|check.*label|原材料/i.test(h.content||''));
 if(!explicitDetails&&!pending.length&&!historyInspection)return null;
 if(/不是.*过敏|not.*allerg|不要|不想|不选|别选|不看|don't want|do not want|not this|やめ/i.test(text))return null;
 const l=input.language&&input.language!=='auto'?input.language:/[ぁ-んァ-ヶ]/u.test(text)?'ja':/[\u3400-\u9fff]/u.test(text)?'zh':'en';
 const spans=[];
 for(const p of catalog.products)for(const name of [p.zh,p.ja,p.en,...(p.id==='oden:egg'?['炖鸡蛋','关东煮鸡蛋']:p.id==='oden:daikon'?['关东煮萝卜']:[])].filter(Boolean)){
  const at=text.toLowerCase().indexOf(name.toLowerCase());if(at>=0)spans.push({p,at,end:at+name.length});
 }
 const matches=spans.filter(s=>!spans.some(t=>t.at<=s.at&&t.end>=s.end&&t.end-t.at>s.end-s.at));
 let selected=[...new Map(matches.map(s=>[s.p.id,s.p])).values()];
 if(!explicitDetails)selected=selected.filter(p=>pending.includes(p.id)||historyInspection&&(input.history||[]).slice(-6).some(h=>h.role==='assistant'&&[p.zh,p.ja,p.en].filter(Boolean).some(n=>(h.content||'').includes(n))));
 const ordinal=text.match(/第([一二12])(?:个|款|种)|\b(first|second)\b|(一|二)つ目/i);
 if(!selected.length&&ordinal&&pending.length){const index=/二|2|second/i.test(ordinal[0])?1:0;selected=pending[index]?[catalog.products.find(p=>p.id===pending[index])]:[];}
 if(!selected.length&&/这(?:个|款|些)|它|刚才|these|this|\bit\b|これ/i.test(text))selected=(memory.requestedProductIds?.length?memory.requestedProductIds:memory.inspectedIds?.length?memory.inspectedIds:pending.length===1?pending:memory.currentIds||[]).map(id=>catalog.products.find(p=>p.id===id)).filter(Boolean);
 if(!selected.length||selected.length>3)return null;
 // A declaration still needs the semantic planner to update and persist the allergy.
 if(/过敏|過敏|allergic|allergy to|アレルギー/i.test(text.replace(/过敏原|过敏信息|allergens?/gi,'')))return null;
 const caffeine=/咖啡因|caffeine/i.test(text)?{zh:' 咖啡因含量未核实，过敏原标注不能替代咖啡因信息。',ja:' カフェイン含有量は未確認です。',en:' Caffeine content is unverified; allergen labels do not establish caffeine content.'}[l]:'';
 return {message:[...new Set(selected.map(p=>facts(p,l)))].join(' ')+caffeine,productIds:[],cardTitle:'Ingredient details',context:input.state?.context||'afternoon',size:input.state?.size||'light',dietaryCaution:memory.allergies.length>0,sessionMemory:{...structuredClone(memory),inspectedIds:selected.map(p=>p.id)},language:l,source:'catalog',allergenItems:selected.map(p=>({id:p.id,verificationStatus:p.allergenInfo?.verificationStatus,reference:p.allergenInfo?.reference||null})),ingredientItems:selected.map(p=>({id:p.id,status:p.ingredientInfo?.status,complete:false,sourceUrls:p.ingredientInfo?.sources.map(s=>s.url)||[]}))};
}
module.exports={load,facts,allergenReply};
