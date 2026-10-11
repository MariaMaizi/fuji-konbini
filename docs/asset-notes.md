# Asset and dependency notes

The website uses 11 current GLB exports, plus JSON layout/replacement manifests. Older full-scene exports are intentionally left out. The current editable merged Blender project is `fuji-711-clean-v27.blend` in the separate local modeling archive; this Git snapshot does not contain that editable source.

The separate `design/product-orthographics/` gallery contains 30 owner-supplied GPT product reference sheets in seven collections. These are unchanged original image files, not product-card label art. `index.json` records source reference names, dimensions and SHA-256 checksums. Some reference designs were revised or not used in the current scene.

Runtime geometry and textures are kept unchanged. Product images are the existing integrated assets. Scene screenshots are existing local captures. This packaging step does not generate new art or alter products.

The largest runtime model is about 72.5 MiB, so the initial snapshot can use ordinary Git. GitHub warns for files above 50 MiB and blocks files above 100 MiB. The editable Blender source exceeds that ordinary-file limit and is excluded. If model exports become frequent or larger, plan Git LFS before accumulating more binary history. Source: [GitHub large-file guidance](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github).

`web/vendor/` contains Three.js and accompanying loader/control/geometry utility scripts. The bundled core header identifies Three.js Authors and MIT licensing. The MIT text is included in `web/vendor/LICENSE-three.txt`.

7-Eleven and product names, packaging, logos and supplied reference artwork are third-party materials used in this personal prototype. No affiliation is claimed and this repository does not grant redistribution rights for those materials. No project-wide open-source license has been chosen.
