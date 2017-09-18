
export async function delay(ms: number): Promise<void> {
  return new Promise<void>(res => setTimeout(res, ms));
}

export function trunc(x: number, a: number, b: number): number {
  return Math.min(Math.max(x, a), b);
}