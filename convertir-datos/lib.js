// Conversor de datos — lógica pura (sin DOM). Las librerías externas se
// inyectan como parámetro `libs` para que el módulo sea testeable con Vitest.
// libs = { yaml: window.jsyaml, xml: window.fxp, toml: window.SmolTOML }

export const FORMATS = ['csv', 'json', 'yaml', 'xml', 'toml'];

// ── CSV ────────────────────────────────────────────────────────────────────

function parseCSV(text) {
  const rows = [];
  let field = '', row = [], inQ = false;
  const flush = () => { row.push(field); field = ''; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else {
      if (c === '"') { inQ = true; }
      else if (c === ',') { flush(); }
      else if (c === '\n' || (c === '\r' && text[i + 1] === '\n')) {
        if (c === '\r') i++;
        flush(); rows.push(row); row = [];
      } else { field += c; }
    }
  }
  flush();
  if (row.length > 1 || row[0] !== '') rows.push(row);
  if (rows.length === 0) throw new Error('CSV vacío.');
  const [headers, ...dataRows] = rows;
  if (dataRows.length === 0) return [];
  return dataRows.map(cells =>
    Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']))
  );
}

function stringifyCSV(data) {
  if (!Array.isArray(data) || data.length === 0) return '';
  const escape = v => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const keys = Object.keys(data[0]);
  const lines = [keys.map(escape).join(',')];
  for (const row of data) lines.push(keys.map(k => escape(row[k])).join(','));
  return lines.join('\n');
}

// ── JSON ───────────────────────────────────────────────────────────────────

function parseJSON(text) { return JSON.parse(text); }
function stringifyJSON(data) { return JSON.stringify(data, null, 2); }

// ── YAML ───────────────────────────────────────────────────────────────────

function parseYAML(text, libs) { return libs.yaml.load(text); }
function stringifyYAML(data, libs) { return libs.yaml.dump(data, { lineWidth: 120 }); }

// ── XML ────────────────────────────────────────────────────────────────────

const XML_PARSER_OPTS = {
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  textNodeName: '#text',
  parseAttributeValue: true,
  parseTagValue: true,
  trimValues: true,
};

const XML_BUILDER_OPTS = {
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  textNodeName: '#text',
  format: true,
  indentBy: '  ',
  suppressEmptyNode: true,
};

function parseXML(text, libs) {
  const parser = new libs.xml.XMLParser(XML_PARSER_OPTS);
  return parser.parse(text);
}

function stringifyXML(data, libs) {
  const builder = new libs.xml.XMLBuilder(XML_BUILDER_OPTS);
  // Si no hay un nodo raíz único, envuelve en <root>
  const keys = Object.keys(data);
  const wrapped = keys.length === 1 ? data : { root: data };
  return `<?xml version="1.0" encoding="UTF-8"?>\n${builder.build(wrapped)}`;
}

// ── TOML ───────────────────────────────────────────────────────────────────

function parseTOML(text, libs) { return libs.toml.parse(text); }
function stringifyTOML(data, libs) { return libs.toml.stringify(data); }

// ── Conversor principal ────────────────────────────────────────────────────

export function convert(text, from, to, libs) {
  if (from === to) return text;
  const data = parse(text, from, libs);
  return serialize(data, to, libs);
}

function parse(text, fmt, libs) {
  switch (fmt) {
    case 'csv':  return parseCSV(text);
    case 'json': return parseJSON(text);
    case 'yaml': return parseYAML(text, libs);
    case 'xml':  return parseXML(text, libs);
    case 'toml': return parseTOML(text, libs);
    default: throw new Error(`Formato desconocido: ${fmt}`);
  }
}

function serialize(data, fmt, libs) {
  switch (fmt) {
    case 'csv':  return stringifyCSV(data);
    case 'json': return stringifyJSON(data);
    case 'yaml': return stringifyYAML(data, libs);
    case 'xml':  return stringifyXML(data, libs);
    case 'toml': return stringifyTOML(data, libs);
    default: throw new Error(`Formato desconocido: ${fmt}`);
  }
}

export const SAMPLE_CSV =
`name,age,city
Alice,30,Madrid
Bob,25,Barcelona`;
