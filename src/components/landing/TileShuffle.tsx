"use client";
// Decorative choropleth tile grid for the "Why map?" card: the blue palette
// reshuffles whenever the user hovers/focuses/taps the card (§26: animation
// communicates interaction; subtle, 150-300ms, reduced-motion aware).
//
// The random order lives in an external store read via useSyncExternalStore:
// the server snapshot is the deterministic INITIAL_TILES (so SSR HTML is
// stable) while the client snapshot is the shuffled order — this avoids the
// hydration mismatch that useState(() => shuffled()) would cause, without
// needing a setState-in-effect.

import { useCallback, useSyncExternalStore } from "react";

const PALETTE = [
  "#eff5fe", "#dce8fd", "#b9d1fb", "#7fa8f7", "#4287f5", "#155eef", "#0c40a3",
];

const INITIAL_TILES: string[] = Array.from({ length: 18 }, (_, i) => PALETTE[i % PALETTE.length]);

function shuffled(): string[] {
  const tiles = [...INITIAL_TILES];
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return tiles;
}

// Module-level store: shuffled once on first client read, then reshuffled on
// interaction. getServerSnapshot keeps SSR deterministic.
let clientTiles: string[] | null = null;
const listeners = new Set<() => void>();

function getClientSnapshot(): string[] {
  if (!clientTiles) clientTiles = shuffled();
  return clientTiles;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setTiles(next: string[]) {
  clientTiles = next;
  listeners.forEach((l) => l());
}

export default function TileShuffle() {
  const tiles = useSyncExternalStore(subscribe, getClientSnapshot, () => INITIAL_TILES);
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
