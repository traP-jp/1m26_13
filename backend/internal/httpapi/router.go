package httpapi

import (
	"context"
	"errors"
	"log/slog"
	"net/http"

	"github.com/google/uuid"

	"github.com/traP-jp/1m26_13/backend/internal/api"
	"github.com/traP-jp/1m26_13/backend/internal/traq"
)

const apiBaseURL = "/api/v1"

type HandlerOptions struct {
	Directory       traq.Directory
	DevelopmentUser string
	Logger          *slog.Logger
}

type server struct {
	directory traq.Directory
}

func NewHandler(options HandlerOptions) http.Handler {
	logger := options.Logger
	if logger == nil {
		logger = slog.Default()
	}

	strictHandler := api.NewStrictHandler(server{directory: options.Directory}, nil)
	router := api.HandlerWithOptions(strictHandler, api.StdHTTPServerOptions{
		BaseURL: apiBaseURL,
	})

	handler := withAuthentication(router, options.DevelopmentUser)
	handler = withRecovery(handler, logger)
	handler = withAccessLog(handler, logger)

	return withRequestID(handler)
}

func (server server) GetCurrentUser(
	ctx context.Context,
	_ api.GetCurrentUserRequestObject,
) (api.GetCurrentUserResponseObject, error) {
	if server.directory == nil {
		return currentUserServiceUnavailable(), nil
	}

	user, found, err := server.directory.UserByName(authenticatedTraQIDFromContext(ctx))
	if err != nil {
		if errors.Is(err, traq.ErrDirectoryUnavailable) {
			return currentUserServiceUnavailable(), nil
		}
		return nil, err
	}
	if !found {
		return api.GetCurrentUser401JSONResponse{
			Code:    "unknown_user",
			Message: "authenticated traQ user was not found",
		}, nil
	}

	userID, err := uuid.Parse(user.ID)
	if err != nil {
		return currentUserServiceUnavailable(), nil
	}

	return api.GetCurrentUser200JSONResponse{
		Id:          userID,
		TraqId:      user.Name,
		DisplayName: user.DisplayName,
	}, nil
}

func currentUserServiceUnavailable() api.GetCurrentUser503JSONResponse {
	return api.GetCurrentUser503JSONResponse{
		Code:    "traq_directory_unavailable",
		Message: "traQ user directory is temporarily unavailable",
	}
}

func (server) GetHealth(
	context.Context,
	api.GetHealthRequestObject,
) (api.GetHealthResponseObject, error) {
	return api.GetHealth200JSONResponse{
		Status: api.Ok,
	}, nil
}
