import {
  cyrb53,
  generateParams,
  renderMiddleSolidShapes,
  renderOuterBezel,
  renderReverseAccentShapes,
  renderSolidCore,
} from "./badgeGenerator";

export const BADGE_DESIGN_VERSION = "host-frame-1";
export type BadgeAccent = "none" | "soft" | "shifted";
export type BadgeHostSplit = "sectors" | "alternating";
export type BadgeDesignInput = {
  lectureName: string;
  hostGroupNames?: readonly string[];
  family?: string;
  accent?: BadgeAccent;
  hostSplit?: BadgeHostSplit;
  // Vue useId() (or a unique preview-card key) prevents clip-path collisions, including dialogs.
  instanceId: string;
};

// Approximate colors used in the reviewed lab; not a traQ directory field or official color spec.
const hostColors: Readonly<Record<string, string>> = {
  sysad: "#61c1b8",
  game: "#b38ae8",
  ctf: "#cae86a",
  sound: "#ed9144",
  graphics: "#df84b2",
  algorithm: "#c95b63",
  kaggle: "#50b9ee",
};
const hostAliases: Readonly<Record<string, string>> = {
  ゲーム: "game",
  サウンド: "sound",
  グラフィック: "graphics",
  アルゴリズム: "algorithm",
};
const neutral = {
  id: "host-frame",
  name: "Host frame",
  primary: "#dfe7f0",
  secondary: "#dfe7f0",
  accent: "#dfe7f0",
  darkBg: "#0c111b",
};

function hostKey(name: string): string {
  const key = name.normalize("NFKC").trim().toLowerCase().replace(/班$/, "").trim();
  return hostAliases[key] ?? key;
}

export function badgeHostColor(groupName: string): string {
  return hostColors[hostKey(groupName)] ?? "#9baec5";
}

function softAccent(hex: string, shifted: boolean): string {
  const rgb = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const [r = 0, g = 0, b = 0] = rgb;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    delta = max - min,
    light = (max + min) / 2;
  let hue = 0;
  if (delta)
    hue =
      max === r
        ? (g - b) / delta + (g < b ? 6 : 0)
        : max === g
          ? (b - r) / delta + 2
          : (r - g) / delta + 4;
  const saturation = delta ? delta / (1 - Math.abs(2 * light - 1)) : 0;
  return `hsl(${(hue * 60 + (shifted ? 12 : 0)) % 360} ${saturation * 70}% ${Math.min(82, light * 100 + 23)}%)`;
}

export function buildLectureBadge(input: BadgeDesignInput) {
  // Deliberately match the reviewed lab seed. IDs, academic years and earned dates do not participate.
  const seed = `course-06:${input.lectureName}`;
  const params = generateParams(seed);
  if (input.family) {
    const family = generateParams(`family-06:${input.family}`);
    params.outerBezelType = family.outerBezelType;
    params.symmetry = family.symmetry;
    params.wedgeCount = family.symmetry;
  }
  const hosts = [...new Set((input.hostGroupNames ?? []).map(hostKey).filter(Boolean))].sort();
  const inks = hosts.map(badgeHostColor);
  const primary = inks[0] ?? "#9baec5";
  const inner = 162 - params.bezelWidth;
  let room = inner;
  if (params.outerBezelType === 1)
    room = (inner - 2) * Math.cos(Math.PI / (params.symmetry === 3 ? 6 : params.symmetry));
  if (params.outerBezelType === 2) room = inner - 8;
  if (params.outerBezelType === 3) room = inner - 10;
  if (params.outerBezelType === 4) room = inner / Math.sqrt(2);
  const scale = Math.min(1, (room - 12) / 132);
  const drawFrame = (color: string) =>
    renderOuterBezel(180, 180, {
      ...params,
      theme: { ...neutral, primary: color, secondary: color, accent: color },
    });
  let outer = drawFrame(primary);
  if (inks.length > 1) {
    const count = inks.length * (input.hostSplit === "alternating" ? 2 : 1);
    const namespace = `badge-${cyrb53(JSON.stringify([seed, hosts, input.hostSplit, input.instanceId])).toString(16)}`;
    let definitions = "",
      fragments = "";
    for (let index = 0; index < count; index++) {
      const start = -Math.PI / 2 + (index * 2 * Math.PI) / count;
      const end = start + (2 * Math.PI) / count;
      const radius = 500;
      const path = `M180 180 L${180 + radius * Math.cos(start)} ${180 + radius * Math.sin(start)} A${radius} ${radius} 0 0 1 ${180 + radius * Math.cos(end)} ${180 + radius * Math.sin(end)} Z`;
      const id = `${namespace}-${index}`;
      definitions += `<clipPath id="${id}"><path d="${path}"/></clipPath>`;
      fragments += `<g clip-path="url(#${id})">${drawFrame(inks[index % inks.length] ?? primary)}</g>`;
    }
    outer = `<defs>${definitions}</defs>${fragments}`;
  }
  const accent = input.accent ?? "soft";
  const innerParams = { ...params, theme: { ...neutral } };
  // Never recolor all white shapes; multi-host centers remain neutral so no host is privileged.
  if (accent !== "none" && hosts.length === 1 && hostColors[hosts[0] ?? ""]) {
    innerParams.theme.accent = softAccent(primary, accent === "shifted");
  }
  let middle = renderMiddleSolidShapes(180, 180, innerParams);
  if (params.middleLayerType === 4) {
    const sides = [4, 5, 6, 8][cyrb53(`${seed}:polygon`) % 4] ?? 4;
    const points = Array.from({ length: sides }, (_, index) => {
      const angle = (index * 2 * Math.PI) / sides + Math.PI / 4;
      return `${180 + 118 * Math.cos(angle)},${180 + 118 * Math.sin(angle)}`;
    }).join(" ");
    middle = `<polygon points="${points}" fill="${neutral.secondary}" fill-opacity=".22" stroke="${neutral.primary}" stroke-width="6"/>`;
  }
  const inside =
    middle +
    renderReverseAccentShapes(180, 180, innerParams) +
    renderSolidCore(180, 180, innerParams);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360" aria-hidden="true" focusable="false" style="shape-rendering:geometricPrecision">${outer}<g transform="translate(180 180) scale(${scale}) translate(-180 -180)">${inside}</g></svg>`;
  // Keep diagnostics available to the dev viewer/tests without recomputing the geometry.
  return { svg, seed, outer, scale, room, params };
}
