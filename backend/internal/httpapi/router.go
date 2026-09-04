package httpapi

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"sort"

	"github.com/labstack/echo/v4"
	"github.com/traP-jp/1m26_13/backend/internal/api"
	"github.com/traP-jp/1m26_13/backend/internal/store"
	"github.com/traP-jp/1m26_13/backend/internal/traq"
)

const apiBaseURL = "/api/v1"

type HandlerOptions struct {
	Directory       traq.Directory
	Repository      store.Repository
	DevelopmentUser string
	Logger          *slog.Logger
}

type server struct {
	directory  traq.Directory
	repository store.Repository
}

func NewHandler(options HandlerOptions) http.Handler {
	logger := options.Logger
	if logger == nil {
		logger = slog.Default()
	}
	e := echo.New()
	e.HideBanner, e.HidePort = true, true
	api.RegisterHandlersWithBaseURL(e, api.NewStrictHandler(server{directory: options.Directory, repository: options.Repository}, nil), apiBaseURL)
	var handler http.Handler = e
	handler = withAuthentication(handler, options.DevelopmentUser)
	handler = withRecovery(handler, logger)
	handler = withAccessLog(handler, logger)
	return withRequestID(handler)
}

var errUnknownUser = errors.New("authenticated traQ user was not found")

func (server server) currentUser(ctx context.Context) (traq.User, error) {
	if server.directory == nil {
		return traq.User{}, traq.ErrDirectoryUnavailable
	}
	user, found, err := server.directory.UserByName(authenticatedTraQIDFromContext(ctx))
	if err != nil {
		return traq.User{}, err
	}
	if !found {
		return traq.User{}, errUnknownUser
	}
	return user, nil
}

func (server server) GetHealth(context.Context, api.GetHealthRequestObject) (api.GetHealthResponseObject, error) {
	return api.GetHealth200JSONResponse{Status: api.Ok}, nil
}

func (server server) GetCurrentUser(ctx context.Context, _ api.GetCurrentUserRequestObject) (api.GetCurrentUserResponseObject, error) {
	user, err := server.currentUser(ctx)
	if errors.Is(err, traq.ErrDirectoryUnavailable) {
		return currentUserServiceUnavailable(), nil
	}
	if errors.Is(err, errUnknownUser) {
		return api.GetCurrentUser401JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "unknown_user", Message: err.Error()}}, nil
	}
	if err != nil {
		return nil, err
	}
	return api.GetCurrentUser200JSONResponse{Id: user.ID, TraqId: user.Name, DisplayName: user.DisplayName}, nil
}

func currentUserServiceUnavailable() api.GetCurrentUser503JSONResponse {
	return api.GetCurrentUser503JSONResponse{Code: "traq_directory_unavailable", Message: "traQ user directory is temporarily unavailable"}
}

func (server server) GetDirectory(context.Context, api.GetDirectoryRequestObject) (api.GetDirectoryResponseObject, error) {
	if server.directory == nil {
		return api.GetDirectory503JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "directory_unavailable", Message: "traQ directory is unavailable"}}, nil
	}
	users, err := server.directory.Users()
	if err != nil {
		return api.GetDirectory503JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "directory_unavailable", Message: "traQ directory is unavailable"}}, nil
	}
	groups, err := server.directory.Groups()
	if err != nil {
		return api.GetDirectory503JSONResponse{ErrorJSONResponse: api.ErrorJSONResponse{Code: "directory_unavailable", Message: "traQ directory is unavailable"}}, nil
	}
	result := api.Directory{Users: make([]api.DirectoryUser, 0, len(users)), Groups: make([]api.DirectoryGroup, 0, len(groups))}
	for _, user := range users {
		if !user.Bot && user.State == 1 {
			result.Users = append(result.Users, api.DirectoryUser{Id: user.ID, TraqId: user.Name, DisplayName: user.DisplayName})
		}
	}
	for _, group := range groups {
		result.Groups = append(result.Groups, api.DirectoryGroup{Id: group.ID, Name: group.Name})
	}
	sort.Slice(result.Users, func(i, j int) bool { return result.Users[i].TraqId < result.Users[j].TraqId })
	sort.Slice(result.Groups, func(i, j int) bool { return result.Groups[i].Name < result.Groups[j].Name })
	return api.GetDirectory200JSONResponse(result), nil
}

func (server server) ListFields(ctx context.Context, _ api.ListFieldsRequestObject) (api.ListFieldsResponseObject, error) {
	fields, err := server.repository.ListFields(ctx)
	if err != nil {
		return nil, err
	}
	result := make(api.ListFields200JSONResponse, 0, len(fields))
	for _, field := range fields {
		result = append(result, api.Field{Id: field.ID, Name: field.Name})
	}
	return result, nil
}

func (server server) GetAttributeHistory(ctx context.Context, request api.GetAttributeHistoryRequestObject) (api.GetAttributeHistoryResponseObject, error) {
	events, err := server.repository.ListEvents(ctx, request.EntityType, request.EntityId)
	if err != nil {
		return nil, err
	}
	result := make(api.GetAttributeHistory200JSONResponse, 0, len(events))
	for _, event := range events {
		result = append(result, api.AttributeUpdateEvent{Id: event.ID, EntityType: api.AttributeUpdateEventEntityType(event.EntityType), EntityId: event.EntityID,
			AttributePath: event.AttributePath, PreviousValue: event.PreviousValue, NextValue: event.NextValue, ActorId: event.ActorID, OccurredAt: event.OccurredAt, ChangeSetId: event.ChangeSetID})
	}
	return result, nil
}
