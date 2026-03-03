import type { QRCell } from "@/lib/types";

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const QR_RANGES: readonly [readonly number[], readonly number[], string][] = [
  [
    [70, 82, 94, 106, 118, 130],
    [10, 22, 34, 46, 58, 70, 82, 94, 106, 118, 130, 140, 152, 164, 176],
    "a",
  ],
  [[10, 22, 34, 46, 58], [70, 82, 94, 106, 118, 130], "b"],
  [[140, 152, 164, 176], [70, 82, 94, 106, 118, 130, 140, 152, 164, 176], "c"],
];

export function generateQRPattern(): readonly QRCell[] {
  const cells: QRCell[] = [];
  let seed = 42;

  for (const [xRange, yRange, prefix] of QR_RANGES) {
    for (const x of xRange) {
      for (const y of yRange) {
        cells.push({
          x,
          y,
          key: `${prefix}-${x}-${y}`,
          visible: seededRandom(seed++) > 0.35,
        });
      }
    }
  }

  return cells;
}
