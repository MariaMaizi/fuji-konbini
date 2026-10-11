const {test}=require('node:test'),assert=require('node:assert/strict');
const food=require('./food-agent.cjs'),control=require('./food-control.cjs');
const catalog=require('./clerk-policy.cjs').pricedCatalog(require('../web/data/product-catalog.json')),all=catalog.products.map(food.facts);
function check(patch,previous=food.blankMemory(),more={}){const plan={intent:'recommend',operation:'replace',queries:[],patch,corrections:[],targetIds:[],clarification:null,...more},memory=food.parsePlan(plan,{message:'取消咖啡偏好',language:'zh'},catalog,previous).memory;return {memory,decision:control.assess({plan,memory,previous,all,planned:food.planOptions(all,plan,memory)})};}
test('coffee preference cancellation preserves budget, sugar aim and drink role',()=>{
 const old=food.blankMemory();Object.assign(old.requirements,{budget:{amount:20,currency:'UNKNOWN'},goals:['sugar_control'],slots:['drink'],preferredCategories:['coffee']});
 const {memory,decision}=check({preferredCategories:[],avoid:['coffee']},old,{corrections:[{field:'preferredCategories',evidence:'取消咖啡偏好'}]});
 assert.deepEqual(memory.requirements.goals,['sugar_control']);assert.equal(memory.requirements.budget.amount,20);assert.deepEqual(memory.requirements.slots,['drink']);assert(!memory.requirements.preferredCategories.length);assert.equal(decision.action,'clarify');
});
test('catalog evidence gap is disclosed, not sent back to user as intent ambiguity',()=>{
 const {decision}=check({goals:['sugar_control'],slots:['drink'],budget:{amount:350,currency:'JPY'}});
 assert.equal(decision.action,'explain_limit');assert(decision.blockSelection);assert.equal(decision.question,null);assert(decision.uncertainties.every(u=>u.kind==='catalog_evidence'));
});
test('unconfirmed loss of independent constraints restores them before a clarifying decision',()=>{
 const old=food.blankMemory();old.requirements.goals=['sugar_control'];old.requirements.noFried=true;
 const {memory,decision}=check({goals:[],noFried:false,preferredCategories:['coffee']},old);
 assert.deepEqual(memory.requirements.goals,['sugar_control']);assert(memory.requirements.noFried);assert.equal(decision.action,'clarify');
});
test('state alone is insufficient to choose a food role',()=>{assert.equal(check({states:['cold']}).decision.action,'clarify');});
test('incompatible preferences and numeric ranges are represented as conflicts, not schema failures',()=>{
 assert(check({avoid:['coffee'],preferredCategories:['coffee']}).decision.conflicts.length);
 assert.equal(check({nutritionLimits:{kcal:{min:500,max:300}}}).decision.conflicts[0].reason,'inverted_range');
});
test('budget failure can offer a valid partial basket without unnecessary clarification',()=>{
 const {decision}=check({budget:{amount:200,currency:'JPY'},slots:['main','drink','side']});assert.equal(decision.action,'partial');assert(!decision.blockSelection);assert.equal(decision.question,null);
});
test('consultation is not blocked by unrelated unresolved eating constraints',()=>{
 const old=food.blankMemory();old.requirements.allergies=['fish'];old.requirements.budget={amount:20,currency:'UNKNOWN'};
 const {decision}=check({},old,{intent:'availability',operation:'none'});assert.equal(decision.action,'consultation');assert(!decision.blockSelection);
});
