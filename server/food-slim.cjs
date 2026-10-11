'use strict';
// One model call: joint interpretation, selection and natural explanation.
// The guard never rewrites prose or chooses an alternative product.
const food=require('./food-agent.cjs');
const fields=['budget','temperature','noFried','avoid','allergies','diet','goals','taste','slots','preferredCategories','nutritionLimits','states'];
function blankMemory(){const m=food.blankMemory();m.requirements.slots=[];return {...m,revision:'slim-v56'};}
function fact(p){
 const f=food.facts(p),i=f.ingredientReference;
 return {id:f.id,names:f.names,category:f.category,roles:f.mealRoles,priceJPY:f.priceJPY,priceBasis:f.priceBasis,
 temperature:f.temperature,preparation:f.preparation,tags:f.tags,taste:f.taste,portion:f.portion,
 ingredients:f.projectIngredients?{...f.projectIngredients,scope:f.informationScope,sources:f.projectSources}:{exact:i?.exactIngredients||null,reference:i?.profile?.components?.zh||[],nameClues:i?.nameClues?.zh||[],verified:f.exactPackageVerified,sources:i?.sources||[]},
 nutrition:f.nutrition,nutritionBasis:f.nutritionBasis,informationScope:f.informationScope,servingTemperatures:f.servingTemperatures,heating:f.heating,dietary:f.dietary,location:f.location,stock:f.stock,
 evidence:{category:'scene_category_or_name',price:'reference_or_category_estimate',temperature:f.temperature===null?'unknown':'scene_service_or_chilled_zone',taste:f.projectIngredients?'project_label':'unknown',portion:f.projectIngredients?'project_label':'unknown',nutrition:f.projectIngredients?'project_label':'unknown',ingredients:i?.exactPackageVerified?'verified_package':'common_type_or_analogous_reference'}};
}
function prompt(input,catalog,memory,{direct=false}={}){
 const facts=catalog.products.map(fact);
 return `You are a convenience-store food consultation and shopping assistant. Answer naturally and concisely in the user's language. Use the supplied real catalog and conversation. Select at most 3 real IDs yourself. Explain why the actual selected items suit the request. No external keyword routing, preselected basket or rewritten reply.
 Catalog prices are project/reference JPY. Values with informationScope=project_virtual_store are authorized virtual-store labels: use their numerical nutrition, ingredient portions, allergens, caffeine, taste and warming service for recommendations, comparisons and exclusions within the project. Do not demand nonexistent physical packaging to answer project questions. A heating.available item can be served hot via the specified service, not directly microwaved in a sealed container. Unknown real-world values remain unknown. Catalog absence means not recorded. Consultation does not require a recommendation. Distinguish uncertainty in user intent (ask a minimal question) from missing catalog evidence. Cold feeling alone: ask drink versus food and record guessed temperature as certainty=inferred. Independent preferences persist unless explicitly changed. Do not invent numerical user thresholds. For ambiguous 元/块 currency ask. Mention numerical user targets without pretending those are product values.
 Return JSON {message:string,productIds:string[],intent:string,changes:[{field:string,value:any,evidence:string,certainty:"explicit"|"inferred"}],claims:[{id:string,field:"priceJPY"|"temperature"|"preparation"|"stock"|"kcal"|"protein_g"|"sugar_g",value:any}]}.
 ${direct?'BASELINE: changes must be []; use only conversation history, no external memory.':'MEMORY '+JSON.stringify(memory.requirements)+'. changes are only fields changed in the latest message. Every change needs an exact quote from the latest message. Allowed fields '+JSON.stringify(fields)+'. Arrays replace only that field. Omitted fields persist. budget={amount,currency}; nutritionLimits={nutrient:{min?,max?}}; temperature=any/hot/cold/ambient; diet=any/vegetarian/vegan/halal. Use preferredCategories for positive categories, avoid for excluded categories/tags/names; roles main/drink/side/dessert/snack. State evidence verifies provenance, not semantic certainty.'}
 intent MUST be exactly one of recommend/modify/select/availability/details/compare/price/locate/clarify/acknowledge/out_of_scope. No descriptive sentences in intent. Null in a claim means unknown, never an assertion. Omit unchanged fields rather than repeating old evidence. Allergy is allergies, not just avoid. Store requested meal roles in slots and positive coffee preference in preferredCategories, not taste. Make explicit numerical nutrition requests nutritionLimits, never omit them. If a requested exact nutrient is unknown, give no edible recommendation. Include all factual claims about product prices, temperature and numeric nutrition in claims. No claims for user targets. For a recommendation, mention every chosen item by its supplied name; never recommend unselected items in prose. A clarification/unknown-data answer may have no IDs. Never claim an executed purchase.
 CATALOG ${JSON.stringify(facts)}`;
}
function error(issues,raw,memory){const e=Error('slim_validation_failed');e.code='slim_validation_failed';e.validationIssues=issues.map(i=>i.code);e.foodEvaluation={version:56,stage:'minimal_guard',issues,rawAnswer:raw,requirements:memory.requirements};return e;}
function update(raw,input,previous){
 const m=structuredClone(previous?.requirements?previous:blankMemory()),issues=[],events=[];
 if(!Array.isArray(raw.changes)||raw.changes.length>fields.length)return {memory:m,issues:[{code:'changes_schema',kind:'schema'}],events};
 const seen=new Set();
 for(const change of raw.changes){
  const {field,value,evidence}=change||{};
  // Repeated unchanged values cannot alter state. Old provenance on these is harmless.
  if(fields.includes(field)&&JSON.stringify(value)===JSON.stringify(m.requirements[field]))continue;
 if(!fields.includes(field)||seen.has(field)||typeof evidence!=='string'||!evidence.trim()||!input.message.includes(evidence)){issues.push({code:'change_evidence',kind:'state',field,classification:'internal_contract'});continue;}seen.add(field);
  let valid=true,v=value;
  if(field==='budget'){
   valid=value===null||value&&Number.isFinite(value.amount)&&value.amount>=0&&[...evidence.matchAll(/\d+(?:\.\d+)?/g)].some(n=>Number(n[0])===value.amount);
   if(valid&&value){const unit=/日元|円|\bJPY\b|\byen\b/i.test(evidence)?'JPY':/人民币|人民幣|\bCNY\b|\bRMB\b/i.test(evidence)?'CNY':/美元|\bUSD\b/i.test(evidence)?'USD':m.requirements.budget?.currency||'UNKNOWN';v={amount:value.amount,currency:unit};}
  }else if(['avoid','allergies','goals','taste','slots','preferredCategories','states'].includes(field)){
   valid=Array.isArray(value)&&value.length<=12&&value.every(x=>typeof x==='string'&&x.length>0&&x.length<120);
   if(valid&&field==='avoid'&&value.some(x=>!m.requirements.avoid.includes(x))&&!/(?:不|别|避|なし|ない|\bno\b|\bnot\b|\bwithout\b|\bavoid\b|don't)/i.test(evidence))valid=false;
   if(valid&&field==='slots')valid=value.every(x=>food.schema.slots.includes(x));
  }else if(field==='temperature')valid=['any','hot','cold','ambient'].includes(value);
  else if(field==='noFried')valid=typeof value==='boolean';
  else if(field==='diet')valid=['any','vegetarian','vegan','halal'].includes(value);
  else if(field==='nutritionLimits'){
   const nums=[...evidence.matchAll(/\d+(?:\.\d+)?/g)].map(n=>Number(n[0]));
   valid=value&&typeof value==='object'&&!Array.isArray(value)&&Object.entries(value).every(([k,b])=>food.schema.patch&&['kcal','protein_g','sugar_g','fat_g','sodium_mg','carbs_g','salt_g','caffeine_mg'].includes(k)&&b&&typeof b==='object'&&!Array.isArray(b)&&Object.keys(b).every(k=>['min','max'].includes(k))&&Object.values(b).every(n=>Number.isFinite(n)&&n>=0&&nums.includes(n)));
  }
 if(!valid){issues.push({code:'invalid_change',kind:'state',field,classification:'internal_contract'});continue;}
  events.push({field,before:m.requirements[field],after:v,evidence,status:'quote_present_semantics_model_inferred'});m.requirements[field]=structuredClone(v);
 }
 return {memory:m,issues,events};
}
function guard(raw,input,catalog,memory){
 const issues=[],warnings=[],all=catalog.products.map(food.facts),byId=new Map(all.map(p=>[p.id,p])),r=memory.requirements;
 if(typeof raw.message!=='string'||!raw.message.trim()||raw.message.length>2000||!Array.isArray(raw.productIds)||raw.productIds.length>3||new Set(raw.productIds).size!==raw.productIds.length)return {issues:[{code:'reply_schema',kind:'schema'}],warnings,totalJPY:null};
 const selected=raw.productIds.map(id=>byId.get(id));
 if(selected.some(p=>!p))return {issues:[{code:'unknown_product',kind:'catalog'}],warnings,totalJPY:null};
 // Free-text/variant intent labels must never disable constraint checking.
 const purchasing=!['availability','details','compare','price','locate','clarify','acknowledge','out_of_scope','query','information'].includes(raw.intent);
 if(purchasing){
  for(const p of selected)for(const code of food.eligibility(p,{...r,nutritionLimits:r.nutritionLimits||{}}))issues.push({code,kind:'constraint',id:p.id,classification:require('./food-information.cjs').classify(code)});
  if(selected.length&&r.budget&&r.budget.currency!=='JPY')issues.push({code:'currency_unconfirmed',kind:'constraint'});
  if(selected.length&&r.slots.length===1&&selected.some(p=>!p.mealRoles.includes(r.slots[0])))issues.push({code:'role_mismatch',kind:'constraint'});
 }
 const totalJPY=selected.length&&selected.every(p=>Number.isFinite(p.priceJPY))?selected.reduce((s,p)=>s+p.priceJPY,0):null;
 if(purchasing&&totalJPY!==null&&r.budget?.currency==='JPY'&&totalJPY>r.budget.amount)issues.push({code:'budget_exceeded',kind:'constraint',actual:totalJPY,limit:r.budget.amount});
 if(!Array.isArray(raw.claims))issues.push({code:'claims_schema',kind:'schema'});
 else for(const c of raw.claims){const p=byId.get(c?.id),knownField=['priceJPY','temperature','preparation','stock','kcal','protein_g','sugar_g','fat_g','sodium_mg','carbs_g','salt_g','caffeine_mg'].includes(c?.field);const actual=p&&(Object.hasOwn(p.nutrition,c.field)?p.nutrition[c.field]:p[c.field]);if(!p||!knownField||c.value!==null&&(actual==null||JSON.stringify(actual)!==JSON.stringify(c.value)&&!(c.field==='temperature'&&c.value==='hot'&&r.temperature==='hot'&&p.heating?.available)))issues.push({code:'unsupported_claim',kind:'fact',claim:c});}
 if(/这里不售卖|这里不出售|已售罄|已经卖完|没有库存/.test(raw.message))issues.push({code:'unsupported_stock_statement',kind:'fact'});
 if(/可以放心吃|适合过敏者食用|保证.{0,8}(?:安全|减肥|增肌)/.test(raw.message))issues.push({code:'unsupported_safety_statement',kind:'fact'});
 // These are review signals, not automatic rejection: quoted limits, negation and
 // consultation can resemble a positive assertion. No broad prose regex blocks them.
 if(/\d+\s*(?:千卡|kcal|克蛋白)|无糖|低糖|售罄|放心吃/.test(raw.message))warnings.push({code:'prose_fact_review',kind:'review'});
 const l=input.language==='auto'?/[ぁ-んァ-ヶ]/u.test(input.message)?'ja':/[\u3400-\u9fff]/u.test(input.message)?'zh':'en':input.language;
 if(purchasing)for(const p of selected)if(!raw.message.includes(p.names[l]||p.names.en))warnings.push({code:'selected_name_review',kind:'review',id:p.id});
 return {issues,warnings,totalJPY};
}
async function orchestrate({input,catalog,memory,call,onRequirements}){
 const previous=memory?.requirements?memory:blankMemory();
 const raw=await call([{role:'system',content:prompt(input,catalog,previous)},...input.history,{role:'user',content:input.message}]);
 const u=update(raw,input,previous);
 const plan={intent:raw.intent,patch:Object.fromEntries(u.events.map(c=>[c.field,c.after])),evidence:Object.fromEntries((raw.changes||[]).filter(Boolean).map(c=>[c.field,c.evidence])),certainty:Object.fromEntries((raw.changes||[]).filter(Boolean).map(c=>[c.field,c.certainty]))};
 require('./food-information.cjs').recordNeeds(u.memory,previous,plan,input);
 onRequirements?.(u.memory.requirements,{revision:'slim-v57',information:u.memory.information,requirementEvents:[...(previous.requirementEvents||[]),...u.events].slice(-60)});
 const result=guard(raw,input,catalog,u.memory),issues=[...u.issues,...result.issues];if(issues.length)throw error(issues,raw,u.memory);
 u.memory.currentIds=raw.productIds;u.memory.requirementEvents=[...(previous.requirementEvents||[]),...u.events].slice(-60);
 require('./food-information.cjs').sent(u.memory,{message:raw.message,productIds:raw.productIds},input);
 return {message:raw.message.trim(),productIds:raw.productIds,cardTitle:'For you',context:input.state.context,size:input.state.size,language:input.language,dietaryCaution:(u.memory.requirements.allergies.length>0||u.memory.requirements.diet!=='any')&&catalog.projectInformationScope!=='project_virtual_store',source:'llm',projectTotalJPY:result.totalJPY,informationScope:catalog.projectInformationScope,sessionMemory:u.memory,
 foodEvaluation:{version:56,variant:'slim',requirements:u.memory.requirements,events:u.events,warnings:result.warnings,intent:raw.intent}};
}
module.exports={blankMemory,fact,prompt,update,guard,orchestrate};
