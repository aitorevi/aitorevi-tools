// Generador de UUID — lógica pura (sin DOM, sin red).

export const COUNTS = [1, 5, 10];

export function generateUUIDs(count = 1) {
  return Array.from({ length: count }, () => crypto.randomUUID()).join('\n');
}
