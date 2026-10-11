/* Local, deterministic experience. No messages leave the browser in this mode. */
(function(scope){
 'use strict';
 let recipes=null;
 let products=[
  {id:'oden',node:'ODEN_V13_ROOT',en:'Oden',ja:'おでん',zh:'关东煮',art:'oden',tags:['hot','meal'],stand:[-4.25,-3.85]},
  {id:'coffee',node:'COFFEE_V11_ROOT',en:'Coffee',ja:'コーヒー',zh:'咖啡',art:'coffee',tags:['drink','hot','caffeine'],stand:[-3.8,-4.3]},
  {id:'sandwich',node:'CHILL_V18_SKU_1_01',en:'Egg sandwich',ja:'たまごサンド',zh:'鸡蛋三明治',art:'sandwich',tags:['meal','cold'],stand:[5.4,-2.3]},
  {id:'ramen',node:'PANTRY_V20_SKU_2_02',en:'Miso ramen',ja:'味噌ラーメン',zh:'味噌杯面',art:'noodle',tags:['meal','hot','instant'],stand:[3.55,-1.35]},
  {id:'seafood',node:'PANTRY_V20_SKU_2_01',en:'Seafood noodles',ja:'シーフードヌードル',zh:'海鲜杯面',art:'noodle',tags:['meal','hot','instant','seafood'],stand:[3.55,-1.35]},
  {id:'icecream',node:'HD_V17_ROOT',en:'Ice cream selection',ja:'アイスクリーム',zh:'冰淇淋区精选',art:'icecream',tags:['sweet','cold'],stand:[4.9,-3.8]},
  {id:'sweets',node:'SWEETS_V21_ROOT',en:'Small treats',ja:'小さなおやつ',zh:'糖果区精选',art:'sweets',tags:['sweet'],stand:[-1.7,-1.35]},
  {id:'snacks',node:'SNACKS_V16_ROOT',en:'Snack selection',ja:'スナック',zh:'零食区精选',art:'snacks',tags:['snack'],stand:[-3.5,-1.35]}
 ];
 const copy={
  zh:{welcome:'欢迎回来。今天想吃点什么？选一个情境，或者告诉我你的心情。',rain:'下雨天，先挑点热乎的吧。给你配了一份轻松的小餐。',morning:'出发之前，给今天准备一份简单的早餐吧。',afternoon:'午后慢一点也没关系，挑一点喜欢的味道。',night:'忙了一天，给今晚准备一份省事的搭配吧。',swap:'换一种搭配，看看这次有没有你喜欢的。',full:'那就搭配得丰盛一点，主食也一起选好。',light:'好，选少一点，留一些慢慢逛店的空间。',unsupported:'我现在是本地搭配体验，还不能自由理解所有问题。可以试试“早餐”“热食”“甜点”或下面的情境。',avoid:'已避开这类推荐；商品配料仍请以包装标识为准。',restriction:'我会记住这项饮食要求。店里的商品还缺少经过核实的配料资料，所以我不能确认具体哪款适合你食用。我可以继续介绍商品和所在区域，帮助你找到想核对的商品；食用前请核对包装或向厂家确认。',empty:'当前偏好下没有匹配的搭配。你仍然可以浏览商品和查看位置。',added:'已经放进购物篮了。',found:'跟着标记去看看吧，WASD 可以随时停止引导。',unavailable:'这件商品暂时无法定位，请稍后重试。',local:'本地搭配体验 · 尚未连接 AI',reason:'根据你选择的情境，从店内现有商品搭配。',titles:{rain:['雨の日のひと息','Rainy-day comfort'],morning:['朝の小さな支度','A little morning ritual'],afternoon:['午後のよりみち','An afternoon pause'],night:['おつかれさま','A gentle end to the day']}},
  en:{welcome:'Welcome in. What would make today a little nicer? Choose a moment, or tell me how you feel.',rain:'Let’s start with something warm. Here is an easy little meal for a rainy day.',morning:'A simple breakfast before your little adventure.',afternoon:'Take a little break and pick a flavor you like.',night:'An easy pairing for the end of your day.',swap:'A different little pairing for you to explore.',full:'Let’s make it a fuller meal.',light:'A smaller pairing, with room to keep exploring.',unsupported:'This is a local pairing demo, so I cannot answer every question yet. Try breakfast, warm food, sweets, or a moment below.',avoid:'I have excluded that category. Please check the packaging for ingredients.',restriction:'I will keep that dietary requirement in mind. The catalog has no verified ingredient information, so I cannot confirm which specific products are suitable for you to eat. I can still describe products and help you find them; please check the packaging or manufacturer before eating.',empty:'No pairing matches the current preferences. You can still browse products and their locations.',added:'Added to your basket.',found:'Follow the marker. WASD stops the guided walk at any time.',unavailable:'This item cannot be located yet. Please try again shortly.',local:'Local pairing demo · AI not connected',reason:'A pairing from the products in this store, based on your selected moment.',titles:{rain:['雨の日のひと息','Rainy-day comfort'],morning:['朝の小さな支度','A little morning ritual'],afternoon:['午後のよりみち','An afternoon pause'],night:['おつかれさま','A gentle end to the day']}},
  ja:{welcome:'いらっしゃいませ。今日はどんな気分ですか？場面を選んだり、気軽に話しかけてください。',rain:'雨の日は、温かいものから。気軽に楽しめる組み合わせです。',morning:'お出かけの前に、小さな朝ごはんを。',afternoon:'少しひと休み。好きな味を探しましょう。',night:'今日もおつかれさま。手軽な組み合わせはいかがですか。',swap:'別の組み合わせも見てみましょう。',full:'主食も合わせて、しっかり食べましょう。',light:'少なめにして、ゆっくり選びましょう。',unsupported:'現在はローカル体験版です。朝ごはん、温かいもの、お菓子、または下の場面をお試しください。',avoid:'その種類を候補から外しました。原材料は包装でご確認ください。',restriction:'その食事条件を覚えておきます。確認済みの原材料情報がないため、安心して食べられる商品は特定できません。商品の紹介や場所の案内はできます。食べる前に包装やメーカーの情報をご確認ください。',empty:'条件に合う組み合わせがありません。商品の一覧や場所は引き続き確認できます。',added:'かごに入れました。',found:'目印を見ながら進みましょう。WASDで案内を止められます。',unavailable:'まだ商品の場所を確認できません。少ししてからお試しください。',local:'ローカル体験版 · AI未接続',reason:'選んだ場面に合わせて、店内の商品を組み合わせました。',titles:{rain:['雨の日のひと息','Rainy-day comfort'],morning:['朝の小さな支度','A little morning ritual'],afternoon:['午後のよりみち','An afternoon pause'],night:['おつかれさま','A gentle end to the day']}}
 };
 function language(text,fallback='en'){if(/[ぁ-んァ-ヶ]/u.test(text))return 'ja';if(/[\u3400-\u9fff]/u.test(text))return 'zh';if(/[a-z]/i.test(text))return 'en';return fallback;}
 function createState(lang='en'){return {lang,context:'rain',size:'light',variant:0,exclude:[],paused:false};}
 function choose(state){
  if(state.paused)return [];
  if(recipes){
   const byId=new Map(products.map(p=>[p.id,p]));
   const options=recipes[state.context]||[],eligible=p=>p&&!p.unavailable&&!p.tags.some(t=>state.exclude.includes(t));
   const pick=(options[state.variant%options.length]||[]).map(id=>byId.get(id)).filter(eligible).slice(0,state.size==='full'?3:2);
   const pool=[...new Set(options.flat())].map(id=>byId.get(id)).filter(eligible);
   const wanted=state.size==='full'?3:2;
   for(const p of pool){if(pick.length>=wanted)break;if(pick.some(q=>q.id===p.id))continue;if(['main','drink'].includes(p.role)&&pick.some(q=>q.role===p.role))continue;pick.push(p);}
   return pick;
  }
  const pools={rain:['oden','sandwich','ramen','coffee','seafood'],morning:['sandwich','coffee','snacks','ramen'],afternoon:['coffee','sweets','icecream','snacks','sandwich'],night:['ramen','oden','sandwich','seafood','sweets']};
  const eligible=pools[state.context].map(id=>products.find(p=>p.id===id)).filter(p=>!p.tags.some(t=>state.exclude.includes(t)));
  if(!eligible.length)return [];
  const n=state.size==='full'?3:2,offset=state.variant%eligible.length;
  return [...eligible.slice(offset),...eligible.slice(0,offset)].slice(0,n);
 }
 function reply(text,state){
  state.lang=language(text,state.lang);const c=copy[state.lang];let key='unsupported';const t=text.toLowerCase();
  if(/过敏|アレルギー|allerg|vegan|素食|ヴィーガン|妊娠|pregnan|halal|清真/.test(t))state.paused=true;
  // Read independent preferences together; explicit time takes precedence over mood.
  if(/你好|hello|hi\b|こんにちは/.test(t))key='welcome';
  if(/早|morning|breakfast|朝/.test(t)){state.context='morning';key='morning';}
  else if(/夜|晚|night|dinner/.test(t)){state.context='night';key='night';}
  else if(/午|afternoon/.test(t)){state.context='afternoon';key='afternoon';}
  else if(/雨|冷|热|累|rain|warm|tired|寒|温か/.test(t)){state.context='rain';key='rain';}
  else if(/甜|零食|无聊|sweet|snack|bored|お菓子/.test(t)&&!/不.*甜|no sweets|甘くない/.test(t)){state.context='afternoon';key='afternoon';}
  if(/很饿|吃饱|full meal|hungry|しっかり/.test(t)){state.size='full';key='full';}
  else if(/少一点|垫|light bite|少なめ/.test(t)){state.size='light';key='light';}
  if(/换|another|swap|別の/.test(t)){state.variant++;key='swap';}
  if(/不.*甜|不要糖|no sweets|less sugar|甘い.*いらない|甘くない/.test(t)){state.exclude=[...new Set([...state.exclude,'sweet'])];key='avoid';}
  if(/不.*咖啡|无咖啡因|避免咖啡|no coffee|no caffeine|without caffeine|caffeine.free|カフェイン.*(なし|抜き|いらない)/.test(t)){state.exclude=[...new Set([...state.exclude,'caffeine'])];key='avoid';}
  const selected=choose(state);return {text:state.paused?c.restriction:selected.length?c[key]:c.empty,products:selected};
 }
 function selectContext(state,context){if(['morning','afternoon','rain','night'].includes(context)){state.context=context;state.variant=0;}return state;}
 function configure(data){products=data.products;recipes=Object.fromEntries(data.scenarios.map(s=>[s.id,s.recipes]));}
 const api={get products(){return products;},copy,language,createState,choose,reply,selectContext,configure};scope.FujiClerkEngine=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

