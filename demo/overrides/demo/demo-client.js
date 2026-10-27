(function(){
 'use strict';
 const cases=window.FujiDemoScenarios;
 const normalize=text=>String(text||'').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');
 const extraConstraints=/预算|預算|予算|budget|[¥￥]|\d+\s*(?:日元|円|yen|jpy|kcal|克|g\b)|过敏|過敏|allerg|アレルギー|不要|不能吃|不吃|排除|avoid|without|\bno\s+(?:chicken|milk|dairy|nuts?|eggs?)\b|抜き|食べられ|糖尿|血糖|妊娠|孕|pregnan/i;
 function classify(message){
  const clean=normalize(message);
  for(const [key,c] of Object.entries(cases))if(['zh','en','ja'].some(l=>normalize(c[l][0])===clean))return {key,kind:'exact'};
  if(extraConstraints.test(message))return {key:null,kind:'constraints'};
  if(Object.values(cases).some(c=>c.steps?.some(s=>['zh','en','ja'].some(l=>normalize(s[l][0])===clean)||s.matches.some(pattern=>pattern.test(message)))))return {key:null,kind:'sequence'};
  const hits=Object.entries(cases).filter(([,c])=>c.matches.some(pattern=>pattern.test(message)));
  return hits.length===1?{key:hits[0][0],kind:'topic'}:{key:null,kind:hits.length?'ambiguous':'unknown'};
 }
 const language=body=>body.language!=='auto'&&body.language?body.language:/[\u3040-\u30ff]/.test(body.message)?'ja':/[\u4e00-\u9fff]/.test(body.message)?'zh':'en';
 function totals(ids){const evidence=window.FujiPicnicEvidence;if(!evidence||evidence.scope!=='project_virtual')return null;let kcal=0,protein=0;for(const id of ids){const n=evidence.items[id]?.nutrition;if(!n||!Number.isFinite(n.kcal)||!Number.isFinite(n.protein_g))return null;kcal+=n.kcal;protein+=n.protein_g;}return {kcal,protein_g:protein,scope:'project_virtual',unit:evidence.unit,physicalPackageVerified:false};}
 window.FujiDemo={cases,classify,createClient(){let flow=null;return {
  async status(){return {configured:true,provider:'demo',model:'scripted-example'};},
  async reply(body,products){
   const lang=language(body);let match=classify(body.message),example=cases[match.key],step=0;
   if(flow&&!extraConstraints.test(body.message)){
    const parent=cases[flow.key],next=parent.steps?.[flow.step];
    if(next&&(['zh','en','ja'].some(l=>normalize(next[l][0])===normalize(body.message))||next.matches.some(pattern=>pattern.test(body.message)))){
     match={key:flow.key,kind:'follow-up'};example={...parent,...next};step=flow.step+1;
    }
   }
   const prompt={zh:'这里是预设问答体验，不调用大模型。可以打开上方 Try a question，选择健身、日用品、早餐、雨天、冰棒、野餐、小奖励或出行应急，再点击示例问题。你也可以输入相近主题；未匹配的问题不会生成新答案。Browse 可自由浏览全部603个条目。',en:'This is a prepared Q&A demo with no model calls. Open Try a question, choose Fitness, Daily care, Breakfast, Rainy day, Ice bars, Picnic, Little treat or Travel kit, then click its question. Similar topic wording is also supported; unmatched questions do not generate new answers. Browse contains all 603 entries.',ja:'これは事前に用意したQ&Aデモで、モデルを呼び出しません。Try a question で運動後の食事、日用品、朝食、雨の日、アイス、ピクニック、ご褒美、外出用品を選び、質問を押してください。近い話題の入力にも対応しますが、新しい回答は生成しません。Browse では全603件を見られます。'};
   const constraintReply={zh:'你追加了预算、排除项或饮食条件；这个预设示例不会核验这些条件，因此先不展示推荐卡。请点上方示例问题体验既定流程，或到 Browse 自己查看商品资料。',en:'Your question adds a budget, exclusion or dietary condition that this prepared demo does not verify, so no recommendation cards are shown. Try one of the displayed example questions or inspect products in Browse.',ja:'予算・除外条件・食事条件の追加は、この事前設定デモでは確認できないため、商品カードは表示しません。表示中の質問例を試すか、Browse で商品情報を確認してください。'};
   const prefix={zh:'示例回答：',en:'Prepared answer: ',ja:'デモ回答：'};
   const byId=new Map(products.filter(p=>!p.unavailable).map(p=>[p.id,p]));
   const valid=example&&example.ids.every(id=>byId.has(id));
   const ids=valid?example.ids:[];
   const nutrition=valid&&match.key==='picnic'?totals(ids):null;
   const priorIds=step===1?cases.picnic?.ids:step>1?cases.picnic?.steps[step-2]?.ids:null;
   const prior=nutrition&&priorIds?totals(priorIds):null;
   const nutritionDelta=prior?{kcal:nutrition.kcal-prior.kcal,protein_g:nutrition.protein_g-prior.protein_g}:null;
   flow=valid&&cases[match.key].steps?{key:match.key,step}:null;
   const nextQuestion=flow?cases[flow.key].steps[flow.step]?.[lang]?.[0]:null;
   return {message:valid?prefix[lang]+example[lang][1]:match.kind==='constraints'?constraintReply[lang]:prompt[lang],products:ids.map(id=>byId.get(id)),productIds:ids,cardTitle:valid?example.label[0]+' · Example selection':'Example Q&A',context:valid?example.context:body.state?.context||'afternoon',size:valid?example.size||'light':'light',dietaryCaution:false,source:'demo-script',replyMode:'scripted',informationScope:'project_virtual_store',sessionId:'demo-preview',demoCase:valid?match.key:null,demoMatch:match.kind,demoStep:step,demoNextQuestion:nextQuestion,demoNutrition:nutrition,demoNutritionDelta:nutritionDelta,demoScenario:valid?example.scenario:null};
  }
 };}};
})();
