'use strict';
const allergenData=require('./clerk-allergens.cjs');
const names={mentaiko:{zh:'明太子',ja:'明太子',en:'mentaiko'},caffeine:{zh:'咖啡因',ja:'カフェイン',en:'caffeine'},soy:{zh:'大豆',ja:'大豆',en:'soy'},fish:{zh:'鱼类',ja:'魚',en:'fish'},egg:{zh:'鸡蛋',ja:'卵',en:'egg'},milk:{zh:'牛奶',ja:'乳',en:'milk'},peanut:{zh:'花生',ja:'落花生',en:'peanut'}};
// Vocabulary normalizes names only; it is not a list of allergy-specific conversation branches.
Object.assign(names,{wheat:{zh:'小麦',ja:'小麦',en:'wheat'},sesame:{zh:'芝麻',ja:'ごま',en:'sesame'},shrimp:{zh:'虾',ja:'えび',en:'shrimp'},crab:{zh:'蟹',ja:'かに',en:'crab'},walnut:{zh:'核桃',ja:'くるみ',en:'walnut'},buckwheat:{zh:'荞麦',ja:'そば',en:'buckwheat'}});
const vocabulary={mentaiko:['明太子','mentaiko'],caffeine:['咖啡因','caffeine','カフェイン'],soy:['大豆','豆浆','豆漿','soy','soybean','豆乳'],fish:['鱼','魚','鱼类','魚類','fish'],egg:['鸡蛋','雞蛋','蛋','egg','eggs','卵'],milk:['牛奶','乳','奶','milk'],peanut:['花生','peanut','peanuts','落花生'],wheat:['小麦','小麥','wheat'],sesame:['芝麻','sesame','ごま'],shrimp:['虾','蝦','shrimp','えび'],crab:['蟹','crab','かに'],walnut:['核桃','walnut','くるみ'],buckwheat:['荞麦','蕎麦','buckwheat','そば']};
// Name-based conservative flags do not broaden the customer's declared allergy in memory.
names.almond={zh:'杏仁',ja:'アーモンド',en:'almond'};vocabulary.almond=['杏仁','almond','almonds','アーモンド'];
const nameRiskTerms={fish:['salmon','tuna','mentaiko','roe','三文鱼','金枪鱼','明太子','鱼卵'],egg:['mayo','mayonnaise','蛋黄酱'],caffeine:['coffee','tea','cola','chocolate','cocoa','matcha','咖啡','茶','可乐','巧克力']};
function normalize(raw){const v=raw.trim().toLowerCase();return Object.entries(vocabulary).find(([key,aliases])=>key===v||aliases.some(a=>a.toLowerCase()===v))?.[0]||raw.trim();}
function declaration(text){
 if(/不是.*过敏|not.*allerg|アレルギーでは/i.test(text))return [];
 const match=text.match(/(?:我)?对([^，。！？,!?]{1,24}?)过敏|allergic to ([^,.!?]{1,30})|([^、。！？]{1,20})にアレルギー/i);
 if(!match)return [];
 const raw=(match[1]||match[2]||match[3]).trim();
 if(/^(?:它|这个|那款|it|this)$/i.test(raw))return [];
 return raw.split(/、|和|及|\band\b/i).map(t=>t.trim()).filter(Boolean).map(normalize);
}
function label(terms,l){return terms.filter(t=>t!=='unverified_allergy').map(t=>names[t]?.[l]||t).join(l==='zh'?'、':l==='ja'?'・':', ');}
function confirmation(memory,l){
 const target=label(memory.allergies,l);
 if(!target)return {zh:'我记下了你有过敏限制。具体是对哪种食材过敏？我先帮你排除对应款式，再查看其他商品的配料资料。',ja:'アレルギーがあるのですね。どの食材へのアレルギーか教えてください。',en:'I have noted an allergy restriction. Which ingredient are you allergic to?'}[l];
 return {zh:`我记下了你对${target}过敏，接下来不会把相关款式推荐给你。你还想找其他饭团，还是换个品类？具体商品的配料资料仍需核对。`,ja:`${target}へのアレルギーを覚えておきます。ほかのおにぎりと別の種類、どちらを調べましょうか。該当包装の原材料はまだ未確認です。`,en:`I have noted your allergy to ${target} and will avoid suggesting those items. Would you like to check other rice balls or another category? The exact package ingredients still need verification.`}[l];
}
function assess(p,terms){
 const text=[p.zh,p.en,p.ja].filter(Boolean).join(' ').toLowerCase(),info=p.allergenInfo||{};
 const normalized=terms.map(normalize);
 const named=normalized.filter(t=>{const aliases=[...(vocabulary[t]||[t]),...(nameRiskTerms[t]||[])];return info.nameIndicatedRisks?.map(normalize).includes(t)||aliases.some(a=>/^[a-z ]+$/i.test(a)?new RegExp('\\b'+a+'\\b','i').test(text):text.includes(a.toLowerCase()));});
 const listed=(info.reference?.listedAllergensJA||[]).map(normalize);
 const reference=normalized.filter(t=>listed.includes(t));
 const exact=(info.exactAllergens||[]).map(normalize),exactMatches=normalized.filter(t=>exact.includes(t));
 const possible=(p.ingredientInfo?.profile?.possibleRiskTerms||[]).concat(p.ingredientInfo?.nameClueRiskTerms||[]).map(normalize);
 const ingredientReference=normalized.filter(t=>possible.includes(t));
 if(info.verificationStatus==='not_food')return {status:'not_food',reasons:[]};
 if(named.length||reference.length||exactMatches.length||ingredientReference.length)return {status:'avoid_pending_check',reasons:[...new Set([...named,...reference,...exactMatches,...ingredientReference])],evidence:{name:named,analogousLabel:reference,exactLabel:exactMatches,ingredientReference}};
 // Absence from a name or partial reference is never classified as allergy-safe.
 return {status:'needs_verification',reasons:[],exactPackageVerified:info.verificationStatus==='exact_variant_verified'};
}
function candidates(catalog,memory,input,plan){
 const rice=/明太子|饭团|飯糰|おにぎり|mentaiko|rice ball|onigiri/i.test(input.message+' '+memory.summary)||plan.queries?.some(q=>/rice ball|onigiri/i.test(q));
 let pool=catalog.products.filter(p=>!['daily','checkout_legacy','checkout_impulse'].includes(p.zone)&&assess(p,memory.allergies).status==='needs_verification'&&!require('./clerk-policy.cjs').excluded(p,memory.exclusions||[]));
 if(rice)pool=pool.filter(p=>/rice ball|onigiri/i.test(p.en));
 if(/换|别的口味|其他口味|别重复|different|another flavor|別の/i.test(input.message)){
  const previous=[...(memory.pendingInspectionIds||[]),...(memory.inspectedIds||[]),...(memory.requestedProductIds||[])];
  pool=pool.filter(p=>!previous.includes(p.id));
 }
 // Present varied ingredient-label checks before names already flagging other common risks.
 pool.sort((a,b)=>(a.allergenInfo?.nameIndicatedRisks?.length||0)-(b.allergenInfo?.nameIndicatedRisks?.length||0));
 return pool.slice(0,12);
}
async function alternatives({input,catalog,memory,plan,l,call}){
 const pool=candidates(catalog,memory,input,plan),target=label(memory.allergies,l);
 const r=await call([{role:'system',content:`Help this convenience-store visitor with their SPECIFIC allergy and request in ${l}. Return JSON {"message":"a natural concise reply","inspectionIds":["up to two exact IDs"]}. These are ONLY products whose labels the visitor could inspect, NEVER products confirmed suitable to eat. Acknowledge ${target||'the unspecified allergy'}; do not infer a broader allergy or say other fish are safe. Exclude named allergy items. Do not repeat a blanket refusal. If the allergy is unspecified ask what ingredient, with inspectionIds []. Otherwise choose at most two supplied items as examples to CHECK, mention their exact names and clearly say exact ingredients remain unverified and suitability is NOT confirmed. Briefly invite the user to pick a label to inspect. Never say free of the allergen, safe, suitable, can eat, reassure, invent ingredients, preparation, cross-contact or purchase actions. Do not infer absence from an official partial list or a name. No product recommendations, medical diagnosis, treatments or prices. Ordinary allergy declaration is not an emergency report. Do not expose IDs. In Chinese replies use Chinese words throughout except the supplied exact product brand; never write English technical words such as suitability, cross-contact or unverified. Be conversational: acknowledge the specific request once, give concrete label-check options, then one short clear limitation. Latest request: ${input.message}\nMemory: ${JSON.stringify(memory)}\nLABEL RECORDS: ${JSON.stringify(pool.map(p=>({id:p.id,name:p[l]||p.en,facts:allergenData.facts(p,l)})))}`},...input.history,{role:'user',content:input.message}]);
 const error=(reason='allergy_structure')=>{throw Object.assign(Error('invalid_allergy_guidance'),{code:'invalid_model_response',validationIssues:[reason]});};
 if(l==='zh'&&typeof r?.message==='string')r.message=r.message.replace(/\bsuitability\b/gi,'食用适用性').replace(/\bcross-contact\b/gi,'交叉接触').replace(/\bunverified\b/gi,'未核实');
 if(r&&typeof r.message==='string'&&!Array.isArray(r.inspectionIds))r.inspectionIds=pool.filter(p=>r.message.includes(p[l]||p.en)).map(p=>p.id);
 if(typeof r?.message!=='string'||!r.message.trim()||r.message.length>1500||!Array.isArray(r.inspectionIds)||r.inspectionIds.length>2||new Set(r.inspectionIds).size!==r.inspectionIds.length||r.inspectionIds.some(id=>!pool.some(p=>p.id===id)))error();
 if(r.inspectionIds.some(id=>!r.message.includes(pool.find(p=>p.id===id)[l]||pool.find(p=>p.id===id).en)))error('allergy_name_mismatch');
 const claims=r.message.replace(/(?:不能|无法|未能)(?:保证|确认)[^，,;；。.!！]*|(?:cannot|can't) (?:confirm|guarantee)[^,;.!]*|安全とは(?:確認|判断)できません/gi,'');
 if(/放心|安全|可以吃|能吃|适合你|不含|无过敏|没有.*(?:明太子|鱼卵|过敏原)|safe|allergen.free|free of|you can eat|suitable for you|食べられ|安心/i.test(claims))error('allergy_unsupported_assurance');
 // A full unselected catalog name must not become an implicit extra suggestion.
 const allowed=r.inspectionIds.map(id=>pool.find(p=>p.id===id));
 if(l==='zh'&&/[A-Za-z]{3,}/.test(allowed.reduce((s,p)=>s.split(p.zh||p.en).join(''),r.message)))error('allergy_language');
 for(const p of catalog.products){const name=p[l]||p.en;if(name.length>=4&&r.message.includes(name)&&!allowed.some(a=>(a[l]||a.en).includes(name)))error('allergy_unlisted_name');}
 // Packaging verification is a catalog fact, not something the model must phrase
 // with one of a handful of exact words. Validate safety/names first; then supply
 // the missing boundary without fabricating recommendations or making another call.
 const hasNotice=/未核实|未核對|未确认|未確認|尚未核查|还未核对|仍需核对|有待核实|unverified|not (?:yet )?(?:verified|confirmed)|未確認/i.test(r.message);
 const notice={zh:'这些选项仅供查看配料标签；具体包装和交叉接触尚未核实，不能确认适合你食用。',ja:'これらは原材料表示を確認するための候補です。該当包装と交差接触は未確認で、アレルギーへの適合は判断できません。',en:'These options are for ingredient-label inspection only. The exact package and cross-contact remain unverified; suitability for your allergy is not established.'}[l];
 return {message:r.message.trim()+(hasNotice?'':' '+notice),inspectionIds:r.inspectionIds,verificationNoticeAdded:!hasNotice};
}
module.exports={declaration,label,confirmation,alternatives,candidates,assess,normalize};
