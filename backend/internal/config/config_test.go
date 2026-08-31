package config

import (
	"testing"
	"time"
)

func TestLoad(t *testing.T) {
	clearConfigEnvironment(t)
	t.Setenv("TRAQ_BOT_ACCESS_TOKEN", "token")

	config, err := Load()
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if config.Environment != EnvironmentProduction {
		t.Fatalf("expected production environment, got %q", config.Environment)
	}
	if config.TraQCacheRefreshInterval != 5*time.Minute {
		t.Fatalf("unexpected refresh interval: %v", config.TraQCacheRefreshInterval)
	}
	if config.TraQCacheMaxStale != 15*time.Minute {
		t.Fatalf("unexpected max stale age: %v", config.TraQCacheMaxStale)
	}
}

func TestLoadRejectsDevelopmentUserInProduction(t *testing.T) {
	clearConfigEnvironment(t)
	t.Setenv("TRAQ_BOT_ACCESS_TOKEN", "token")
	t.Setenv("DEV_USER", "jizi")

	if _, err := Load(); err == nil {
		t.Fatal("expected config load to fail")
	}
}

func TestLoadRejectsMaxStaleShorterThanRefreshInterval(t *testing.T) {
	clearConfigEnvironment(t)
	t.Setenv("TRAQ_BOT_ACCESS_TOKEN", "token")
	t.Setenv("TRAQ_CACHE_REFRESH_INTERVAL", "10m")
	t.Setenv("TRAQ_CACHE_MAX_STALE", "5m")

	if _, err := Load(); err == nil {
		t.Fatal("expected invalid cache durations to be rejected")
	}
}

func clearConfigEnvironment(t *testing.T) {
	t.Helper()

	for _, key := range []string{
		"APP_ADDR",
		"APP_ENV",
		"DEV_USER",
		"TRAQ_API_BASE_URL",
		"TRAQ_BOT_ACCESS_TOKEN",
		"TRAQ_API_TIMEOUT",
		"TRAQ_CACHE_REFRESH_INTERVAL",
		"TRAQ_CACHE_MAX_STALE",
	} {
		t.Setenv(key, "")
	}
}
