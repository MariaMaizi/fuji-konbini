# Local source context / 本地来源摘录

The audit describes the original working project. The GitHub application uses `web/` where the working project uses `outputs/fuji-711-diorama/`. This document preserves evidence for two local-only files without adding runtime code.

## Local preview launcher

The local `start-preview.ps1` checks port 8011, then launches Node with `server/clerk-server.cjs` in a hidden process and redirects local logs. This repository uses the existing `npm start` script to start that same backend entry point. The local launcher itself is not shipped here.

## Virtual food data generator

Read-only excerpts from `work/build-food-information-v57.cjs`, captured for the audit. These lines explain the project calorie calculation, dietary inference, caffeine branch and energy-based satiety labels. They are evidence of implementation, not verified nutrition claims or a recommendation to use these heuristics. The limitations and concrete data errors are discussed in the full audit.

```javascript
 const animal=contains.has('fish')||contains.has('mentaiko')||contains.has('shrimp')||contains.has('crab')||/chicken|beef|pork|ham|meat|sausage/.test(n)||components.some(c=>/肉|虾|鱼|蟹/.test(c));
 const caffeineMg=caffeinated?/energy drink/.test(n)?80:/coffee/.test(n)?100:/latte/.test(n)?60:/tea|matcha/.test(n)?40:/cola/.test(n)?45:10:0;
  nutrition:{kcal:Math.round(protein*4+fat*9+carbs*4),protein_g:protein,fat_g:fat,carbs_g:carbs,sugar_g:sugar,available_carbs_g:carbs,salt_g:salt,sodium_mg:Math.round(salt*393.7),caffeine_mg:caffeineMg},
  nutritionBasis:'project_per_serving_design; not physical package measurements; Japanese 糖質 is available carbohydrate, not sugar',dietary:{vegetarian:!animal,vegan:!animal&&!contains.has('milk')&&!contains.has('egg')&&!/honey/.test(n),halal:null},
  stock:{status:'available_in_virtual_store',basis:'project_catalog_setting'},storage:temp==='frozen'?'frozen':temp==='cold'?'refrigerated':'shelf_or_service',utensils:liquid.has(k)?['cup']:['bento','pasta','noodle','curry','porridge','gratin','salad','side'].includes(k)?['chopsticks_or_spoon']:[],satiety:protein*4+fat*9+carbs*4>=500?'full_meal':protein*4+fat*9+carbs*4>=180?'light_meal':'light_snack'};
```
