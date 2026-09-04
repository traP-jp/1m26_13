import { describe, expect, it } from "vitest";

import { expandValues, parseFlow } from "./flowParser";

describe("parseFlow", () => {
  it("keeps pages and gives checkboxes page-local positions", () => {
    const pages = parseFlow(
      "# 準備\n\n- [ ] 日時を決める\n- [x] 会場を予約する\n\n---\n# 告知\n\n- [X] 告知する",
    );

    expect(pages).toHaveLength(2);
    expect(pages.map((page) => page.title)).toEqual(["準備", "告知"]);
    expect(pages[0]?.nodes).toEqual([
      {
        kind: "task",
        text: "日時を決める",
        pageIndex: 0,
        checkboxIndex: 0,
        checked: false,
        key: "0:0",
      },
      {
        kind: "task",
        text: "会場を予約する",
        pageIndex: 0,
        checkboxIndex: 1,
        checked: true,
        key: "0:1",
      },
    ]);
    expect(pages[1]?.nodes[0]).toMatchObject({
      kind: "task",
      pageIndex: 1,
      checkboxIndex: 0,
      checked: true,
    });
  });

  it("reads legacy stable-key tasks without using the key as state", () => {
    const first = parseFlow("# 確認\n- [ ]{#confirm-purpose} 目的を確認する")[0]?.nodes[0];
    const renamed = parseFlow("# 確認\n- [ ]{#another-key} 目的を確認する")[0]?.nodes[0];

    expect(first).toEqual({
      kind: "task",
      text: "目的を確認する",
      pageIndex: 0,
      checkboxIndex: 0,
      checked: false,
      key: "0:0",
    });
    expect(renamed).toEqual(first);
  });

  it("distinguishes scalar inputs from compound-value editors", () => {
    const nodes = parseFlow(
      "# 入力\n{{ lecture.name }}\n\n{{ edit lecture.resources }}\n\n{{ edit session.material }}",
    )[0]?.nodes;

    expect(nodes).toEqual([
      {
        kind: "input",
        text: "lecture.name",
        path: "lecture.name",
        mode: "scalar",
        key: "lecture.name",
      },
      {
        kind: "input",
        text: "lecture.resources",
        path: "lecture.resources",
        mode: "edit",
        key: "lecture.resources",
      },
      {
        kind: "input",
        text: "session.material",
        path: "session.material",
        mode: "edit",
        key: "session.material",
      },
    ]);
  });

  it("keeps copy and code fences intact", () => {
    const nodes = parseFlow(
      "# 告知\n```copy\n[[ lecture.name ]]を開催します\n```\n```sh\necho hello\n```",
    )[0]?.nodes;

    expect(nodes).toEqual([
      { kind: "copy", text: "[[ lecture.name ]]を開催します" },
      { kind: "code", text: "echo hello" },
    ]);
  });
});

describe("expandValues", () => {
  it("expands scalar and structured values while leaving unknown values empty", () => {
    expect(
      expandValues("[[ lecture.name ]] / [[ session.material ]] / [[ missing ]]", {
        "lecture.name": "Go入門",
        "session.material": { title: "講義資料", url: "https://example.com" },
      }),
    ).toBe('Go入門 / {"title":"講義資料","url":"https://example.com"} / ');
  });
});
