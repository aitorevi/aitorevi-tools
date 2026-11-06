# Decoder HEIC

Paquete: `@keeratita/heic-converter@0.5.2` (MIT), copiado de su `dist/` y servido desde este sitio. `package-lock.json` fija su integridad:

`sha512-vfmSTwlCvnWWHt23krRNGmQdOg4d1GZImrmqahNh5NCCx/ZdCDP/8bCGHtyVnZnt8R8msTg9OFxJETog406ckw==`

La atestación SLSA de npm apunta a `https://github.com/keeratita/heic-converter`, tag `v0.5.2`, commit `416bb777fd23167b136d13089a1979115ec03cfe`. Verificar con `npm audit signatures`.

WASM construido con `emscripten/emsdk:3.1.56` desde:

- libheif v1.23.5 — `f81f28ac014b1c28dee483ac45b72c6b05bc421a`
- libde265 v1.1.3 — `ba62bf4cfb3242f3bf0a45617ff09e35236e4d82`

Reconstruido localmente el 2026-10-21 con `npm run build:wasm`; `npm run verify:wasm` confirmó hashes idénticos al manifiesto upstream (WASM `0570fb88…a085`, glue `6782e824…7d96`) y ausencia de `eval`/`new Function`.

Licencias LGPL v3 en `COPYING-libheif.txt` y `COPYING-libde265.txt`.
