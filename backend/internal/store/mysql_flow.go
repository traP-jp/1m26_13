package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/traP-jp/1m26_13/backend/internal/domain"
)

const flowClassColumns = `id, name, flow_type, text, format_version, listed, revision, created_at, updated_at`

func scanFlowClass(row scanner) (domain.FlowClass, error) {
	var flowClass domain.FlowClass
	err := row.Scan(&flowClass.ID, &flowClass.Name, &flowClass.Type, &flowClass.Text,
		&flowClass.FormatVersion, &flowClass.Listed, &flowClass.Revision, &flowClass.CreatedAt, &flowClass.UpdatedAt)
	return flowClass, err
}

func flowClassSnapshot(flowClass domain.FlowClass) map[string]any {
	return map[string]any{"name": flowClass.Name, "type": flowClass.Type, "text": flowClass.Text, "listed": flowClass.Listed}
}

func (store *MySQL) ListFlowClasses(ctx context.Context, flowType string, includeUnlisted bool) ([]domain.FlowClass, error) {
	query := "SELECT " + flowClassColumns + " FROM flow_classes WHERE 1=1"
	args := make([]any, 0)
	if !includeUnlisted {
		query += " AND listed = TRUE"
	}
	if flowType != "" {
		query += " AND flow_type = ?"
		args = append(args, flowType)
	}
	query += " ORDER BY flow_type, updated_at DESC, id"
	rows, err := store.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list flow classes: %w", err)
	}
	defer rows.Close()
	result := make([]domain.FlowClass, 0)
	for rows.Next() {
		flowClass, err := scanFlowClass(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, flowClass)
	}
	return result, rows.Err()
}

func (store *MySQL) GetFlowClass(ctx context.Context, id string) (domain.FlowClass, error) {
	flowClass, err := scanFlowClass(store.db.QueryRowContext(ctx, "SELECT "+flowClassColumns+" FROM flow_classes WHERE id = ?", id))
	if errors.Is(err, sql.ErrNoRows) {
		return domain.FlowClass{}, ErrNotFound
	}
	if err != nil {
		return domain.FlowClass{}, fmt.Errorf("get flow class: %w", err)
	}
	return flowClass, nil
}

func (store *MySQL) CreateFlowClass(ctx context.Context, flowClass domain.FlowClass, actorID string) (domain.FlowClass, error) {
	flowClass.ID, flowClass.FormatVersion, flowClass.Revision = newID(), 1, 1
	flowClass.CreatedAt, flowClass.UpdatedAt = store.now(), store.now()
	tx, err := store.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.FlowClass{}, err
	}
	defer tx.Rollback()
	_, err = tx.ExecContext(ctx, `INSERT INTO flow_classes
		(id, name, flow_type, text, format_version, listed, revision, created_by, updated_by, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, flowClass.ID, flowClass.Name, flowClass.Type, flowClass.Text,
		flowClass.FormatVersion, flowClass.Listed, flowClass.Revision, actorID, actorID, flowClass.CreatedAt, flowClass.UpdatedAt)
	if err != nil {
		return domain.FlowClass{}, fmt.Errorf("create flow class: %w", err)
	}
	if err := recordEvents(ctx, tx, "flow_class", flowClass.ID, actorID, map[string]any{}, flowClassSnapshot(flowClass), flowClass.CreatedAt); err != nil {
		return domain.FlowClass{}, err
	}
	if err := tx.Commit(); err != nil {
		return domain.FlowClass{}, err
	}
	return store.GetFlowClass(ctx, flowClass.ID)
}

func (store *MySQL) UpdateFlowClass(ctx context.Context, flowClass domain.FlowClass, expectedRevision int, actorID string) (domain.FlowClass, error) {
	before, err := store.GetFlowClass(ctx, flowClass.ID)
	if err != nil {
		return domain.FlowClass{}, err
	}
	if before.Type != flowClass.Type {
		var references int
		if err := store.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM flows WHERE flow_class_id = ?", flowClass.ID).Scan(&references); err != nil {
			return domain.FlowClass{}, err
		}
		if references > 0 {
			return domain.FlowClass{}, fmt.Errorf("%w: referenced flow class type is immutable", ErrInvalid)
		}
	}
	now := store.now()
	tx, err := store.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.FlowClass{}, err
	}
	defer tx.Rollback()
	result, err := tx.ExecContext(ctx, `UPDATE flow_classes SET name=?, flow_type=?, text=?, listed=?,
		revision=revision+1, updated_by=?, updated_at=? WHERE id=? AND revision=?`, flowClass.Name, flowClass.Type,
		flowClass.Text, flowClass.Listed, actorID, now, flowClass.ID, expectedRevision)
	if err != nil {
		return domain.FlowClass{}, fmt.Errorf("update flow class: %w", err)
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return domain.FlowClass{}, ErrConflict
	}
	if err := recordEvents(ctx, tx, "flow_class", flowClass.ID, actorID, flowClassSnapshot(before), flowClassSnapshot(flowClass), now); err != nil {
		return domain.FlowClass{}, err
	}
	if err := tx.Commit(); err != nil {
		return domain.FlowClass{}, err
	}
	return store.GetFlowClass(ctx, flowClass.ID)
}

const flowColumns = `f.id, f.flow_class_id, COALESCE(f.lecture_id, f.session_id), fc.flow_type, f.text,
	f.format_version, f.answers, f.tasks, f.current_page, f.status, f.revision, f.created_at, f.updated_at`

func scanFlow(row scanner) (domain.Flow, error) {
	var flow domain.Flow
	var answers, tasks []byte
	err := row.Scan(&flow.ID, &flow.FlowClassID, &flow.TargetID, &flow.Type, &flow.Text, &flow.FormatVersion,
		&answers, &tasks, &flow.CurrentPage, &flow.Status, &flow.Revision, &flow.CreatedAt, &flow.UpdatedAt)
	if err != nil {
		return domain.Flow{}, err
	}
	var decodeErr error
	if flow.Answers, decodeErr = decodeJSON(answers, map[string]string{}); decodeErr != nil {
		return domain.Flow{}, decodeErr
	}
	if flow.Tasks, decodeErr = decodeJSON(tasks, map[string]bool{}); decodeErr != nil {
		return domain.Flow{}, decodeErr
	}
	return flow, nil
}

func flowProgressSnapshot(flow domain.Flow) map[string]any {
	return map[string]any{
		"answers": flow.Answers, "tasks": flow.Tasks,
		"currentPage": flow.CurrentPage, "status": flow.Status,
	}
}

func (store *MySQL) CreateFlow(ctx context.Context, flowClassID, targetID, actorID string) (domain.Flow, error) {
	flowClass, err := store.GetFlowClass(ctx, flowClassID)
	if err != nil {
		return domain.Flow{}, err
	}
	var lectureID, sessionID any
	if flowClass.Type == "session_main" {
		if _, err := store.GetSession(ctx, targetID, actorID, true); err != nil {
			return domain.Flow{}, err
		}
		sessionID = targetID
	} else {
		if _, err := store.GetLecture(ctx, targetID, actorID, true); err != nil {
			return domain.Flow{}, err
		}
		lectureID = targetID
	}
	flow := domain.Flow{ID: newID(), FlowClassID: flowClassID, TargetID: targetID, Type: flowClass.Type,
		Text: flowClass.Text, FormatVersion: flowClass.FormatVersion, Answers: map[string]string{}, Tasks: map[string]bool{},
		CurrentPage: 0, Status: "active", Revision: 1, CreatedAt: store.now(), UpdatedAt: store.now()}
	answers, _ := encodeJSON(flow.Answers)
	tasks, _ := encodeJSON(flow.Tasks)
	tx, err := store.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.Flow{}, err
	}
	defer tx.Rollback()
	_, err = tx.ExecContext(ctx, `INSERT INTO flows (id, flow_class_id, lecture_id, session_id, text, format_version,
		answers, tasks, current_page, status, revision, created_by, updated_by, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, flow.ID, flow.FlowClassID, lectureID, sessionID,
		flow.Text, flow.FormatVersion, answers, tasks, flow.CurrentPage, flow.Status, flow.Revision, actorID, actorID, flow.CreatedAt, flow.UpdatedAt)
	if err != nil {
		return domain.Flow{}, fmt.Errorf("create flow: %w", err)
	}
	if err := recordEvents(ctx, tx, "flow", flow.ID, actorID, map[string]any{}, map[string]any{
		"flowClassId": flow.FlowClassID, "targetId": flow.TargetID, "text": flow.Text, "formatVersion": flow.FormatVersion}, flow.CreatedAt); err != nil {
		return domain.Flow{}, err
	}
	if err := tx.Commit(); err != nil {
		return domain.Flow{}, err
	}
	return store.GetFlow(ctx, flow.ID)
}

func (store *MySQL) GetFlow(ctx context.Context, id string) (domain.Flow, error) {
	flow, err := scanFlow(store.db.QueryRowContext(ctx, "SELECT "+flowColumns+" FROM flows f JOIN flow_classes fc ON fc.id=f.flow_class_id WHERE f.id=?", id))
	if errors.Is(err, sql.ErrNoRows) {
		return domain.Flow{}, ErrNotFound
	}
	if err != nil {
		return domain.Flow{}, fmt.Errorf("get flow: %w", err)
	}
	return flow, nil
}

func (store *MySQL) ListFlows(ctx context.Context, targetID, status string) ([]domain.Flow, error) {
	query := "SELECT " + flowColumns + " FROM flows f JOIN flow_classes fc ON fc.id=f.flow_class_id WHERE 1=1"
	args := make([]any, 0, 2)
	if targetID != "" {
		query += " AND COALESCE(f.lecture_id, f.session_id)=?"
		args = append(args, targetID)
	}
	if status != "" {
		query += " AND f.status=?"
		args = append(args, status)
	}
	query += " ORDER BY f.updated_at DESC, f.id"
	rows, err := store.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list flows: %w", err)
	}
	defer rows.Close()
	flows := make([]domain.Flow, 0)
	for rows.Next() {
		flow, err := scanFlow(rows)
		if err != nil {
			return nil, err
		}
		flows = append(flows, flow)
	}
	return flows, rows.Err()
}

func (store *MySQL) UpdateFlow(ctx context.Context, flow domain.Flow, expectedRevision int, actorID string) (domain.Flow, error) {
	before, err := store.GetFlow(ctx, flow.ID)
	if err != nil {
		return domain.Flow{}, err
	}
	answers, err := encodeJSON(flow.Answers)
	if err != nil {
		return domain.Flow{}, err
	}
	tasks, err := encodeJSON(flow.Tasks)
	if err != nil {
		return domain.Flow{}, err
	}
	now := store.now()
	tx, err := store.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.Flow{}, err
	}
	defer tx.Rollback()
	result, err := tx.ExecContext(ctx, `UPDATE flows SET answers=?, tasks=?, current_page=?, status=?,
		revision=revision+1, updated_by=?, updated_at=? WHERE id=? AND revision=?`, answers, tasks, flow.CurrentPage,
		flow.Status, actorID, now, flow.ID, expectedRevision)
	if err != nil {
		return domain.Flow{}, fmt.Errorf("update flow: %w", err)
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return domain.Flow{}, ErrConflict
	}
	if err := recordEvents(ctx, tx, "flow", flow.ID, actorID, flowProgressSnapshot(before), flowProgressSnapshot(flow), now); err != nil {
		return domain.Flow{}, err
	}
	if err := tx.Commit(); err != nil {
		return domain.Flow{}, err
	}
	return store.GetFlow(ctx, flow.ID)
}
