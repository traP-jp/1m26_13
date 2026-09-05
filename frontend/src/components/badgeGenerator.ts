// Ported from workshop_badge_collection.html. Keep the PRNG call order stable:
// changing it changes every badge produced from an existing seed.

type SolidTheme = {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  darkBg: string;
};

type BadgeParams = {
  seed: string;
  hash: string;
  theme: SolidTheme;
  type: string;
  symmetry: number;
  identifier: string;
  outerBezelType: number;
  middleLayerType: number;
  coreType: number;
  bezelWidth: number;
  wedgeCount: number;
  accentContrast: boolean;
};

export function cyrb53(value: string, seed = 0) {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let index = 0; index < value.length; index += 1) {
    const character = value.charCodeAt(index);
    h1 = Math.imul(h1 ^ character, 2654435761);
    h2 = Math.imul(h2 ^ character, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

class SeededRng {
  private s0: number;
  private s1: number;
  private s2: number;
  private s3: number;

  constructor(seed: string) {
    const hash = cyrb53(seed);
    this.s0 = (hash ^ 0x9e3779b9) >>> 0;
    this.s1 = ((hash * 0x85ebca6b) ^ 0xc2b2ae35) >>> 0;
    this.s2 = ((hash * 0x27d4eb2f) ^ 0x165667b1) >>> 0;
    this.s3 = ((hash * 0x165667b1) ^ 0x9e3779b9) >>> 0;

    for (let index = 0; index < 12; index += 1) this.next();
  }

  next() {
    const result = Math.imul(((this.s1 * 5) << 7) | ((this.s1 * 5) >>> 25), 9) >>> 0;
    const temporary = (this.s1 << 9) >>> 0;
    this.s2 ^= this.s0;
    this.s3 ^= this.s1;
    this.s1 ^= this.s2;
    this.s0 ^= this.s3;
    this.s2 ^= temporary;
    this.s3 = ((this.s3 << 11) | (this.s3 >>> 21)) >>> 0;
    return result / 4294967296;
  }

  range(minimum: number, maximum: number) {
    return minimum + this.next() * (maximum - minimum);
  }

  rangeInt(minimum: number, maximum: number) {
    return Math.floor(this.range(minimum, maximum + 1));
  }

  choice<T>(values: readonly T[]) {
    return values[this.rangeInt(0, values.length - 1)] as T;
  }

  boolean(chance = 0.5) {
    return this.next() < chance;
  }
}

const solidThemes: readonly SolidTheme[] = [
  {
    id: "crimson",
    name: "CRIMSON RED",
    primary: "#ef4444",
    secondary: "#fca5a5",
    accent: "#ffffff",
    darkBg: "#090d16",
  },
  {
    id: "cobalt",
    name: "COBALT BLUE",
    primary: "#3b82f6",
    secondary: "#93c5fd",
    accent: "#f59e0b",
    darkBg: "#090d16",
  },
  {
    id: "emerald",
    name: "EMERALD JADE",
    primary: "#10b981",
    secondary: "#6ee7b7",
    accent: "#ffffff",
    darkBg: "#090d16",
  },
  {
    id: "amber",
    name: "SAFETY AMBER",
    primary: "#f59e0b",
    secondary: "#fde68a",
    accent: "#ef4444",
    darkBg: "#090d16",
  },
  {
    id: "purple",
    name: "ROYAL PURPLE",
    primary: "#8b5cf6",
    secondary: "#c4b5fd",
    accent: "#06b6d4",
    darkBg: "#090d16",
  },
  {
    id: "cyan",
    name: "CYAN VECTOR",
    primary: "#06b6d4",
    secondary: "#a5f3fc",
    accent: "#f43f5e",
    darkBg: "#090d16",
  },
  {
    id: "orange",
    name: "BRUTAL ORANGE",
    primary: "#ff5722",
    secondary: "#ffcc80",
    accent: "#ffffff",
    darkBg: "#090d16",
  },
  {
    id: "monochrome",
    name: "HIGH MONO",
    primary: "#f8fafc",
    secondary: "#64748b",
    accent: "#38bdf8",
    darkBg: "#090d16",
  },
];

const compositionTypes = [
  "SEGMENTED RING",
  "SOLID CREST",
  "INTERLOCKING BLOCKS",
  "RADIAL CHEVRONS",
  "MODULAR GRID",
  "HEAVY POLYGON",
] as const;

function createArcSlice(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number,
) {
  const x1 = cx + outerRadius * Math.cos(startAngle);
  const y1 = cy + outerRadius * Math.sin(startAngle);
  const x2 = cx + outerRadius * Math.cos(endAngle);
  const y2 = cy + outerRadius * Math.sin(endAngle);
  const x3 = cx + innerRadius * Math.cos(endAngle);
  const y3 = cy + innerRadius * Math.sin(endAngle);
  const x4 = cx + innerRadius * Math.cos(startAngle);
  const y4 = cy + innerRadius * Math.sin(startAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${x3.toFixed(2)} ${y3.toFixed(2)} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`;
}

function createPolygonPoints(
  cx: number,
  cy: number,
  radius: number,
  sides: number,
  startAngle = 0,
) {
  const points: string[] = [];
  for (let index = 0; index < sides; index += 1) {
    const angle = startAngle + (index * 2 * Math.PI) / sides;
    points.push(
      `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`,
    );
  }
  return points.join(" ");
}

function generateIdentifier(rng: SeededRng) {
  const first = [
    "SOLID",
    "HEAVY",
    "BLOCK",
    "APEX",
    "PRISM",
    "KINETIC",
    "MODULE",
    "STRUCT",
    "NEXUS",
    "CORE",
  ] as const;
  const second = [
    "FORGE",
    "CREST",
    "MARK",
    "GUARD",
    "INDEX",
    "UNIT",
    "SHIELD",
    "ALPHA",
    "PRIME",
  ] as const;
  return `${rng.choice(first)}_${rng.choice(second)}`;
}

export function generateParams(seed: string): BadgeParams {
  const rng = new SeededRng(seed);
  const hash = cyrb53(seed);
  const theme = solidThemes[Math.floor(rng.next() * solidThemes.length)] as SolidTheme;
  const symmetry = rng.choice([3, 4, 6, 8] as const);

  return {
    seed,
    hash: hash.toString(16).toUpperCase().padStart(6, "0").slice(0, 6),
    theme,
    type: rng.choice(compositionTypes),
    symmetry,
    identifier: generateIdentifier(rng),
    outerBezelType: rng.rangeInt(0, 4),
    middleLayerType: rng.rangeInt(0, 4),
    coreType: rng.rangeInt(0, 5),
    bezelWidth: rng.choice([14, 18, 22] as const),
    wedgeCount: symmetry,
    accentContrast: rng.boolean(0.7),
  };
}

export function renderOuterBezel(cx: number, cy: number, params: BadgeParams) {
  const theme = params.theme;
  const outerRadius = 162;
  const innerRadius = outerRadius - params.bezelWidth;

  switch (params.outerBezelType) {
    case 0: {
      let svg = "";
      const slits = params.symmetry * 2;
      const gapAngle = 0.08;
      const stepAngle = (2 * Math.PI) / slits;
      for (let index = 0; index < slits; index += 1) {
        const start = index * stepAngle + gapAngle / 2;
        const end = (index + 1) * stepAngle - gapAngle / 2;
        const fill = index % 2 === 0 && params.accentContrast ? theme.accent : theme.primary;
        svg += `<path d="${createArcSlice(cx, cy, outerRadius, innerRadius, start, end)}" fill="${fill}"/>`;
      }
      return svg;
    }
    case 1: {
      const sides = params.symmetry === 3 ? 6 : params.symmetry;
      return `<polygon points="${createPolygonPoints(cx, cy, outerRadius, sides, Math.PI / sides)}" fill="${theme.primary}"/><polygon points="${createPolygonPoints(cx, cy, innerRadius - 2, sides, Math.PI / sides)}" fill="${theme.darkBg}"/>`;
    }
    case 2: {
      let svg = `<circle cx="${cx}" cy="${cy}" r="${innerRadius + 4}" fill="${theme.primary}"/><circle cx="${cx}" cy="${cy}" r="${innerRadius - 8}" fill="${theme.darkBg}"/>`;
      const blocks = params.symmetry * 2;
      for (let index = 0; index < blocks; index += 1) {
        const angle = (index * 2 * Math.PI) / blocks;
        const blockX = cx + (outerRadius - 4) * Math.cos(angle);
        const blockY = cy + (outerRadius - 4) * Math.sin(angle);
        const fill = index % 2 === 0 ? theme.accent : theme.primary;
        svg += `<rect x="${blockX - 6}" y="${blockY - 6}" width="12" height="12" fill="${fill}" transform="rotate(${(angle * 180) / Math.PI} ${blockX} ${blockY})"/>`;
      }
      return svg;
    }
    case 3:
      return `<circle cx="${cx}" cy="${cy}" r="${outerRadius - params.bezelWidth / 2}" stroke="${theme.primary}" stroke-width="${params.bezelWidth}" fill="none"/><circle cx="${cx}" cy="${cy}" r="${innerRadius - 8}" stroke="${theme.secondary}" stroke-width="4" fill="none"/>`;
    default:
      return `<polygon points="${createPolygonPoints(cx, cy, outerRadius, 4, Math.PI / 4)}" fill="${theme.primary}"/><polygon points="${createPolygonPoints(cx, cy, innerRadius, 4, Math.PI / 4)}" fill="${theme.darkBg}"/>`;
  }
}

export function renderMiddleSolidShapes(cx: number, cy: number, params: BadgeParams) {
  const theme = params.theme;
  const outerRadius = 126;
  const innerRadius = 94;

  switch (params.middleLayerType) {
    case 0: {
      let svg = "";
      const gap = 0.12;
      const step = (2 * Math.PI) / params.wedgeCount;
      for (let index = 0; index < params.wedgeCount; index += 1) {
        const start = index * step + gap / 2;
        const end = (index + 1) * step - gap / 2;
        svg += `<path d="${createArcSlice(cx, cy, outerRadius, innerRadius, start, end)}" fill="${index % 2 === 0 ? theme.primary : theme.secondary}"/>`;
      }
      return svg;
    }
    case 1: {
      let svg = "";
      for (let index = 0; index < params.symmetry; index += 1) {
        const angle = (index * 2 * Math.PI) / params.symmetry;
        const length = outerRadius - innerRadius;
        const pointX = cx + ((outerRadius + innerRadius) / 2) * Math.cos(angle);
        const pointY = cy + ((outerRadius + innerRadius) / 2) * Math.sin(angle);
        svg += `<rect x="${pointX - 9}" y="${pointY - length / 2}" width="18" height="${length}" rx="2" fill="${index % 2 === 0 ? theme.primary : theme.accent}" transform="rotate(${(angle * 180) / Math.PI + 90} ${pointX} ${pointY})"/>`;
      }
      return svg;
    }
    case 2: {
      const points = createPolygonPoints(cx, cy, outerRadius, params.symmetry);
      return `<polygon points="${points}" fill="${theme.secondary}" fill-opacity="0.25"/><polygon points="${points}" stroke="${theme.primary}" stroke-width="8" fill="none"/>`;
    }
    case 3: {
      let svg = "";
      for (let index = 0; index < params.symmetry; index += 1) {
        const angle = (index * 2 * Math.PI) / params.symmetry;
        const radius = (outerRadius + innerRadius) / 2;
        const pointX = cx + radius * Math.cos(angle);
        const pointY = cy + radius * Math.sin(angle);
        svg += `<g transform="translate(${pointX}, ${pointY}) rotate(${(angle * 180) / Math.PI + 90})"><polyline points="-14,-8 0,8 14,-8" stroke="${theme.primary}" stroke-width="7" stroke-linecap="square" fill="none"/></g>`;
      }
      return svg;
    }
    default:
      return `<rect x="${cx - 45}" y="${cy - 45}" width="90" height="90" fill="${theme.secondary}" fill-opacity="0.15"/><rect x="${cx - 45}" y="${cy - 45}" width="90" height="90" stroke="${theme.primary}" stroke-width="8" fill="none" transform="rotate(45 ${cx} ${cy})"/>`;
  }
}

export function renderReverseAccentShapes(cx: number, cy: number, params: BadgeParams) {
  const theme = params.theme;
  const radius = 70;
  const count = params.symmetry >= 6 ? params.symmetry / 2 : params.symmetry;
  let svg = "";

  for (let index = 0; index < count; index += 1) {
    const angle = (index * 2 * Math.PI) / count + Math.PI / count;
    const pointX = cx + radius * Math.cos(angle);
    const pointY = cy + radius * Math.sin(angle);
    svg += `<rect x="${pointX - 6}" y="${pointY - 6}" width="12" height="12" fill="${theme.accent}" transform="rotate(45 ${pointX} ${pointY})"/>`;
  }

  return `${svg}<circle cx="${cx}" cy="${cy}" r="${radius}" stroke="${theme.secondary}" stroke-width="3" stroke-dasharray="16 16" fill="none"/>`;
}

export function renderSolidCore(cx: number, cy: number, params: BadgeParams) {
  const theme = params.theme;
  const radius = 46;

  switch (params.coreType) {
    case 0: {
      const width = 15;
      const length = 38;
      return `<path d="M ${cx - width} ${cy - length} H ${cx + width} V ${cy - width} H ${cx + length} V ${cy + width} H ${cx + width} V ${cy + length} H ${cx - width} V ${cy + width} H ${cx - length} V ${cy - width} H ${cx - width} Z" fill="${theme.accent}"/><circle cx="${cx}" cy="${cy}" r="6" fill="${theme.darkBg}"/>`;
    }
    case 1: {
      const points: string[] = [];
      const pointCount = params.symmetry >= 6 ? 6 : 4;
      for (let index = 0; index < pointCount * 2; index += 1) {
        const pointRadius = index % 2 === 0 ? radius : radius * 0.45;
        const angle = (index * Math.PI) / pointCount - Math.PI / 2;
        points.push(
          `${(cx + pointRadius * Math.cos(angle)).toFixed(2)},${(cy + pointRadius * Math.sin(angle)).toFixed(2)}`,
        );
      }
      return `<polygon points="${points.join(" ")}" fill="${theme.primary}"/><circle cx="${cx}" cy="${cy}" r="12" fill="${theme.darkBg}"/><circle cx="${cx}" cy="${cy}" r="5" fill="${theme.accent}"/>`;
    }
    case 2:
      return `<polygon points="${cx},${cy - radius} ${cx + radius},${cy + radius * 0.7} ${cx},${cy + radius * 0.2} ${cx - radius},${cy + radius * 0.7}" fill="${theme.accent}"/><polygon points="${cx},${cy - radius * 0.3} ${cx + radius * 0.6},${cy + radius * 0.8} ${cx},${cy + radius * 0.5} ${cx - radius * 0.6},${cy + radius * 0.8}" fill="${theme.primary}"/>`;
    case 3: {
      let svg = "";
      for (let index = 0; index < 3; index += 1) {
        const angle = (index * 2 * Math.PI) / 3 - Math.PI / 2;
        const x1 = cx + radius * Math.cos(angle);
        const y1 = cy + radius * Math.sin(angle);
        const x2 = cx + radius * 0.4 * Math.cos(angle + 1.2);
        const y2 = cy + radius * 0.4 * Math.sin(angle + 1.2);
        svg += `<polygon points="${cx},${cy} ${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" fill="${index === 0 ? theme.accent : theme.primary}"/>`;
      }
      return `${svg}<circle cx="${cx}" cy="${cy}" r="8" fill="${theme.darkBg}"/>`;
    }
    case 4:
      return `<polygon points="${cx},${cy - radius} ${cx + radius},${cy} ${cx},${cy + radius} ${cx - radius},${cy}" fill="${theme.primary}"/><polygon points="${cx},${cy - radius * 0.55} ${cx + radius * 0.55},${cy} ${cx},${cy + radius * 0.55} ${cx - radius * 0.55},${cy}" fill="${theme.darkBg}"/><polygon points="${cx},${cy - radius * 0.25} ${cx + radius * 0.25},${cy} ${cx},${cy + radius * 0.25} ${cx - radius * 0.25},${cy}" fill="${theme.accent}"/>`;
    default:
      return `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${theme.primary}"/><circle cx="${cx}" cy="${cy}" r="${radius * 0.5}" fill="${theme.darkBg}"/><rect x="${cx - 6}" y="${cy - radius}" width="12" height="${radius * 2}" fill="${theme.darkBg}"/><circle cx="${cx}" cy="${cy}" r="7" fill="${theme.accent}"/>`;
  }
}

export function buildBadgeSvg(seed: string) {
  const params = generateParams(seed);
  const size = 360;
  const center = size / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" aria-hidden="true" focusable="false" style="shape-rendering:geometricPrecision"><rect width="${size}" height="${size}" fill="none"/><g>${renderOuterBezel(center, center, params)}</g><g>${renderMiddleSolidShapes(center, center, params)}</g><g>${renderReverseAccentShapes(center, center, params)}</g><g>${renderSolidCore(center, center, params)}</g></svg>`;
}
