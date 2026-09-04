package flow

import "testing"

func TestParse(t *testing.T) {
	document, err := Parse("# 準備\n\n{{ lecture.name }}\n\n- [ ] 目的を確認\n\n---\n# 告知\n\n[[ lecture.name ]]", "lecture_pre")
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if document.PageCount != 2 || len(document.Checkboxes) != 1 || document.Checkboxes[0].Text != "目的を確認" {
		t.Fatalf("unexpected document: %#v", document)
	}
}

func TestParseReadsLegacyAndCheckedTasks(t *testing.T) {
	document, err := Parse("# 準備\n- [ ]{#legacy} 旧形式\n- [x] 完了", "lecture_pre")
	if err != nil || len(document.Checkboxes) != 2 || !document.Checkboxes[1].Checked {
		t.Fatalf("unexpected document: %#v, %v", document, err)
	}
}

func TestSetCheckboxOnlyChangesMarker(t *testing.T) {
	input := "# 準備\n\n- [ ] 最初\n- [ ]{#legacy} 次\n\n---\n# 二頁目\n- [ ] 最後"
	got, err := SetCheckbox(input, "lecture_pre", 0, 1, true, "次")
	if err != nil {
		t.Fatal(err)
	}
	want := "# 準備\n\n- [ ] 最初\n- [x]{#legacy} 次\n\n---\n# 二頁目\n- [ ] 最後"
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}

func TestParseEditInput(t *testing.T) {
	document, err := Parse("# 教材\n\n{{ edit lecture.resources }}", "lecture_pre")
	if err != nil || len(document.InputKeys) != 1 || document.InputKeys[0] != "lecture.resources" {
		t.Fatalf("unexpected document: %#v, %v", document, err)
	}
}

func TestParseRestrictsTarget(t *testing.T) {
	if _, err := Parse("# 開催\n{{ lecture.name }}", "session_main"); err == nil {
		t.Fatal("expected lecture input in session flow to fail")
	}
}

func TestParseRejectsUnknownTargetField(t *testing.T) {
	if _, err := Parse("# 準備\n{{ lecture.typo }}", "lecture_pre"); err == nil {
		t.Fatal("expected unknown lecture input to fail")
	}
}

func TestParseValidatesCopyBlockValues(t *testing.T) {
	if _, err := Parse("# 準備\n```copy\n[[ session.typo ]]\n```", "session_main"); err == nil {
		t.Fatal("expected unknown copy value to fail")
	}
}
