package httpapi

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/traP-jp/1m26_13/backend/internal/api"
	"github.com/traP-jp/1m26_13/backend/internal/domain"
	"github.com/traP-jp/1m26_13/backend/internal/store"
	"github.com/traP-jp/1m26_13/backend/internal/traq"
)

func roadmapFromWrite(input api.RoadmapWrite) (domain.Roadmap, error) {
	roadmap := domain.Roadmap{Title: strings.TrimSpace(input.Title), Description: strings.TrimSpace(input.Description),
		Audience: strings.TrimSpace(input.Audience), Published: input.Published, Stages: make([]domain.RoadmapStage, 0, len(input.Stages))}
	if roadmap.Title == "" {
		return domain.Roadmap{}, store.ErrInvalid
	}
	seenStageIDs := make(map[string]bool)
	for _, stage := range input.Stages {
		if stage.Id == "" || strings.TrimSpace(stage.Title) == "" || seenStageIDs[stage.Id] {
			return domain.Roadmap{}, store.ErrInvalid
		}
		seenStageIDs[stage.Id] = true
		converted := domain.RoadmapStage{ID: stage.Id, Title: strings.TrimSpace(stage.Title), Description: strings.TrimSpace(stage.Description), Items: make([]domain.RoadmapItem, 0, len(stage.Items))}
		for _, item := range stage.Items {
			converted.Items = append(converted.Items, domain.RoadmapItem{LectureID: item.LectureId, Note: strings.TrimSpace(item.Note)})
		}
		roadmap.Stages = append(roadmap.Stages, converted)
	}
	return roadmap, nil
}

func roadmapToAPI(roadmap domain.Roadmap, completed map[string]time.Time) api.Roadmap {
	result := api.Roadmap{Id: roadmap.ID, Title: roadmap.Title, Description: roadmap.Description, Audience: roadmap.Audience,
		Published: roadmap.Published, Stages: make([]api.RoadmapStage, 0, len(roadmap.Stages)), CompletedLectureIds: []string{},
		Revision: roadmap.Revision, ExpectedRevision: roadmap.Revision, CreatedAt: roadmap.CreatedAt, UpdatedAt: roadmap.UpdatedAt}
	for _, stage := range roadmap.Stages {
		converted := api.RoadmapStage{Id: stage.ID, Title: stage.Title, Description: stage.Description, Items: make([]api.RoadmapItem, 0, len(stage.Items))}
		for _, item := range stage.Items {
			converted.Items = append(converted.Items, api.RoadmapItem{LectureId: item.LectureID, Note: item.Note})
			result.TotalItemCount++
			if _, ok := completed[item.LectureID]; ok {
				result.CompletedLectureIds = append(result.CompletedLectureIds, item.LectureID)
				result.CompletedItemCount++
			} else if result.NextLectureId == nil {
				next := item.LectureID
				result.NextLectureId = &next
			}
		}
		result.Stages = append(result.Stages, converted)
	}
	if result.TotalItemCount > 0 {
		result.ProgressPercent = result.CompletedItemCount * 100 / result.TotalItemCount
	}
	return result
}

func (server server) ListRoadmaps(ctx context.Context, request api.ListRoadmapsRequestObject) (api.ListRoadmapsResponseObject, error) {
	user, err := server.currentUser(ctx)
	if err != nil {
		return nil, err
	}
	includeDraft := request.Params.IncludeDraft != nil && *request.Params.IncludeDraft
	roadmaps, err := server.repository.ListRoadmaps(ctx, includeDraft)
	if err != nil {
		return nil, err
	}
	completed, err := server.repository.ListCompletedLectures(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	result := make(api.ListRoadmaps200JSONResponse, 0, len(roadmaps))
	for _, roadmap := range roadmaps {
		result = append(result, roadmapToAPI(roadmap, completed))
	}
	return result, nil
}

func (server server) CreateRoadmap(ctx context.Context, request api.CreateRoadmapRequestObject) (api.CreateRoadmapResponseObject, error) {
	if request.Body == nil {
		return api.CreateRoadmap400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_body", Message: "request body is required"}}, nil
	}
	user, err := server.currentUser(ctx)
	if err != nil {
		return nil, err
	}
	roadmap, err := roadmapFromWrite(*request.Body)
	if err != nil {
		return api.CreateRoadmap400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_roadmap", Message: "ロードマップの入力を確認してください"}}, nil
	}
	created, err := server.repository.CreateRoadmap(ctx, roadmap, user.ID)
	if errors.Is(err, store.ErrInvalid) {
		return api.CreateRoadmap400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_roadmap", Message: err.Error()}}, nil
	}
	if err != nil {
		return nil, err
	}
	completed, err := server.repository.ListCompletedLectures(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	return api.CreateRoadmap201JSONResponse(roadmapToAPI(created, completed)), nil
}

func (server server) GetRoadmap(ctx context.Context, request api.GetRoadmapRequestObject) (api.GetRoadmapResponseObject, error) {
	user, err := server.currentUser(ctx)
	if err != nil {
		return nil, err
	}
	includeDraft := request.Params.IncludeDraft != nil && *request.Params.IncludeDraft
	roadmap, err := server.repository.GetRoadmap(ctx, request.RoadmapId, includeDraft)
	if errors.Is(err, store.ErrNotFound) {
		return api.GetRoadmap404JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "roadmap_not_found", Message: "ロードマップが見つかりません"}}, nil
	}
	if err != nil {
		return nil, err
	}
	completed, err := server.repository.ListCompletedLectures(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	return api.GetRoadmap200JSONResponse(roadmapToAPI(roadmap, completed)), nil
}

func (server server) UpdateRoadmap(ctx context.Context, request api.UpdateRoadmapRequestObject) (api.UpdateRoadmapResponseObject, error) {
	if request.Body == nil {
		return api.UpdateRoadmap400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_body", Message: "request body is required"}}, nil
	}
	user, err := server.currentUser(ctx)
	if err != nil {
		return nil, err
	}
	roadmap, err := roadmapFromWrite(*request.Body)
	if err != nil {
		return api.UpdateRoadmap400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_roadmap", Message: "ロードマップの入力を確認してください"}}, nil
	}
	roadmap.ID = request.RoadmapId
	updated, err := server.repository.UpdateRoadmap(ctx, roadmap, request.Body.ExpectedRevision, user.ID)
	if errors.Is(err, store.ErrNotFound) {
		return api.UpdateRoadmap404JSONResponse{Code: "roadmap_not_found", Message: "ロードマップが見つかりません"}, nil
	}
	if errors.Is(err, store.ErrConflict) {
		return api.UpdateRoadmap409JSONResponse{Code: "revision_conflict", Message: "別の利用者が先に更新しました"}, nil
	}
	if errors.Is(err, store.ErrInvalid) {
		return api.UpdateRoadmap400JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "invalid_roadmap", Message: err.Error()}}, nil
	}
	if err != nil {
		return nil, err
	}
	completed, err := server.repository.ListCompletedLectures(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	return api.UpdateRoadmap200JSONResponse(roadmapToAPI(updated, completed)), nil
}

func (server server) GetProfile(ctx context.Context, request api.GetProfileRequestObject) (api.GetProfileResponseObject, error) {
	user, found, err := server.directory.UserByName(request.TraqId)
	if errors.Is(err, traq.ErrDirectoryUnavailable) {
		return api.GetProfile503JSONResponse{Code: "directory_unavailable", Message: "traQ directory is unavailable"}, nil
	}
	if err != nil {
		return nil, err
	}
	if !found {
		return api.GetProfile404JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "user_not_found", Message: "利用者が見つかりません"}}, nil
	}
	completions, err := server.repository.ListCompletions(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	completedLectures, err := server.repository.ListCompletedLectures(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	roadmaps, err := server.repository.ListRoadmaps(ctx, false)
	if err != nil {
		return nil, err
	}
	profile := api.Profile{User: api.DirectoryUser{Id: user.ID, TraqId: user.Name, DisplayName: user.DisplayName},
		Completions: make([]api.SessionCompletion, 0, len(completions)), Badges: make([]api.Badge, 0, len(completedLectures)), Roadmaps: make([]api.Roadmap, 0, len(roadmaps))}
	for _, completion := range completions {
		profile.Completions = append(profile.Completions, api.SessionCompletion{UserId: completion.UserID, SessionId: completion.SessionID, LectureId: completion.LectureID, RoundNumber: completion.RoundNumber, CompletedAt: completion.CompletedAt})
	}
	for lectureID, earnedAt := range completedLectures {
		lecture, err := server.repository.GetLecture(ctx, lectureID, user.ID, true)
		if err != nil {
			continue
		}
		profile.Badges = append(profile.Badges, api.Badge{LectureId: lecture.ID, LectureName: lecture.Name, AcademicYearStart: lecture.AcademicYearStart, AcademicYearEnd: lecture.AcademicYearEnd, EarnedAt: earnedAt})
	}
	for _, roadmap := range roadmaps {
		profile.Roadmaps = append(profile.Roadmaps, roadmapToAPI(roadmap, completedLectures))
	}
	return api.GetProfile200JSONResponse(profile), nil
}
