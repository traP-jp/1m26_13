import {
  BADGE_DESIGN_VERSION,
  buildLectureBadge,
  type BadgeAccent,
  type BadgeHostSplit,
} from "../components/badgeDesign";
import { inferBadgeFamilies, normalizeBadgeName } from "../components/badgeNameAffinity";

// This entry is referenced only by badge-lab.html, not the production index.html or router.
if (!import.meta.env.DEV) throw new Error("Badge Lab is development-only");

function element<T extends HTMLElement>(id: string): T {
  const value = document.getElementById(id);
  if (!value) throw new Error(`Missing element: ${id}`);
  return value as T;
}
const samples = element<HTMLTextAreaElement>("samples");
const related = element<HTMLInputElement>("related");
const split = element<HTMLSelectElement>("split");
const size = element<HTMLSelectElement>("size");
const dialog = element<HTMLDialogElement>("detail");
const accentButton = element<HTMLButtonElement>("accent");
const accents: BadgeAccent[] = ["soft", "shifted", "none"];
const labels: Record<BadgeAccent, string> = {
  soft: "班色を薄く",
  shifted: "班色から少しずらす",
  none: "なし",
};
let accentIndex = 0;
samples.value = [
  "Webエンジニアになろう講習会 | SysAd",
  "CTF講習会 Web編 | CTF",
  "Unity講習会 | Game",
  "真Unity講習会 | Game",
  "アルゴリズム基礎講習会 | Algorithm",
  "機械学習講習会 | Kaggle",
  "DAW操作講習会 | Sound",
  "デジタルイラスト講習会 | Graphics",
  "Git入門 | SysAd",
  "Gitブランチ演習 | SysAd",
  "Git共同開発 | SysAd",
  "GitHub入門 | SysAd",
  "Git共催の例 | SysAd,Game",
  "Git共催の例 | SysAd,Game,CTF",
  "主催未設定の例 |",
  "未登録グループの例 | unknown",
].join("\n");

function render() {
  const rows = samples.value
    .split("\n")
    .map((line) => {
      const [name = "", groups = ""] = line.split("|");
      return {
        name: name.trim(),
        groups: groups
          .split(",")
          .map((group) => group.trim())
          .filter(Boolean),
      };
    })
    .filter((row) => row.name)
    .slice(0, 200);
  const families = inferBadgeFamilies(rows.map((row) => row.name));
  const accent = accents[accentIndex] ?? "soft";
  accentButton.textContent = `差し色：${labels[accent]}（次へ）`;
  const hostSplit: BadgeHostSplit = split.value === "alternating" ? "alternating" : "sectors";
  const gallery = element("gallery");
  gallery.replaceChildren();
  dialog.close();
  element("detail-art").replaceChildren();
  for (const [index, row] of rows.entries()) {
    const family = related.checked ? families.get(normalizeBadgeName(row.name)) : undefined;
    const input = {
      lectureName: row.name,
      hostGroupNames: row.groups,
      family,
      accent,
      hostSplit,
      instanceId: `lab-${index}`,
    };
    const badge = buildLectureBadge(input);
    const article = document.createElement("article");
    const button = document.createElement("button");
    button.className = "art";
    button.type = "button";
    button.setAttribute("aria-label", `${index + 1} ${row.name}を拡大`);
    button.innerHTML = badge.svg;
    const heading = document.createElement("h2");
    heading.textContent = `${index + 1}. ${row.name}`;
    const info = document.createElement("p");
    info.textContent = `${row.groups.join(" + ") || "主催未設定"} / 共通語：${family ?? "なし"}`;
    button.onclick = () => {
      element("detail-title").textContent = heading.textContent;
      element("detail-info").textContent = info.textContent;
      element("detail-art").innerHTML = buildLectureBadge({
        ...input,
        instanceId: "lab-detail",
      }).svg;
      dialog.showModal();
    };
    article.append(button, heading, info);
    gallery.append(article);
  }
  element("status").textContent =
    `${BADGE_DESIGN_VERSION} / ${rows.length}例 / 共催は等角度。角度が同じでも色の面積が同じとは限りません。`;
}
accentButton.onclick = () => {
  accentIndex = (accentIndex + 1) % accents.length;
  render();
};
related.onchange = render;
split.onchange = render;
size.onchange = () =>
  document.documentElement.style.setProperty("--badge-size", `${Number(size.value)}px`);
element("apply").onclick = render;
element("close").onclick = () => dialog.close();
render();
