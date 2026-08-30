package httpapi

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealth(t *testing.T) {
	t.Parallel()

	request := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
	response := httptest.NewRecorder()

	NewHandler().ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, response.Code)
	}

	if got, want := response.Header().Get("Content-Type"), "application/json"; got != want {
		t.Fatalf("expected content type %q, got %q", want, got)
	}

	if got, want := response.Body.String(), "{\"status\":\"ok\"}\n"; got != want {
		t.Fatalf("expected body %q, got %q", want, got)
	}
}

func TestHealthRejectsPost(t *testing.T) {
	t.Parallel()

	request := httptest.NewRequest(http.MethodPost, "/api/v1/health", nil)
	response := httptest.NewRecorder()

	NewHandler().ServeHTTP(response, request)

	if response.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected status %d, got %d", http.StatusMethodNotAllowed, response.Code)
	}
}

func TestUnknownRoute(t *testing.T) {
	t.Parallel()

	request := httptest.NewRequest(http.MethodGet, "/unknown", nil)
	response := httptest.NewRecorder()

	NewHandler().ServeHTTP(response, request)

	if response.Code != http.StatusNotFound {
		t.Fatalf("expected status %d, got %d", http.StatusNotFound, response.Code)
	}
}
