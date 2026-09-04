package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/traP-jp/1m26_13/backend/internal/config"
	"github.com/traP-jp/1m26_13/backend/internal/database"
	"github.com/traP-jp/1m26_13/backend/internal/httpapi"
	"github.com/traP-jp/1m26_13/backend/internal/store"
	"github.com/traP-jp/1m26_13/backend/internal/traq"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := run(ctx); err != nil {
		slog.Error("server stopped", "error", err)
		os.Exit(1)
	}
}

func run(ctx context.Context) error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	db, err := database.Open(database.Config{Hostname: cfg.DatabaseHostname, Port: cfg.DatabasePort,
		User: cfg.DatabaseUser, Password: cfg.DatabasePassword, Database: cfg.DatabaseName})
	if err != nil {
		return err
	}
	defer db.Close()
	if err := database.Ready(ctx, db); err != nil {
		return err
	}
	if err := database.Migrate(ctx, db); err != nil {
		return err
	}

	var directory traq.Directory
	if cfg.TraQBotAccessToken == "" {
		directory = traq.NewStaticDirectory(cfg.DevelopmentUser)
	} else {
		traqClient, err := traq.NewClient(cfg.TraQAPIBaseURL, cfg.TraQBotAccessToken, &http.Client{Timeout: cfg.TraQAPITimeout})
		if err != nil {
			return fmt.Errorf("create traQ client: %w", err)
		}
		cache, err := traq.NewDirectoryCache(traqClient, cfg.TraQCacheRefreshInterval, cfg.TraQCacheMaxStale)
		if err != nil {
			return fmt.Errorf("create traQ directory cache: %w", err)
		}
		if err := cache.Refresh(ctx); err != nil {
			return fmt.Errorf("initialize traQ directory cache: %w", err)
		}
		go cache.Run(ctx, slog.Default())
		directory = cache
	}

	server := &http.Server{
		Addr: cfg.Address,
		Handler: httpapi.NewHandler(httpapi.HandlerOptions{
			Directory:       directory,
			Repository:      store.NewMySQL(db),
			DevelopmentUser: cfg.DevelopmentUser,
			Logger:          slog.Default(),
		}),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	serveError := make(chan error, 1)

	slog.Info("starting server", "address", cfg.Address)
	go func() {
		serveError <- server.ListenAndServe()
	}()

	select {
	case err := <-serveError:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			return err
		}
		return nil
	case <-ctx.Done():
		slog.Info("shutting down server")
	}

	shutdownContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownContext); err != nil {
		return fmt.Errorf("shutdown server: %w", err)
	}

	if err := <-serveError; err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}

	return nil
}
