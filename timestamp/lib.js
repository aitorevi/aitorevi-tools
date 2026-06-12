// Conversor de timestamps — lógica pura (sin DOM, sin red).

export const MODES = ['epochToHuman', 'humanToEpoch'];
export const SAMPLE_EPOCH = '1700000000';
export const SAMPLE_HUMAN = '2025-01-15T10:30:00';

export function epochToHuman(value) {
  const n = Number(value.trim());
  if (isNaN(n)) throw new Error('Introduce un número entero (Unix timestamp).');
  // Auto-detect: values above 1e10 are already in milliseconds
  const ms = n > 1e10 ? n : n * 1000;
  const d = new Date(ms);
  if (isNaN(d.getTime())) throw new Error('Timestamp fuera de rango.');
  return [
    `ISO 8601:  ${d.toISOString()}`,
    `Local:     ${d.toLocaleString()}`,
    `UTC:       ${d.toUTCString()}`,
    `ms:        ${ms}`,
    `s:         ${Math.floor(ms / 1000)}`,
  ].join('\n');
}

export function humanToEpoch(value) {
  const d = new Date(value.trim());
  if (isNaN(d.getTime())) throw new Error('Fecha no reconocida. Prueba con ISO 8601: 2025-01-15T10:30:00');
  const ms = d.getTime();
  return [
    `ms (Unix): ${ms}`,
    `s (Unix):  ${Math.floor(ms / 1000)}`,
    `ISO 8601:  ${d.toISOString()}`,
  ].join('\n');
}
