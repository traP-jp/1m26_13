package httpapi

import (
	"context"
	"net/http"

	"github.com/traP-jp/1m26_13/backend/internal/api"
)

const apiBaseURL = "/api/v1"

type server struct{}

func NewHandler() http.Handler {
	strictHandler := api.NewStrictHandler(server{}, nil)

	return api.HandlerWithOptions(strictHandler, api.StdHTTPServerOptions{
		BaseURL: apiBaseURL,
	})
}

func (server) GetHealth(
	context.Context,
	api.GetHealthRequestObject,
) (api.GetHealthResponseObject, error) {
	return api.GetHealth200JSONResponse{
		Status: api.Ok,
	}, nil
}
