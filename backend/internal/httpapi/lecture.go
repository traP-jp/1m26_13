package httpapi

import (
	"context"
	"encoding/json"
	"errors"
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

func resourceToAPI(resource *domain.Resource) *api.Resource {
	if resource == nil {
		return nil
	}
	return &api.Resource{Title: stringPointer(resource.Title), Url: resource.URL}
}

func organizerToAPI(organizer *domain.Organizer) *api.Organizer {
	if organizer == nil {
		return nil
	}
	return &api.Organizer{Kind: api.OrganizerKind(organizer.Kind), Id: organizer.ID, GroupName: stringPointer(organizer.GroupName)}
}

func sessionToAPI(session domain.Session) api.Session {
	result := api.Session{Id: session.ID, LectureId: session.LectureID, Name: session.Name,
		Description: stringPointer(session.Description), Order: session.Order, StartTime: stringPointer(session.StartTime),
		Location: stringPointer(session.Location), KnoqUrl: stringPointer(session.KnoQURL),
		InstructorId: stringPointer(session.InstructorID), Material: resourceToAPI(session.Material),
		ReplayOfSessionIds: session.ReplayOfSessionIDs, Status: api.SessionStatus(session.Status),
		IsReplay: len(session.ReplayOfSessionIDs) > 0, IsCompleted: session.IsCompleted, Revision: session.Revision,
		CreatedAt: session.CreatedAt, UpdatedAt: session.UpdatedAt, Resources: make([]api.Resource, 0, len(session.Resources))}
	if session.Date != "" {
		if parsed, err := time.Parse("2006-01-02", session.Date); err == nil {
			date := openapi_types.Date{Time: parsed}
			result.Date = &date
		}
	}
	for _, resource := range session.Resources {
		result.Resources = append(result.Resources, *resourceToAPI(&resource))
	}
	return result
}

func lectureToAPI(lecture domain.Lecture) api.Lecture {
	result := api.Lecture{Id: lecture.ID, Name: lecture.Name, Description: stringPointer(lecture.Description),
		AcademicYearStart: lecture.AcademicYearStart, AcademicYearEnd: lecture.AcademicYearEnd, FieldId: stringPointer(lecture.FieldID),
		TargetAudience: stringPointer(lecture.TargetAudience), IsIntroductory: lecture.IsIntroductory,
		TraqChannelId: stringPointer(lecture.TraQChannelID), Material: resourceToAPI(lecture.Material),
		Revision: lecture.Revision, CreatedAt: lecture.CreatedAt, UpdatedAt: lecture.UpdatedAt,
		Resources: make([]api.Resource, 0, len(lecture.Resources)), Relations: make([]api.LectureRelation, 0, len(lecture.Relations)),
		Sessions: make([]api.Session, 0, len(lecture.Sessions))}
	result.Organizer = organizerToAPI(lecture.Organizer)
	for _, resource := range lecture.Resources {
		result.Resources = append(result.Resources, *resourceToAPI(&resource))
	}
	for _, relation := range lecture.Relations {
		result.Relations = append(result.Relations, api.LectureRelation{ToLectureId: relation.ToLectureID, Type: api.RelationType(relation.Type)})
	}
	for _, session := range lecture.Sessions {
		result.Sessions = append(result.Sessions, sessionToAPI(session))
		if session.Status == "published" && len(session.ReplayOfSessionIDs) == 0 {
			result.IsPublished = true
			result.RequiredSessionCount++
			if session.IsCompleted {
				result.CompletedSessionCount++
			}
		}
	}
	result.IsCompleted = result.RequiredSessionCount > 0 && result.CompletedSessionCount == result.RequiredSessionCount
	return result
}

func workspaceToAPI(workspace domain.LectureWorkspace) api.LectureWorkspace {
	flows := make([]api.Flow, 0, len(workspace.Flows))
	for _, flow := range workspace.Flows {
		flows = append(flows, flowToAPI(flow))
	}
	return api.LectureWorkspace{Lecture: lectureToAPI(workspace.Lecture), Flows: flows}
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
	if request.Params.Limit != nil {
		filter.Limit = *request.Params.Limit
	}
	if request.Params.Cursor != nil {
		filter.Cursor = *request.Params.Cursor
	}
	page, err := server.repository.ListLectures(ctx, filter, user.ID)
	if errors.Is(err, store.ErrInvalid) {
		return api.ListLectures400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_pagination", Message: "ページ指定を確認してください"}}, nil
	}
	if err != nil {
		return nil, err
	}
	items := make([]api.Lecture, 0, len(page.Items))
	for _, lecture := range page.Items {
		items = append(items, lectureToAPI(lecture))
	}
	result := api.LecturePage{Items: items}
	if page.NextCursor != "" {
		result.NextCursor = &page.NextCursor
	}
	return api.ListLectures200JSONResponse(result), nil
}

func (server server) CreateLecture(ctx context.Context, request api.CreateLectureRequestObject) (api.CreateLectureResponseObject, error) {
	if request.Body == nil {
		return api.CreateLecture400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_body", Message: "request body is required"}}, nil
	}
	user, err := server.currentUser(ctx)
	if err != nil {
		return nil, err
	}
	year := time.Now().Year()
	start, end := year, year
	if request.Body.AcademicYearStart != nil && request.Body.AcademicYearEnd == nil {
		start = *request.Body.AcademicYearStart
		end = start
	}
	if request.Body.AcademicYearEnd != nil && request.Body.AcademicYearStart == nil {
		end = *request.Body.AcademicYearEnd
		start = end
	}
	if request.Body.AcademicYearStart != nil && request.Body.AcademicYearEnd != nil {
		start = *request.Body.AcademicYearStart
		end = *request.Body.AcademicYearEnd
	}
	if start < 2000 || start > 2200 || end < 2000 || end > 2200 || start > end {
		return api.CreateLecture400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_year", Message: "年度を確認してください"}}, nil
	}
	workspace, err := server.repository.CreateLectureWorkspace(ctx, store.LectureCreate{Name: request.Body.Name,
		AcademicYearStart: start, AcademicYearEnd: end, LecturePreFlowClassID: request.Body.LecturePreFlowClassId,
		SessionMainFlowClassID: request.Body.SessionMainFlowClassId, LecturePostFlowClassID: request.Body.LecturePostFlowClassId}, user.ID)
	if errors.Is(err, store.ErrNotFound) {
		return api.CreateLecture404JSONResponse{Code: "flow_class_not_found", Message: "FlowClassが見つかりません"}, nil
	}
	if errors.Is(err, store.ErrInvalid) {
		return api.CreateLecture400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_lecture", Message: err.Error()}}, nil
	}
	if err != nil {
		return nil, err
	}
	return api.CreateLecture201JSONResponse(workspaceToAPI(workspace)), nil
}

func (server server) InheritLecture(ctx context.Context, request api.InheritLectureRequestObject) (api.InheritLectureResponseObject, error) {
	if request.Body == nil {
		return api.InheritLecture400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_body", Message: "request body is required"}}, nil
	}
	user, err := server.currentUser(ctx)
	if err != nil {
		return nil, err
	}
	workspace, err := server.repository.InheritLectureWorkspace(ctx, store.LectureInherit{
		SourceLectureID: request.LectureId, AcademicYearStart: request.Body.AcademicYearStart,
		AcademicYearEnd: request.Body.AcademicYearEnd,
	}, user.ID)
	if errors.Is(err, store.ErrNotFound) {
		return api.InheritLecture404JSONResponse{Code: "lecture_or_flow_class_not_found", Message: "引き継ぎ元またはFlowClassが見つかりません"}, nil
	}
	if errors.Is(err, store.ErrIncompleteWorkspace) {
		return api.InheritLecture409JSONResponse{Code: "incomplete_workspace", Message: "引き継ぎ元の必須Flowが不足しています"}, nil
	}
	if errors.Is(err, store.ErrInvalid) {
		return api.InheritLecture400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_source", Message: "引き継ぎ元または年度を確認してください"}}, nil
	}
	if err != nil {
		return nil, err
	}
	return api.InheritLecture201JSONResponse(workspaceToAPI(workspace)), nil
}

func (server server) GetLecture(ctx context.Context, request api.GetLectureRequestObject) (api.GetLectureResponseObject, error) {
	user, err := server.currentUser(ctx)
	if err != nil {
		return nil, err
	}
	include := request.Params.IncludeDraft != nil && *request.Params.IncludeDraft
	lecture, err := server.repository.GetLecture(ctx, request.LectureId, user.ID, include)
	if errors.Is(err, store.ErrNotFound) {
		return api.GetLecture404JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "lecture_not_found", Message: "講習会が見つかりません"}}, nil
	}
	if err != nil {
		return nil, err
	}
	return api.GetLecture200JSONResponse(lectureToAPI(lecture)), nil
}

func (server server) GetLectureWorkspace(ctx context.Context, request api.GetLectureWorkspaceRequestObject) (api.GetLectureWorkspaceResponseObject, error) {
	user, err := server.currentUser(ctx)
	if err != nil {
		return nil, err
	}
	workspace, err := server.repository.GetLectureWorkspace(ctx, request.LectureId, user.ID)
	if errors.Is(err, store.ErrNotFound) {
		return api.GetLectureWorkspace404JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "lecture_not_found", Message: "講習会が見つかりません"}}, nil
	}
	if errors.Is(err, store.ErrIncompleteWorkspace) {
		return api.GetLectureWorkspace409JSONResponse{Code: "incomplete_workspace", Message: "必須Flowが不足しています"}, nil
	}
	if err != nil {
		return nil, err
	}
	return api.GetLectureWorkspace200JSONResponse(workspaceToAPI(workspace)), nil
}

func (server server) PatchLectureAttribute(ctx context.Context, request api.PatchLectureAttributeRequestObject) (api.PatchLectureAttributeResponseObject, error) {
	if request.Body == nil {
		return api.PatchLectureAttribute400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_body", Message: "request body is required"}}, nil
	}
	user, err := server.currentUser(ctx)
	if err != nil {
		return nil, err
	}
	if request.Body.AttributePath == "organizer" && request.Body.NextValue != nil {
		raw, _ := json.Marshal(request.Body.NextValue)
		var organizer domain.Organizer
		if json.Unmarshal(raw, &organizer) != nil || organizer.ID == "" {
			return api.PatchLectureAttribute400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_organizer", Message: "運営担当を確認してください"}}, nil
		}
		if organizer.Kind == "group" {
			group, found, lookupErr := server.directory.GroupByID(organizer.ID)
			if lookupErr != nil || !found {
				return api.PatchLectureAttribute400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_organizer", Message: "運営担当グループが見つかりません"}}, nil
			}
			organizer.GroupName = group.Name
		} else if organizer.Kind == "user" {
			_, found, lookupErr := server.directory.UserByID(organizer.ID)
			if lookupErr != nil || !found {
				return api.PatchLectureAttribute400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_organizer", Message: "運営担当者が見つかりません"}}, nil
			}
			organizer.GroupName = ""
		} else {
			return api.PatchLectureAttribute400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_organizer", Message: "運営担当を確認してください"}}, nil
		}
		request.Body.NextValue = organizer
	}
	lecture, conflict, err := server.repository.PatchLectureAttribute(ctx, request.LectureId, request.Body.AttributePath, request.Body.BaseValue, request.Body.NextValue, true, user.ID)
	if errors.Is(err, store.ErrNotFound) {
		return api.PatchLectureAttribute404JSONResponse{Code: "lecture_not_found", Message: "講習会が見つかりません"}, nil
	}
	if errors.Is(err, store.ErrInvalid) {
		return api.PatchLectureAttribute400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_attribute", Message: "属性値を確認してください"}}, nil
	}
	if err != nil {
		return nil, err
	}
	return api.PatchLectureAttribute200JSONResponse{Lecture: lectureToAPI(lecture), ConflictDetected: conflict}, nil
}

func (server server) CreateSession(ctx context.Context, request api.CreateSessionRequestObject) (api.CreateSessionResponseObject, error) {
	if request.Body == nil {
		return api.CreateSession400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_body", Message: "request body is required"}}, nil
	}
	user, err := server.currentUser(ctx)
	if err != nil {
		return nil, err
	}
	input := store.SessionCreate{Mode: string(request.Body.Mode), FlowClassID: request.Body.FlowClassId}
	if request.Body.SourceSessionId != nil {
		input.SourceSessionID = *request.Body.SourceSessionId
	}
	if request.Body.ReplayOfSessionIds != nil {
		input.ReplayOfSessionIDs = *request.Body.ReplayOfSessionIds
	}
	created, err := server.repository.CreateSessionWorkspace(ctx, request.LectureId, input, user.ID)
	if errors.Is(err, store.ErrNotFound) {
		return api.CreateSession404JSONResponse{Code: "target_not_found", Message: "講習会、複製元、またはFlowClassが見つかりません"}, nil
	}
	if errors.Is(err, store.ErrInvalid) {
		return api.CreateSession400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_session", Message: "開催の入力を確認してください"}}, nil
	}
	if err != nil {
		return nil, err
	}
	return api.CreateSession201JSONResponse{Workspace: workspaceToAPI(created.Workspace), Session: sessionToAPI(created.Session), Flow: flowToAPI(created.Flow)}, nil
}

func (server server) ReorderSessions(ctx context.Context, request api.ReorderSessionsRequestObject) (api.ReorderSessionsResponseObject, error) {
	if request.Body == nil {
		return api.ReorderSessions400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_body", Message: "request body is required"}}, nil
	}
	user, err := server.currentUser(ctx)
	if err != nil {
		return nil, err
	}
	items := make([]store.SessionOrderItem, 0, len(request.Body.Items))
	for _, item := range request.Body.Items {
		items = append(items, store.SessionOrderItem{SessionID: item.SessionId, Order: item.Order})
	}
	sessions, err := server.repository.ReorderSessions(ctx, request.LectureId, items, user.ID)
	if errors.Is(err, store.ErrInvalid) {
		return api.ReorderSessions400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_order", Message: "開催順を確認してください"}}, nil
	}
	if err != nil {
		return nil, err
	}
	result := make(api.ReorderSessions200JSONResponse, 0, len(sessions))
	for _, session := range sessions {
		result = append(result, sessionToAPI(session))
	}
	return result, nil
}

func (server server) GetSession(ctx context.Context, request api.GetSessionRequestObject) (api.GetSessionResponseObject, error) {
	user, err := server.currentUser(ctx)
	if err != nil {
		return nil, err
	}
	include := request.Params.IncludeDraft != nil && *request.Params.IncludeDraft
	session, err := server.repository.GetSession(ctx, request.SessionId, user.ID, include)
	if errors.Is(err, store.ErrNotFound) {
		return api.GetSession404JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "session_not_found", Message: "開催が見つかりません"}}, nil
	}
	if err != nil {
		return nil, err
	}
	return api.GetSession200JSONResponse(sessionToAPI(session)), nil
}

func (server server) PatchSessionAttribute(ctx context.Context, request api.PatchSessionAttributeRequestObject) (api.PatchSessionAttributeResponseObject, error) {
	if request.Body == nil {
		return api.PatchSessionAttribute400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_body", Message: "request body is required"}}, nil
	}
	user, err := server.currentUser(ctx)
	if err != nil {
		return nil, err
	}
	if request.Body.AttributePath == "instructorId" {
		value, ok := request.Body.NextValue.(string)
		if !ok {
			return api.PatchSessionAttribute400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_instructor", Message: "講師を確認してください"}}, nil
		}
		if value != "" {
			_, found, lookupErr := server.directory.UserByID(value)
			if lookupErr != nil || !found {
				return api.PatchSessionAttribute400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_instructor", Message: "講師が見つかりません"}}, nil
			}
		}
	}
	session, conflict, err := server.repository.PatchSessionAttribute(ctx, request.SessionId, request.Body.AttributePath, request.Body.BaseValue, request.Body.NextValue, true, user.ID)
	if errors.Is(err, store.ErrNotFound) {
		return api.PatchSessionAttribute404JSONResponse{Code: "session_not_found", Message: "開催が見つかりません"}, nil
	}
	if errors.Is(err, store.ErrInvalid) {
		return api.PatchSessionAttribute400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_attribute", Message: "属性値を確認してください"}}, nil
	}
	if err != nil {
		return nil, err
	}
	return api.PatchSessionAttribute200JSONResponse{Session: sessionToAPI(session), ConflictDetected: conflict}, nil
}

func (server server) GetLectureHistory(ctx context.Context, request api.GetLectureHistoryRequestObject) (api.GetLectureHistoryResponseObject, error) {
	events, err := server.repository.ListLectureEvents(ctx, request.LectureId, string(request.Params.Category))
	if err != nil {
		return nil, err
	}
	result := make(api.GetLectureHistory200JSONResponse, 0, len(events))
	for _, event := range events {
		result = append(result, eventToAPI(event))
	}
	return result, nil
}

func (server server) ExportLecture(ctx context.Context, request api.ExportLectureRequestObject) (api.ExportLectureResponseObject, error) {
	user, err := server.currentUser(ctx)
	if err != nil {
		return nil, err
	}
	lecture, err := server.repository.GetLecture(ctx, request.LectureId, user.ID, true)
	if errors.Is(err, store.ErrNotFound) {
		return api.ExportLecture404JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "lecture_not_found", Message: "講習会が見つかりません"}}, nil
	}
	if err != nil {
		return nil, err
	}
	return api.ExportLecture200JSONResponse{SchemaVersion: 1, Lecture: lectureToAPI(lecture)}, nil
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
	return api.CompleteSession200JSONResponse{UserId: completion.UserID, SessionId: completion.SessionID, LectureId: completion.LectureID, RoundNumber: completion.RoundNumber, CompletedAt: completion.CompletedAt}, nil
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
