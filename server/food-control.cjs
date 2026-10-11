'use strict';
// Decisions are driven by typed task state and catalog evidence, never input keyword routes.
function assess({plan,memory,previous,all,planned}){
 const r=memory.requirements,uncertainties=[],conflicts=[];
 // A typed drink query can carry a preference even if the model omitted the soft patch.
 if(!Object.hasOwn(plan.patch,'preferredCategories')){
  const specific=plan.queries.filter(q=>q.category&&!['drink','side','other','nonfood'].includes(q.category)&&q.slot&&!q.ids.length&&!r.avoid.includes(q.category));
  if(specific.length){const changingRoles=specific.map(q=>q.slot);r.preferredCategories=[...new Set([...(r.preferredCategories||[]).filter(c=>!all.some(p=>p.category===c&&p.mealRoles.some(role=>changingRoles.includes(role)))),...specific.map(q=>q.category)])];}
 }
 if(!Object.hasOwn(plan.patch,'slots')&&plan.queries.length&&plan.queries.every(q=>q.slot==='drink'))r.slots=['drink'];
 // An explicit new exclusion takes precedence over the older soft preference.
 if(Object.hasOwn(plan.patch,'avoid')&&plan.corrections.some(c=>c.field==='avoid'))r.preferredCategories=(r.preferredCategories||[]).filter(c=>!r.avoid.includes(c));
 const decision={action:'recommend',uncertainties,conflicts,question:null,blockSelection:false,evidence:[],stateDelta:[]};
 for(const [field,value] of Object.entries(plan.patch))decision.stateDelta.push({field,before:previous.requirements[field],after:value,source:'model_patch',evidence:plan.corrections.find(c=>c.field===field)?.evidence||null});
 if(!['recommend','select','modify','clarify'].includes(plan.intent)){decision.action='consultation';return decision;}
 if(r.budget&&r.budget.currency!=='JPY')uncertainties.push({kind:'user_information',field:'budget.currency',reason:'currency_not_usable_in_JPY_catalog'});
 for(const item of plan.uncertainties||[])uncertainties.push({...item,kind:'user_information'});
 for(const [field,old] of Object.entries(previous.requirements)){
  if(!Object.hasOwn(plan.patch,field)||plan.corrections.some(c=>c.field===field))continue;
  const next=r[field];
  const drops=Array.isArray(old)&&['goals','taste','avoid','allergies'].includes(field)&&old.some(v=>!next.includes(v))||field==='noFried'&&old===true&&next===false||field==='nutritionLimits'&&Object.keys(old).some(k=>!Object.hasOwn(next,k));
  if(drops){r[field]=structuredClone(old);uncertainties.push({kind:'user_information',field,reason:'unconfirmed_constraint_removal'});}
 }
 for(const preferred of r.preferredCategories||[])if(r.avoid.includes(preferred))conflicts.push({field:'preferredCategories',reason:'preference_is_excluded',value:preferred});
 for(const [key,bound] of Object.entries(r.nutritionLimits))if(bound.min!==undefined&&bound.max!==undefined&&bound.min>bound.max)conflicts.push({field:'nutritionLimits.'+key,reason:'inverted_range'});
 if(r.slots.length>r.maxItems)conflicts.push({field:'slots',reason:'roles_exceed_item_limit'});
 if(plan.clarification)uncertainties.push({kind:'user_information',field:'intent',reason:'parser_requested_clarification'});
 if(memory.information?.hypotheses?.temperature?.status==='pending_confirmation'&&!previous.currentIds.length&&!memory.information.needs.slots&&!plan.queries.some(q=>q.slot||q.ids.length))uncertainties.push({kind:'user_information',field:'slots',reason:'temperature_is_unconfirmed_hypothesis'});
 if(r.states.some(s=>['cold','hot'].includes(s))&&!previous.currentIds.length&&!Object.hasOwn(plan.patch,'slots')&&!Object.hasOwn(plan.patch,'temperature')&&!plan.queries.some(q=>q.ids.length))uncertainties.push({kind:'user_information',field:'slots',reason:'state_does_not_identify_food_or_drink'});
 const applicable=all.filter(p=>p.category!=='nonfood'&&(r.slots.some(s=>p.mealRoles.includes(s))));
 for(const goal of r.goals){const nutrient={sugar_control:'sugar_g',low_salt:'sodium_mg'}[goal];if(nutrient&&applicable.every(p=>p.nutrition[nutrient]===null)&&!applicable.some(p=>p.tags.includes(goal)))uncertainties.push({kind:'catalog_evidence',field:'nutrition.'+nutrient,reason:'goal_not_verifiable',goal});}
 if(conflicts.length){decision.action='clarify';decision.blockSelection=true;decision.question='你的条件存在冲突，请确认优先保留哪一项。';}
 else if(uncertainties.some(u=>u.kind==='user_information')){decision.action='clarify';decision.blockSelection=true;decision.question=plan.clarification|| (uncertainties.some(u=>u.field==='budget.currency')?'预算使用的是日元、人民币，还是其他币种？':uncertainties.some(u=>u.field==='slots')?'你想喝点饮品，还是吃点东西？':'需要确认本轮要改变的条件或商品对象；其他条件会保留。');}
 else if(uncertainties.some(u=>u.kind==='catalog_evidence')){decision.action='explain_limit';decision.blockSelection=true;}
 else if(planned.reasons.some(x=>x.code==='not_in_catalog'||x.code==='missing_verified_data'))decision.action='explain_limit';
 else if(planned.reasons.some(x=>x.code==='budget_conflict'||x.code==='constraints_conflict'||x.code==='too_many_roles'||x.code==='retained_constraint_conflict')){decision.action='partial';decision.evidence=planned.reasons;}
 else if(planned.options.some(o=>!o.complete))decision.action='partial';
 return decision;
}
module.exports={assess};
