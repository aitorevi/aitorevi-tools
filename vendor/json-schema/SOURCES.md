# Validación con JSON Schema

`vendor/json-schema.min.js` es un bundle de `esbuild` (IIFE, expone `self.JsonSchema = { Validator, metaschemas }`) con:

- **`@cfworker/json-schema@4.1.6`** (MIT, © 2020 Jeremy Danyow). Es un *intérprete* de JSON Schema: no genera código, así que no usa `new Function` ni `eval` y cabe en la CSP `script-src 'self'` (Ajv sí los usa y no sirve aquí). `npm run vendor:json-schema` lo regenera y `package-lock.json` fija su integridad.
- **Los metaschemas oficiales** de los drafts 4, 7, 2019-09 y 2020-12 (`metaschemas/*.json`), que sirven para validar el propio schema antes de usarlo. © 2022 JSON Schema Specification Authors, licencia BSD de 3 cláusulas (el proyecto los ofrece también bajo AFL 3.0; aquí se usa la BSD). Se descargaron de `https://json-schema.org/` y cada fichero conserva su `$id`:
  - `draft-04.json`, `draft-07.json` → `http://json-schema.org/draft-0{4,7}/schema#`
  - `2019-09*.json` → `https://json-schema.org/draft/2019-09/{schema,meta/*}`
  - `2020-12*.json` → `https://json-schema.org/draft/2020-12/{schema,meta/*}`

Para regenerar: `npm run vendor:json-schema`. Comprobar después que el bundle sigue sin evaluar código:
`grep -c "new Function\|eval(" vendor/json-schema.min.js` debe dar `0`.

La librería solo se carga dentro de un Worker (`validar-json/schema-worker.js`) y solo cuando el usuario activa el modo schema. Nunca descarga referencias remotas (`$ref` a otras direcciones): las trata como no resueltas.
