package traq

import (
	"context"
	"errors"
	"testing"
	"time"
)

type fakeSource struct {
	users     []User
	groups    []Group
	usersErr  error
	groupsErr error
}

func (source *fakeSource) FetchUsers(context.Context) ([]User, error) {
	return source.users, source.usersErr
}

func (source *fakeSource) FetchGroups(context.Context) ([]Group, error) {
	return source.groups, source.groupsErr
}

func TestDirectoryCache(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, time.August, 31, 0, 0, 0, 0, time.UTC)
	source := &fakeSource{
		users: []User{{ID: "user-id", Name: "JIZI", DisplayName: "JIZI"}},
		groups: []Group{{
			ID:      "group-id",
			Name:    "group",
			Members: []GroupMember{{UserID: "user-id", Role: "member"}},
		}},
	}
	cache := newDirectoryCache(source, 5*time.Minute, 15*time.Minute, func() time.Time { return now })

	if _, _, err := cache.UserByName("jizi"); !errors.Is(err, ErrDirectoryUnavailable) {
		t.Fatalf("expected unavailable before refresh, got %v", err)
	}
	if err := cache.Refresh(context.Background()); err != nil {
		t.Fatalf("refresh cache: %v", err)
	}

	user, found, err := cache.UserByName("jizi")
	if err != nil {
		t.Fatalf("look up user: %v", err)
	}
	if !found || user.ID != "user-id" {
		t.Fatalf("unexpected user lookup result: %#v, %v", user, found)
	}
	user, found, err = cache.UserByID("user-id")
	if err != nil || !found || user.Name != "JIZI" {
		t.Fatalf("unexpected user ID lookup result: %#v, %v, %v", user, found, err)
	}
	group, found, err := cache.GroupByID("group-id")
	if err != nil || !found || group.Name != "group" {
		t.Fatalf("unexpected group lookup result: %#v, %v, %v", group, found, err)
	}
	groups, err := cache.GroupsForUser("user-id")
	if err != nil {
		t.Fatalf("look up groups: %v", err)
	}
	if len(groups) != 1 || groups[0].ID != "group-id" {
		t.Fatalf("unexpected groups: %#v", groups)
	}

	groups[0].Members[0].Role = "mutated"
	groupsAgain, err := cache.GroupsForUser("user-id")
	if err != nil {
		t.Fatalf("look up groups again: %v", err)
	}
	if groupsAgain[0].Members[0].Role != "member" {
		t.Fatal("expected returned groups not to mutate the cache")
	}
}

func TestDirectoryCacheRetainsOnlyBoundedStaleSnapshot(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, time.August, 31, 0, 0, 0, 0, time.UTC)
	source := &fakeSource{
		users:  []User{{ID: "old-user", Name: "jizi"}},
		groups: []Group{},
	}
	cache := newDirectoryCache(source, 5*time.Minute, 15*time.Minute, func() time.Time { return now })
	if err := cache.Refresh(context.Background()); err != nil {
		t.Fatalf("initial refresh: %v", err)
	}

	source.users = []User{{ID: "new-user", Name: "new-user"}}
	source.groupsErr = errors.New("upstream unavailable")
	now = now.Add(5 * time.Minute)
	if err := cache.Refresh(context.Background()); err == nil {
		t.Fatal("expected refresh to fail")
	}
	if user, found, err := cache.UserByName("jizi"); err != nil || !found || user.ID != "old-user" {
		t.Fatalf("expected previous snapshot, got %#v, %v, %v", user, found, err)
	}

	now = now.Add(11 * time.Minute)
	if _, _, err := cache.UserByName("jizi"); !errors.Is(err, ErrDirectoryUnavailable) {
		t.Fatalf("expected stale cache to become unavailable, got %v", err)
	}
}
