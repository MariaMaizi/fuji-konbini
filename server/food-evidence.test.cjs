const {test}=require('node:test'),assert=require('node:assert/strict');
const food=require('./food-agent.cjs'),{verify}=require('./food-evidence.cjs');
function run(message,patch,evidence,previous=food.blankMemory()){const memory=structuredClone(previous);Object.assign(memory.requirements,patch);return {memory,audit:verify({patch,evidence,corrections:[]},{message},previous,memory)};}
test('ambiguous yuan cannot become yen because the model guessed it',()=>{
 const {memory}=run('想买20元以内的低糖饮料',{budget:{amount:20,currency:'JPY'}},{budget:'20元以内'});assert.deepEqual(memory.requirements.budget,{amount:20,currency:'UNKNOWN'});
});
test('currency can inherit a confirmed earlier value when only the amount changes',()=>{
 const previous=food.blankMemory();previous.requirements.budget={amount:300,currency:'JPY'};
 assert.equal(run('提高到600，其他不变',{budget:{amount:600,currency:'UNKNOWN'}},{budget:'提高到600'},previous).memory.requirements.budget.currency,'JPY');
});
test('quote and numeric bound evidence must belong to this turn',()=>{
 const {memory,audit}=run('最好是咖啡',{budget:{amount:20,currency:'JPY'}},{budget:'20日元'});assert.equal(memory.requirements.budget,null);assert(audit.pending.length);
 const r=run('想低糖一点',{nutritionLimits:{sugar_g:{max:10}}},{nutritionLimits:'低糖一点'});assert.deepEqual(r.memory.requirements.nutritionLimits,{});assert.equal(r.audit.pending[0].reason,'numeric_bound_not_in_evidence');
});
test('explicit numeric contradiction is preserved for conflict decisions',()=>{
 const {memory}=run('至少500千卡但不能超过300千卡',{nutritionLimits:{kcal:{min:500,max:300}}},{nutritionLimits:'至少500千卡但不能超过300千卡'});assert.equal(memory.requirements.nutritionLimits.kcal.min,500);
});
test('changing a preference cannot erase other stored requirement dimensions',()=>{
 const previous=food.blankMemory();Object.assign(previous.requirements,{goals:['sugar_control'],budget:{amount:350,currency:'JPY'},slots:['drink'],preferredCategories:['coffee']});
 const {memory}=run('不要咖啡，其他不变',{preferredCategories:[],avoid:['coffee']},{preferredCategories:'不要咖啡',avoid:'不要咖啡'},previous);
 assert.deepEqual(memory.requirements.goals,['sugar_control']);assert.equal(memory.requirements.budget.amount,350);assert.deepEqual(memory.requirements.slots,['drink']);assert.deepEqual(memory.requirements.preferredCategories,[]);
});
test('a positive preference quote is not evidence for a new exclusion',()=>{
 const {memory,audit}=run('最好是咖啡',{avoid:['coffee']},{avoid:'最好是咖啡'});assert.deepEqual(memory.requirements.avoid,[]);assert.equal(audit.pending[0].reason,'exclusion_polarity_not_supported');
});
test('C response must execute a clarifying decision, not just describe uncertainty',()=>{
 const planned={options:[],queryResults:[],reasons:[],decision:{action:'clarify'}};
 const input={message:'有点冷',language:'zh'},r=food.blankMemory().requirements;
 assert.throws(()=>food.validateAnswer({option:-1,message:'尚未明确想要饮品或食物。'},planned,[],input,r),/decision_not_executed/);
 assert.equal(food.validateAnswer({option:-1,message:'想喝点饮品还是吃东西？'},planned,[],input,r).option,-1);
});
test('user bound clarification is allowed, unsupported exact product nutrients remain rejected',()=>{
 const planned={options:[],queryResults:[],reasons:[],decision:{action:'clarify'}},input={message:'至少500千卡但不能超过300千卡',language:'zh'},r=food.blankMemory().requirements;
 assert(food.validateAnswer({option:-1,message:'至少500千卡和不超过300千卡的要求矛盾，你想保留哪一个？'},planned,[],input,r));
 assert.throws(()=>food.validateAnswer({option:-1,message:'这款商品有300千卡，请确认。'}, {...planned,decision:null},[],input,r));
});
test('C does not accept unsupported stock, nutrition or copied placeholders',()=>{
 const planned={options:[],queryResults:[],reasons:[],decision:{action:'explain_limit'}},input={message:'低糖饮料',language:'zh'},r=food.blankMemory().requirements;
 for(const message of ['饮用水是低糖饮料。','无相关商品供应。','参考合计T日元。'])assert.throws(()=>food.validateAnswer({option:-1,message},planned,[],input,r));
});
test('stale correction metadata for an unchanged field cannot invalidate an independent preference update',()=>{
 const catalog=require('./clerk-policy.cjs').pricedCatalog(require('../web/data/product-catalog.json'));
 const previous=food.blankMemory();Object.assign(previous.requirements,{budget:{amount:20,currency:'UNKNOWN'},goals:['sugar_control'],slots:['drink']});
 const plan={intent:'modify',operation:'replace_slot',queries:[{text:'drink',category:'drink',ids:[],slot:'drink'}],patch:{budget:{amount:20,currency:'UNKNOWN'},preferredCategories:['coffee']},corrections:[{field:'budget.currency',evidence:'20元以内'},{field:'preferredCategories',evidence:'最好是咖啡'}],targetIds:[],clarification:null};
 const parsed=food.parsePlan(plan,{message:'最好是咖啡'},catalog,previous);assert.deepEqual(parsed.memory.requirements.preferredCategories,['coffee']);assert.equal(parsed.memory.requirements.budget.currency,'UNKNOWN');
 const next={...plan,patch:{budget:{amount:20,currency:'JPY'}},corrections:[{field:'budget.currency',evidence:'20元以内'}]};assert.throws(()=>food.parsePlan(next,{message:'最好是咖啡'},catalog,previous));
});
test('amount-only updates can drop semantically empty query metadata without losing roles',()=>{
 const catalog=require('./clerk-policy.cjs').pricedCatalog(require('../web/data/product-catalog.json')),previous=food.blankMemory();previous.requirements.slots=['main','drink','side'];
 const parsed=food.parsePlan({intent:'modify',operation:'replace',queries:[{}],patch:{budget:{amount:600,currency:'JPY'}},corrections:[],targetIds:[],clarification:null},{message:'提高到600日元'},catalog,previous);
 assert.deepEqual(parsed.plan.queries,[]);assert.deepEqual(parsed.memory.requirements.slots,['main','drink','side']);
});
test('C makes a clarification in one model call and preserves low-sugar drink state',async()=>{
 const catalog=require('./clerk-policy.cjs').pricedCatalog(require('../web/data/product-catalog.json'));let calls=0;
 const result=await food.orchestrate({catalog,selfCheck:true,memory:food.blankMemory(),input:{message:'20元以内的低糖饮料',history:[],language:'zh',state:{}},call:async()=>{calls++;return {intent:'recommend',operation:'replace',queries:[{text:'drink',category:'drink',ids:[],slot:'drink'}],patch:{budget:{amount:20,currency:'JPY'},goals:['sugar_control']},corrections:[{field:'budget',evidence:'20元以内'}],targetIds:[],clarification:null};}});
 assert.equal(calls,1);assert.equal(result.source,'decision');assert.equal(result.sessionMemory.requirements.budget.currency,'UNKNOWN');assert.deepEqual(result.sessionMemory.requirements.goals,['sugar_control']);assert.deepEqual(result.sessionMemory.requirements.slots,['drink']);assert(result.message.includes('？'));
});
