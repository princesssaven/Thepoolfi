export function lightweightEmbedding(input: string, dims = 96): number[] {
  const vec = new Array<number>(dims).fill(0);
  const normalized = input.toLowerCase().trim();
  if (!normalized) return vec;

  for (let i = 0; i < normalized.length; i += 1) {
    const code = normalized.charCodeAt(i);
    const idx = (code * (i + 7)) % dims;
    vec[idx] += (code % 31) / 31;
  }

  const magnitude = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  if (!magnitude) return vec;
  return vec.map((v) => Number((v / magnitude).toFixed(6)));
}
