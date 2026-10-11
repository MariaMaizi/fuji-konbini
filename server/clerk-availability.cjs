'use strict';
// Catalog inclusion is evidence of a modeled item, not live stock or permission to eat it.
const categories=[
 {zh:'大米',en:'uncooked rice',ja:'生米',request:/^(?:大米|生米|米|袋装大米|uncooked rice|rice|生米|お米)$/i,match:/^(?:大米|生米|米|袋装大米|uncooked rice|rice|生米|お米)$/i},
 {zh:'酱油',en:'soy sauce',ja:'醤油',request:/^(?:酱油|醬油|soy sauce|醤油|しょうゆ)$/i,match:/^(?:酱油|醬油|soy sauce|醤油|しょうゆ)$/i},
 {zh:'啤酒',en:'beer',ja:'ビール',request:/啤酒|\bbeer\b|ビール/i,match:/啤酒|\bbeer\b|ビール/i},
 {zh:'葡萄酒',en:'wine',ja:'ワイン',request:/葡萄酒|红酒|白葡萄酒|\bwine\b|ワイン/i,match:/葡萄酒|红酒|\bwine\b|ワイン/i},
 {zh:'清酒',en:'sake',ja:'日本酒',request:/清酒|日本酒|\bsake\b/i,match:/清酒|日本酒|\bsake\b/i},
 {zh:'酒类',en:'alcoholic drinks',ja:'お酒',request:/^(?:酒|酒类|お酒|alcohol|alcoholic drinks?|liquor)$/i,match:/啤酒|葡萄酒|清酒|日本酒|\bbeer\b|\bwine\b|\bsake\b|alcoholic|liquor|ビール|ワイン/i},
 {zh:'果汁',en:'juice',ja:'ジュース',request:/果汁|\bjuice\b|ジュース/i,match:/果汁|\bjuice\b|ジュース/i},
 {zh:'饭团',en:'rice balls',ja:'おにぎり',request:/饭团|飯糰|rice balls?|onigiri|おにぎり/i,match:/饭团|飯糰|rice ball|onigiri|おにぎり/i},
 {zh:'牛奶',en:'milk',ja:'牛乳',request:/牛奶|\bmilk\b|牛乳/i,match:/牛奶|\bmilk\b|牛乳/i}
];
function isQuestion(text){return /有没有|有.{0,24}(?:卖|售|吗|嗎)|卖不卖|是否.{0,12}(?:卖|有)|do you (?:have|sell)|is there|available|売って|ありますか/i.test(text);}
function targetOf(text){
 // Only simple product existence questions. Price/diet/location constraints use the normal planner.
 if(/预算|以内|以下|多少钱|哪里|在哪|不含|过敏|allerg|under\s*\d|without/i.test(text))return null;
 const zh=text.match(/(?:有没有|卖不卖|是否有|有)([^，,。！？?]{1,40}?)(?:卖吗|售吗|吗|嗎|卖|售|[？?]|$)/);
 const en=text.match(/(?:do you (?:have|sell)|is there)\s+(?:any\s+|some\s+)?(.+?)(?:\s+(?:here|available))?[?.!]*$/i);
 const ja=text.match(/^(.+?)(?:は|が)?(?:ありますか|売っていますか)[？?。]*$/);
 const target=(zh?.[1]||en?.[1]||ja?.[1]||'').replace(/(?:这里|这儿|在这里|这里卖的|有售|出售|卖的)$/,'').trim();
 return !target||/东西|吃的|喝的|推荐|适合|其他|别的|something|anything/i.test(target)?null:target;
}
function reply(input,catalog,memory){
 if(!isQuestion(input.message)||/过敏|過敏|allerg|アレルギー/i.test(input.message))return null;
 let target=targetOf(input.message);if(!target)return null;
 if(/和|以及|或者|还是|\band\b|\bor\b|不太|无糖|低糖|少糖|脱脂|热的|冰的|便宜/i.test(target))return null;
 if(/^(?:这个|这款|那个|它|this|that|it|これ)$/i.test(target)){
  const ids=memory.requestedProductIds?.length?memory.requestedProductIds:memory.currentIds?.length?memory.currentIds:memory.inspectedIds||[];
  if(ids.length!==1)return {message:input.language==='en'?'Which item do you mean?':input.language==='ja'?'どの商品ですか？':'你指的是哪件商品？告诉我名称，我帮你查目录。',productIds:[],cardTitle:'Catalog',language:input.language==='auto'?'zh':input.language,context:input.state?.context||'afternoon',size:input.state?.size||'light',dietaryCaution:!!memory.allergies?.length,source:'catalog',sessionMemory:structuredClone(memory)};
  const p=catalog.products.find(p=>p.id===ids[0]);if(!p)return null;target=p.en;
 }
 const key=s=>s?.toLowerCase().trim();
 const names=catalog.products.filter(p=>[p.zh,p.en,p.ja,...(p.searchAliases||[])].some(name=>key(name)===key(target)));
 const category=categories.find(c=>c.request.test(target));
 const zone=catalog.zones?.find(z=>[z.zh,z.en,z.ja].some(name=>key(name)===key(target)));
 const l=input.language&&input.language!=='auto'?input.language:/[ぁ-んァ-ヶ]/u.test(input.message)?'ja':/[\u3400-\u9fff]/u.test(input.message)?'zh':'en';
 const matches=names.length?names:zone?catalog.products.filter(p=>p.zone===zone.id):category?catalog.products.filter(p=>p.allergenInfo?.verificationStatus!=='not_food'&&[p.zh,p.en,p.ja].some(name=>name&&category.match.test(name))):[];
 const label=names.length?[...new Set(names.map(p=>p[l]||p.en))].join('、'):category?.[l]||target;
 const list=[...new Set(matches.map(p=>p[l]||p.en))].slice(0,3).join(l==='en'?', ':'、');
 const message=matches.length?{zh:`当前项目目录收录了${label}，例如${list}。可以在 Browse 查看商品；实际库存还需向店员确认。`,en:`The project catalog includes ${label}, for example ${list}. You can view them in Browse; live stock still needs confirmation.`,ja:`プロジェクトの商品一覧には${label}があり、${list}などを確認できます。実際の在庫は店員への確認が必要です。`}[l]:{zh:`当前项目目录没有收录${label}，所以我无法确认这里有售。`,en:`The project catalog does not list ${label}, so I cannot confirm they are sold here.`,ja:`プロジェクトの商品一覧に${label}は登録されていないため、販売しているか確認できません。`}[l];
 const next=structuredClone(memory);next.currentIds=[];next.requestedProductIds=[];next.pendingInspectionIds=[];next.inspectedIds=names.map(p=>p.id).slice(0,3);next.purchaseTarget=null;next.purchaseTemperature=null;next.purchaseKind=null;next.summary=`Catalog availability question: ${label}`;
 return {message,productIds:[],cardTitle:'Catalog',language:l,context:input.state?.context||'afternoon',size:input.state?.size||'light',dietaryCaution:!!next.allergies?.length,source:'catalog',sessionMemory:next};
}
module.exports={reply,isQuestion,targetOf};
