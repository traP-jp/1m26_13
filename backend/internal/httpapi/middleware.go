package httpapi

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"log/slog"
	"net/http"
	"runtime/debug"
	"time"

	"github.com/traP-jp/1m26_13/backend/internal/api"
)

const (
	requestIDHeader     = "X-Request-ID"
	maxRequestIDLength  = 128
	forwardedUserHeader = "X-Forwarded-User"
)

type requestIDContextKey struct{}
type authenticatedUserContextKey struct{}

func withAuthentication(next http.Handler, developmentUser string) http.Handler {
	return http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		if request.URL.Path != apiBaseURL+"/users/me" {
			next.ServeHTTP(response, request)
			return
		}

		traqID := request.Header.Get(forwardedUserHeader)
		if traqID == "" {
			traqID = developmentUser
		}
		if !isValidTraQID(traqID) {
			writeJSONError(
				response,
				http.StatusUnauthorized,
				api.ErrorResponse{Code: "unauthorized", Message: "authentication is required"},
			)
			return
		}

		ctx := context.WithValue(request.Context(), authenticatedUserContextKey{}, traqID)
		next.ServeHTTP(response, request.WithContext(ctx))
	})
}

func isValidTraQID(traqID string) bool {
	if len(traqID) < 1 || len(traqID) > 32 {
		return false
	}

	for index := range len(traqID) {
		character := traqID[index]
		if (character >= 'a' && character <= 'z') ||
			(character >= 'A' && character <= 'Z') ||
			(character >= '0' && character <= '9') ||
			character == '_' || character == '-' {
			continue
		}
		return false
	}

	return true
}

func authenticatedTraQIDFromContext(ctx context.Context) string {
	traqID, _ := ctx.Value(authenticatedUserContextKey{}).(string)
	return traqID
}

func writeJSONError(response http.ResponseWriter, status int, body api.ErrorResponse) {
	response.Header().Set("Content-Type", "application/json")
	response.WriteHeader(status)
	_ = json.NewEncoder(response).Encode(body)
}

func withRequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		requestID := request.Header.Get(requestIDHeader)
		if !isValidRequestID(requestID) {
			requestID = rand.Text()
		}

		response.Header().Set(requestIDHeader, requestID)
		ctx := context.WithValue(request.Context(), requestIDContextKey{}, requestID)

		next.ServeHTTP(response, request.WithContext(ctx))
	})
}

func isValidRequestID(requestID string) bool {
	if requestID == "" || len(requestID) > maxRequestIDLength {
		return false
	}

	for index := range len(requestID) {
		if requestID[index] < 0x21 || requestID[index] > 0x7e {
			return false
		}
	}

	return true
}

func requestIDFromContext(ctx context.Context) string {
	requestID, _ := ctx.Value(requestIDContextKey{}).(string)
	return requestID
}

func withAccessLog(next http.Handler, logger *slog.Logger) http.Handler {
	return http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		startedAt := time.Now()
		recorder := &responseRecorder{ResponseWriter: response}

		next.ServeHTTP(recorder, request)

		logger.InfoContext(
			request.Context(),
			"request completed",
			"request_id", requestIDFromContext(request.Context()),
			"method", request.Method,
			"path", request.URL.Path,
			"status", recorder.statusCode(),
			"duration", time.Since(startedAt),
			"bytes", recorder.bytesWritten,
		)
	})
}

type responseRecorder struct {
	http.ResponseWriter
	status       int
	bytesWritten int
}

func (recorder *responseRecorder) WriteHeader(status int) {
	if recorder.status != 0 {
		return
	}

	recorder.status = status
	recorder.ResponseWriter.WriteHeader(status)
}

func (recorder *responseRecorder) Write(body []byte) (int, error) {
	if recorder.status == 0 {
		recorder.WriteHeader(http.StatusOK)
	}

	written, err := recorder.ResponseWriter.Write(body)
	recorder.bytesWritten += written
	return written, err
}

func (recorder *responseRecorder) Unwrap() http.ResponseWriter {
	return recorder.ResponseWriter
}

func (recorder *responseRecorder) statusCode() int {
	if recorder.status == 0 {
		return http.StatusOK
	}

	return recorder.status
}

func withRecovery(next http.Handler, logger *slog.Logger) http.Handler {
	return http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		defer func() {
			if recovered := recover(); recovered != nil {
				logger.ErrorContext(
					request.Context(),
					"request panicked",
					"request_id", requestIDFromContext(request.Context()),
					"panic", recovered,
					"stack", string(debug.Stack()),
				)
				http.Error(response, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
			}
		}()

		next.ServeHTTP(response, request)
	})
}
