(function () {
 'use strict';
 const cases = {
  fitness: {
   label: ['Fitness', '健身'], ids: ['chilled:1_06','chilled:4_20','chilled:4_19'], context: 'afternoon', size: 'full',
   matches: [/健身|训练后|訓練後|练完|練完|运动后|運動後|锻炼|鍛煉|高蛋白|补充蛋白|減脂|减脂/, /\b(?:gym|workout|fitness|protein)\b/i, /トレーニング|筋トレ|運動後|たんぱく/],
   zh: ['健身后想吃一餐，有什么搭配？','可以先看看三文鱼饭团、冷豆腐和毛豆：这份示例把主食与豆类组合在一起，方便训练后挑一餐。它不是按你的个人营养目标计算的方案，具体热量、蛋白质与配料需要核对包装。点 Find 去冷食柜看看，再把喜欢的商品加入购物篮。'],
   en: ['What could I pick for a meal after a workout?','Start with the salmon rice ball, chilled tofu and edamame: a prepared example combining rice and soy foods for a post-workout meal. This is not a personalized nutrition calculation; check the packaging for calories, protein and ingredients. Use Find to visit the chilled-food cabinet, then Add your choices.'],
   ja: ['トレーニング後の食事に、何を選べますか？','鮭おにぎり、冷ややっこ、枝豆を見てみましょう。ご飯と大豆食品を組み合わせた、運動後の食事選びのデモです。個人の栄養目標を計算した提案ではありません。カロリー・たんぱく質・原材料は包装で確認してください。Find で冷蔵棚へ移動し、気に入った商品を Add できます。']
  },
  daily: {
   label: ['Daily care','日用品'], ids: ['daily:7_01','daily:7_05'], context: 'afternoon',
   matches: [/牙刷|牙膏|洗漱|日用品|盥洗/, /\b(?:toothbrush|toothpaste|toiletries|daily essentials)\b/i, /歯ブラシ|歯磨き|日用品/],
   zh: ['旅行忘带牙刷和牙膏了，店里有吗？','有，先看看蓝色普通牙刷和 Clinica 牙膏。这两款在日用品货架；点对应卡片的 Find，就能走到那一侧。你可以分别 Add，或用 Add pairing 一起加入购物篮。部分日用品还没有独立标签图，卡片会保留现有占位图，不影响定位。'],
   en: ['I forgot my toothbrush and toothpaste. Can I find them here?','Yes—take a look at the regular blue toothbrush and Clinica toothpaste on the daily-care shelf. Use each card’s Find control to visit that side of the aisle. Add them separately or use Add pairing. Some daily-care items still use placeholder artwork; their shelf locations remain available.'],
   ja: ['旅行に歯ブラシと歯磨き粉を忘れました。ありますか？','青い歯ブラシと Clinica の歯磨き粉があります。日用品の棚にあるので、各カードの Find で売り場へ移動できます。個別に Add するか、Add pairing で両方をかごに入れてみてください。一部の日用品は商品画像が未整備のため、仮の画像を表示しています。']
  },
  breakfast: {
   label: ['Breakfast','早餐'], ids: ['chilled:1_01','drinks:GREEN_TEA'], context: 'morning',
   matches: [/早餐|早饭|早飯|早上.*吃/, /\bbreakfast\b/i, /朝食|朝ごはん/],
   zh: ['出发前想吃一份简单的早餐。','出发前可以先看看鸡蛋三明治和绿茶，选择一份拿取方便的早餐。三明治在冷食柜，绿茶在饮料区；两张卡都可以单独 Find。喜欢的话用 Add 收进购物篮。'],
   en: ['I want a simple breakfast before heading out.','Take a look at the egg sandwich and green tea for a convenient breakfast. The sandwich is in the chilled-food cabinet and the tea is in the drinks section. Each card has its own Find control; use Add to keep your choices in the basket.'],
   ja: ['出発前に簡単な朝食を選びたいです。','たまごサンドと緑茶を見てみましょう。サンドイッチは冷蔵棚、緑茶は飲料売り場にあります。各カードの Find でそれぞれの棚へ移動し、Add でかごに入れられます。']
  },
  rain: {
   label: ['Rainy day','雨天'], ids: ['oden:daikon','oden:egg'], context: 'rain',
   matches: [/关东煮|關東煮|淋雨|雨天|下雨|热食|熱食|暖和/, /\b(?:oden|rainy|raining|warm food|something warm)\b/i, /おでん|雨の日|温かいもの/],
   zh: ['雨天有点冷，想找点热食。','进来歇一会儿吧。可以看看关东煮白萝卜和鸡蛋，两样都在同一个关东煮柜台。先点 Find 看看位置，再用 Add pairing 把这份热食组合加入购物篮。'],
   en: ['It is rainy and cold. I would like something warm.','Come in for a little break. Take a look at oden daikon and egg, both at the oden counter. Use Find to see their location, then Add pairing to put this warm-food selection in your basket.'],
   ja: ['雨で少し寒いので、温かいものが欲しいです。','少し休んでいきませんか。おでんの大根とたまごは、どちらも同じおでん売り場にあります。Find で場所を確認し、Add pairing でかごに入れてみてください。']
  },
  frozen: {
   label: ['Ice bars','冰棒'], ids: ['ice_lower:09','ice_lower:10'], context: 'afternoon',
   matches: [/冰棒|冰棍|雪糕|冰淇淋/, /\b(?:ice bars?|ice cream|frozen treat|popsicles?)\b/i, /アイス|氷菓/],
   zh: ['想看看清爽一点的冰棒。','可以比较 Gari Soda 和 Gari Mandarin 两款冰棒，先看看哪一种口味更合心意，再用 Find 前往冰柜。这里没有根据口味或包装推断“低热量”，具体营养数值仍要核对产品资料。'],
   en: ['Show me some refreshing ice bars.','Compare Gari Soda and Gari Mandarin, then use Find to visit the freezer. Choose the flavor you prefer. A flavor name or package does not establish a low-calorie claim; check the product information for nutrition values.'],
   ja: ['さっぱりしたアイスバーを見たいです。','Gari Soda と Gari Mandarin を比べて、好みの味を選んでみましょう。Find で冷凍ケースへ移動できます。味や包装だけでは低カロリーとは判断できないため、栄養の数値は商品情報で確認してください。']
  },
  picnic: {
   label: ['Picnic','野餐'], ids: ['chilled:1_06','drinks:BARLEY_TEA'], context: 'morning', size: 'light',
   scenario: {time:'11:30',nextMeal:'14:30',activityMinutes:120,coldBag:false},
   matches: [/野餐|富士山.*午餐|饭团.*茶|飯糰.*茶/, /\bpicnic\b|rice ball.*tea/i, /ピクニック|おにぎり.*お茶/],
   zh: ['现在11:30，下午要在富士山附近步行拍照两小时，14:30才能再吃东西。想买饭团和茶，怎样选才不只看低热量？','先看看三文鱼饭团和大麦茶，作为主食与饮品的起点。真正要留意的是用餐间隔和后面的活动：你要到14:30才能再吃，不能因为搭配看起来清淡，就认定分量一定适合。饭团配茶也不等于完整的一餐；可按自己的食量补足食物或准备加餐。下面的数值只用于比较项目方案，不是你的个人能量需求。'],
   en: ['It is 11:30. I will walk and take photos near Fuji for two hours, with no next meal until 14:30. How should I choose rice and tea beyond just low calories?','Start with a salmon rice ball and barley tea as a rice-and-drink base. The meal interval and your plans matter: looking light does not establish that this amount will suit you until 14:30. Rice and tea alone are not a complete meal plan; adjust the amount or add food to your appetite and plans. The figures below compare project examples, not your personal energy needs.'],
   ja: ['今11時30分です。午後は富士山の近くで2時間歩いて撮影し、次の食事は14時30分です。おにぎりとお茶を、低カロリーだけで選ばないためには？','鮭おにぎりと麦茶を、主食と飲み物の出発点として見てみましょう。大切なのは次の食事までの時間と行動予定です。軽そうだから14時30分まで十分とは判断できません。量や追加の食べ物は食欲と予定に合わせてください。下の数値はプロジェクト内の比較用で、個人の必要エネルギーを計算したものではありません。'],
   steps: [
    {ids:['chilled:1_06','drinks:BARLEY_TEA','chilled:4_06'],matches:[/再加.*水果|加一份水果/,/add.*fruit/i,/フルーツ.*追加|果物.*追加/],
     zh:['保留饭团和茶，再加一份水果。我没有保冷袋，剩下的能带着走两小时再吃吗？','保留饭团和大麦茶，增加混合水果杯。水果增加了食物种类，但不代表蛋白质或整餐分量已经合适。还有一个比搭配更容易忽略的条件：水果杯和这里的饭团都标为冷藏。没有保冷条件时，不建议把它们放在包里走两小时后再吃；可在店里先吃，或按包装要求保冷携带。'],
     en:['Keep the rice ball and tea, and add fruit. I have no cooler bag; can I save the rest for after a two-hour walk?','The rice ball and tea stay selected, with a mixed fruit cup added. Fruit adds variety; it does not establish that the protein or portion size is right for you. Storage is an easy detail to miss: this project lists both the fruit cup and rice ball as refrigerated. Without a cold source, do not plan to leave them in a bag for the walk and eat later. Eat now, or maintain the storage conditions on the packaging.'],
     ja:['おにぎりとお茶はそのままで、果物を追加してください。保冷バッグがありません。残りは2時間歩いた後で食べてもいいですか？','ミックスフルーツカップを追加しました。種類は増えますが、たんぱく質や量が適切になったとは限りません。見落としやすいのは保存です。このプロジェクトでは果物とおにぎりは冷蔵扱いです。保冷できないバッグに入れて歩いた後に食べる予定にはせず、今食べるか、包装に示された温度を保って持ち運んでください。']},
    {ids:['chilled:1_06','drinks:BARLEY_TEA','chilled:5_06'],matches:[/水果.*换.*酸奶|水果.*換.*酸奶|换成酸奶|換成酸奶/,/replace.*fruit.*yogurt|swap.*yogurt/i,/ヨーグルト.*変更|果物.*ヨーグルト/],
     zh:['那我现在吃完再出发。把水果换成酸奶，饭团和茶不变，营养上有什么取舍？','已把水果杯换成明治保加利亚酸奶，饭团和大麦茶保留。按项目虚拟资料，替换后蛋白质合计增加4g，能量增加32 kcal；这不是“热量越低越好”的选择。你增加了乳制品、减少了水果种类，不代表酸奶在所有方面都更好。现在吃完更符合这次没有保冷袋的安排；也要确认乳制品是否适合自己。最终分量仍应结合食欲和下一次进食时间调整。'],
     en:['I will eat now before leaving. Replace the fruit with yogurt, keeping the rice ball and tea. What is the nutrition trade-off?','Meiji Bulgaria yogurt replaces the fruit cup; the rice ball and tea stay selected. In the project’s simulated data, this adds 4 g of protein and 32 kcal to the total. Lower calories are not automatically the better choice. You gain a dairy item and lose fruit variety; yogurt is not better in every respect. Eating now fits the no-cooler plan, and dairy suitability still needs checking. Adjust the final amount to your appetite and next eating opportunity.'],
     ja:['出発前に今食べます。果物だけヨーグルトに替えて、おにぎりとお茶はそのままで。栄養面の違いは？','果物を明治ブルガリアヨーグルトに替えました。プロジェクトの仮想データでは合計たんぱく質が4g、エネルギーが32kcal増えます。低カロリーほど良いとは限りません。乳製品が加わり果物の種類は減るため、すべての面で優れるわけではありません。今食べる方が保冷バッグなしの予定に合います。乳製品が自分に適するかも確認し、量は食欲と次の食事に合わせてください。']}
   ]
  },
  treat: {
   label: ['Little treat','小奖励'], ids: ['snacks:NEW_01','drinks:SPARKLING_WATER'], context: 'afternoon',
   matches: [/小奖励|小獎勵|奖励自己|獎勵自己|巧克力|休息.*零食|下午.*零食/, /\b(?:little treat|reward myself|chocolate|afternoon snack)\b/i, /ご褒美|チョコ|おやつ/],
   zh: ['想休息一下，给自己挑一点小奖励。','给自己留个小小的休息时间吧。可以看看明治牛奶巧克力和气泡水，一份甜食配一瓶饮料。分别点 Find 看看两处货架，比较后再决定要不要加入购物篮。'],
   en: ['I want a little treat for my afternoon break.','Make a little space for your break. Have a look at Meiji milk chocolate and sparkling water: a sweet snack with a drink. Use Find on each card to explore the two shelves, then decide what to add to your basket.'],
   ja: ['休憩に、自分への小さなご褒美を選びたいです。','ひと息つく時間に、明治ミルクチョコレートと炭酸水を見てみませんか。各カードの Find でそれぞれの棚を見てから、かごに入れるか決められます。']
  },
  travel: {
   label: ['Travel kit','出行应急'], ids: ['checkout_impulse:CHARGE_CABLE','checkout_impulse:POCKET_TISSUE'], context: 'afternoon',
   matches: [/充电线|充電線|数据线|數據線|纸巾|紙巾|出行应急|出行應急/, /\b(?:charg(?:e|ing) cable|usb cable|tissues?|travel kit)\b/i, /充電ケーブル|ティッシュ/],
   zh: ['出门忘带充电线和纸巾了，可以在哪找？','这两样可以先去收银台旁的 Checkout 架看看：充电线和便携纸巾。点 Find 会带你到对应位置；喜欢的话可以一起加购。充电线接口和设备是否适配，还需要查看具体包装。'],
   en: ['I forgot my charging cable and tissues. Where can I find them?','Look at the charging cable and pocket tissues on the Checkout shelf beside the counter. Find takes you to their locations, and you can add them together. Check the cable’s packaging to confirm that its connector fits your device.'],
   ja: ['充電ケーブルとティッシュを忘れました。どこにありますか？','レジ横の Checkout 棚にある充電ケーブルとポケットティッシュを見てみましょう。Find で場所を確認し、まとめてかごに入れられます。ケーブルの端子が機器に合うかは包装で確認してください。']
  }
 };
 window.FujiDemoScenarios = cases;
})();
