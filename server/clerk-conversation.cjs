'use strict';
// Explicit user actions take priority over an older invitation to inspect labels.
function intent(text){
 if(/不是.*过敏|并非过敏|not.*allerg|アレルギーでは/i.test(text))return 'correction';
 if(/先.*(?:配料|详情|成分)|查看|查.*(?:它|这个|这款)|看看.*(?:配料|详情)|配料|详细信息|成分|ingredients?|details?|原材料/i.test(text))return 'details';
 if(/不(?:想要|要|买|选|看)了|取消|算了|never mind|cancel|やめます/i.test(text))return 'cancel';
 if(/在哪|哪里|位置|怎么找|where|場所/i.test(text))return 'locate';
 if(/多少钱|价格|单价|总价|合计|how much|price|いくら/i.test(text))return 'price';
 if(/我要|我想要|想买|要买|我说.*要|给我|来[一两二三\d]|就买|换成|改成|\b(?:i want|i'll take|buy|i would like|switch to)\b|買いたい|ください/i.test(text)&&!/不要|不想要|不买|don't want|not buy/i.test(text))return 'choose';
 return null;
}
function namedProducts(text,catalog){
 const spans=[];for(const p of catalog.products)for(const name of [p.zh,p.ja,p.en].filter(Boolean)){const at=text.toLowerCase().indexOf(name.toLowerCase());if(at>=0)spans.push({p,at,end:at+name.length});}
 return [...new Map(spans.filter(s=>!spans.some(t=>t.at<=s.at&&t.end>=s.end&&t.end-t.at>s.end-s.at)).map(s=>[s.p.id,s.p])).values()];
}
function reply(input,catalog,memory){
 const action=intent(input.message);
 const keepOnly=/只保留|只留下|\bonly keep\b/i.test(input.message);
 const closing=/^(?:谢谢|谢谢你|thanks|thank you|ありがとう)[，,\s。.!！]*(?:不用推荐了|不需要了|就这样|no more recommendations)?[\s。.!！]*$/i.test(input.message.trim());
 if(!closing&&(!(keepOnly||action==='cancel'||action==='locate'||memory.allergies?.length&&action==='choose')||/过敏|allerg|アレルギー/i.test(input.message)))return null;
 const l=input.language&&input.language!=='auto'?input.language:/[ぁ-んァ-ヶ]/u.test(input.message)?'ja':/[\u3400-\u9fff]/u.test(input.message)?'zh':'en';
 const next=structuredClone(memory),byId=new Map(catalog.products.map(p=>[p.id,p]));
 const finish=message=>({message,productIds:[],cardTitle:'Your selection',language:l,context:input.state?.context||'afternoon',size:input.state?.size||'light',dietaryCaution:!!next.allergies?.length,source:'catalog',sessionMemory:next});
 if(keepOnly&&!next.allergies?.length){
  const text=input.message.split(/只保留|只留下|\bonly keep\b/i).at(-1),named=namedProducts(text,catalog);
  const matches=(next.currentIds||[]).map(id=>byId.get(id)).filter(p=>p&&(named.some(n=>n.id===p.id)||/饭团|rice ball|onigiri/i.test(text)&&/rice ball/i.test(p.en)||/零食|snack/i.test(text)&&['snacks','sweets'].includes(p.zone)||/饮料|drink/i.test(text)&&require('./clerk-drinks.cjs').isDrink(p)));
  if(!matches.length)return finish({zh:'当前选品中没有找到你要保留的商品，请告诉我具体名称。',ja:'残す商品が見つかりません。商品名を教えてください。',en:'I cannot identify that item in the current selection. Please give its name.'}[l]);
  next.currentIds=matches.map(p=>p.id);next.summary=input.message;Object.assign(next,require('./clerk-drinks.cjs').intent(text,next));
  return {...finish({zh:`好，当前选品只保留${matches.map(p=>p.zh||p.en).join('、')}，其余选项已移除。这不会修改购物篮。`,ja:`選択を${matches.map(p=>p.ja||p.en).join('、')}だけにしました。買い物かごは変更していません。`,en:`The selection now keeps only ${matches.map(p=>p.en).join(', ')}. The basket has not changed.`}[l]),productIds:next.currentIds};
 }
 if(closing)return finish({zh:'不客气，有需要再叫我就好。',ja:'どういたしまして。また必要なときに声をかけてください。',en:'You’re welcome. Let me know if you need anything else.'}[l]);
 if(action==='cancel'){if(require('./clerk-language.cjs').mixedCancellation(input.message))return null;next.requestedProductIds=[];next.pendingInspectionIds=[];next.inspectedIds=[];next.currentIds=[];return finish({zh:'好，取消这次选品。如果还想找别的东西，告诉我就好。',ja:'今回の選択を取り消しました。ほかに探したい物があれば教えてください。',en:'Okay, I have cleared this item choice. Tell me if you want to look for something else.'}[l]);}
 let chosen=namedProducts(input.message,catalog);
 if(!chosen.length&&/这(?:个|款)|它|this|it\b|これ/i.test(input.message))chosen=(next.requestedProductIds?.length?next.requestedProductIds:next.inspectedIds?.length?next.inspectedIds:next.currentIds||[]).map(id=>byId.get(id)).filter(Boolean);
 if(chosen.length!==1||action==='choose'&&chosen[0].allergenInfo?.verificationStatus==='not_food')return null;
 const p=chosen[0],name=p[l]||p.en;
 if(action==='locate'){
  const zone=catalog.zones?.find(z=>z.id===p.zone);return finish({zh:`${name}在${zone?.zh||'冷食区'}。打开 Browse 搜索“${p.en}”，商品页可用 Find in store 查看位置。`,ja:`${name}は${zone?.ja||'冷蔵食品コーナー'}です。Browse で「${p.en}」を検索して Find in store を選んでください。`,en:`${name} is in ${zone?.en||'the chilled foods area'}. Search for "${p.en}" in Browse and use Find in store.`}[l]);
 }
 const repeated=next.requestedProductIds?.length===1&&next.requestedProductIds[0]===p.id;
 next.requestedProductIds=[p.id];next.pendingInspectionIds=[];next.inspectedIds=[];
 const status=require('./clerk-allergy-guidance.cjs').assess(p,memory.allergies).status;
 const restricted=status==='avoid_pending_check';
 return finish(repeated?{zh:`明白，你是要选${name}，不是继续查配料。它还没有加入购物篮；可以在 Browse 搜索“${p.en}”查看商品和位置。`,ja:`${name}を選びたいのですね。まだ買い物かごには追加されていません。Browse から商品と場所を確認できます。`,en:`Understood—you want ${name}, rather than another ingredient explanation. It has not been added to the basket; use Browse to view the item and location.`}[l]:{zh:`明白，你选的是${name}。${restricted?'现有名称或同类资料提示可能涉及你的过敏限制，需先核对具体包装。':'我会保留你的过敏限制；这款具体包装尚未核实，不能确认适合你食用。'}这只是记下你的选择，还没有加入购物篮。`,ja:`${name}を選びたいのですね。アレルギー条件は保持していますが、該当包装は未確認で適合は判断できません。買い物かごにはまだ追加されていません。`,en:`Understood, your choice is ${name}. Your allergy restriction remains; the exact package is unverified and suitability is not established. This records your choice; it has not been added to the basket.`}[l]);
}
module.exports={intent,namedProducts,reply};
