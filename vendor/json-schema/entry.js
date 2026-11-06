// Entrada del bundle vendor/json-schema.min.js (ver SOURCES.md).
// Expone window.JsonSchema = { Validator, metaschemas }. `metaschemas[draft]` es la
// lista de metaschemas oficiales de ese draft, para registrarlos con addSchema y
// validar un schema contra el suyo antes de usarlo.
import { Validator } from "@cfworker/json-schema";
import draft04 from "./metaschemas/draft-04.json";
import draft07 from "./metaschemas/draft-07.json";
import s201909 from "./metaschemas/2019-09.json";
import c201909 from "./metaschemas/2019-09-core.json";
import a201909 from "./metaschemas/2019-09-applicator.json";
import v201909 from "./metaschemas/2019-09-validation.json";
import m201909 from "./metaschemas/2019-09-meta-data.json";
import f201909 from "./metaschemas/2019-09-format.json";
import t201909 from "./metaschemas/2019-09-content.json";
import s202012 from "./metaschemas/2020-12.json";
import c202012 from "./metaschemas/2020-12-core.json";
import a202012 from "./metaschemas/2020-12-applicator.json";
import u202012 from "./metaschemas/2020-12-unevaluated.json";
import v202012 from "./metaschemas/2020-12-validation.json";
import m202012 from "./metaschemas/2020-12-meta-data.json";
import f202012 from "./metaschemas/2020-12-format-annotation.json";
import t202012 from "./metaschemas/2020-12-content.json";

export { Validator };
export const metaschemas = {
  "4": [draft04],
  "7": [draft07],
  "2019-09": [s201909, c201909, a201909, v201909, m201909, f201909, t201909],
  "2020-12": [s202012, c202012, a202012, u202012, v202012, m202012, f202012, t202012],
};
