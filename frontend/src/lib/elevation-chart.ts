// Keep small height variations from filling the entire graph. These are display
// bounds only; sampling, gain/loss and difficulty calculations use their original values.
export function elevationAxis(minElevation: number, maxElevation: number) {
  const range = maxElevation - minElevation;
  const span = Math.max(100, range * 1.2);
  const roughStep = span / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const step = ([1, 2, 2.5, 5, 10].find((factor) => factor * magnitude >= roughStep) ?? 10) * magnitude;
  const center = (minElevation + maxElevation) / 2;
  let min = Math.floor((center - span / 2) / step) * step;
  if (minElevation >= 0) min = Math.max(0, min);
  const max = Math.max(min + step * 4, Math.ceil((maxElevation + range * .1) / step) * step);
  const ticks = Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => max - i * step);
  return { min, max, step, ticks };
}
