package store

import (
	"context"
	"errors"
	"time"

	"github.com/traP-jp/1m26_13/backend/internal/domain"
)

var (
	ErrNotFound = errors.New("not found")
	ErrConflict = errors.New("revision conflict")
	ErrInvalid  = errors.New("invalid data")
)

type LectureFilter struct {
	Query        string
	Year         int
	FieldID      string
	IncludeDraft bool
}

type Repository interface {
	ListFields(context.Context) ([]domain.Field, error)
	ListLectures(context.Context, LectureFilter, string) ([]domain.Lecture, error)
	GetLecture(context.Context, string, string, bool) (domain.Lecture, error)
	CreateLecture(context.Context, domain.Lecture, string) (domain.Lecture, error)
	UpdateLecture(context.Context, domain.Lecture, int, string) (domain.Lecture, error)
	GetSession(context.Context, string, string, bool) (domain.Session, error)
	CreateSession(context.Context, domain.Session, string) (domain.Session, error)
	UpdateSession(context.Context, domain.Session, int, string) (domain.Session, error)
	CompleteSession(context.Context, string, string) (domain.Completion, error)
	UncompleteSession(context.Context, string, string) error
	ListCompletions(context.Context, string) ([]domain.Completion, error)
	ListCompletedLectures(context.Context, string) (map[string]time.Time, error)
	ListFlowClasses(context.Context, string, bool) ([]domain.FlowClass, error)
	GetFlowClass(context.Context, string) (domain.FlowClass, error)
	CreateFlowClass(context.Context, domain.FlowClass, string) (domain.FlowClass, error)
	UpdateFlowClass(context.Context, domain.FlowClass, int, string) (domain.FlowClass, error)
	CreateFlow(context.Context, string, string, string) (domain.Flow, error)
	ListFlows(context.Context, string, string) ([]domain.Flow, error)
	GetFlow(context.Context, string) (domain.Flow, error)
	UpdateFlow(context.Context, domain.Flow, int, string) (domain.Flow, error)
	ListRoadmaps(context.Context, bool) ([]domain.Roadmap, error)
	GetRoadmap(context.Context, string, bool) (domain.Roadmap, error)
	CreateRoadmap(context.Context, domain.Roadmap, string) (domain.Roadmap, error)
	UpdateRoadmap(context.Context, domain.Roadmap, int, string) (domain.Roadmap, error)
	ListEvents(context.Context, string, string) ([]domain.AttributeUpdateEvent, error)
}
