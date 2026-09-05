package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
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
	DatabaseHostname         string
	DatabasePort             int
	DatabaseUser             string
	DatabasePassword         string
	DatabaseName             string
}

func Load() (Config, error) {
	config := Config{
		Address:            envOrDefault("APP_ADDR", ":8080"),
		Environment:        envOrDefault("APP_ENV", EnvironmentProduction),
		DevelopmentUser:    strings.TrimSpace(os.Getenv("DEV_USER")),
		TraQAPIBaseURL:     envOrDefault("TRAQ_API_BASE_URL", "https://q.trap.jp/api/v3"),
		TraQBotAccessToken: strings.TrimSpace(os.Getenv("TRAQ_BOT_ACCESS_TOKEN")),
		DatabaseHostname:   envOrDefault("NS_MARIADB_HOSTNAME", "127.0.0.1"),
		DatabaseUser:       envOrDefault("NS_MARIADB_USER", "app"),
		DatabasePassword:   envOrDefault("NS_MARIADB_PASSWORD", "password"),
		DatabaseName:       envOrDefault("NS_MARIADB_DATABASE", "1m26_13"),
	}

	if config.Environment != EnvironmentDevelopment && config.Environment != EnvironmentProduction {
		return Config{}, fmt.Errorf("APP_ENV must be %q or %q", EnvironmentDevelopment, EnvironmentProduction)
	}
	if config.DevelopmentUser != "" && config.Environment != EnvironmentDevelopment {
		return Config{}, errors.New("DEV_USER can only be used when APP_ENV=development")
	}
	if config.TraQBotAccessToken == "" && config.Environment == EnvironmentProduction {
		return Config{}, errors.New("TRAQ_BOT_ACCESS_TOKEN is required")
	}
	if config.TraQBotAccessToken == "" && config.DevelopmentUser == "" {
		return Config{}, errors.New("DEV_USER is required when development runs without a traQ token")
	}
	var err error
	config.DatabasePort, err = intEnv("NS_MARIADB_PORT", 3306)
	if err != nil {
		return Config{}, err
	}

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

func intEnv(key string, fallback int) (int, error) {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback, nil
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed < 1 || parsed > 65535 {
		return 0, fmt.Errorf("%s must be a valid port", key)
	}
	return parsed, nil
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
