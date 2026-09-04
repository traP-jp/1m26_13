package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/traP-jp/1m26_13/backend/internal/domain"
)

const roadmapColumns = `id, title, description, audience, published, stages, revision, created_at, updated_at`

func scanRoadmap(row scanner) (domain.Roadmap, error) {
	var roadmap domain.Roadmap
	var stages []byte
	err := row.Scan(&roadmap.ID, &roadmap.Title, &roadmap.Description, &roadmap.Audience, &roadmap.Published,
		&stages, &roadmap.Revision, &roadmap.CreatedAt, &roadmap.UpdatedAt)
	if err != nil {
		return domain.Roadmap{}, err
	}
	roadmap.Stages, err = decodeJSON(stages, []domain.RoadmapStage{})
	return roadmap, err
}

func roadmapSnapshot(roadmap domain.Roadmap) map[string]any {
	return map[string]any{"title": roadmap.Title, "description": roadmap.Description,
		"audience": roadmap.Audience, "published": roadmap.Published, "stages": roadmap.Stages}
}

func (store *MySQL) validateRoadmap(ctx context.Context, roadmap domain.Roadmap) error {
	seen := make(map[string]bool)
	itemCount := 0
	for _, stage := range roadmap.Stages {
		if stage.ID == "" || stage.Title == "" {
			return fmt.Errorf("%w: roadmap stages require stable ids and titles", ErrInvalid)
		}
		for _, item := range stage.Items {
			if item.LectureID == "" || seen[item.LectureID] {
				return fmt.Errorf("%w: roadmap lecture ids must be unique", ErrInvalid)
			}
			seen[item.LectureID], itemCount = true, itemCount+1
			var published bool
			err := store.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM lectures l JOIN sessions s ON s.lecture_id=l.id
				WHERE l.id=? AND s.status='published' AND JSON_LENGTH(s.replay_of_session_ids)=0)`, item.LectureID).Scan(&published)
			if err != nil {
				return err
			}
			if !published && roadmap.Published {
				return fmt.Errorf("%w: published roadmaps may contain only published lectures", ErrInvalid)
			}
		}
		if roadmap.Published && len(stage.Items) == 0 {
			return fmt.Errorf("%w: published roadmaps cannot contain empty stages", ErrInvalid)
		}
	}
	if roadmap.Published && (len(roadmap.Stages) == 0 || itemCount == 0) {
		return fmt.Errorf("%w: published roadmaps require lectures", ErrInvalid)
	}
	return nil
}

func (store *MySQL) ListRoadmaps(ctx context.Context, includeDraft bool) ([]domain.Roadmap, error) {
	query := "SELECT " + roadmapColumns + " FROM roadmaps"
	if !includeDraft {
		query += " WHERE published = TRUE"
	}
	query += " ORDER BY updated_at DESC, id"
	rows, err := store.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("list roadmaps: %w", err)
	}
	defer rows.Close()
	result := make([]domain.Roadmap, 0)
	for rows.Next() {
		roadmap, err := scanRoadmap(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, roadmap)
	}
	return result, rows.Err()
}

func (store *MySQL) GetRoadmap(ctx context.Context, id string, includeDraft bool) (domain.Roadmap, error) {
	query := "SELECT " + roadmapColumns + " FROM roadmaps WHERE id=?"
	if !includeDraft {
		query += " AND published=TRUE"
	}
	roadmap, err := scanRoadmap(store.db.QueryRowContext(ctx, query, id))
	if errors.Is(err, sql.ErrNoRows) {
		return domain.Roadmap{}, ErrNotFound
	}
	if err != nil {
		return domain.Roadmap{}, fmt.Errorf("get roadmap: %w", err)
	}
	return roadmap, nil
}

func (store *MySQL) CreateRoadmap(ctx context.Context, roadmap domain.Roadmap, actorID string) (domain.Roadmap, error) {
	if err := store.validateRoadmap(ctx, roadmap); err != nil {
		return domain.Roadmap{}, err
	}
	roadmap.ID, roadmap.Revision, roadmap.CreatedAt, roadmap.UpdatedAt = newID(), 1, store.now(), store.now()
	stages, err := encodeJSON(roadmap.Stages)
	if err != nil {
		return domain.Roadmap{}, err
	}
	tx, err := store.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.Roadmap{}, err
	}
	defer tx.Rollback()
	_, err = tx.ExecContext(ctx, `INSERT INTO roadmaps (id, title, description, audience, published, stages, revision,
		created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, roadmap.ID,
		roadmap.Title, roadmap.Description, roadmap.Audience, roadmap.Published, stages, roadmap.Revision,
		actorID, actorID, roadmap.CreatedAt, roadmap.UpdatedAt)
	if err != nil {
		return domain.Roadmap{}, fmt.Errorf("create roadmap: %w", err)
	}
	if err := recordEvents(ctx, tx, "roadmap", roadmap.ID, actorID, map[string]any{}, roadmapSnapshot(roadmap), roadmap.CreatedAt); err != nil {
		return domain.Roadmap{}, err
	}
	if err := tx.Commit(); err != nil {
		return domain.Roadmap{}, err
	}
	return store.GetRoadmap(ctx, roadmap.ID, true)
}

func (store *MySQL) UpdateRoadmap(ctx context.Context, roadmap domain.Roadmap, expectedRevision int, actorID string) (domain.Roadmap, error) {
	before, err := store.GetRoadmap(ctx, roadmap.ID, true)
	if err != nil {
		return domain.Roadmap{}, err
	}
	if err := store.validateRoadmap(ctx, roadmap); err != nil {
		return domain.Roadmap{}, err
	}
	stages, err := encodeJSON(roadmap.Stages)
	if err != nil {
		return domain.Roadmap{}, err
	}
	now := store.now()
	tx, err := store.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.Roadmap{}, err
	}
	defer tx.Rollback()
	result, err := tx.ExecContext(ctx, `UPDATE roadmaps SET title=?, description=?, audience=?, published=?, stages=?,
		revision=revision+1, updated_by=?, updated_at=? WHERE id=? AND revision=?`, roadmap.Title, roadmap.Description,
		roadmap.Audience, roadmap.Published, stages, actorID, now, roadmap.ID, expectedRevision)
	if err != nil {
		return domain.Roadmap{}, fmt.Errorf("update roadmap: %w", err)
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return domain.Roadmap{}, ErrConflict
	}
	if err := recordEvents(ctx, tx, "roadmap", roadmap.ID, actorID, roadmapSnapshot(before), roadmapSnapshot(roadmap), now); err != nil {
		return domain.Roadmap{}, err
	}
	if err := tx.Commit(); err != nil {
		return domain.Roadmap{}, err
	}
	return store.GetRoadmap(ctx, roadmap.ID, true)
}
