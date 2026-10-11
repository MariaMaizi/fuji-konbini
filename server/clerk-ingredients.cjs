'use strict';
const fs=require('node:fs'),path=require('node:path');
const file=path.resolve(__dirname,'../web/data/product-ingredients.json');
function load(){return JSON.parse(fs.readFileSync(file,'utf8'));}
function enrich(data,id){const item=data.items[id];if(!item)return null;const profile=data.profiles[item.profileId];return {...item,profile:profile||null,sources:[...new Set([...(profile?.sourceIds||[]),...(item.officialAnalogSummary?[item.officialAnalogSummary.sourceId]:[])])].map(id=>({id,...data.sources[id]}))};}
function facts(p,l='zh'){
 const info=p.ingredientInfo;if(!info||info.status==='not_food')return '';
 const base=info.profile?.components[l]||[],clues=info.nameClues?.[l]||[];
 const official=info.officialAnalogSummary;
 const officialSource=official&&info.sources.find(s=>s.id===official.sourceId);
 if(l==='zh')return `常见同类组成参考：${base.join('、')}。${clues.length?`商品名提示的主料或风味：${clues.join('、')}（实际配方未核实）。`:''}${official?`另有“${officialSource.title}”官方同类配料摘要：${official.components.zh.join('、')}；不是本店包装的完整配料表。`:''}${info.analogousMajorIngredients?`已查到的7-Eleven同类主要原料原文：${info.analogousMajorIngredients.textJA}；属于参照款。`:''}`;
 if(l==='ja')return `類似タイプの主な原料参考：${base.join('・')}。${clues.length?`名称からの具材・風味の手がかり：${clues.join('・')}（実際の配合は未確認）。`:''}${official?`公式類似品の原料要約：${official.components.ja.join('・')}。該当包装の完全な原材料表示ではありません。`:''}`;
 return `Common-type ingredient reference: ${base.join(', ')}. ${clues.length?`Name clues (not confirmed recipe): ${clues.join(', ')}. `:''}${official?`Linked official analogous product summary: ${official.components.en.join(', ')}. This is not the full ingredient label of the store package.`:''}`;
}
module.exports={load,enrich,facts};
