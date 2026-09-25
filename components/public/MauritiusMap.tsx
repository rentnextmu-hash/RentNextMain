import Link from "next/link";

// A simplified outline of Mauritius, traced clockwise from Cap Malheureux
// through approximate coastal coordinates [longitude, latitude]. Good
// enough for placing branch markers correctly relative to each other — not
// a navigational map.
const COASTLINE: [number, number][] = [
  [57.614, -19.984], // Cap Malheureux
  [57.664, -20.007], // Grand Gaube
  [57.75, -20.115], // Poste Lafayette
  [57.775, -20.19], // Belle Mare
  [57.79, -20.24], // Trou d'Eau Douce
  [57.785, -20.29], // Grand River South East
  [57.73, -20.37], // Vieux Grand Port
  [57.7, -20.408], // Mahébourg
  [57.71, -20.445], // Blue Bay
  [57.62, -20.49], // Le Bouchon
  [57.52, -20.52], // Souillac
  [57.4, -20.505], // Bel Ombre
  [57.37, -20.49], // Baie du Cap
  [57.31, -20.46], // Le Morne peninsula
  [57.37, -20.325], // Tamarin
  [57.365, -20.275], // Flic-en-Flac
  [57.4, -20.21], // Albion
  [57.495, -20.16], // Port Louis
  [57.51, -20.12], // Baie du Tombeau
  [57.515, -20.06], // Pointe aux Piments
  [57.545, -20.035], // Trou-aux-Biches
  [57.575, -20.005], // Grand Baie
];

// Equirectangular projection, with longitude scaled by cos(20.2°) so the
// island keeps its true proportions at this latitude.
const LON_MIN = 57.27;
const LAT_MAX = -19.95;
const SCALE = 1000;
const LON_FACTOR = Math.cos((20.2 * Math.PI) / 180);
const project = ([lon, lat]: [number, number]) => ({
  x: (lon - LON_MIN) * LON_FACTOR * SCALE,
  y: (LAT_MAX - lat) * SCALE,
});

const WIDTH = (57.82 - LON_MIN) * LON_FACTOR * SCALE;
const HEIGHT = (LAT_MAX - -20.56) * SCALE;

export type MapLocation = { slug: string; name: string; latitude: number; longitude: number; type: string };

type Box = { x1: number; y1: number; x2: number; y2: number };
const overlaps = (a: Box, b: Box) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
const FONT = 22;
const CHAR_WIDTH = FONT * 0.62; // generous average glyph width, so long names are never clipped

/**
 * Where each marker's label goes: right of the dot, else left, else above
 * or below — the first spot that doesn't collide with another label or
 * dot and stays inside the map. Neighbouring branches (Grand Baie and
 * Trou-aux-Biches are ~4 km apart) would otherwise print on top of each other.
 */
function placeLabels(points: { x: number; y: number; name: string }[]) {
  const dots: Box[] = points.map((p) => ({ x1: p.x - 12, y1: p.y - 12, x2: p.x + 12, y2: p.y + 12 }));
  const placed: Box[] = [];
  return points.map((p) => {
    const w = p.name.length * CHAR_WIDTH;
    // Labels centred above/below slide sideways to stay inside the map.
    const cx = Math.min(Math.max(p.x, -20 + w / 2), WIDTH + 20 - w / 2);
    const candidates = [
      { x: p.x + 16, y: p.y + 7, anchor: "start" as const, box: { x1: p.x + 14, y1: p.y - 14, x2: p.x + 18 + w, y2: p.y + 12 } },
      { x: p.x - 16, y: p.y + 7, anchor: "end" as const, box: { x1: p.x - 18 - w, y1: p.y - 14, x2: p.x - 14, y2: p.y + 12 } },
      { x: cx, y: p.y - 22, anchor: "middle" as const, box: { x1: cx - w / 2, y1: p.y - 42, x2: cx + w / 2, y2: p.y - 16 } },
      { x: cx, y: p.y + 38, anchor: "middle" as const, box: { x1: cx - w / 2, y1: p.y + 16, x2: cx + w / 2, y2: p.y + 42 } },
    ];
    const fits = (c: (typeof candidates)[number]) =>
      c.box.x1 >= -20 &&
      c.box.x2 <= WIDTH + 20 &&
      !placed.some((b) => overlaps(b, c.box)) &&
      !dots.some((d, i) => points[i] !== p && overlaps(d, c.box));
    const chosen = candidates.find(fits) ?? candidates[0];
    placed.push(chosen.box);
    return chosen;
  });
}

export function MauritiusMap({ locations }: { locations: MapLocation[] }) {
  const projected = locations.map((l) => ({ ...project([l.longitude, l.latitude]), name: l.name }));
  const labels = placeLabels(projected);
  const outline = COASTLINE.map((p) => {
    const { x, y } = project(p);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return (
    <figure className="relative mx-auto w-full max-w-md">
      <svg viewBox={`-20 -20 ${WIDTH + 40} ${HEIGHT + 40}`} className="h-auto w-full" aria-label={`Map of Mauritius with our ${locations.length} pickup locations`}>
        {/* One string child: React 19 treats <title> specially and mixed text children break hydration. */}
        <title id="map-title">{`Map of Mauritius showing our ${locations.length} pickup locations`}</title>
        <polygon
          points={outline}
          className="fill-accent/15 stroke-accent"
          strokeWidth={3}
          strokeLinejoin="round"
        />
        {locations.map((l, i) => {
          const { x, y } = projected[i];
          const label = labels[i];
          return (
            <Link key={l.slug} href={`/locations/${l.slug}`} aria-label={`${l.name} — view location`}>
              <g className="group cursor-pointer">
                <circle cx={x} cy={y} r={22} className="fill-primary/10 transition-all group-hover:fill-primary/20" />
                <circle cx={x} cy={y} r={9} className={l.type === "airport" ? "fill-accent-hover" : "fill-primary"} />
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor={label.anchor}
                  className="fill-text text-[22px] font-medium group-hover:fill-primary group-hover:underline"
                >
                  {l.name}
                </text>
              </g>
            </Link>
          );
        })}
      </svg>
    </figure>
  );
}
