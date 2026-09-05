package domain

import "time"

type Resource struct {
	Title string `json:"title,omitempty"`
	URL   string `json:"url"`
}
type Organizer struct {
	Kind, ID, GroupName string
}
type Relation struct {
	ToLectureID string `json:"toLectureId"`
	Type        string `json:"type"`
}
type Lecture struct {
	ID, Name, Description                                                string
	AcademicYearStart, AcademicYearEnd                                   int
	FieldID                                                              string
	OrganizerGroupIDs, OrganizerUserIDs, ContactGroupIDs, ContactUserIDs []string
	TargetAudience                                                       string
	IsIntroductory                                                       bool
	TraQChannelID                                                        string
	Resources                                                            []Resource
	Material                                                             *Resource
	Organizer                                                            *Organizer
	Relations                                                            []Relation
	Sessions                                                             []Session
	Revision                                                             int
	CreatedAt, UpdatedAt                                                 time.Time
}
type Session struct {
	ID, LectureID, Name, Description   string
	Order                              int
	Date, StartTime, Location, KnoQURL string
	InstructorIDs                      []string
	Resources                          []Resource
	Material                           *Resource
	InstructorID                       string
	ReplayOfSessionIDs                 []string
	Status                             string
	IsCompleted                        bool
	Revision                           int
	CreatedAt, UpdatedAt               time.Time
}
type FlowClass struct {
	ID, Name, Type, Text string
	FormatVersion        int
	Listed               bool
	Revision             int
	CreatedAt, UpdatedAt time.Time
}
type Flow struct {
	ID, FlowClassID, TargetID, Type, Text string
	FormatVersion                         int
	CurrentPage                           int
	Revision                              int
	CreatedAt, UpdatedAt                  time.Time
}
type LectureWorkspace struct {
	Lecture Lecture
	Flows   []Flow
}
type SessionCreateResult struct {
	Workspace LectureWorkspace
	Session   Session
	Flow      Flow
}
type LegacyRoadmapItem struct {
	LectureID string `json:"lectureId"`
	Note      string `json:"note"`
}
type RoadmapStage struct {
	ID          string              `json:"id"`
	Title       string              `json:"title"`
	Description string              `json:"description"`
	Items       []LegacyRoadmapItem `json:"items"`
}
type RoadmapItem struct {
	ID         string `json:"id"`
	TargetType string `json:"targetType"`
	TargetID   string `json:"targetId"`
}
type Roadmap struct {
	ID, Title, Description, Audience string
	Published                        bool
	Items                            []RoadmapItem
	LegacyStages                     []RoadmapStage
	Revision                         int
	CreatedAt, UpdatedAt             time.Time
}
type Completion struct {
	UserID, SessionID, LectureID string
	RoundNumber                  int
	CompletedAt                  time.Time
}
type AttributeUpdateEvent struct {
	ID, EntityType, EntityID, AttributePath string
	PreviousValue, NextValue                any
	ActorID                                 string
	OccurredAt                              time.Time
	ChangeSetID                             string
}
type Field struct{ ID, Name string }
