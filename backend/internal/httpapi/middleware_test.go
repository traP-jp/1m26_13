package httpapi

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRequestID(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		requestID string
		preserved bool
	}{
		{
			name:      "generates an ID when the header is absent",
			preserved: false,
		},
		{
			name:      "preserves a valid incoming ID",
			requestID: "upstream-request-id",
			preserved: true,
		},
		{
			name:      "replaces an invalid incoming ID",
			requestID: strings.Repeat("a", maxRequestIDLength+1),
			preserved: false,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()

			var contextRequestID string
			handler := withRequestID(http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
				contextRequestID = requestIDFromContext(request.Context())
				response.WriteHeader(http.StatusNoContent)
			}))
			request := httptest.NewRequest(http.MethodGet, "/", nil)
			request.Header.Set(requestIDHeader, test.requestID)
			response := httptest.NewRecorder()

			handler.ServeHTTP(response, request)

			responseRequestID := response.Header().Get(requestIDHeader)
			if responseRequestID == "" {
				t.Fatal("expected a response request ID")
			}
			if contextRequestID != responseRequestID {
				t.Fatalf("expected context request ID %q, got %q", responseRequestID, contextRequestID)
			}
			if test.preserved && responseRequestID != test.requestID {
				t.Fatalf("expected request ID %q to be preserved, got %q", test.requestID, responseRequestID)
			}
			if !test.preserved && test.requestID != "" && responseRequestID == test.requestID {
				t.Fatalf("expected invalid request ID %q to be replaced", test.requestID)
			}
		})
	}
}

func TestAccessLog(t *testing.T) {
	t.Parallel()

	var output bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&output, nil))
	handler := withRequestID(withAccessLog(http.HandlerFunc(func(response http.ResponseWriter, _ *http.Request) {
		response.WriteHeader(http.StatusCreated)
		_, _ = response.Write([]byte("ok"))
	}), logger))
	request := httptest.NewRequest(http.MethodPost, "/workshops", nil)
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	var entry map[string]any
	if err := json.Unmarshal(output.Bytes(), &entry); err != nil {
		t.Fatalf("decode access log: %v", err)
	}

	assertLogField(t, entry, "msg", "request completed")
	assertLogField(t, entry, "request_id", response.Header().Get(requestIDHeader))
	assertLogField(t, entry, "method", http.MethodPost)
	assertLogField(t, entry, "path", "/workshops")
	assertLogField(t, entry, "status", float64(http.StatusCreated))
	assertLogField(t, entry, "bytes", float64(len("ok")))
	if _, ok := entry["duration"]; !ok {
		t.Fatal("expected access log to include duration")
	}
}

func TestRecovery(t *testing.T) {
	t.Parallel()

	var output bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&output, nil))
	handler := withRequestID(withRecovery(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic("sensitive implementation detail")
	}), logger))
	request := httptest.NewRequest(http.MethodGet, "/panic", nil)
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	if response.Code != http.StatusInternalServerError {
		t.Fatalf("expected status %d, got %d", http.StatusInternalServerError, response.Code)
	}
	if got, want := response.Body.String(), "Internal Server Error\n"; got != want {
		t.Fatalf("expected body %q, got %q", want, got)
	}
	if strings.Contains(response.Body.String(), "sensitive") {
		t.Fatal("expected response not to expose the panic value")
	}

	var entry map[string]any
	if err := json.Unmarshal(output.Bytes(), &entry); err != nil {
		t.Fatalf("decode recovery log: %v", err)
	}
	assertLogField(t, entry, "msg", "request panicked")
	assertLogField(t, entry, "request_id", response.Header().Get(requestIDHeader))
	if _, ok := entry["stack"]; !ok {
		t.Fatal("expected recovery log to include a stack trace")
	}
}

func assertLogField(t *testing.T, entry map[string]any, key string, want any) {
	t.Helper()

	if got := entry[key]; got != want {
		t.Fatalf("expected log field %q to be %v, got %v", key, want, got)
	}
}
