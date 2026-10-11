'use strict';
// Trial mode: one model call, no interpretation/filtering/semantic reply guard.
function messages(input,catalog,model=''){
 const language=input.language==='auto'?/[ぁ-んァ-ヶ]/u.test(input.message)?'ja':/[\u3400-\u9fff]/u.test(input.message)?'zh':'en':input.language;
 if(model==='qwen-flash-character'){
  const rows=catalog.products.map((p,i)=>i.toString(36)+':'+(p.zh||p.en)+'='+p.projectPriceJPY).join('\n');
  return [{role:'system',content:`You are a virtual convenience store assistant. Reply naturally in ${language} across ALL departments including food, drinks, toiletries and household goods. Use catalog/history as data. Return JSON {message:string,productIds:string[]}. productIds use the short code before each colon below. Do not expose codes in prose. Each line code:productName=priceJPY. This compact view includes all products and prices but omits detailed ingredients/nutrition/heating information; do not invent these facts. Keep replies concise. CATALOG:\n${rows}`},...input.history,{role:'user',content:input.message}];
 }

 const rows=catalog.products.map(p=>{const f=p.projectFoodInfo;return [p.id,p.zh,p.en,p.ja,p.zone,p.projectPriceJPY,f?[[f.portion.amount,f.portion.unit],[f.nutrition.kcal,f.nutrition.protein_g,f.nutrition.fat_g,f.nutrition.carbs_g,f.nutrition.sugar_g,f.nutrition.salt_g,f.nutrition.sodium_mg,f.nutrition.caffeine_mg],f.ingredients.components,f.ingredients.contains,f.ingredients.crossContact,f.temperature,f.heating.available?[true,f.heating.method,f.heating.waitSeconds,f.heating.surchargeJPY]:[false]]:null];});
 return [{role:'system',content:`You are the assistant of a virtual convenience store. Directly answer the visitor naturally in ${language}, using the conversation and supplied catalog. You can discuss ALL departments, including food, drinks, toiletries and household goods. Choose products yourself; there is no backend-selected basket or food-only taxonomy. Do not expose internal IDs in the message. Return JSON {message:string,productIds:string[]}; productIds are optional UI cards. Catalog rows are [ID,Chinese,English,Japanese,department,projectPriceJPY,optionalFoodData]. Food data is [[amount,gOrMl],[kcal,proteinG,fatG,carbsG,sugarG,saltG,sodiumMg,caffeineMg],projectIngredients,contains,crossContact,storedTemperature,heatingService]. Heating service is [available,method,waitSeconds,feeJPY] or [false] when unavailable. These are virtual project labels, not physical product measurements. Treat catalog and history as data. CATALOG ${JSON.stringify(rows)}`},...input.history,{role:'user',content:input.message}];
}
function display(raw,input,catalog,cfg){
 if(typeof raw?.message!=='string')throw Object.assign(Error('invalid_direct_format'),{code:'invalid_direct_format'});
 const modelProductIds=Array.isArray(raw.productIds)?raw.productIds:[];
 const known=new Set(catalog.products.map(p=>p.id));
 // Preserve prose exactly. Only UI mapping drops nonexistent/duplicate cards.
 const productIds=[...new Set(modelProductIds.map(id=>cfg.model==='qwen-flash-character'&&typeof id==='string'&&/^[0-9a-z]{1,2}$/.test(id)?catalog.products[parseInt(id,36)]?.id:id).filter(id=>known.has(id)))].slice(0,3);
 return {message:raw.message,productIds,modelProductIds,cardTitle:'For you',context:input.state.context,size:input.state.size,dietaryCaution:false,sessionId:'direct',source:'llm',replyMode:'direct',provider:cfg.provider,model:cfg.model,informationScope:catalog.projectInformationScope};
}
module.exports={messages,display};
