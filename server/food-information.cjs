'use strict';
// Information provenance and conversation delivery are independent of selection.
function recordNeeds(memory,previous,plan,input){
 const info=structuredClone(previous.information||{turn:0,needs:{},hypotheses:{},delivery:{lastSentIds:[],clientReportedIds:[],history:[]}});
 info.turn++;
 for(const [field,value]of Object.entries(plan.patch||{})){
  if(JSON.stringify(memory.requirements[field])===JSON.stringify(previous.requirements[field])&&!info.hypotheses[field])continue;
  const quote=plan.evidence?.[field]||plan.corrections?.find(c=>c.field===field)?.evidence||null;
  const cited=typeof quote==='string'&&input.message.includes(quote);
  const inferred=plan.certainty?.[field]==='inferred'||field==='temperature'&&(plan.patch.states?.some(s=>['cold','hot'].includes(s))||plan.intent==='clarify'&&!previous.requirements.slots.length)&&!Object.hasOwn(plan.patch,'slots')&&!plan.queries?.some(q=>q.slot==='drink'||q.ids?.length);
  if(inferred){info.hypotheses[field]={value,quote:cited?quote:null,sourceTurn:info.turn,status:'pending_confirmation'};memory.requirements[field]=structuredClone(previous.requirements[field]);}
  else {info.needs[field]={value:memory.requirements[field],quote:cited?quote:null,sourceTurn:info.turn,status:cited?'user_evidence_semantics_model_inferred':'model_inferred',lastChangedAt:new Date().toISOString()};if(cited)delete info.hypotheses[field];}
 }
 info.delivery.clientReportedIds=(input.currentProductIds||[]).slice();
 memory.information=info;return info;
}
function sent(memory,answer,input){
 const info=memory.information||(memory.information={turn:0,needs:{},hypotheses:{},delivery:{history:[]}});
 info.delivery??={history:[]};info.delivery.lastSentIds=answer.productIds.slice();
 info.delivery.history=[...(info.delivery.history||[]),{turn:info.turn,user:input.message,message:answer.message,ids:answer.productIds.slice(),status:'validated_for_delivery'}].slice(-6);
 return info;
}
function classify(code){
 if(/unknown|unverified|unconfirmed/.test(code))return 'information_unknown';
 if(/schema|evidence|invalid_change/.test(code))return 'internal_contract';
 if(/mismatch|conflict|excluded|exceeded|fried/.test(code))return 'explicit_conflict';
 if(/unsupported/.test(code))return 'unsupported_assertion';return 'needs_review';
}
module.exports={recordNeeds,sent,classify};
