package httpapi

import (
	"reflect"
	"testing"
	"time"

	"github.com/traP-jp/1m26_13/backend/internal/api"
	"github.com/traP-jp/1m26_13/backend/internal/domain"
)

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
