export type FlowNode = {
  kind: "heading" | "paragraph" | "input" | "task" | "copy" | "code";
  text: string;
  key?: string;
};
export type FlowPage = { title: string; nodes: FlowNode[] };

export function parseFlow(source: string): FlowPage[] {
  return source
    .replaceAll("\r\n", "\n")
    .split("\n---\n")
    .map((rawPage) => {
      const lines = rawPage.trim().split("\n");
      const nodes: FlowNode[] = [];
      let paragraph: string[] = [];
      let fence: "copy" | "code" | "" = "";
      let fenced: string[] = [];
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
        const input = line.match(/^\{\{\s*([^}]+)\s*\}\}$/);
        const task = line.match(/^- \[ \]\{#([a-z][a-z0-9-]*)\}\s+(.+)$/);
        if (line.startsWith("# ")) {
          flush();
          nodes.push({ kind: "heading", text: line.slice(2).trim() });
        } else if (input) {
          flush();
          nodes.push({ kind: "input", text: input[1]!.trim(), key: input[1]!.trim() });
        } else if (task) {
          flush();
          nodes.push({ kind: "task", text: task[2]!, key: task[1]! });
        } else if (!line) flush();
        else paragraph.push(rawLine);
      }
      flush();
      const heading = nodes.find((node) => node.kind === "heading");
      return { title: heading?.text ?? "Flow", nodes: nodes.filter((node) => node !== heading) };
    });
}

export function expandValues(value: string, answers: Record<string, string>) {
  return value.replace(/\[\[\s*([^\]]+)\s*\]\]/g, (_, key: string) => answers[key.trim()] ?? "");
}
