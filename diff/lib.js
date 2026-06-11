// Diff de texto — lógica pura (sin DOM, sin red), testeable con Vitest.
// Compara dos textos línea a línea con un diff clásico basado en LCS (la
// subsecuencia común más larga). Sin dependencias.

/** Líneas demasiado grandes para una tabla LCS O(n·m) razonable. */
const MAX_CELLS = 4_000_000; // p. ej. 2000 × 2000 líneas

/**
 * Diferencia A y B por líneas.
 * @returns {{ type: "eq"|"add"|"del", line: string }[]}
 */
export function diffLines(a, b) {
  const A = String(a == null ? "" : a).split("\n");
  const B = String(b == null ? "" : b).split("\n");
  const n = A.length;
  const m = B.length;
  if (n * m > MAX_CELLS) throw new Error("Los textos son demasiado grandes para comparar.");

  // Tabla de longitudes de LCS (desde el final).
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      out.push({ type: "eq", line: A[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: "del", line: A[i] });
      i++;
    } else {
      out.push({ type: "add", line: B[j] });
      j++;
    }
  }
  while (i < n) out.push({ type: "del", line: A[i++] });
  while (j < m) out.push({ type: "add", line: B[j++] });
  return out;
}

/** Cuenta líneas añadidas y quitadas de un diff. */
export function diffStats(parts) {
  let added = 0;
  let removed = 0;
  for (const p of parts) {
    if (p.type === "add") added++;
    else if (p.type === "del") removed++;
  }
  return { added, removed };
}

export const SAMPLE_A = "name: aitorevi\nversion: 1\nport: 8080\ndebug: false";
export const SAMPLE_B = "name: aitorevi\nversion: 2\nport: 8080\ndebug: true\nssl: on";
