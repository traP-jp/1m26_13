package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/traP-jp/1m26_13/backend/internal/domain"
	flowparser "github.com/traP-jp/1m26_13/backend/internal/flow"
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

const flowColumns = `f.id, f.flow_class_id, COALESCE(f.lecture_id, f.session_id), f.flow_type, f.text,
	f.format_version, f.current_page, f.revision, f.created_at, f.updated_at`

func scanFlow(row scanner) (domain.Flow, error) {
	var flow domain.Flow
	err := row.Scan(&flow.ID, &flow.FlowClassID, &flow.TargetID, &flow.Type, &flow.Text, &flow.FormatVersion,
		&flow.CurrentPage, &flow.Revision, &flow.CreatedAt, &flow.UpdatedAt)
	return flow, err
}

func (store *MySQL) GetFlow(ctx context.Context, id string) (domain.Flow, error) {
	flow, err := scanFlow(store.db.QueryRowContext(ctx, "SELECT "+flowColumns+" FROM flows f WHERE f.id=?", id))
	if errors.Is(err, sql.ErrNoRows) {
		return domain.Flow{}, ErrNotFound
	}
	if err != nil {
		return domain.Flow{}, fmt.Errorf("get flow: %w", err)
	}
	return flow, nil
}

func (store *MySQL) ListFlows(ctx context.Context, targetType, targetID string) ([]domain.Flow, error) {
	column := "f.lecture_id"
	if targetType == "session" {
		column = "f.session_id"
	} else if targetType != "lecture" {
		return nil, ErrInvalid
	}
	query := "SELECT " + flowColumns + " FROM flows f WHERE " + column + "=?"
	args := []any{targetID}
	query += " ORDER BY FIELD(f.flow_type, 'lecture_pre', 'session_main', 'lecture_post'), f.id"
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

func scanFlowForUpdate(ctx context.Context, tx *sql.Tx, id string) (domain.Flow, error) {
	flow, err := scanFlow(tx.QueryRowContext(ctx, "SELECT "+flowColumns+" FROM flows f WHERE f.id=? FOR UPDATE", id))
	if errors.Is(err, sql.ErrNoRows) {
		return domain.Flow{}, ErrNotFound
	}
	return flow, err
}

func (store *MySQL) ReplaceFlowClass(ctx context.Context, flowID, flowClassID, actorID string) (domain.Flow, error) {
	tx, err := store.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.Flow{}, err
	}
	defer tx.Rollback()
	before, err := scanFlowForUpdate(ctx, tx, flowID)
	if err != nil {
		return domain.Flow{}, err
	}
	var flowClass domain.FlowClass
	err = tx.QueryRowContext(ctx, "SELECT "+flowClassColumns+" FROM flow_classes WHERE id=?", flowClassID).Scan(
		&flowClass.ID, &flowClass.Name, &flowClass.Type, &flowClass.Text, &flowClass.FormatVersion,
		&flowClass.Listed, &flowClass.Revision, &flowClass.CreatedAt, &flowClass.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return domain.Flow{}, ErrNotFound
	}
	if err != nil {
		return domain.Flow{}, err
	}
	if before.Type != flowClass.Type {
		return domain.Flow{}, fmt.Errorf("%w: flow class type does not match target", ErrInvalid)
	}
	now := store.now()
	_, err = tx.ExecContext(ctx, `UPDATE flows SET flow_class_id=?, text=?, format_version=?, current_page=0,
		revision=revision+1, updated_by=?, updated_at=? WHERE id=?`, flowClass.ID, flowClass.Text,
		flowClass.FormatVersion, actorID, now, flowID)
	if err != nil {
		return domain.Flow{}, err
	}
	after := before
	after.FlowClassID, after.Text, after.FormatVersion, after.CurrentPage = flowClass.ID, flowClass.Text, flowClass.FormatVersion, 0
	if err := recordEvents(ctx, tx, "flow", flowID, actorID,
		map[string]any{"flowClassId": before.FlowClassID, "text": before.Text, "currentPage": before.CurrentPage},
		map[string]any{"flowClassId": after.FlowClassID, "text": after.Text, "currentPage": after.CurrentPage}, now); err != nil {
		return domain.Flow{}, err
	}
	if err := tx.Commit(); err != nil {
		return domain.Flow{}, err
	}
	return store.GetFlow(ctx, flowID)
}

func (store *MySQL) PatchFlowCheck(ctx context.Context, flowID string, pageIndex, checkboxIndex int, checked bool, expectedText, actorID string) (domain.Flow, error) {
	tx, err := store.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.Flow{}, err
	}
	defer tx.Rollback()
	before, err := scanFlowForUpdate(ctx, tx, flowID)
	if err != nil {
		return domain.Flow{}, err
	}
	nextText, err := flowparser.SetCheckbox(before.Text, before.Type, pageIndex, checkboxIndex, checked, expectedText)
	if err != nil {
		return domain.Flow{}, fmt.Errorf("%w: %v", ErrInvalid, err)
	}
	if nextText == before.Text {
		return before, tx.Commit()
	}
	now := store.now()
	_, err = tx.ExecContext(ctx, `UPDATE flows SET text=?, revision=revision+1, updated_by=?, updated_at=? WHERE id=?`, nextText, actorID, now, flowID)
	if err != nil {
		return domain.Flow{}, err
	}
	path := fmt.Sprintf("checks.%d.%d", pageIndex, checkboxIndex)
	if err := recordEvents(ctx, tx, "flow", flowID, actorID, map[string]any{path: !checked}, map[string]any{path: checked}, now); err != nil {
		return domain.Flow{}, err
	}
	if err := tx.Commit(); err != nil {
		return domain.Flow{}, err
	}
	return store.GetFlow(ctx, flowID)
}

func (store *MySQL) UpdateFlowPage(ctx context.Context, flowID string, currentPage int, actorID string) (domain.Flow, error) {
	tx, err := store.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.Flow{}, err
	}
	defer tx.Rollback()
	before, err := scanFlowForUpdate(ctx, tx, flowID)
	if err != nil {
		return domain.Flow{}, err
	}
	document, err := flowparser.Parse(before.Text, before.Type)
	if err != nil || currentPage < 0 || currentPage >= document.PageCount {
		return domain.Flow{}, fmt.Errorf("%w: current page is out of range", ErrInvalid)
	}
	if currentPage == before.CurrentPage {
		return before, tx.Commit()
	}
	now := store.now()
	_, err = tx.ExecContext(ctx, `UPDATE flows SET current_page=?, revision=revision+1, updated_by=?, updated_at=? WHERE id=?`, currentPage, actorID, now, flowID)
	if err != nil {
		return domain.Flow{}, err
	}
	if err := recordEvents(ctx, tx, "flow", flowID, actorID, map[string]any{"currentPage": before.CurrentPage}, map[string]any{"currentPage": currentPage}, now); err != nil {
		return domain.Flow{}, err
	}
	if err := tx.Commit(); err != nil {
		return domain.Flow{}, err
	}
	return store.GetFlow(ctx, flowID)
}
