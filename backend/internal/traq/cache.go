package traq

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"sync"
	"time"
)

var ErrDirectoryUnavailable = errors.New("traQ directory is unavailable")

type Directory interface {
	UserByID(id string) (User, bool, error)
	UserByName(name string) (User, bool, error)
	GroupByID(id string) (Group, bool, error)
	Users() ([]User, error)
	Groups() ([]Group, error)
	GroupsForUser(userID string) ([]Group, error)
}

type directorySnapshot struct {
	users          []User
	groups         []Group
	usersByID      map[string]User
	usersByName    map[string]User
	groupsByID     map[string]Group
	groupIDsByUser map[string][]string
	refreshedAt    time.Time
}

type DirectoryCache struct {
	source          Source
	refreshInterval time.Duration
	maxStale        time.Duration
	now             func() time.Time

	refreshMu sync.Mutex
	mu        sync.RWMutex
	snapshot  directorySnapshot
}

func NewDirectoryCache(
	source Source,
	refreshInterval time.Duration,
	maxStale time.Duration,
) (*DirectoryCache, error) {
	if source == nil {
		return nil, errors.New("traQ directory source is required")
	}
	if refreshInterval <= 0 {
		return nil, errors.New("traQ cache refresh interval must be positive")
	}
	if maxStale < refreshInterval {
		return nil, errors.New("traQ cache maximum stale age must not be shorter than its refresh interval")
	}

	return newDirectoryCache(source, refreshInterval, maxStale, time.Now), nil
}

func newDirectoryCache(
	source Source,
	refreshInterval time.Duration,
	maxStale time.Duration,
	now func() time.Time,
) *DirectoryCache {
	return &DirectoryCache{
		source:          source,
		refreshInterval: refreshInterval,
		maxStale:        maxStale,
		now:             now,
	}
}

func (cache *DirectoryCache) Refresh(ctx context.Context) error {
	cache.refreshMu.Lock()
	defer cache.refreshMu.Unlock()

	users, err := cache.source.FetchUsers(ctx)
	if err != nil {
		return fmt.Errorf("fetch traQ users: %w", err)
	}
	groups, err := cache.source.FetchGroups(ctx)
	if err != nil {
		return fmt.Errorf("fetch traQ groups: %w", err)
	}

	snapshot, err := buildDirectorySnapshot(users, groups, cache.now())
	if err != nil {
		return err
	}

	cache.mu.Lock()
	cache.snapshot = snapshot
	cache.mu.Unlock()

	return nil
}

func (cache *DirectoryCache) Run(ctx context.Context, logger *slog.Logger) {
	if logger == nil {
		logger = slog.Default()
	}

	ticker := time.NewTicker(cache.refreshInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := cache.Refresh(ctx); err != nil {
				logger.WarnContext(ctx, "refreshing traQ directory cache", "error", err)
			}
		}
	}
}

func (cache *DirectoryCache) UserByID(id string) (User, bool, error) {
	cache.mu.RLock()
	defer cache.mu.RUnlock()

	if cache.isUnavailableLocked() {
		return User{}, false, ErrDirectoryUnavailable
	}

	user, ok := cache.snapshot.usersByID[id]
	return user, ok, nil
}

func (cache *DirectoryCache) UserByName(name string) (User, bool, error) {
	cache.mu.RLock()
	defer cache.mu.RUnlock()

	if cache.isUnavailableLocked() {
		return User{}, false, ErrDirectoryUnavailable
	}

	user, ok := cache.snapshot.usersByName[strings.ToLower(name)]
	return user, ok, nil
}

func (cache *DirectoryCache) GroupByID(id string) (Group, bool, error) {
	cache.mu.RLock()
	defer cache.mu.RUnlock()

	if cache.isUnavailableLocked() {
		return Group{}, false, ErrDirectoryUnavailable
	}

	group, ok := cache.snapshot.groupsByID[id]
	return cloneGroup(group), ok, nil
}

func (cache *DirectoryCache) Users() ([]User, error) {
	cache.mu.RLock()
	defer cache.mu.RUnlock()

	if cache.isUnavailableLocked() {
		return nil, ErrDirectoryUnavailable
	}

	return append([]User(nil), cache.snapshot.users...), nil
}

func (cache *DirectoryCache) Groups() ([]Group, error) {
	cache.mu.RLock()
	defer cache.mu.RUnlock()

	if cache.isUnavailableLocked() {
		return nil, ErrDirectoryUnavailable
	}

	return cloneGroups(cache.snapshot.groups), nil
}

func (cache *DirectoryCache) GroupsForUser(userID string) ([]Group, error) {
	cache.mu.RLock()
	defer cache.mu.RUnlock()

	if cache.isUnavailableLocked() {
		return nil, ErrDirectoryUnavailable
	}

	groupIDs := cache.snapshot.groupIDsByUser[userID]
	groups := make([]Group, 0, len(groupIDs))
	for _, groupID := range groupIDs {
		groups = append(groups, cloneGroup(cache.snapshot.groupsByID[groupID]))
	}

	return groups, nil
}

func (cache *DirectoryCache) isUnavailableLocked() bool {
	if cache.snapshot.refreshedAt.IsZero() {
		return true
	}

	age := cache.now().Sub(cache.snapshot.refreshedAt)
	return age > cache.maxStale
}

func buildDirectorySnapshot(users []User, groups []Group, refreshedAt time.Time) (directorySnapshot, error) {
	snapshot := directorySnapshot{
		users:          append([]User(nil), users...),
		groups:         cloneGroups(groups),
		usersByID:      make(map[string]User, len(users)),
		usersByName:    make(map[string]User, len(users)),
		groupsByID:     make(map[string]Group, len(groups)),
		groupIDsByUser: make(map[string][]string),
		refreshedAt:    refreshedAt,
	}
	userIDs := make(map[string]struct{}, len(users))

	for _, user := range users {
		if user.ID == "" || user.Name == "" {
			return directorySnapshot{}, errors.New("traQ user is missing an ID or name")
		}
		name := strings.ToLower(user.Name)
		if _, exists := snapshot.usersByName[name]; exists {
			return directorySnapshot{}, fmt.Errorf("duplicate traQ user name %q", user.Name)
		}
		if _, exists := userIDs[user.ID]; exists {
			return directorySnapshot{}, fmt.Errorf("duplicate traQ user ID %q", user.ID)
		}
		snapshot.usersByName[name] = user
		snapshot.usersByID[user.ID] = user
		userIDs[user.ID] = struct{}{}
	}

	for _, group := range snapshot.groups {
		if group.ID == "" || group.Name == "" {
			return directorySnapshot{}, errors.New("traQ group is missing an ID or name")
		}
		if _, exists := snapshot.groupsByID[group.ID]; exists {
			return directorySnapshot{}, fmt.Errorf("duplicate traQ group ID %q", group.ID)
		}
		snapshot.groupsByID[group.ID] = group
		for _, member := range group.Members {
			if member.UserID == "" {
				return directorySnapshot{}, fmt.Errorf("traQ group %q has a member without an ID", group.ID)
			}
			snapshot.groupIDsByUser[member.UserID] = append(
				snapshot.groupIDsByUser[member.UserID],
				group.ID,
			)
		}
	}

	return snapshot, nil
}

func cloneGroups(groups []Group) []Group {
	cloned := make([]Group, len(groups))
	for index, group := range groups {
		cloned[index] = cloneGroup(group)
	}
	return cloned
}

func cloneGroup(group Group) Group {
	group.Members = append([]GroupMember(nil), group.Members...)
	group.Admins = append([]string(nil), group.Admins...)
	return group
}
