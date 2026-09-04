package httpapi

import (
	"context"
	"errors"
	"strings"

	"github.com/traP-jp/1m26_13/backend/internal/api"
	"github.com/traP-jp/1m26_13/backend/internal/domain"
	flowparser "github.com/traP-jp/1m26_13/backend/internal/flow"
	"github.com/traP-jp/1m26_13/backend/internal/store"
)

func flowClassToAPI(flowClass domain.FlowClass) api.FlowClass {
	return api.FlowClass{Id: flowClass.ID, Name: flowClass.Name, Type: api.FlowType(flowClass.Type), Text: flowClass.Text,
		Listed: flowClass.Listed, FormatVersion: api.FlowClassFormatVersion(flowClass.FormatVersion), Revision: flowClass.Revision,
		ExpectedRevision: flowClass.Revision, CreatedAt: flowClass.CreatedAt, UpdatedAt: flowClass.UpdatedAt}
}

func flowToAPI(flow domain.Flow) api.Flow {
	return api.Flow{Id: flow.ID, FlowClassId: flow.FlowClassID, TargetId: flow.TargetID, Type: api.FlowType(flow.Type), Text: flow.Text,
		FormatVersion: api.FlowFormatVersion(flow.FormatVersion), Answers: flow.Answers, Tasks: flow.Tasks, CurrentPage: flow.CurrentPage,
		Status: api.FlowStatus(flow.Status), Revision: flow.Revision, ExpectedRevision: flow.Revision,
		CreatedAt: flow.CreatedAt, UpdatedAt: flow.UpdatedAt}
}

func validFlowType(value string) bool {
	return value == "lecture_pre" || value == "session_main" || value == "lecture_post"
}

func (server server) ListFlows(ctx context.Context, request api.ListFlowsRequestObject) (api.ListFlowsResponseObject, error) {
	targetID, status := "", ""
	if request.Params.TargetId != nil {
		targetID = strings.TrimSpace(*request.Params.TargetId)
	}
	if request.Params.Status != nil {
		status = string(*request.Params.Status)
	}
	flows, err := server.repository.ListFlows(ctx, targetID, status)
	if err != nil {
		return nil, err
	}
	result := make(api.ListFlows200JSONResponse, 0, len(flows))
	for _, flow := range flows {
		result = append(result, flowToAPI(flow))
	}
	return result, nil
}

func (server server) ListFlowClasses(ctx context.Context, request api.ListFlowClassesRequestObject) (api.ListFlowClassesResponseObject, error) {
	flowType := ""
	if request.Params.Type != nil {
		flowType = string(*request.Params.Type)
	}
	includeUnlisted := request.Params.IncludeUnlisted != nil && *request.Params.IncludeUnlisted
	classes, err := server.repository.ListFlowClasses(ctx, flowType, includeUnlisted)
	if err != nil {
		return nil, err
	}
	result := make(api.ListFlowClasses200JSONResponse, 0, len(classes))
	for _, flowClass := range classes {
		result = append(result, flowClassToAPI(flowClass))
	}
	return result, nil
}

func (server server) CreateFlowClass(ctx context.Context, request api.CreateFlowClassRequestObject) (api.CreateFlowClassResponseObject, error) {
	if request.Body == nil {
		return api.CreateFlowClass400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_body", Message: "request body is required"}}, nil
	}
	user, err := server.currentUser(ctx)
	if err != nil {
		return nil, err
	}
	flowType, bodyText := string(request.Body.Type), strings.TrimSpace(request.Body.Text)
	if strings.TrimSpace(request.Body.Name) == "" || !validFlowType(flowType) {
		return api.CreateFlowClass400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_flow_class", Message: "FlowClassの入力を確認してください"}}, nil
	}
	if _, err := flowparser.Parse(bodyText, flowType); err != nil {
		return api.CreateFlowClass400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_flow_text", Message: err.Error()}}, nil
	}
	created, err := server.repository.CreateFlowClass(ctx, domain.FlowClass{Name: strings.TrimSpace(request.Body.Name), Type: flowType, Text: bodyText, Listed: request.Body.Listed}, user.ID)
	if err != nil {
		return nil, err
	}
	return api.CreateFlowClass201JSONResponse(flowClassToAPI(created)), nil
}

func (server server) GetFlowClass(ctx context.Context, request api.GetFlowClassRequestObject) (api.GetFlowClassResponseObject, error) {
	flowClass, err := server.repository.GetFlowClass(ctx, request.FlowClassId)
	if errors.Is(err, store.ErrNotFound) {
		return api.GetFlowClass404JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "flow_class_not_found", Message: "FlowClassが見つかりません"}}, nil
	}
	if err != nil {
		return nil, err
	}
	return api.GetFlowClass200JSONResponse(flowClassToAPI(flowClass)), nil
}

func (server server) UpdateFlowClass(ctx context.Context, request api.UpdateFlowClassRequestObject) (api.UpdateFlowClassResponseObject, error) {
	if request.Body == nil {
		return api.UpdateFlowClass400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_body", Message: "request body is required"}}, nil
	}
	user, err := server.currentUser(ctx)
	if err != nil {
		return nil, err
	}
	flowType, bodyText := string(request.Body.Type), strings.TrimSpace(request.Body.Text)
	if _, err := flowparser.Parse(bodyText, flowType); err != nil {
		return api.UpdateFlowClass400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_flow_text", Message: err.Error()}}, nil
	}
	updated, err := server.repository.UpdateFlowClass(ctx, domain.FlowClass{ID: request.FlowClassId, Name: strings.TrimSpace(request.Body.Name), Type: flowType, Text: bodyText, Listed: request.Body.Listed}, request.Body.ExpectedRevision, user.ID)
	if errors.Is(err, store.ErrNotFound) {
		return api.UpdateFlowClass404JSONResponse{Code: "flow_class_not_found", Message: "FlowClassが見つかりません"}, nil
	}
	if errors.Is(err, store.ErrConflict) {
		return api.UpdateFlowClass409JSONResponse{Code: "revision_conflict", Message: "別の利用者が先に更新しました"}, nil
	}
	if errors.Is(err, store.ErrInvalid) {
		return api.UpdateFlowClass400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_flow_class", Message: err.Error()}}, nil
	}
	if err != nil {
		return nil, err
	}
	return api.UpdateFlowClass200JSONResponse(flowClassToAPI(updated)), nil
}

func (server server) CreateFlow(ctx context.Context, request api.CreateFlowRequestObject) (api.CreateFlowResponseObject, error) {
	if request.Body == nil {
		return api.CreateFlow400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_body", Message: "request body is required"}}, nil
	}
	user, err := server.currentUser(ctx)
	if err != nil {
		return nil, err
	}
	created, err := server.repository.CreateFlow(ctx, request.Body.FlowClassId, request.Body.TargetId, user.ID)
	if errors.Is(err, store.ErrNotFound) {
		return api.CreateFlow404JSONResponse{Code: "target_not_found", Message: "FlowClassまたは適用先が見つかりません"}, nil
	}
	if err != nil {
		return api.CreateFlow400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "flow_not_created", Message: "同じFlowは適用済みか、対象が不正です"}}, nil
	}
	return api.CreateFlow201JSONResponse(flowToAPI(created)), nil
}

func (server server) GetFlow(ctx context.Context, request api.GetFlowRequestObject) (api.GetFlowResponseObject, error) {
	flow, err := server.repository.GetFlow(ctx, request.FlowId)
	if errors.Is(err, store.ErrNotFound) {
		return api.GetFlow404JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "flow_not_found", Message: "Flowが見つかりません"}}, nil
	}
	if err != nil {
		return nil, err
	}
	return api.GetFlow200JSONResponse(flowToAPI(flow)), nil
}

func (server server) UpdateFlow(ctx context.Context, request api.UpdateFlowRequestObject) (api.UpdateFlowResponseObject, error) {
	if request.Body == nil {
		return api.UpdateFlow400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_body", Message: "request body is required"}}, nil
	}
	user, err := server.currentUser(ctx)
	if err != nil {
		return nil, err
	}
	current, err := server.repository.GetFlow(ctx, request.FlowId)
	if errors.Is(err, store.ErrNotFound) {
		return api.UpdateFlow404JSONResponse{Code: "flow_not_found", Message: "Flowが見つかりません"}, nil
	}
	if err != nil {
		return nil, err
	}
	if current.Status == "completed" {
		return api.UpdateFlow409JSONResponse{Code: "flow_completed", Message: "完了済みFlowは変更できません"}, nil
	}
	document, err := flowparser.Parse(current.Text, current.Type)
	if err != nil {
		return nil, err
	}
	if request.Body.CurrentPage < 0 || request.Body.CurrentPage >= document.PageCount {
		return api.UpdateFlow400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_progress", Message: "現在ページが範囲外です"}}, nil
	}
	allowedAnswers := make(map[string]bool)
	for _, key := range document.InputKeys {
		if strings.HasPrefix(key, "answer.") {
			allowedAnswers[key] = true
		}
	}
	for key := range request.Body.Answers {
		if !allowedAnswers[key] {
			return api.UpdateFlow400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_answers", Message: "Flow本文にない回答keyが含まれています"}}, nil
		}
	}
	allowedTasks := make(map[string]bool, len(document.TaskKeys))
	for _, key := range document.TaskKeys {
		allowedTasks[key] = true
	}
	for key := range request.Body.Tasks {
		if !allowedTasks[key] {
			return api.UpdateFlow400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_tasks", Message: "Flow本文にないtask keyが含まれています"}}, nil
		}
	}
	if request.Body.Status == api.Completed {
		for _, key := range document.TaskKeys {
			if !request.Body.Tasks[key] {
				return api.UpdateFlow400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "incomplete_tasks", Message: "すべてのチェック項目を完了してください"}}, nil
			}
		}
	}
	current.Answers, current.Tasks, current.CurrentPage, current.Status = request.Body.Answers, request.Body.Tasks, request.Body.CurrentPage, string(request.Body.Status)
	updated, err := server.repository.UpdateFlow(ctx, current, request.Body.ExpectedRevision, user.ID)
	if errors.Is(err, store.ErrConflict) {
		return api.UpdateFlow409JSONResponse{Code: "revision_conflict", Message: "別の利用者が先に更新しました"}, nil
	}
	if err != nil {
		return nil, err
	}
	return api.UpdateFlow200JSONResponse(flowToAPI(updated)), nil
}
