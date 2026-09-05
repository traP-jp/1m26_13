package httpapi

import (
	"encoding/json"
	"reflect"
	"testing"
	"time"

	"github.com/traP-jp/1m26_13/backend/internal/api"
	"github.com/traP-jp/1m26_13/backend/internal/domain"
)

func TestBadgeToAPIIncludesCurrentOrganizerWithoutChangingCompletion(t *testing.T) {
	earned := time.Date(2026, 9, 5, 0, 0, 0, 0, time.UTC)
	lecture := domain.Lecture{ID: "10", Name: "Git講習会", AcademicYearStart: 2026, AcademicYearEnd: 2027,
		Organizer: &domain.Organizer{Kind: "group", ID: "group-id", GroupName: "SysAd"}}
	got := badgeToAPI(lecture, earned)
	if got.LectureId != "10" || got.LectureName != lecture.Name || got.EarnedAt != earned || got.AcademicYearStart != 2026 || got.AcademicYearEnd != 2027 {
		t.Fatalf("completion identity changed: %#v", got)
	}
	if got.Organizer == nil || got.Organizer.Id != "group-id" || got.Organizer.GroupName == nil || *got.Organizer.GroupName != "SysAd" {
		t.Fatalf("missing organizer: %#v", got.Organizer)
	}
	lecture.Organizer = nil
	got = badgeToAPI(lecture, earned)
	if got.Organizer != nil {
		t.Fatalf("unset organizer should remain absent: %#v", got.Organizer)
	}
	encoded, err := json.Marshal(got)
	if err != nil {
		t.Fatal(err)
	}
	var payload map[string]any
	if err := json.Unmarshal(encoded, &payload); err != nil {
		t.Fatal(err)
	}
	if _, exists := payload["organizer"]; exists {
		t.Fatal("unset organizer must be omitted")
	}
	lecture.Organizer = &domain.Organizer{Kind: "user", ID: "user-id"}
	got = badgeToAPI(lecture, earned)
	if got.Organizer == nil || got.Organizer.Kind != api.User || got.Organizer.GroupName != nil {
		t.Fatalf("individual organizer misrepresented as a group: %#v", got.Organizer)
	}
}

func TestRoadmapFromWriteKeepsFlatMixedTargets(t *testing.T) {
	input := api.RoadmapWrite{Title: " path ", Items: []api.RoadmapItem{
		{Id: "one", TargetType: api.RoadmapTargetTypeLecture, TargetId: "10"},
		{Id: "two", TargetType: api.RoadmapTargetTypeSession, TargetId: "20"},
	}}
	got, err := roadmapFromWrite(input)
	if err != nil {
		t.Fatal(err)
	}
	want := []domain.RoadmapItem{{ID: "one", TargetType: "lecture", TargetID: "10"}, {ID: "two", TargetType: "session", TargetID: "20"}}
	if got.Title != "path" || !reflect.DeepEqual(got.Items, want) {
		t.Fatalf("roadmapFromWrite() = %#v", got)
	}
}

func TestRoadmapToAPIUsesSessionAndLectureCompletion(t *testing.T) {
	roadmap := domain.Roadmap{Items: []domain.RoadmapItem{
		{ID: "lecture-item", TargetType: "lecture", TargetID: "10"},
		{ID: "session-item", TargetType: "session", TargetID: "20"},
	}}
	now := time.Now()
	got := roadmapToAPI(roadmap, map[string]time.Time{}, map[string]time.Time{"20": now})
	if got.CompletedItemCount != 1 || got.TotalItemCount != 2 || got.ProgressPercent != 50 {
		t.Fatalf("unexpected progress: %#v", got)
	}
	if !reflect.DeepEqual(got.CompletedItemIds, []string{"session-item"}) || got.NextItemId == nil || *got.NextItemId != "lecture-item" {
		t.Fatalf("unexpected completion state: %#v", got)
	}
}
