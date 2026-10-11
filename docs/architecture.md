# Architecture

The browser loads vendored Three.js scripts and the files listed in `web/index.html`. `app.js` coordinates the outdoor scene and the store. `src/blender-scene.js` loads the checkout base scene; individual station modules load the newer coffee, food, shelf and floor layers and remove their replaced objects. Loading older complete-scene exports alongside these layers would duplicate or regress the scene.

`navigation.js` owns walking and wayfinding. `characters.js` adds the customer and cashier prototypes. `product-catalog.js` maps catalog nodes to the loaded scene, while `catalog-panel.js` and `clerk-ui.js` handle cards, browsing, conversation and basket actions.

The browser client `clerk-api.js` calls the same-origin Node server. `server/clerk-server.cjs` serves only `web/`, handles request limits and diagnostics, and selects the configured model adapter. The credential files sit outside the static directory.

The current example configuration enables `direct`: the model receives conversation history and compact facts for all 603 entries; returned IDs are mapped to at most three unique catalog cards. It does not apply the structured food planner's semantic validators to the reply text. Historical structured/planner modules and their offline tests are retained for comparison and future development. They should not be described as active protections in direct mode.

The local clerk engine remains part of the initial pairing/preferences experience. Failed remote conversation requests are not silently replaced by local generated answers. This is API integration and application logic, not custom model training.

Catalog identity and modeled positions live in `web/data/product-catalog.json`. Project prices and food information are separate JSON datasets. Preserve IDs and the distinction between source facts, reference information, and fictional project values.

This snapshot is a localhost application. Public hosting, authentication for visitors, shared usage controls and a production deployment are separate work.
