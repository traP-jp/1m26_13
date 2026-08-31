package httpapi

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/traP-jp/1m26_13/backend/internal/traq"
)

const testUserID = "019b0000-0000-7000-8000-000000000001"

type fakeDirectory struct {
	user  traq.User
	found bool
	err   error
}

func (directory fakeDirectory) UserByID(string) (traq.User, bool, error) {
	return directory.user, directory.found, directory.err
}

func (directory fakeDirectory) UserByName(string) (traq.User, bool, error) {
	return directory.user, directory.found, directory.err
}

func (fakeDirectory) Users() ([]traq.User, error) {
	return nil, nil
}

func (fakeDirectory) Groups() ([]traq.Group, error) {
	return nil, nil
}

func (fakeDirectory) GroupByID(string) (traq.Group, bool, error) {
	return traq.Group{}, false, nil
}

func (fakeDirectory) GroupsForUser(string) ([]traq.Group, error) {
	return nil, nil
}

func newTestHandler() http.Handler {
	return NewHandler(HandlerOptions{})
}

func TestHealth(t *testing.T) {
	t.Parallel()

	request := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
	response := httptest.NewRecorder()

	newTestHandler().ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, response.Code)
	}

	if got, want := response.Header().Get("Content-Type"), "application/json"; got != want {
		t.Fatalf("expected content type %q, got %q", want, got)
	}

	if got, want := response.Body.String(), "{\"status\":\"ok\"}\n"; got != want {
		t.Fatalf("expected body %q, got %q", want, got)
	}

	if got := response.Header().Get(requestIDHeader); got == "" {
		t.Fatal("expected response to include a request ID")
	}
}

func TestHealthRejectsPost(t *testing.T) {
	t.Parallel()

	request := httptest.NewRequest(http.MethodPost, "/api/v1/health", nil)
	response := httptest.NewRecorder()

	newTestHandler().ServeHTTP(response, request)

	if response.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected status %d, got %d", http.StatusMethodNotAllowed, response.Code)
	}
}

func TestUnknownRoute(t *testing.T) {
	t.Parallel()

	request := httptest.NewRequest(http.MethodGet, "/unknown", nil)
	response := httptest.NewRecorder()

	newTestHandler().ServeHTTP(response, request)

	if response.Code != http.StatusNotFound {
		t.Fatalf("expected status %d, got %d", http.StatusNotFound, response.Code)
	}
}

func TestCurrentUser(t *testing.T) {
	t.Parallel()

	handler := NewHandler(HandlerOptions{Directory: fakeDirectory{
		user: traq.User{
			ID:          testUserID,
			Name:        "jizi",
			DisplayName: "JIZI",
		},
		found: true,
	}})
	request := httptest.NewRequest(http.MethodGet, "/api/v1/users/me", nil)
	request.Header.Set(forwardedUserHeader, "jizi")
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, response.Code)
	}
	if got, want := response.Body.String(), "{\"displayName\":\"JIZI\",\"id\":\""+testUserID+"\",\"traqId\":\"jizi\"}\n"; got != want {
		t.Fatalf("expected body %q, got %q", want, got)
	}
}

func TestCurrentUserRequiresAuthentication(t *testing.T) {
	t.Parallel()

	request := httptest.NewRequest(http.MethodGet, "/api/v1/users/me", nil)
	response := httptest.NewRecorder()

	newTestHandler().ServeHTTP(response, request)

	if response.Code != http.StatusUnauthorized {
		t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, response.Code)
	}
	if got, want := response.Header().Get("Content-Type"), "application/json"; got != want {
		t.Fatalf("expected content type %q, got %q", want, got)
	}
}

func TestCurrentUserUsesDevelopmentUser(t *testing.T) {
	t.Parallel()

	handler := NewHandler(HandlerOptions{
		Directory: fakeDirectory{
			user:  traq.User{ID: testUserID, Name: "jizi", DisplayName: "JIZI"},
			found: true,
		},
		DevelopmentUser: "jizi",
	})
	request := httptest.NewRequest(http.MethodGet, "/api/v1/users/me", nil)
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, response.Code)
	}
}

func TestCurrentUserDirectoryUnavailable(t *testing.T) {
	t.Parallel()

	handler := NewHandler(HandlerOptions{Directory: fakeDirectory{err: traq.ErrDirectoryUnavailable}})
	request := httptest.NewRequest(http.MethodGet, "/api/v1/users/me", nil)
	request.Header.Set(forwardedUserHeader, "jizi")
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	if response.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected status %d, got %d", http.StatusServiceUnavailable, response.Code)
	}
}
