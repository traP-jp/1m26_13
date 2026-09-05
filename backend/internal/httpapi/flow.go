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
		Listed: flowClass.Listed, FormatVersion: flowClass.FormatVersion, Revision: flowClass.Revision,
		ExpectedRevision: flowClass.Revision, CreatedAt: flowClass.CreatedAt, UpdatedAt: flowClass.UpdatedAt}
}

func flowToAPI(flow domain.Flow) api.Flow {
	return api.Flow{Id: flow.ID, FlowClassId: flow.FlowClassID, TargetId: flow.TargetID, Type: api.FlowType(flow.Type), Text: flow.Text,
		FormatVersion: flow.FormatVersion, CurrentPage: flow.CurrentPage, Revision: flow.Revision,
		CreatedAt: flow.CreatedAt, UpdatedAt: flow.UpdatedAt}
}

func validFlowType(value string) bool {
	return value == "lecture_pre" || value == "session_main" || value == "lecture_post"
}

func (server server) ListFlows(ctx context.Context, request api.ListFlowsRequestObject) (api.ListFlowsResponseObject, error) {
	targetID := strings.TrimSpace(request.Params.TargetId)
	flows, err := server.repository.ListFlows(ctx, string(request.Params.TargetType), targetID)
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

func (server server) ReplaceFlowClass(ctx context.Context, request api.ReplaceFlowClassRequestObject) (api.ReplaceFlowClassResponseObject, error) {
	if request.Body == nil {
		return api.ReplaceFlowClass400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_body", Message: "request body is required"}}, nil
	}
	user, err := server.currentUser(ctx)
	if err != nil {
		return nil, err
	}
	updated, err := server.repository.ReplaceFlowClass(ctx, request.FlowId, request.Body.FlowClassId, user.ID)
	if errors.Is(err, store.ErrNotFound) {
		return api.ReplaceFlowClass404JSONResponse{Code: "not_found", Message: "FlowまたはFlowClassが見つかりません"}, nil
	}
	if errors.Is(err, store.ErrInvalid) {
		return api.ReplaceFlowClass400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_flow_class", Message: err.Error()}}, nil
	}
	if err != nil {
		return nil, err
	}
	return api.ReplaceFlowClass200JSONResponse{Flow: flowToAPI(updated)}, nil
}

func (server server) PatchFlowCheck(ctx context.Context, request api.PatchFlowCheckRequestObject) (api.PatchFlowCheckResponseObject, error) {
	if request.Body == nil {
		return api.PatchFlowCheck400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_body", Message: "request body is required"}}, nil
	}
	user, err := server.currentUser(ctx)
	if err != nil {
		return nil, err
	}
	expected := text(request.Body.ExpectedText)
	updated, err := server.repository.PatchFlowCheck(ctx, request.FlowId, request.Body.PageIndex, request.Body.CheckboxIndex, request.Body.Checked, expected, user.ID)
	if errors.Is(err, store.ErrNotFound) {
		return api.PatchFlowCheck404JSONResponse{Code: "flow_not_found", Message: "Flowが見つかりません"}, nil
	}
	if errors.Is(err, store.ErrInvalid) {
		return api.PatchFlowCheck409JSONResponse{Code: "flow_changed", Message: "Flow本文が変更されています"}, nil
	}
	if err != nil {
		return nil, err
	}
	return api.PatchFlowCheck200JSONResponse{Flow: flowToAPI(updated)}, nil
}

func (server server) UpdateFlowPage(ctx context.Context, request api.UpdateFlowPageRequestObject) (api.UpdateFlowPageResponseObject, error) {
	if request.Body == nil {
		return api.UpdateFlowPage400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_body", Message: "request body is required"}}, nil
	}
	user, err := server.currentUser(ctx)
	if err != nil {
		return nil, err
	}
	updated, err := server.repository.UpdateFlowPage(ctx, request.FlowId, request.Body.CurrentPage, user.ID)
	if errors.Is(err, store.ErrNotFound) {
		return api.UpdateFlowPage404JSONResponse{Code: "flow_not_found", Message: "Flowが見つかりません"}, nil
	}
	if errors.Is(err, store.ErrInvalid) {
		return api.UpdateFlowPage400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_page", Message: "ページが範囲外です"}}, nil
	}
	if err != nil {
		return nil, err
	}
	return api.UpdateFlowPage200JSONResponse{Flow: flowToAPI(updated)}, nil
}
