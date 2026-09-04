package store

import (
	"context"
	"errors"
	"time"

	"github.com/traP-jp/1m26_13/backend/internal/domain"
)

var (
	ErrNotFound            = errors.New("not found")
	ErrConflict            = errors.New("revision conflict")
	ErrInvalid             = errors.New("invalid data")
	ErrIncompleteWorkspace = errors.New("workspace is missing a required flow")
)

type LectureFilter struct {
	Query        string
	Year         int
	FieldID      string
	IncludeDraft bool
}

type LectureCreate struct {
	Name                                                                  string
	AcademicYearStart, AcademicYearEnd                                    int
	LecturePreFlowClassID, SessionMainFlowClassID, LecturePostFlowClassID string
}

type SessionCreate struct {
	Mode, FlowClassID, SourceSessionID string
	ReplayOfSessionIDs                 []string
}
type SessionOrderItem struct {
	SessionID string
	Order     int
}

type Repository interface {
	ListFields(context.Context) ([]domain.Field, error)
	ListLectures(context.Context, LectureFilter, string) ([]domain.Lecture, error)
	GetLecture(context.Context, string, string, bool) (domain.Lecture, error)
	CreateLectureWorkspace(context.Context, LectureCreate, string) (domain.LectureWorkspace, error)
	GetLectureWorkspace(context.Context, string, string) (domain.LectureWorkspace, error)
	PatchLectureAttribute(context.Context, string, string, any, any, bool, string) (domain.Lecture, bool, error)
	UpdateLecture(context.Context, domain.Lecture, int, string) (domain.Lecture, error)
	GetSession(context.Context, string, string, bool) (domain.Session, error)
	CreateSessionWorkspace(context.Context, string, SessionCreate, string) (domain.SessionCreateResult, error)
	PatchSessionAttribute(context.Context, string, string, any, any, bool, string) (domain.Session, bool, error)
	ReorderSessions(context.Context, string, []SessionOrderItem, string) ([]domain.Session, error)
	UpdateSession(context.Context, domain.Session, int, string) (domain.Session, error)
	CompleteSession(context.Context, string, string) (domain.Completion, error)
	UncompleteSession(context.Context, string, string) error
	ListCompletions(context.Context, string) ([]domain.Completion, error)
	ListCompletedLectures(context.Context, string) (map[string]time.Time, error)
	ListFlowClasses(context.Context, string, bool) ([]domain.FlowClass, error)
	GetFlowClass(context.Context, string) (domain.FlowClass, error)
	CreateFlowClass(context.Context, domain.FlowClass, string) (domain.FlowClass, error)
	UpdateFlowClass(context.Context, domain.FlowClass, int, string) (domain.FlowClass, error)
	ListFlows(context.Context, string, string) ([]domain.Flow, error)
	GetFlow(context.Context, string) (domain.Flow, error)
	ReplaceFlowClass(context.Context, string, string, string) (domain.Flow, error)
	PatchFlowCheck(context.Context, string, int, int, bool, string, string) (domain.Flow, error)
	UpdateFlowPage(context.Context, string, int, string) (domain.Flow, error)
	ListRoadmaps(context.Context, bool) ([]domain.Roadmap, error)
	GetRoadmap(context.Context, string, bool) (domain.Roadmap, error)
	CreateRoadmap(context.Context, domain.Roadmap, string) (domain.Roadmap, error)
	UpdateRoadmap(context.Context, domain.Roadmap, int, string) (domain.Roadmap, error)
	ListEvents(context.Context, string, string) ([]domain.AttributeUpdateEvent, error)
	ListLectureEvents(context.Context, string, string) ([]domain.AttributeUpdateEvent, error)
}
