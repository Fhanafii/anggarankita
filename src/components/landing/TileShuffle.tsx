"use client";
// Decorative choropleth tile grid for the "Why map?" card: the blue palette
// reshuffles whenever the user hovers/focuses/taps the card (§26: animation
// communicates interaction; subtle, 150-300ms, reduced-motion aware).

import { useCallback, useState } from "react";

const PALETTE = [
  "#eff5fe", "#dce8fd", "#b9d1fb", "#7fa8f7", "#4287f5", "#155eef", "#0c40a3",
];

function shuffled(): string[] {
  const tiles = Array.from({ length: 18 }, (_, i) => PALETTE[i % PALETTE.length]);
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return tiles;
}

export default function TileShuffle() {
  const [tiles, setTiles] = useState<string[]>(shuffled);
  const shuffle = useCallback(() => setTiles(shuffled()), []);

  return (
    <div
      className="mx-auto mt-4 grid max-w-xs cursor-pointer grid-cols-6 gap-1"
      role="presentation"
      onMouseEnter={shuffle}
      onFocus={shuffle}
      onClick={shuffle}
      tabIndex={0}
    >
      {tiles.map((c, i) => (
        <span
          key={i}
          aria-hidden
          className="h-6 rounded-sm transition-colors duration-200 motion-reduce:transition-none"
          style={{ background: c }}
        />
      ))}
    </div>
  );
}
