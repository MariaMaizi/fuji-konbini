'use strict';
// Documentation assets only. No dependencies, network access or runtime changes.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const images=path.join(root,'docs/images');
const sources=path.join(root,'docs/ai-pm/diagrams');
fs.mkdirSync(images,{recursive:true});fs.mkdirSync(sources,{recursive:true});
const content={
 'zh-CN':{
  title:'Fuji Konbini：从对话到店内行动',
  desc:'用户消息和最近八条历史与全量精简商品数据在 Node 后端组合，发送至百炼模型。模型返回正文和商品 ID；代码过滤无效、重复 ID，并展示最多三张商品卡。用户点击 Find 才执行定位和 A* 导航，点击 Add 才加入购物篮。',
  caption:'Fuji Konbini · 当前 direct 架构',
  nodes:{
   U:['用户消息与短期上下文','当前问题 + 最近 8 条历史'],
   D:['商品数据','603 个目录条目与项目价格','518 条食品虚拟信息'],
   N:['Node.js 后端','拼装请求与解析回复','过滤无效、重复商品 ID'],
   L:['LLM · qwen3.6-plus','百炼：理解需求、选品、写回复','返回 message + productIds'],
   C:['回复与商品卡','最多 3 张卡片','ID → 目录名称、图片与场景节点'],
   F:['用户点击 Find','Three.js 商品定位与 A* 导航','第一人称前往货架'],
   B:['用户点击 Add','前端购物篮与数量管理','可移除商品、导出虚拟清单']
  },
  foot:'模型提供建议；代码连接商品与动作。有效商品卡不代表正文事实已核验。'
 },
 en:{
  title:'Fuji Konbini: from conversation to in-store action',
  desc:'Node combines the question, the last eight messages and compact full-catalog facts for Bailian. The model returns prose and product IDs. Code removes invalid and duplicate IDs and displays up to three cards. User clicks trigger Find with A* navigation or Add to the browser basket.',
  caption:'Fuji Konbini · Current direct architecture',
  nodes:{
   U:['Message and short-term context','Question + last 8 messages'],
   D:['Product data','603 catalog entries and prices','518 virtual food records'],
   N:['Node.js backend','Build request and parse reply','Remove invalid / duplicate IDs'],
   L:['LLM · qwen3.6-plus','Bailian: interpret, select, explain','Return message + productIds'],
   C:['Reply and product cards','Up to 3 cards','ID → catalog, artwork and 3D node'],
   F:['User clicks Find','Three.js mapping and A* navigation','First-person walk to the shelf'],
   B:['User clicks Add','Browser basket and quantities','Remove items or export a virtual list']
  },
  foot:'The model suggests; code connects products and actions. Valid card IDs do not verify prose facts.'
 }
};
const boxes={U:[350,70,340,86],D:[28,218,278,110],N:[350,218,340,110],L:[734,218,278,110],C:[350,390,340,104],F:[170,560,320,104],B:[550,560,320,104]};
const edges=[['U','N'],['D','N'],['N','L'],['L','N'],['N','C'],['C','F'],['C','B']];
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
for(const [lang,c] of Object.entries(content)){
 const paths=['M520 156V218','M306 273H350','M690 248H734','M734 298H690','M520 328V390','M520 494V526H330V560','M520 494V526H710V560'];
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1040" height="724" viewBox="0 0 1040 724" role="img" aria-labelledby="title desc" xml:lang="${lang}">
<title id="title">${esc(c.title)}</title><desc id="desc">${esc(c.desc)}</desc>
<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#527361"/></marker></defs>
<rect width="1040" height="724" rx="12" fill="#fafbf8"/>
<g font-family="Arial, 'Microsoft YaHei', 'Noto Sans CJK SC', sans-serif" text-anchor="middle">
<text x="520" y="36" font-size="18" fill="#52655a">${esc(c.caption)}</text>
<g fill="none" stroke="#527361" stroke-width="2.2" stroke-linejoin="round" marker-end="url(#arrow)">${paths.map(d=>`<path d="${d}"/>`).join('')}</g>
${Object.entries(boxes).map(([id,[x,y,w,h]])=>{
 const dark=id==='N',llm=id==='L',lines=c.nodes[id];
 return `<g id="node-${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="9" fill="${dark?'#214c39':llm?'#eef2e8':'#ffffff'}" stroke="${llm?'#7a895e':'#b8cabc'}" stroke-width="${llm?'2':'1.4'}"/>
<text x="${x+w/2}" y="${y+32}" font-size="${id==='L'?19:20}" font-weight="600" fill="${dark?'#ffffff':'#244734'}">${esc(lines[0])}</text>
${lines.slice(1).map((line,i)=>`<text x="${x+w/2}" y="${y+58+i*23}" font-size="15" fill="${dark?'#e1ece3':'#52655a'}">${esc(line)}</text>`).join('')}</g>`;
}).join('\n')}
<text x="520" y="704" font-size="15" fill="#52655a">${esc(c.foot)}</text>
</g></svg>\n`;
 fs.writeFileSync(path.join(images,`agent-architecture.${lang}.svg`),svg);
 // Quoted labels remain editable Mermaid source, without dynamic README rendering.
 const mmd='flowchart TD\n'+Object.entries(c.nodes).map(([id,lines])=>`    ${id}["${lines.join('<br/>')}"]`).join('\n')+'\n'+edges.map(([a,b])=>`    ${a} --> ${b}`).join('\n')+'\n';
 fs.writeFileSync(path.join(sources,`architecture.${lang}.mmd`),mmd);
}
console.log('Generated bilingual architecture SVGs and quoted Mermaid sources.');
