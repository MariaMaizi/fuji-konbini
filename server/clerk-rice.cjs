'use strict';
const isRice=p=>p.zone==='chilled'&&/rice ball|onigiri/i.test(p.en);
const flavors=[
 ['Salmon rice ball',/三文鱼|鮭|salmon/i],['Tuna mayo rice ball',/金枪鱼蛋黄酱|ツナマヨ|tuna mayo/i],
 ['Plum rice ball',/梅子|梅おにぎり|plum/i],['Kombu onigiri',/昆布|kombu/i],
 ['Mentaiko onigiri',/明太子|mentaiko/i],['Takana onigiri',/高菜|takana/i],
 ['Beef shigure onigiri',/牛肉|beef/i],['Tuna kombu onigiri',/金枪鱼昆布|tuna kombu/i],
 ['Chicken gomoku onigiri',/鸡肉五目|chicken gomoku/i],['Wakame rice ball',/裙带菜|わかめ|wakame/i],
 ['Grilled rice ball',/烤饭团|焼きおにぎり|grilled/i],['Sekihan rice ball',/赤饭|赤飯|sekihan/i],
 ['Wakame sesame rice ball',/裙带菜芝麻|wakame sesame/i],['Yukari rice ball',/紫苏|ゆかり|yukari/i]
];
function requested(text){
 // Prefer the longest flavor name; negative requests are constraints, not favorites.
 if(/不喜欢|不想|不要|别推荐|avoid|don't|do not|苦手/i.test(text))return null;
 return [...flavors].sort((a,b)=>b[0].length-a[0].length).find(([,re])=>re.test(text))?.[0]||null;
}
function variedCandidates(candidates,text,memory){
 const all=candidates.filter(isRice),named=requested(text);
 if(!all.length)return candidates;
 if(named)return candidates.filter(p=>!isRice(p)||p.en===named);
 const fresh=all.filter(p=>!memory.recentIds.includes(p.id));
 // Exhaustion permits ordinary recommendations again; explicit swaps were filtered by the caller.
 const eligible=fresh.length?fresh:all;
 const offset=memory.recentIds.length%eligible.length;
 const ordered=eligible.slice(offset).concat(eligible.slice(0,offset));
 const allowed=new Set(ordered.slice(0,4).map(p=>p.id));
 return [...ordered.filter(p=>allowed.has(p.id)),...candidates.filter(p=>!isRice(p))];
}
module.exports={isRice,requested,variedCandidates};
