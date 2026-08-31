package traq

import (
	"context"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (roundTrip roundTripFunc) RoundTrip(request *http.Request) (*http.Response, error) {
	return roundTrip(request)
}

func TestClientFetchesDirectory(t *testing.T) {
	t.Parallel()

	httpClient := &http.Client{
		Timeout: time.Second,
		Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
			if got, want := request.Header.Get("Authorization"), "Bearer bot-token"; got != want {
				t.Errorf("expected authorization %q, got %q", want, got)
			}
			if got, want := request.Header.Get("User-Agent"), "1m26_13"; got != want {
				t.Errorf("expected user agent %q, got %q", want, got)
			}

			var body string
			switch request.URL.Path {
			case "/api/v3/users":
				body = `[{"id":"user-id","name":"jizi","displayName":"JIZI","iconFileId":"icon-id","bot":false,"state":1}]`
			case "/api/v3/groups":
				body = `[{"id":"group-id","name":"group","description":"","type":"","members":[{"id":"user-id","role":""}],"admins":[]}]`
			default:
				return &http.Response{
					StatusCode: http.StatusNotFound,
					Status:     "404 Not Found",
					Body:       io.NopCloser(strings.NewReader("not found")),
					Header:     make(http.Header),
				}, nil
			}

			return &http.Response{
				StatusCode: http.StatusOK,
				Status:     "200 OK",
				Body:       io.NopCloser(strings.NewReader(body)),
				Header:     http.Header{"Content-Type": []string{"application/json"}},
			}, nil
		}),
	}

	client, err := NewClient("https://q.trap.jp/api/v3", "bot-token", httpClient)
	if err != nil {
		t.Fatalf("create client: %v", err)
	}

	users, err := client.FetchUsers(context.Background())
	if err != nil {
		t.Fatalf("fetch users: %v", err)
	}
	if len(users) != 1 || users[0].Name != "jizi" {
		t.Fatalf("unexpected users: %#v", users)
	}

	groups, err := client.FetchGroups(context.Background())
	if err != nil {
		t.Fatalf("fetch groups: %v", err)
	}
	if len(groups) != 1 || groups[0].Members[0].UserID != "user-id" {
		t.Fatalf("unexpected groups: %#v", groups)
	}
}

func TestClientRejectsUnexpectedStatus(t *testing.T) {
	t.Parallel()

	httpClient := &http.Client{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
		return &http.Response{
			StatusCode: http.StatusUnauthorized,
			Status:     "401 Unauthorized",
			Body:       io.NopCloser(strings.NewReader("secret upstream response")),
			Header:     make(http.Header),
		}, nil
	})}

	client, err := NewClient("https://q.trap.jp/api/v3", "bot-token", httpClient)
	if err != nil {
		t.Fatalf("create client: %v", err)
	}
	if _, err := client.FetchUsers(context.Background()); err == nil {
		t.Fatal("expected an error")
	}
}
