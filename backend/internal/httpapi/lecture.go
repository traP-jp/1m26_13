package httpapi

import (
	"context"
	"errors"
	"net/url"
	"strings"
	"time"

	openapi_types "github.com/oapi-codegen/runtime/types"
	"github.com/traP-jp/1m26_13/backend/internal/api"
	"github.com/traP-jp/1m26_13/backend/internal/domain"
	"github.com/traP-jp/1m26_13/backend/internal/store"
)

func text(pointer *string) string {
	if pointer == nil {
		return ""
	}
	return strings.TrimSpace(*pointer)
}
func stringPointer(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}

func validateURL(value string) bool {
	if value == "" {
		return true
	}
	parsed, err := url.ParseRequestURI(value)
	return err == nil && (parsed.Scheme == "http" || parsed.Scheme == "https") && parsed.Host != ""
}

func lectureFromWrite(input api.LectureWrite) (domain.Lecture, error) {
	lecture := domain.Lecture{Name: strings.TrimSpace(input.Name), Description: text(input.Description), AcademicYearStart: input.AcademicYearStart,
		AcademicYearEnd: input.AcademicYearEnd, FieldID: text(input.FieldId), OrganizerGroupIDs: input.OrganizerGroupIds,
		OrganizerUserIDs: input.OrganizerUserIds, ContactGroupIDs: input.ContactGroupIds, ContactUserIDs: input.ContactUserIds,
		TargetAudience: text(input.TargetAudience), IsIntroductory: input.IsIntroductory, TraQChannelID: text(input.TraqChannelId),
		Resources: make([]domain.Resource, 0, len(input.Resources)), Relations: make([]domain.Relation, 0, len(input.Relations))}
	if lecture.Name == "" || lecture.AcademicYearStart > lecture.AcademicYearEnd {
		return domain.Lecture{}, store.ErrInvalid
	}
	for _, resource := range input.Resources {
		if !validateURL(resource.Url) {
			return domain.Lecture{}, store.ErrInvalid
		}
		lecture.Resources = append(lecture.Resources, domain.Resource{Title: text(resource.Title), URL: resource.Url})
	}
	seenRelations := make(map[string]bool)
	for _, relation := range input.Relations {
		key := relation.ToLectureId + ":" + string(relation.Type)
		if relation.ToLectureId == "" || seenRelations[key] {
			return domain.Lecture{}, store.ErrInvalid
		}
		seenRelations[key] = true
		lecture.Relations = append(lecture.Relations, domain.Relation{ToLectureID: relation.ToLectureId, Type: string(relation.Type)})
	}
	return lecture, nil
}

func sessionFromWrite(input api.SessionWrite) (domain.Session, error) {
	session := domain.Session{Name: strings.TrimSpace(input.Name), Description: text(input.Description), Order: input.Order,
		StartTime: text(input.StartTime), Location: text(input.Location), KnoQURL: text(input.KnoqUrl),
		InstructorIDs: input.InstructorIds, ReplayOfSessionIDs: input.ReplayOfSessionIds, Status: string(input.Status),
		Resources: make([]domain.Resource, 0, len(input.Resources))}
	if input.Date != nil {
		session.Date = input.Date.Format("2006-01-02")
	}
	if session.Name == "" || session.Order < 0 || (session.Date == "" && session.StartTime != "") || !validateURL(session.KnoQURL) {
		return domain.Session{}, store.ErrInvalid
	}
	for _, resource := range input.Resources {
		if !validateURL(resource.Url) {
			return domain.Session{}, store.ErrInvalid
		}
		session.Resources = append(session.Resources, domain.Resource{Title: text(resource.Title), URL: resource.Url})
	}
	return session, nil
}

func sessionToAPI(session domain.Session) api.Session {
	result := api.Session{Id: session.ID, LectureId: session.LectureID, Name: session.Name, Description: stringPointer(session.Description),
		Order: session.Order, StartTime: stringPointer(session.StartTime), Location: stringPointer(session.Location), KnoqUrl: stringPointer(session.KnoQURL),
		InstructorIds: session.InstructorIDs, ReplayOfSessionIds: session.ReplayOfSessionIDs, Status: api.SessionStatus(session.Status),
		IsReplay: len(session.ReplayOfSessionIDs) > 0, IsCompleted: session.IsCompleted, Revision: session.Revision,
		ExpectedRevision: session.Revision, CreatedAt: session.CreatedAt, UpdatedAt: session.UpdatedAt, Resources: make([]api.Resource, 0, len(session.Resources))}
	if session.Date != "" {
		if parsed, err := time.Parse("2006-01-02", session.Date); err == nil {
			date := openapi_types.Date{Time: parsed}
			result.Date = &date
		}
	}
	for _, resource := range session.Resources {
		result.Resources = append(result.Resources, api.Resource{Title: stringPointer(resource.Title), Url: resource.URL})
	}
	return result
}

func lectureToAPI(lecture domain.Lecture) api.Lecture {
	result := api.Lecture{Id: lecture.ID, Name: lecture.Name, Description: stringPointer(lecture.Description), AcademicYearStart: lecture.AcademicYearStart,
		AcademicYearEnd: lecture.AcademicYearEnd, FieldId: stringPointer(lecture.FieldID), OrganizerGroupIds: lecture.OrganizerGroupIDs,
		OrganizerUserIds: lecture.OrganizerUserIDs, ContactGroupIds: lecture.ContactGroupIDs, ContactUserIds: lecture.ContactUserIDs,
		TargetAudience: stringPointer(lecture.TargetAudience), IsIntroductory: lecture.IsIntroductory, TraqChannelId: stringPointer(lecture.TraQChannelID),
		Revision: lecture.Revision, ExpectedRevision: lecture.Revision, CreatedAt: lecture.CreatedAt, UpdatedAt: lecture.UpdatedAt,
		Resources: make([]api.Resource, 0, len(lecture.Resources)), Relations: make([]api.LectureRelation, 0, len(lecture.Relations)),
		Sessions: make([]api.Session, 0, len(lecture.Sessions))}
	for _, resource := range lecture.Resources {
		result.Resources = append(result.Resources, api.Resource{Title: stringPointer(resource.Title), Url: resource.URL})
	}
	for _, relation := range lecture.Relations {
		result.Relations = append(result.Relations, api.LectureRelation{ToLectureId: relation.ToLectureID, Type: api.RelationType(relation.Type)})
	}
	for _, session := range lecture.Sessions {
		result.Sessions = append(result.Sessions, sessionToAPI(session))
		if session.Status == "published" {
			result.IsPublished = true
		}
		if session.Status == "published" && len(session.ReplayOfSessionIDs) == 0 {
			result.RequiredSessionCount++
			if session.IsCompleted {
				result.CompletedSessionCount++
			}
		}
	}
	result.IsCompleted = result.RequiredSessionCount > 0 && result.CompletedSessionCount == result.RequiredSessionCount
	return result
}

func (server server) ListLectures(ctx context.Context, request api.ListLecturesRequestObject) (api.ListLecturesResponseObject, error) {
	user, err := server.currentUser(ctx)
	if err != nil {
		return nil, err
	}
	filter := store.LectureFilter{}
	if request.Params.Q != nil {
		filter.Query = *request.Params.Q
	}
	if request.Params.Year != nil {
		filter.Year = *request.Params.Year
	}
	if request.Params.FieldId != nil {
		filter.FieldID = *request.Params.FieldId
	}
	if request.Params.IncludeDraft != nil {
		filter.IncludeDraft = *request.Params.IncludeDraft
	}
	lectures, err := server.repository.ListLectures(ctx, filter, user.ID)
	if err != nil {
		return nil, err
	}
	result := make(api.ListLectures200JSONResponse, 0, len(lectures))
	for _, lecture := range lectures {
		result = append(result, lectureToAPI(lecture))
	}
	return result, nil
}

func (server server) CreateLecture(ctx context.Context, request api.CreateLectureRequestObject) (api.CreateLectureResponseObject, error) {
	if request.Body == nil {
		return api.CreateLecture400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_body", Message: "request body is required"}}, nil
	}
	user, err := server.currentUser(ctx)
	if err != nil {
		return nil, err
	}
	lecture, err := lectureFromWrite(*request.Body)
	if err != nil {
		return api.CreateLecture400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_lecture", Message: "講習会の入力を確認してください"}}, nil
	}
	created, err := server.repository.CreateLecture(ctx, lecture, user.ID)
	if err != nil {
		if errors.Is(err, store.ErrInvalid) {
			return api.CreateLecture400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_lecture", Message: err.Error()}}, nil
		}
		return nil, err
	}
	return api.CreateLecture201JSONResponse(lectureToAPI(created)), nil
}

func (server server) GetLecture(ctx context.Context, request api.GetLectureRequestObject) (api.GetLectureResponseObject, error) {
	user, err := server.currentUser(ctx)
	if err != nil {
		return nil, err
	}
	includeDraft := request.Params.IncludeDraft != nil && *request.Params.IncludeDraft
	lecture, err := server.repository.GetLecture(ctx, request.LectureId, user.ID, includeDraft)
	if errors.Is(err, store.ErrNotFound) {
		return api.GetLecture404JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "lecture_not_found", Message: "講習会が見つかりません"}}, nil
	}
	if err != nil {
		return nil, err
	}
	return api.GetLecture200JSONResponse(lectureToAPI(lecture)), nil
}

func (server server) UpdateLecture(ctx context.Context, request api.UpdateLectureRequestObject) (api.UpdateLectureResponseObject, error) {
	if request.Body == nil {
		return api.UpdateLecture400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_body", Message: "request body is required"}}, nil
	}
	user, err := server.currentUser(ctx)
	if err != nil {
		return nil, err
	}
	lecture, err := lectureFromWrite(*request.Body)
	if err != nil {
		return api.UpdateLecture400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_lecture", Message: "講習会の入力を確認してください"}}, nil
	}
	lecture.ID = request.LectureId
	updated, err := server.repository.UpdateLecture(ctx, lecture, request.Body.ExpectedRevision, user.ID)
	if errors.Is(err, store.ErrNotFound) {
		return api.UpdateLecture404JSONResponse{Code: "lecture_not_found", Message: "講習会が見つかりません"}, nil
	}
	if errors.Is(err, store.ErrConflict) {
		return api.UpdateLecture409JSONResponse{Code: "revision_conflict", Message: "別の利用者が先に更新しました。再読込してください"}, nil
	}
	if errors.Is(err, store.ErrInvalid) {
		return api.UpdateLecture400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_lecture", Message: err.Error()}}, nil
	}
	if err != nil {
		return nil, err
	}
	return api.UpdateLecture200JSONResponse(lectureToAPI(updated)), nil
}

func (server server) CreateSession(ctx context.Context, request api.CreateSessionRequestObject) (api.CreateSessionResponseObject, error) {
	if request.Body == nil {
		return api.CreateSession400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_body", Message: "request body is required"}}, nil
	}
	user, err := server.currentUser(ctx)
	if err != nil {
		return nil, err
	}
	session, err := sessionFromWrite(*request.Body)
	if err != nil {
		return api.CreateSession400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_session", Message: "開催の入力を確認してください"}}, nil
	}
	session.LectureID = request.LectureId
	created, err := server.repository.CreateSession(ctx, session, user.ID)
	if errors.Is(err, store.ErrNotFound) {
		return api.CreateSession404JSONResponse{Code: "lecture_not_found", Message: "講習会が見つかりません"}, nil
	}
	if errors.Is(err, store.ErrInvalid) {
		return api.CreateSession400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_session", Message: err.Error()}}, nil
	}
	if err != nil {
		return nil, err
	}
	return api.CreateSession201JSONResponse(sessionToAPI(created)), nil
}

func (server server) GetSession(ctx context.Context, request api.GetSessionRequestObject) (api.GetSessionResponseObject, error) {
	user, err := server.currentUser(ctx)
	if err != nil {
		return nil, err
	}
	includeDraft := request.Params.IncludeDraft != nil && *request.Params.IncludeDraft
	session, err := server.repository.GetSession(ctx, request.SessionId, user.ID, includeDraft)
	if errors.Is(err, store.ErrNotFound) {
		return api.GetSession404JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "session_not_found", Message: "開催が見つかりません"}}, nil
	}
	if err != nil {
		return nil, err
	}
	return api.GetSession200JSONResponse(sessionToAPI(session)), nil
}

func (server server) UpdateSession(ctx context.Context, request api.UpdateSessionRequestObject) (api.UpdateSessionResponseObject, error) {
	if request.Body == nil {
		return api.UpdateSession400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_body", Message: "request body is required"}}, nil
	}
	user, err := server.currentUser(ctx)
	if err != nil {
		return nil, err
	}
	session, err := sessionFromWrite(*request.Body)
	if err != nil {
		return api.UpdateSession400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_session", Message: "開催の入力を確認してください"}}, nil
	}
	session.ID = request.SessionId
	updated, err := server.repository.UpdateSession(ctx, session, request.Body.ExpectedRevision, user.ID)
	if errors.Is(err, store.ErrNotFound) {
		return api.UpdateSession404JSONResponse{Code: "session_not_found", Message: "開催が見つかりません"}, nil
	}
	if errors.Is(err, store.ErrConflict) {
		return api.UpdateSession409JSONResponse{Code: "revision_conflict", Message: "別の利用者が先に更新しました。再読込してください"}, nil
	}
	if errors.Is(err, store.ErrInvalid) {
		return api.UpdateSession400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_session", Message: err.Error()}}, nil
	}
	if err != nil {
		return nil, err
	}
	return api.UpdateSession200JSONResponse(sessionToAPI(updated)), nil
}

func (server server) CompleteSession(ctx context.Context, request api.CompleteSessionRequestObject) (api.CompleteSessionResponseObject, error) {
	user, err := server.currentUser(ctx)
	if err != nil {
		return nil, err
	}
	completion, err := server.repository.CompleteSession(ctx, request.SessionId, user.ID)
	if errors.Is(err, store.ErrNotFound) {
		return api.CompleteSession404JSONResponse{Code: "session_not_found", Message: "開催が見つかりません"}, nil
	}
	if errors.Is(err, store.ErrInvalid) {
		return api.CompleteSession400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "completion_not_allowed", Message: err.Error()}}, nil
	}
	if err != nil {
		return nil, err
	}
	return api.CompleteSession200JSONResponse{UserId: completion.UserID, SessionId: completion.SessionID, CompletedAt: completion.CompletedAt}, nil
}

func (server server) UncompleteSession(ctx context.Context, request api.UncompleteSessionRequestObject) (api.UncompleteSessionResponseObject, error) {
	user, err := server.currentUser(ctx)
	if err != nil {
		return nil, err
	}
	err = server.repository.UncompleteSession(ctx, request.SessionId, user.ID)
	if errors.Is(err, store.ErrNotFound) {
		return api.UncompleteSession404JSONResponse{Code: "completion_not_found", Message: "完了記録が見つかりません"}, nil
	}
	if err != nil {
		return nil, err
	}
	return api.UncompleteSession204Response{}, nil
}
