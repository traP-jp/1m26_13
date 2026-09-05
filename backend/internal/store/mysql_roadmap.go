package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/traP-jp/1m26_13/backend/internal/domain"
)

const roadmapColumns = `id, title, description, audience, published, stages, items, revision, created_at, updated_at`

func scanRoadmap(row scanner) (domain.Roadmap, error) {
	var roadmap domain.Roadmap
	var stages []byte
	var items []byte
	err := row.Scan(&roadmap.ID, &roadmap.Title, &roadmap.Description, &roadmap.Audience, &roadmap.Published,
		&stages, &items, &roadmap.Revision, &roadmap.CreatedAt, &roadmap.UpdatedAt)
	if err != nil {
		return domain.Roadmap{}, err
	}
	roadmap.LegacyStages, err = decodeJSON(stages, []domain.RoadmapStage{})
	if err != nil {
		return domain.Roadmap{}, err
	}
	if len(items) > 0 && string(items) != "null" {
		roadmap.Items, err = decodeJSON(items, []domain.RoadmapItem{})
		return roadmap, err
	}
	roadmap.Items = flattenLegacyRoadmapItems(roadmap.LegacyStages)
	return roadmap, nil
}

func flattenLegacyRoadmapItems(stages []domain.RoadmapStage) []domain.RoadmapItem {
	items := make([]domain.RoadmapItem, 0)
	for _, stage := range stages {
		for index, item := range stage.Items {
			items = append(items, domain.RoadmapItem{
				ID: fmt.Sprintf("legacy:%s:%d", stage.ID, index), TargetType: "lecture", TargetID: item.LectureID,
			})
		}
	}
	return items
}

func roadmapSnapshot(roadmap domain.Roadmap) map[string]any {
	return map[string]any{"title": roadmap.Title, "description": roadmap.Description,
		"audience": roadmap.Audience, "published": roadmap.Published, "items": roadmap.Items}
}

func (store *MySQL) validateRoadmap(ctx context.Context, roadmap domain.Roadmap) error {
	seenIDs := make(map[string]bool)
	seenTargets := make(map[string]bool)
	for _, item := range roadmap.Items {
		key := item.TargetType + ":" + item.TargetID
		if item.ID == "" || seenIDs[item.ID] || item.TargetID == "" || seenTargets[key] {
			return fmt.Errorf("%w: roadmap item ids and targets must be unique", ErrInvalid)
		}
		seenIDs[item.ID], seenTargets[key] = true, true
		switch item.TargetType {
		case "lecture":
			var published bool
			err := store.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM lectures l JOIN sessions s ON s.lecture_id=l.id
				WHERE l.id=? AND s.status='published' AND JSON_LENGTH(s.replay_of_session_ids)=0)`, item.TargetID).Scan(&published)
			if err != nil {
				return err
			}
			var exists bool
			if err := store.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM lectures WHERE id=?)`, item.TargetID).Scan(&exists); err != nil {
				return err
			}
			if !exists {
				return fmt.Errorf("%w: roadmap lecture target does not exist", ErrInvalid)
			}
			if !published && roadmap.Published {
				return fmt.Errorf("%w: published roadmaps may contain only published lectures", ErrInvalid)
			}
		case "session":
			var status string
			var replayCount int
			err := store.db.QueryRowContext(ctx, `SELECT status, JSON_LENGTH(replay_of_session_ids) FROM sessions WHERE id=?`, item.TargetID).Scan(&status, &replayCount)
			if errors.Is(err, sql.ErrNoRows) {
				return fmt.Errorf("%w: roadmap session target does not exist", ErrInvalid)
			}
			if err != nil {
				return err
			}
			if replayCount > 0 {
				return fmt.Errorf("%w: replay sessions cannot be roadmap targets", ErrInvalid)
			}
			if roadmap.Published && status != "published" {
				return fmt.Errorf("%w: published roadmaps may contain only published sessions", ErrInvalid)
			}
		default:
			return fmt.Errorf("%w: unknown roadmap target type", ErrInvalid)
		}
	}
	if roadmap.Published && len(roadmap.Items) == 0 {
		return fmt.Errorf("%w: published roadmaps require items", ErrInvalid)
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
	items, err := encodeJSON(roadmap.Items)
	if err != nil {
		return domain.Roadmap{}, err
	}
	tx, err := store.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.Roadmap{}, err
	}
	defer tx.Rollback()
	_, err = tx.ExecContext(ctx, `INSERT INTO roadmaps (id, title, description, audience, published, stages, items, revision,
		created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, JSON_ARRAY(), ?, ?, ?, ?, ?, ?)`, roadmap.ID,
		roadmap.Title, roadmap.Description, roadmap.Audience, roadmap.Published, items, roadmap.Revision,
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
	items, err := encodeJSON(roadmap.Items)
	if err != nil {
		return domain.Roadmap{}, err
	}
	now := store.now()
	tx, err := store.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.Roadmap{}, err
	}
	defer tx.Rollback()
	result, err := tx.ExecContext(ctx, `UPDATE roadmaps SET title=?, description=?, audience=?, published=?, items=?,
		revision=revision+1, updated_by=?, updated_at=? WHERE id=? AND revision=?`, roadmap.Title, roadmap.Description,
		roadmap.Audience, roadmap.Published, items, actorID, now, roadmap.ID, expectedRevision)
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
