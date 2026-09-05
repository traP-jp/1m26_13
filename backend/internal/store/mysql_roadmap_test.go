package store

import (
	"reflect"
	"testing"

	"github.com/traP-jp/1m26_13/backend/internal/domain"
)

func TestFlattenLegacyRoadmapItemsPreservesStageAndItemOrder(t *testing.T) {
	stages := []domain.RoadmapStage{
		{ID: "foundation", Items: []domain.LegacyRoadmapItem{{LectureID: "10", Note: "first"}, {LectureID: "11", Note: "second"}}},
		{ID: "practice", Items: []domain.LegacyRoadmapItem{{LectureID: "12", Note: "third"}}},
	}
	want := []domain.RoadmapItem{
		{ID: "legacy:foundation:0", TargetType: "lecture", TargetID: "10"},
		{ID: "legacy:foundation:1", TargetType: "lecture", TargetID: "11"},
		{ID: "legacy:practice:0", TargetType: "lecture", TargetID: "12"},
	}
	if got := flattenLegacyRoadmapItems(stages); !reflect.DeepEqual(got, want) {
		t.Fatalf("flattenLegacyRoadmapItems() = %#v, want %#v", got, want)
	}
}
