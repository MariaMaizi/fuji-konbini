'use strict';
function reply(decision,requirements,input){
 const language=input.language==='auto'?/[ぁ-んァ-ヶ]/u.test(input.message)?'ja':/[\u3400-\u9fff]/u.test(input.message)?'zh':'en':input.language;
 if(decision.action==='clarify'){
  const fields=decision.uncertainties.map(u=>u.field);
  if(fields.includes('budget.currency'))return {zh:'预算用的是日元、人民币，还是其他币种？其他饮食要求会保留。',en:'Is your budget in yen, RMB, or another currency? I will retain your other food requirements.',ja:'予算は日本円、人民元、それとも別の通貨ですか？ほかの食事条件は保持します。'}[language]||decision.question;
  if(fields.includes('slots'))return {zh:'你想喝点饮品，还是吃点东西？',en:'Would you like a drink or something to eat?',ja:'飲み物と食べ物、どちらがよいですか？'}[language];
  if(fields.includes('temperature'))return {zh:'你想喝热的还是冷的？',en:'Would you like it hot or cold?',ja:'温かいものと冷たいもの、どちらがよいですか？'}[language];
  const concrete=decision.question&&/[?？]|请(?:确认|告诉)|please (?:confirm|tell)|確認してください/i.test(decision.question);
  return (concrete?decision.question:null)||{zh:'请确认需要改变的条件；其余要求会保留。',en:'Please confirm the condition you want to change; I will retain the others.',ja:'変更したい条件を確認してください。ほかの条件は保持します。'}[language];
 }
 const fields=[...new Set([...decision.uncertainties.map(u=>u.field),...decision.evidence.flatMap(e=>e.missingFields||[])])];
 const labels={zh:{sugar_g:'糖量或低糖标签',sodium_mg:'钠含量或低盐标签',kcal:'热量',protein_g:'蛋白质含量',fat_g:'脂肪含量'},en:{sugar_g:'sugar content or low-sugar labels',sodium_mg:'sodium content or low-sodium labels',kcal:'calories',protein_g:'protein content',fat_g:'fat content'},ja:{sugar_g:'糖量または低糖表示',sodium_mg:'ナトリウム量または減塩表示',kcal:'カロリー',protein_g:'たんぱく質量',fat_g:'脂質量'}};
 const nutrients=[...new Set(fields.map(f=>f.split(/[.:]/).at(-1)).filter(f=>labels[language]?.[f]))];
 const data=nutrients.map(f=>labels[language][f]).join(language==='zh'?'、':', ');
 const fallback=language==='zh'?'所需的商品配料或属性':language==='ja'?'必要な成分や商品属性':'the required ingredients or product properties';
 const value=data||fallback;
 return {zh:`当前目录缺少已核实的${value}资料，暂时无法确认哪款满足这些条件。你的预算、饮食品类和偏好会保留。`,en:`The catalog lacks verified data for ${value}, so I cannot confirm a suitable item. Your budget, food type, and preferences remain active.`,ja:`現在のカタログには${value}の確認済みデータがなく、条件を満たす商品を確認できません。予算、食品の種類、好みは保持します。`}[language];
}
module.exports={reply};
