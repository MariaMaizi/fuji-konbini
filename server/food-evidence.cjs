'use strict';
// Verify typed patch provenance. Unit/number checks validate facts, not user-intent keyword routing.
function verify(plan,input,previous,memory){
 const r=memory.requirements,pending=[],events=[],evidence=plan.evidence||{};
 for(const [field,value] of Object.entries(plan.patch)){
  const old=previous.requirements[field],quote=evidence[field]||plan.corrections.find(c=>c.field===field)?.evidence;
  if(JSON.stringify(value)===JSON.stringify(old))continue;
  const supported=typeof quote==='string'&&quote.trim()&&input.message.includes(quote);
  if(!supported&&['goals','states','scenes','taste','slots','preferredCategories'].includes(field)){events.push({field,status:'model_inferred_not_quote_verified',before:old,after:value,quote:null});continue;}
  if(!supported){r[field]=structuredClone(old===undefined?[]:old);pending.push({field,reason:'missing_change_evidence'});events.push({field,status:'unresolved',before:old,proposed:value,quote:null});continue;}
  if(field==='avoid'&&value.some(v=>!old.includes(v))&&!/(?:不|没|別|别|避|不能|苦手|なし|ない|\bno\b|\bnot\b|\bwithout\b|\bavoid\b|\bexclude\b|don't)/i.test(quote)){
   r[field]=structuredClone(old);pending.push({field,reason:'exclusion_polarity_not_supported'});events.push({field,status:'unresolved',proposed:value,quote});continue;
  }
  if(field==='budget'&&value!==null){
   const numbers=[...quote.matchAll(/\d+(?:\.\d+)?/g)].map(m=>Number(m[0]));
   if(!numbers.includes(value.amount)){r.budget=structuredClone(old);pending.push({field,reason:'amount_not_in_evidence'});continue;}
   const explicit=/日元|円|\bJPY\b|\byen\b/i.test(quote)?'JPY':/人民币|人民幣|\bRMB\b|\bCNY\b/i.test(quote)?'CNY':/美元|\bUSD\b/i.test(quote)?'USD':null;
   const currency=explicit||(old&&old.currency!=='UNKNOWN'?old.currency:'UNKNOWN');
   r.budget={amount:value.amount,currency};
   events.push({field,status:explicit?'explicit':'currency_unresolved_or_inherited',before:old,after:r.budget,quote});
  }else if(field==='nutritionLimits'){
   const numbers=[...quote.matchAll(/\d+(?:\.\d+)?/g)].map(m=>Number(m[0]));
   if(Object.values(value).flatMap(b=>Object.values(b)).some(v=>!numbers.includes(v))){r[field]=structuredClone(old);pending.push({field,reason:'numeric_bound_not_in_evidence'});events.push({field,status:'unresolved',proposed:value,quote});continue;}
   events.push({field,status:'quote_verified_semantics_model_inferred',before:old,after:r[field],quote});
  }else events.push({field,status:'quote_verified_semantics_model_inferred',before:old,after:r[field],quote});
 }
 return {pending,events};
}
module.exports={verify};
