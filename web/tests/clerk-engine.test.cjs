const assert = require('node:assert/strict');
const E = require('../src/clerk-engine.js');
const state = E.createState('zh');
assert.equal(E.choose(state).length, 2);
E.reply('今天很饿，想吃饱', state);
assert.equal(E.choose(state).length, 3);
E.reply('不要甜的', state);
E.reply('换一个', state);
assert(E.choose(state).every(p => !p.tags.includes('sweet')));
E.reply('No coffee please', state);
assert.equal(state.lang, 'en');
assert(E.choose(state).every(p => !p.tags.includes('caffeine')));
assert(state.exclude.includes('sweet'));
E.reply('朝ごはんを食べたい', state);
assert.equal(state.lang, 'ja');
assert.equal(state.context, 'morning');
const allergy = E.reply('I have a peanut allergy', state);
assert.equal(allergy.products.length, 0);
assert.equal(E.choose(state).length, 0);
const clean = E.createState('en');
const breakfastAllergy=E.createState('zh');
const cautious=E.reply('我咖啡因过敏，想要一份早餐推荐',breakfastAllergy);
assert.equal(breakfastAllergy.context,'morning');
assert.equal(breakfastAllergy.paused,true);
assert.equal(cautious.products.length,0);
assert(!cautious.text.includes('重新开始'));
assert(cautious.text.includes('商品和所在区域'));
E.selectContext(breakfastAllergy,'afternoon');
assert.equal(breakfastAllergy.paused,true);
assert.equal(E.reply('换一种搭配',breakfastAllergy).products.length,0);
assert.equal(E.reply('想吃饱一点',breakfastAllergy).products.length,0);
assert.match(E.reply('What is the stock market doing?', clean).text, /local pairing demo/);
const ids = new Set(E.products.map(p => p.id));
for (const context of ['rain','morning','afternoon','night']) {
 for (const size of ['light','full']) {
  for (let variant=0;variant<12;variant++) {
   const chosen=E.choose({...E.createState(),context,size,variant});
   assert(chosen.every(p => ids.has(p.id)));
   assert.equal(new Set(chosen.map(p => p.id)).size,chosen.length);
   assert.equal(chosen.length,size==='full'?3:2);
  }
 }
}
console.log('PASS: pairing coverage, language switching, persistent exclusions, allergy pause, honest fallback.');
