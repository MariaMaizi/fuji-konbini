'use strict';
const hotIds=new Set(['coffee:hot-coffee','coffee:cafe-latte']);
const isDrink=p=>p.role==='drink'||['drinks','vending','coffee','smoothies'].includes(p.zone);
function coldAmbiguous(text){return /有点冷|有點冷|好冷|很冷|感觉冷|覺得冷|有些冷|\b(?:feel(?:ing)?|i(?:'m| am))\s+(?:a (?:bit|little)\s+)?cold\b|寒い/i.test(text)&&!/喝|饮|飲|吃|食べ|饭|飯|零食|咖啡|茶|drink|beverage|eat|food|snack|coffee|tea/i.test(text);}
function intent(text,memory={}){
 if(coldAmbiguous(text))return {purchaseTarget:null,purchaseTemperature:'hot'};
 let target=memory.purchaseTarget||null,temperature=memory.purchaseTemperature||null;
 const positive=require('./clerk-language.cjs').positiveText(text);
 const drink=/喝的|热饮|冷饮|饮料|飲み物|ドリンク|beverage|\bdrinks?\b|(?:想|要|来|推荐|换|给|找).*喝|(?:want|like).*drink/i.test(positive);
 const food=/吃的|饭团|三明治|便当|零食|早餐|午餐|晚餐|食べ|rice ball|sandwich|bento|snack|breakfast|lunch|dinner/i.test(positive);
 if(drink)target=food?'mixed':'drink';else if(food)target='food';
 if(/热饮|温热|热的|暖的|喝热|hot|warm|温か|あたたか/i.test(positive))temperature='hot';
 else if(/冷饮|冰的|冷的|冰饮|iced|cold|冷たい/i.test(positive))temperature='cold';
 else if(/常温|room temperature/i.test(positive))temperature='ambient';
 // A fresh food request must not inherit a drink-only temperature constraint.
 if(food&&!drink&&!/热|暖|hot|warm|冷|冰|cold|iced/i.test(positive))temperature=null;
 return {purchaseTarget:target,purchaseTemperature:temperature};
}
function filter(p,request){return request.purchaseTarget!=='drink'||isDrink(p)&&(request.purchaseTemperature!=='hot'||hotIds.has(p.id))&&(request.purchaseTemperature!=='cold'||!hotIds.has(p.id));}
module.exports={intent,filter,isDrink,hotIds,coldAmbiguous};
