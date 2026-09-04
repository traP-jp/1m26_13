package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"reflect"
	"time"

	"github.com/google/uuid"
	"github.com/traP-jp/1m26_13/backend/internal/domain"
)

type MySQL struct {
	db  *sql.DB
	now func() time.Time
}

func NewMySQL(db *sql.DB) *MySQL {
	return &MySQL{db: db, now: func() time.Time { return time.Now().UTC() }}
}

func encodeJSON(value any) (string, error) {
	encoded, err := json.Marshal(value)
	if err != nil {
		return "", fmt.Errorf("encode JSON: %w", err)
	}
	return string(encoded), nil
}

func decodeJSON[T any](raw []byte, fallback T) (T, error) {
	if len(raw) == 0 {
		return fallback, nil
	}
	var value T
	if err := json.Unmarshal(raw, &value); err != nil {
		return fallback, fmt.Errorf("decode JSON: %w", err)
	}
	return value, nil
}

func nullable(value string) any {
	if value == "" {
		return nil
	}
	return value
}

func newID() string { return uuid.NewString() }

func (store *MySQL) ListFields(ctx context.Context) ([]domain.Field, error) {
	rows, err := store.db.QueryContext(ctx, "SELECT id, name FROM fields WHERE active = TRUE ORDER BY position, id")
	if err != nil {
		return nil, fmt.Errorf("list fields: %w", err)
	}
	defer rows.Close()
	result := make([]domain.Field, 0)
	for rows.Next() {
		var field domain.Field
		if err := rows.Scan(&field.ID, &field.Name); err != nil {
			return nil, fmt.Errorf("scan field: %w", err)
		}
		result = append(result, field)
	}
	return result, rows.Err()
}

func recordEvents(ctx context.Context, tx *sql.Tx, entityType, entityID, actorID string, before, after map[string]any, now time.Time) error {
	changeSetID := newID()
	for attribute, nextValue := range after {
		previousValue := before[attribute]
		if reflect.DeepEqual(previousValue, nextValue) {
			continue
		}
		previousJSON, err := encodeJSON(previousValue)
		if err != nil {
			return err
		}
		nextJSON, err := encodeJSON(nextValue)
		if err != nil {
			return err
		}
		_, err = tx.ExecContext(ctx, `INSERT INTO attribute_update_events
			(id, entity_type, entity_id, attribute_path, previous_value, next_value, actor_id, occurred_at, change_set_id)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			newID(), entityType, entityID, attribute, previousJSON, nextJSON, actorID, now, changeSetID)
		if err != nil {
			return fmt.Errorf("record %s event: %w", entityType, err)
		}
	}
	return nil
}

func (store *MySQL) ListEvents(ctx context.Context, entityType, entityID string) ([]domain.AttributeUpdateEvent, error) {
	rows, err := store.db.QueryContext(ctx, `SELECT id, entity_type, entity_id, attribute_path,
		previous_value, next_value, actor_id, occurred_at, change_set_id
		FROM attribute_update_events WHERE entity_type = ? AND entity_id = ?
		ORDER BY occurred_at DESC, id`, entityType, entityID)
	if err != nil {
		return nil, fmt.Errorf("list events: %w", err)
	}
	defer rows.Close()
	result := make([]domain.AttributeUpdateEvent, 0)
	for rows.Next() {
		var event domain.AttributeUpdateEvent
		var previous, next []byte
		if err := rows.Scan(&event.ID, &event.EntityType, &event.EntityID, &event.AttributePath, &previous, &next, &event.ActorID, &event.OccurredAt, &event.ChangeSetID); err != nil {
			return nil, fmt.Errorf("scan event: %w", err)
		}
		if err := json.Unmarshal(previous, &event.PreviousValue); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(next, &event.NextValue); err != nil {
			return nil, err
		}
		result = append(result, event)
	}
	return result, rows.Err()
}

func (store *MySQL) CompleteSession(ctx context.Context, sessionID, userID string) (domain.Completion, error) {
	var status string
	var replayCount, roundNumber int
	var lectureID string
	err := store.db.QueryRowContext(ctx, `SELECT s.status, JSON_LENGTH(s.replay_of_session_ids), s.lecture_id,
		1 + (SELECT COUNT(DISTINCT prior.display_order) FROM sessions prior WHERE prior.lecture_id = s.lecture_id
			AND prior.status = 'published' AND prior.display_order < s.display_order)
		FROM sessions s WHERE s.id = ?`, sessionID).Scan(&status, &replayCount, &lectureID, &roundNumber)
	if errors.Is(err, sql.ErrNoRows) {
		return domain.Completion{}, ErrNotFound
	}
	if err != nil {
		return domain.Completion{}, fmt.Errorf("load session for completion: %w", err)
	}
	if status != "published" || replayCount > 0 {
		return domain.Completion{}, fmt.Errorf("%w: only published non-replay sessions can be completed", ErrInvalid)
	}
	now := store.now()
	_, err = store.db.ExecContext(ctx, `INSERT INTO session_completions (user_id, session_id, completed_at)
		VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE completed_at = completed_at`, userID, sessionID, now)
	if err != nil {
		return domain.Completion{}, fmt.Errorf("complete session: %w", err)
	}
	var completedAt time.Time
	if err := store.db.QueryRowContext(ctx, "SELECT completed_at FROM session_completions WHERE user_id = ? AND session_id = ?", userID, sessionID).Scan(&completedAt); err != nil {
		return domain.Completion{}, fmt.Errorf("read completion: %w", err)
	}
	return domain.Completion{UserID: userID, SessionID: sessionID, LectureID: lectureID, RoundNumber: roundNumber, CompletedAt: completedAt}, nil
}

func (store *MySQL) UncompleteSession(ctx context.Context, sessionID, userID string) error {
	result, err := store.db.ExecContext(ctx, "DELETE FROM session_completions WHERE user_id = ? AND session_id = ?", userID, sessionID)
	if err != nil {
		return fmt.Errorf("remove completion: %w", err)
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return ErrNotFound
	}
	return nil
}

func (store *MySQL) ListCompletions(ctx context.Context, userID string) ([]domain.Completion, error) {
	rows, err := store.db.QueryContext(ctx, `SELECT sc.user_id, sc.session_id, s.lecture_id,
		1 + (SELECT COUNT(DISTINCT prior.display_order) FROM sessions prior WHERE prior.lecture_id = s.lecture_id
			AND prior.status = 'published' AND prior.display_order < s.display_order),
		sc.completed_at FROM session_completions sc JOIN sessions s ON s.id = sc.session_id
		WHERE sc.user_id = ? ORDER BY sc.completed_at DESC, sc.session_id`, userID)
	if err != nil {
		return nil, fmt.Errorf("list completions: %w", err)
	}
	defer rows.Close()
	result := make([]domain.Completion, 0)
	for rows.Next() {
		var completion domain.Completion
		if err := rows.Scan(&completion.UserID, &completion.SessionID, &completion.LectureID, &completion.RoundNumber, &completion.CompletedAt); err != nil {
			return nil, err
		}
		result = append(result, completion)
	}
	return result, rows.Err()
}

func (store *MySQL) ListCompletedLectures(ctx context.Context, userID string) (map[string]time.Time, error) {
	rows, err := store.db.QueryContext(ctx, `SELECT l.id, MAX(sc.completed_at)
		FROM lectures l JOIN sessions s ON s.lecture_id = l.id AND s.status = 'published' AND JSON_LENGTH(s.replay_of_session_ids) = 0
		LEFT JOIN session_completions sc ON sc.session_id = s.id AND sc.user_id = ?
		GROUP BY l.id HAVING COUNT(s.id) > 0 AND COUNT(sc.session_id) = COUNT(s.id)`, userID)
	if err != nil {
		return nil, fmt.Errorf("list completed lectures: %w", err)
	}
	defer rows.Close()
	result := make(map[string]time.Time)
	for rows.Next() {
		var id string
		var earnedAt time.Time
		if err := rows.Scan(&id, &earnedAt); err != nil {
			return nil, err
		}
		result[id] = earnedAt
	}
	return result, rows.Err()
}
