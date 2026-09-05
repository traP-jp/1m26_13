export type FlowNode =
  | { kind: "heading" | "paragraph" | "copy" | "code"; text: string }
  | {
      kind: "input";
      text: string;
      path: string;
      mode: "scalar" | "edit";
      /** @deprecated Use path. Kept while the existing runners migrate to attribute bindings. */
      key: string;
    }
  | {
      kind: "task";
      text: string;
      pageIndex: number;
      checkboxIndex: number;
      checked: boolean;
      /** @deprecated Positional compatibility key. It is not persisted in Flow state. */
      key: string;
    };
export type FlowPage = { title: string; nodes: FlowNode[] };

const inputPattern = /^\{\{\s*(?:(edit)\s+)?([a-z][a-zA-Z0-9_.-]*)\s*\}\}$/;
const taskPattern = /^- \[([ xX])\](?:\{#[a-z][a-z0-9-]{0,63}\})?\s+(.+)$/;

export function parseFlow(source: string): FlowPage[] {
  return source
    .replaceAll("\r\n", "\n")
    .split("\n---\n")
    .map((rawPage, pageIndex) => {
      const lines = rawPage.trim().split("\n");
      const nodes: FlowNode[] = [];
      let paragraph: string[] = [];
      let fence: "copy" | "code" | "" = "";
      let fenced: string[] = [];
      let checkboxIndex = 0;
      const flush = () => {
        if (paragraph.length) {
          nodes.push({ kind: "paragraph", text: paragraph.join("\n") });
          paragraph = [];
        }
      };
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (line.startsWith("```")) {
          if (fence) {
            nodes.push({ kind: fence, text: fenced.join("\n") });
            fence = "";
            fenced = [];
          } else {
            flush();
            fence = line === "```copy" ? "copy" : "code";
          }
          continue;
        }
        if (fence) {
          fenced.push(rawLine);
          continue;
        }
        const input = line.match(inputPattern);
        const task = line.match(taskPattern);
        if (line.startsWith("# ")) {
          flush();
          nodes.push({ kind: "heading", text: line.slice(2).trim() });
        } else if (input) {
          flush();
          const path = input[2]!;
          nodes.push({
            kind: "input",
            text: path,
            path,
            mode: input[1] ? "edit" : "scalar",
            key: path,
          });
        } else if (task) {
          flush();
          nodes.push({
            kind: "task",
            text: task[2]!,
            pageIndex,
            checkboxIndex,
            checked: task[1]!.toLowerCase() === "x",
            key: `${pageIndex}:${checkboxIndex}`,
          });
          checkboxIndex += 1;
        } else if (!line) flush();
        else paragraph.push(rawLine);
      }
      flush();
      const heading = nodes.find((node) => node.kind === "heading");
      return { title: heading?.text ?? "Flow", nodes: nodes.filter((node) => node !== heading) };
    });
}

export function expandValues(value: string, values: Readonly<Record<string, unknown>>) {
  return value.replace(/\[\[\s*([^\]]+)\s*\]\]/g, (_, rawPath: string) => {
    const resolved = values[rawPath.trim()];
    if (resolved === undefined || resolved === null) return "";
    return typeof resolved === "string" ? resolved : JSON.stringify(resolved);
  });
}
