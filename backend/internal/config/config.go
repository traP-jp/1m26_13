package config

import (
	"errors"
	"fmt"
	"os"
	"strings"
	"time"
)

const (
	EnvironmentDevelopment = "development"
	EnvironmentProduction  = "production"
)

type Config struct {
	Address                  string
	Environment              string
	DevelopmentUser          string
	TraQAPIBaseURL           string
	TraQBotAccessToken       string
	TraQAPITimeout           time.Duration
	TraQCacheRefreshInterval time.Duration
	TraQCacheMaxStale        time.Duration
}

func Load() (Config, error) {
	config := Config{
		Address:            envOrDefault("APP_ADDR", ":8080"),
		Environment:        envOrDefault("APP_ENV", EnvironmentProduction),
		DevelopmentUser:    strings.TrimSpace(os.Getenv("DEV_USER")),
		TraQAPIBaseURL:     envOrDefault("TRAQ_API_BASE_URL", "https://q.trap.jp/api/v3"),
		TraQBotAccessToken: strings.TrimSpace(os.Getenv("TRAQ_BOT_ACCESS_TOKEN")),
	}

	if config.Environment != EnvironmentDevelopment && config.Environment != EnvironmentProduction {
		return Config{}, fmt.Errorf("APP_ENV must be %q or %q", EnvironmentDevelopment, EnvironmentProduction)
	}
	if config.DevelopmentUser != "" && config.Environment != EnvironmentDevelopment {
		return Config{}, errors.New("DEV_USER can only be used when APP_ENV=development")
	}
	if config.TraQBotAccessToken == "" {
		return Config{}, errors.New("TRAQ_BOT_ACCESS_TOKEN is required")
	}

	var err error
	config.TraQAPITimeout, err = durationEnv("TRAQ_API_TIMEOUT", 10*time.Second)
	if err != nil {
		return Config{}, err
	}
	config.TraQCacheRefreshInterval, err = durationEnv(
		"TRAQ_CACHE_REFRESH_INTERVAL",
		5*time.Minute,
	)
	if err != nil {
		return Config{}, err
	}
	config.TraQCacheMaxStale, err = durationEnv("TRAQ_CACHE_MAX_STALE", 15*time.Minute)
	if err != nil {
		return Config{}, err
	}
	if config.TraQCacheMaxStale < config.TraQCacheRefreshInterval {
		return Config{}, errors.New(
			"TRAQ_CACHE_MAX_STALE must be greater than or equal to TRAQ_CACHE_REFRESH_INTERVAL",
		)
	}

	return config, nil
}

func envOrDefault(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func durationEnv(key string, fallback time.Duration) (time.Duration, error) {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback, nil
	}

	duration, err := time.ParseDuration(value)
	if err != nil {
		return 0, fmt.Errorf("parse %s: %w", key, err)
	}
	if duration <= 0 {
		return 0, fmt.Errorf("%s must be positive", key)
	}

	return duration, nil
}
