package flow

import "testing"

func TestParse(t *testing.T) {
	document, err := Parse("# 準備\n\n{{ lecture.name }}\n\n- [ ]{#confirm-purpose} 目的を確認\n\n---\n# 告知\n\n[[ lecture.name ]]", "lecture_pre")
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if document.PageCount != 2 || len(document.TaskKeys) != 1 || document.TaskKeys[0] != "confirm-purpose" {
		t.Fatalf("unexpected document: %#v", document)
	}
}

func TestParseRejectsUnstableTask(t *testing.T) {
	if _, err := Parse("# 準備\n- [ ] 目的を確認", "lecture_pre"); err == nil {
		t.Fatal("expected unstable task to fail")
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
