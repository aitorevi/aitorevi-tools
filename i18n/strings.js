// Generado por build.mjs — no editar a mano.
export const STRINGS = {
  "es": {
    "_common": {
      "badge": "100% en tu navegador · sin subir nada",
      "addMore": "Añadir más",
      "clear": "Vaciar",
      "moveUp": "Subir",
      "moveDown": "Bajar",
      "remove": "Quitar",
      "pages": {
        "one": "página",
        "many": "páginas"
      },
      "files": {
        "one": "archivo",
        "many": "archivos"
      },
      "images": {
        "one": "imagen",
        "many": "imágenes"
      },
      "navWeb": "Web",
      "navWebHref": "https://www.aitorevi.dev/",
      "navBlog": "Blog",
      "navBlogHref": "https://www.aitorevi.dev/blog",
      "navHome": "Inicio de aitorevi.tools",
      "langSelect": "Idioma",
      "themeAria": "Cambiar entre tema claro y oscuro",
      "themeTitle": "Cambiar tema",
      "linkedinAria": "LinkedIn de Aitor Reviriego",
      "githubAria": "GitHub de Aitor Reviriego",
      "codeInput": "Entrada",
      "codeOutput": "Resultado",
      "codeFormat": "Formatear",
      "codeMinify": "Minificar",
      "codeCopy": "Copiar",
      "codeCopied": "¡Copiado!",
      "codeSample": "Probar ejemplo",
      "codePlaceholder": "Pega aquí tu código…",
      "codeError": "No se pudo procesar:",
      "codeDialect": "Dialecto",
      "codeTarget": "Lenguaje"
    },
    "separar-pdf": {
      "pages": {
        "one": "página",
        "many": "páginas"
      },
      "selected": {
        "one": "seleccionada",
        "many": "seleccionadas"
      },
      "pageTag": "página",
      "notPdf": "Ese archivo no parece un PDF. Prueba con otro.",
      "reading": "Leyendo el PDF…",
      "noPages": "El PDF no tiene páginas.",
      "readError": "No se pudo leer el PDF. Puede estar dañado o protegido con contraseña.",
      "dlTitle": "Descargar solo la página {n}",
      "preparing": "Preparando la página {n}…",
      "pageDownloaded": "Página {n} descargada.",
      "extractError": "No se pudo extraer la página {n}.",
      "generating": "Generando {n} páginas…",
      "zipDownloaded": "ZIP con {n} páginas descargado.",
      "zipError": "No se pudo generar el ZIP.",
      "confirmMany": "Vas a descargar {n} archivos por separado. Tu navegador puede pedirte permiso para descargas múltiples. ¿Continuar?",
      "downloadingMany": "Descargando {n} páginas…",
      "manyDownloaded": "{n} páginas descargadas.",
      "manyError": "Hubo un problema durante las descargas."
    },
    "unir-pdf": {
      "notPdf": "Eso no parece un PDF. Añade archivos PDF.",
      "reading": "Leyendo {n} {files}…",
      "addedFailed": "{added} añadido(s); {failed} no se pudieron leer (¿dañados o protegidos?).",
      "needMore": "Añade al menos otro PDF para unir.",
      "merging": "Uniendo los PDFs…",
      "mergedOk": "PDF unido con {n} {pages} descargado.",
      "mergeError": "No se pudo unir los PDFs."
    },
    "imagen-a-pdf": {
      "addImages": "Añade imágenes JPG o PNG.",
      "reading": "Leyendo {n} {images}…",
      "creating": "Creando el PDF…",
      "createdOk": "PDF con {n} {images} descargado.",
      "createError": "No se pudo crear el PDF."
    },
    "marca-de-agua-pdf": {
      "notPdf": "Ese archivo no parece un PDF.",
      "reading": "Leyendo el PDF…",
      "readError": "No se pudo leer el PDF. Puede estar dañado o protegido.",
      "needText": "Escribe el texto de la marca de agua.",
      "applying": "Aplicando la marca de agua…",
      "appliedOk": "PDF con marca de agua ({n} {pages}) descargado.",
      "applyError": "No se pudo aplicar la marca de agua."
    },
    "n-up-pdf": {
      "reading": "Leyendo {n} {files}…",
      "notPdf": "Eso no parece un PDF. Añade archivos PDF.",
      "failedRead": "{failed} no se pudieron leer (¿dañados o protegidos?).",
      "arranging": "Recolocando las páginas…",
      "arrangedOk": "PDF con {per} por hoja ({sheets} {sheetsWord}) descargado.",
      "arrangeError": "No se pudo recolocar el PDF.",
      "sheets": {
        "one": "hoja",
        "many": "hojas"
      }
    },
    "comprimir-imagen": {
      "notImage": "Eso no parece una imagen.",
      "reading": "Leyendo la imagen…",
      "readError": "No se pudo leer la imagen.",
      "originalLabel": "Original:",
      "calculating": "Calculando resultado…",
      "resultLabel": "Resultado:",
      "qualityWord": "calidad",
      "overNote": " — no baja más a esta resolución",
      "downloadedLabel": "Descargada:",
      "compressError": "No se pudo comprimir la imagen."
    },
    "convertir-imagen": {
      "notImage": "Eso no parece una imagen.",
      "reading": "Leyendo la imagen…",
      "readError": "No se pudo leer la imagen.",
      "originalLabel": "Original:",
      "calculating": "Calculando resultado…",
      "resultLabel": "Resultado:",
      "downloadedIn": "Descargado en",
      "convertError": "No se pudo convertir la imagen."
    },
    "quitar-metadatos-imagen": {
      "notImage": "Eso no parece una imagen.",
      "onlyJpgPng": "De momento solo JPG y PNG.",
      "reading": "Leyendo la imagen…",
      "readError": "No se pudo leer la imagen.",
      "removedOk": "Metadatos eliminados (−{n}). Los píxeles no se han tocado.",
      "noneFound": "Descargada. No se han encontrado metadatos que eliminar.",
      "processError": "No se pudo procesar la imagen."
    },
    "formatear-json": {
      "guide": {
        "title": "Reglas de JSON",
        "intro": "JSON representa datos con estos tipos y reglas. La mayoría de errores vienen de saltárselas:",
        "groups": {
          "types": "Tipos de dato",
          "rules": "Reglas y errores típicos"
        },
        "desc": {
          "strType": "Texto, siempre entre comillas dobles",
          "numType": "Número (entero o decimal), sin comillas",
          "boolType": "Booleano: true o false",
          "nullType": "Valor nulo / vacío",
          "arrType": "Array: lista ordenada de valores",
          "objType": "Objeto: pares clave/valor",
          "keysRule": "Las claves van siempre entre comillas dobles",
          "trailingComma": "No se permite coma tras el último elemento",
          "singleQuote": "Las comillas simples no son válidas (usa dobles)",
          "noComments": "JSON no admite comentarios"
        }
      }
    },
    "formatear-xml": {
      "guide": {
        "title": "Notas sobre XML",
        "intro": "El XML anida elementos bien formados: cada apertura tiene su cierre. Construcciones:",
        "groups": {
          "structure": "Estructura",
          "special": "Especiales"
        },
        "desc": {
          "openTag": "Abre un elemento",
          "closeTag": "Cierra el elemento (mismo nombre)",
          "selfClose": "Elemento vacío, sin contenido",
          "attr": "Atributo del elemento (clave=\"valor\")",
          "comment": "Comentario",
          "cdata": "Texto literal: no se interpreta como XML",
          "declaration": "Declaración: versión y codificación",
          "entity": "Entidad para caracteres especiales (&lt; &gt; &amp; …)"
        }
      }
    },
    "formatear-sql": {
      "guide": {
        "title": "Dialectos y notas de SQL",
        "intro": "Elige el dialecto que uses para que el formato respete su sintaxis.",
        "groups": {
          "dialects": "Dialectos",
          "notes": "Notas"
        },
        "desc": {
          "std": "Estándar genérico (ANSI)",
          "mysql": "MySQL y MariaDB",
          "postgresql": "PostgreSQL",
          "sqlite": "SQLite",
          "tsql": "Transact-SQL — Microsoft SQL Server",
          "plsql": "PL/SQL — Oracle",
          "bigquery": "Google BigQuery",
          "semicolon": "Separa sentencias",
          "keywords": "El formateador pone las palabras clave en MAYÚSCULA",
          "quoting": "Las comillas de identificadores varían según el dialecto"
        }
      }
    },
    "formatear-yaml": {
      "guide": {
        "title": "Notas sobre YAML",
        "intro": "YAML anida con indentación de espacios (nunca tabuladores). Elementos y trampas frecuentes:",
        "groups": {
          "structure": "Estructura",
          "gotchas": "Trampas habituales"
        },
        "desc": {
          "pair": "Separa la clave del valor (clave: valor)",
          "listItem": "Elemento de una lista",
          "comment": "Comentario hasta el fin de línea",
          "literal": "Bloque literal: conserva los saltos de línea",
          "folded": "Bloque plegado: une las líneas con espacios",
          "noTabs": "Los tabuladores están prohibidos; usa espacios",
          "boolTrap": "yes/no/on/off se leen como booleanos; comilla el texto",
          "quote": "Comillas para forzar texto (números, yes/no…)",
          "docSep": "Separa varios documentos en un mismo archivo"
        }
      }
    },
    "formatear-html-css": {
      "guide": {
        "title": "HTML y CSS",
        "intro": "La herramienta detecta el lenguaje: si empieza por «<» lo trata como HTML; si no, como CSS.",
        "groups": {
          "html": "HTML",
          "css": "CSS"
        },
        "desc": {
          "openTag": "Abre un elemento",
          "closeTag": "Cierra el elemento",
          "selfClose": "Elemento sin contenido (img, br, input…)",
          "attr": "Atributo del elemento (clave=\"valor\")",
          "htmlComment": "Comentario en HTML",
          "rule": "Regla: un selector y su bloque de declaraciones",
          "declaration": "Declaración: propiedad y valor, termina en ;",
          "classSel": "Selecciona los elementos con esa clase",
          "idSel": "Selecciona el elemento con ese id",
          "cssComment": "Comentario en CSS"
        }
      }
    },
    "jwt": {
      "expired": "Expirado",
      "expires": "Expira:",
      "issued": "Emitido:",
      "guide": {
        "title": "Notas sobre JWT",
        "intro": "Un JWT tiene tres partes separadas por puntos y codificadas en Base64URL. El payload lleva los datos (claims):",
        "groups": {
          "parts": "Partes del token",
          "registered": "Claims estándar (registrados)",
          "header": "Campos del header",
          "common": "Claims habituales"
        },
        "desc": {
          "header": "Algoritmo y tipo del token",
          "payload": "Los datos del token (claims)",
          "signature": "Firma que verifica el token; necesita la clave (aquí no se comprueba)",
          "iss": "Issuer: quién emitió el token",
          "sub": "Subject: a quién identifica (normalmente el usuario)",
          "aud": "Audience: para quién es el token",
          "exp": "Expiration: caduca tras esta fecha (UNIX)",
          "nbf": "Not before: no vale antes de esta fecha (UNIX)",
          "iat": "Issued at: cuándo se emitió (UNIX)",
          "jti": "JWT ID: identificador único del token",
          "alg": "Algoritmo de firma (HS256, RS256…)",
          "typ": "Tipo del token, normalmente \"JWT\"",
          "kid": "Key ID: qué clave firmó el token",
          "name": "Nombre del usuario (habitual, no estándar)",
          "email": "Correo del usuario (habitual, no estándar)",
          "role": "Rol o permisos (habitual, no estándar)",
          "scope": "Permisos concedidos (OAuth)"
        }
      }
    },
    "regex": {
      "matchesCount": {
        "one": "{n} coincidencia",
        "many": "{n} coincidencias"
      },
      "guide": {
        "title": "Guía rápida de regex",
        "intro": "Una expresión regular describe un patrón de texto combinando estos elementos:",
        "groups": {
          "anchors": "Anclas",
          "classes": "Clases de caracteres",
          "quantifiers": "Cuantificadores",
          "groups": "Grupos y alternativas",
          "flags": "Flags"
        },
        "desc": {
          "start": "Inicio de línea o del texto",
          "end": "Fin de línea o del texto",
          "wordBoundary": "Límite de palabra",
          "nonBoundary": "Donde NO hay límite de palabra",
          "any": "Cualquier carácter (salvo el salto de línea)",
          "digit": "Un dígito (0–9)",
          "nonDigit": "Cualquier cosa que no sea un dígito",
          "word": "Letra, dígito o guion bajo",
          "space": "Espacio, tabulador o salto de línea",
          "set": "Cualquiera de los caracteres a, b o c",
          "negSet": "Cualquier carácter excepto a, b o c",
          "range": "Un carácter del rango a–z",
          "zeroMore": "El elemento anterior 0 o más veces",
          "oneMore": "El elemento anterior 1 o más veces",
          "optional": "Opcional: 0 o 1 vez",
          "exactly": "Exactamente n veces",
          "between": "Entre n y m veces",
          "lazy": "Versión perezosa: captura lo mínimo posible",
          "capture": "Grupo de captura",
          "nonCapture": "Grupo sin captura (solo agrupa)",
          "named": "Grupo con nombre",
          "alternation": "a o b (alternativa)",
          "backref": "Referencia al grupo capturado nº 1",
          "flagG": "Global: todas las coincidencias, no solo la primera",
          "flagI": "Ignora mayúsculas y minúsculas",
          "flagM": "Multilínea: ^ y $ casan en cada línea",
          "flagS": "El punto . también incluye el salto de línea"
        }
      }
    },
    "diff": {
      "identical": "Los textos son idénticos"
    }
  },
  "en": {
    "_common": {
      "badge": "100% in your browser · nothing uploaded",
      "addMore": "Add more",
      "clear": "Clear",
      "moveUp": "Move up",
      "moveDown": "Move down",
      "remove": "Remove",
      "pages": {
        "one": "page",
        "many": "pages"
      },
      "files": {
        "one": "file",
        "many": "files"
      },
      "images": {
        "one": "image",
        "many": "images"
      },
      "navWeb": "Work",
      "navWebHref": "https://www.aitorevi.dev/en/",
      "navBlog": "Blog",
      "navBlogHref": "https://www.aitorevi.dev/en/blog",
      "navHome": "aitorevi.tools home",
      "langSelect": "Language",
      "themeAria": "Toggle light and dark theme",
      "themeTitle": "Toggle theme",
      "linkedinAria": "Aitor Reviriego on LinkedIn",
      "githubAria": "Aitor Reviriego on GitHub",
      "codeInput": "Input",
      "codeOutput": "Output",
      "codeFormat": "Format",
      "codeMinify": "Minify",
      "codeCopy": "Copy",
      "codeCopied": "Copied!",
      "codeSample": "Try example",
      "codePlaceholder": "Paste your code here…",
      "codeError": "Could not process:",
      "codeDialect": "Dialect",
      "codeTarget": "Language"
    },
    "separar-pdf": {
      "pages": {
        "one": "page",
        "many": "pages"
      },
      "selected": {
        "one": "selected",
        "many": "selected"
      },
      "pageTag": "page",
      "notPdf": "That file doesn't look like a PDF. Try another one.",
      "reading": "Reading the PDF…",
      "noPages": "The PDF has no pages.",
      "readError": "Couldn't read the PDF. It may be damaged or password-protected.",
      "dlTitle": "Download only page {n}",
      "preparing": "Preparing page {n}…",
      "pageDownloaded": "Page {n} downloaded.",
      "extractError": "Couldn't extract page {n}.",
      "generating": "Generating {n} pages…",
      "zipDownloaded": "ZIP with {n} pages downloaded.",
      "zipError": "Couldn't generate the ZIP.",
      "confirmMany": "You're about to download {n} files separately. Your browser may ask permission for multiple downloads. Continue?",
      "downloadingMany": "Downloading {n} pages…",
      "manyDownloaded": "{n} pages downloaded.",
      "manyError": "There was a problem during the downloads."
    },
    "unir-pdf": {
      "notPdf": "That doesn't look like a PDF. Add PDF files.",
      "reading": "Reading {n} {files}…",
      "addedFailed": "{added} added; {failed} couldn't be read (damaged or protected?).",
      "needMore": "Add at least one more PDF to merge.",
      "merging": "Merging the PDFs…",
      "mergedOk": "Merged PDF with {n} {pages} downloaded.",
      "mergeError": "Couldn't merge the PDFs."
    },
    "imagen-a-pdf": {
      "addImages": "Add JPG or PNG images.",
      "reading": "Reading {n} {images}…",
      "creating": "Creating the PDF…",
      "createdOk": "PDF with {n} {images} downloaded.",
      "createError": "Couldn't create the PDF."
    },
    "marca-de-agua-pdf": {
      "notPdf": "That file doesn't look like a PDF.",
      "reading": "Reading the PDF…",
      "readError": "Couldn't read the PDF. It may be damaged or protected.",
      "needText": "Type the watermark text.",
      "applying": "Applying the watermark…",
      "appliedOk": "Watermarked PDF ({n} {pages}) downloaded.",
      "applyError": "Couldn't apply the watermark."
    },
    "n-up-pdf": {
      "reading": "Reading {n} {files}…",
      "notPdf": "That doesn't look like a PDF. Add PDF files.",
      "failedRead": "{failed} couldn't be read (damaged or protected?).",
      "arranging": "Rearranging the pages…",
      "arrangedOk": "PDF with {per} per sheet ({sheets} {sheetsWord}) downloaded.",
      "arrangeError": "Couldn't rearrange the PDF.",
      "sheets": {
        "one": "sheet",
        "many": "sheets"
      }
    },
    "comprimir-imagen": {
      "notImage": "That doesn't look like an image.",
      "reading": "Reading the image…",
      "readError": "Couldn't read the image.",
      "originalLabel": "Original:",
      "calculating": "Calculating result…",
      "resultLabel": "Result:",
      "qualityWord": "quality",
      "overNote": " — can't go lower at this resolution",
      "downloadedLabel": "Downloaded:",
      "compressError": "Couldn't compress the image."
    },
    "convertir-imagen": {
      "notImage": "That doesn't look like an image.",
      "reading": "Reading the image…",
      "readError": "Couldn't read the image.",
      "originalLabel": "Original:",
      "calculating": "Calculating result…",
      "resultLabel": "Result:",
      "downloadedIn": "Saved as",
      "convertError": "Couldn't convert the image."
    },
    "quitar-metadatos-imagen": {
      "notImage": "That doesn't look like an image.",
      "onlyJpgPng": "Only JPG and PNG for now.",
      "reading": "Reading the image…",
      "readError": "Couldn't read the image.",
      "removedOk": "Metadata removed (−{n}). Your pixels are untouched.",
      "noneFound": "Downloaded. No metadata found to remove.",
      "processError": "Couldn't process the image."
    },
    "formatear-json": {
      "guide": {
        "title": "JSON rules",
        "intro": "JSON represents data with these types and rules. Most errors come from breaking them:",
        "groups": {
          "types": "Data types",
          "rules": "Rules and common mistakes"
        },
        "desc": {
          "strType": "Text, always in double quotes",
          "numType": "Number (integer or decimal), no quotes",
          "boolType": "Boolean: true or false",
          "nullType": "Null / empty value",
          "arrType": "Array: an ordered list of values",
          "objType": "Object: key/value pairs",
          "keysRule": "Keys are always in double quotes",
          "trailingComma": "No comma after the last element",
          "singleQuote": "Single quotes are not valid (use double)",
          "noComments": "JSON does not allow comments"
        }
      }
    },
    "formatear-xml": {
      "guide": {
        "title": "XML notes",
        "intro": "XML nests well-formed elements: every opening tag has its closing tag. Constructs:",
        "groups": {
          "structure": "Structure",
          "special": "Special"
        },
        "desc": {
          "openTag": "Opens an element",
          "closeTag": "Closes the element (same name)",
          "selfClose": "Empty element, with no content",
          "attr": "Element attribute (name=\"value\")",
          "comment": "Comment",
          "cdata": "Literal text: not parsed as XML",
          "declaration": "Declaration: version and encoding",
          "entity": "Entity for special characters (&lt; &gt; &amp; …)"
        }
      }
    },
    "formatear-sql": {
      "guide": {
        "title": "SQL dialects and notes",
        "intro": "Pick the dialect you use so the formatting respects its syntax.",
        "groups": {
          "dialects": "Dialects",
          "notes": "Notes"
        },
        "desc": {
          "std": "Generic standard (ANSI)",
          "mysql": "MySQL and MariaDB",
          "postgresql": "PostgreSQL",
          "sqlite": "SQLite",
          "tsql": "Transact-SQL — Microsoft SQL Server",
          "plsql": "PL/SQL — Oracle",
          "bigquery": "Google BigQuery",
          "semicolon": "Separates statements",
          "keywords": "The formatter uppercases the keywords",
          "quoting": "Identifier quoting varies by dialect"
        }
      }
    },
    "formatear-yaml": {
      "guide": {
        "title": "YAML notes",
        "intro": "YAML nests with space indentation (never tabs). Building blocks and common gotchas:",
        "groups": {
          "structure": "Structure",
          "gotchas": "Common gotchas"
        },
        "desc": {
          "pair": "Separates the key from the value (key: value)",
          "listItem": "A list item",
          "comment": "Comment until the end of the line",
          "literal": "Literal block: keeps line breaks",
          "folded": "Folded block: joins lines with spaces",
          "noTabs": "Tabs are not allowed; use spaces",
          "boolTrap": "yes/no/on/off read as booleans; quote the text",
          "quote": "Quotes force text (numbers, yes/no…)",
          "docSep": "Separates multiple documents in one file"
        }
      }
    },
    "formatear-html-css": {
      "guide": {
        "title": "HTML and CSS",
        "intro": "The tool detects the language: if it starts with «<» it treats it as HTML; otherwise, as CSS.",
        "groups": {
          "html": "HTML",
          "css": "CSS"
        },
        "desc": {
          "openTag": "Opens an element",
          "closeTag": "Closes the element",
          "selfClose": "Element with no content (img, br, input…)",
          "attr": "Element attribute (name=\"value\")",
          "htmlComment": "HTML comment",
          "rule": "Rule: a selector and its block of declarations",
          "declaration": "Declaration: property and value, ends with ;",
          "classSel": "Selects elements with that class",
          "idSel": "Selects the element with that id",
          "cssComment": "CSS comment"
        }
      }
    },
    "jwt": {
      "expired": "Expired",
      "expires": "Expires:",
      "issued": "Issued:",
      "guide": {
        "title": "JWT notes",
        "intro": "A JWT has three dot-separated parts encoded in Base64URL. The payload carries the data (claims):",
        "groups": {
          "parts": "Token parts",
          "registered": "Standard (registered) claims",
          "header": "Header fields",
          "common": "Common claims"
        },
        "desc": {
          "header": "Token algorithm and type",
          "payload": "The token data (claims)",
          "signature": "Signature that verifies the token; needs the key (not checked here)",
          "iss": "Issuer: who issued the token",
          "sub": "Subject: who it identifies (usually the user)",
          "aud": "Audience: who the token is for",
          "exp": "Expiration: expires after this date (UNIX)",
          "nbf": "Not before: not valid before this date (UNIX)",
          "iat": "Issued at: when it was issued (UNIX)",
          "jti": "JWT ID: unique token identifier",
          "alg": "Signing algorithm (HS256, RS256…)",
          "typ": "Token type, usually \"JWT\"",
          "kid": "Key ID: which key signed the token",
          "name": "User name (common, not standard)",
          "email": "User email (common, not standard)",
          "role": "Role or permissions (common, not standard)",
          "scope": "Granted permissions (OAuth)"
        }
      }
    },
    "regex": {
      "matchesCount": {
        "one": "{n} match",
        "many": "{n} matches"
      },
      "guide": {
        "title": "Quick regex guide",
        "intro": "A regular expression describes a text pattern by combining these building blocks:",
        "groups": {
          "anchors": "Anchors",
          "classes": "Character classes",
          "quantifiers": "Quantifiers",
          "groups": "Groups and alternation",
          "flags": "Flags"
        },
        "desc": {
          "start": "Start of line or text",
          "end": "End of line or text",
          "wordBoundary": "Word boundary",
          "nonBoundary": "Where there is NO word boundary",
          "any": "Any character (except newline)",
          "digit": "A digit (0–9)",
          "nonDigit": "Anything that is not a digit",
          "word": "Letter, digit or underscore",
          "space": "Space, tab or newline",
          "set": "Any of the characters a, b or c",
          "negSet": "Any character except a, b or c",
          "range": "A character in the a–z range",
          "zeroMore": "Previous element 0 or more times",
          "oneMore": "Previous element 1 or more times",
          "optional": "Optional: 0 or 1 time",
          "exactly": "Exactly n times",
          "between": "Between n and m times",
          "lazy": "Lazy version: matches as little as possible",
          "capture": "Capturing group",
          "nonCapture": "Non-capturing group (groups only)",
          "named": "Named group",
          "alternation": "a or b (alternation)",
          "backref": "Reference to capturing group #1",
          "flagG": "Global: all matches, not just the first",
          "flagI": "Case-insensitive",
          "flagM": "Multiline: ^ and $ match on each line",
          "flagS": "The dot . also matches the newline"
        }
      }
    },
    "diff": {
      "identical": "The texts are identical"
    }
  }
};
