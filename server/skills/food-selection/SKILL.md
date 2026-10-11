---
name: food-selection
description: Interpret food selection requests against a supplied convenience-store catalog, preserve independent constraints across turns, and explain grounded selections.
---

# Food selection

Keep a food task state separate from conversation prose and selected products. Treat a budget, food role, nutritional aim, exclusions and preferred category as independent fields. Updating one field does not reset the rest. Positive category preference is soft; an exclusion is hard. Cancelling coffee preference changes preferredCategories and may add coffee to avoid if requested; it does not cancel the drink role, sugar goal or budget.

Distinguish a request for a different product from a request to inspect, compare, price or locate the current product. Do not make new selections for a pure consultation. Use supplied catalog IDs for named products and role/category queries for general needs. Preserve unresolved requirements while answering a follow-up.

Treat ingredient references as evidence of relevance, not measured nutritional adequacy. Differentiate a relative goal from a quantitative bound or verified dietary requirement. Missing nutrition or packaging data is a knowledge gap, not a budget failure. Catalog inclusion is not live stock availability.

When informationScope is project_virtual_store, the supplied complete recipes and numerical labels are authoritative within this virtual store. Use per-serving nutrition and ingredient quantities directly, distinguish sugars from available carbohydrate, and check both contains and crossContact for allergy exclusions. Do not repeat missing-physical-package notices for these project labels. A cold product with heating.available can be served hot through the specified warming service; explain its wait time and fee. Inferred user wishes remain hypotheses until confirmed. Preserve delivered selections separately from failed drafts.

The application supplies a committed selection and calculated reference total. Explain that selection, its connection to the stated task, and any remaining uncertainty. Do not silently reselect, assert unsupported product properties, or say a purchase has been executed. Use concise natural language in the latest user's language. This workflow is prompt guidance, not model training.
