package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/traP-jp/1m26_13/backend/internal/domain"
)

type scanner interface{ Scan(...any) error }

const lectureColumns = `id, name, description, academic_year_start, academic_year_end, field_id,
	organizer_group_ids, organizer_user_ids, contact_group_ids, contact_user_ids, target_audience,
	is_introductory, traq_channel_id, resources, revision, created_at, updated_at`

func scanLecture(row scanner) (domain.Lecture, error) {
	var lecture domain.Lecture
	var fieldID, channelID sql.NullString
	var organizerGroups, organizerUsers, contactGroups, contactUsers, resources []byte
	err := row.Scan(&lecture.ID, &lecture.Name, &lecture.Description, &lecture.AcademicYearStart,
		&lecture.AcademicYearEnd, &fieldID, &organizerGroups, &organizerUsers, &contactGroups,
		&contactUsers, &lecture.TargetAudience, &lecture.IsIntroductory, &channelID, &resources,
		&lecture.Revision, &lecture.CreatedAt, &lecture.UpdatedAt)
	if err != nil {
		return domain.Lecture{}, err
	}
	lecture.FieldID, lecture.TraQChannelID = fieldID.String, channelID.String
	var decodeErr error
	if lecture.OrganizerGroupIDs, decodeErr = decodeJSON(organizerGroups, []string{}); decodeErr != nil {
		return domain.Lecture{}, decodeErr
	}
	if lecture.OrganizerUserIDs, decodeErr = decodeJSON(organizerUsers, []string{}); decodeErr != nil {
		return domain.Lecture{}, decodeErr
	}
	if lecture.ContactGroupIDs, decodeErr = decodeJSON(contactGroups, []string{}); decodeErr != nil {
		return domain.Lecture{}, decodeErr
	}
	if lecture.ContactUserIDs, decodeErr = decodeJSON(contactUsers, []string{}); decodeErr != nil {
		return domain.Lecture{}, decodeErr
	}
	if lecture.Resources, decodeErr = decodeJSON(resources, []domain.Resource{}); decodeErr != nil {
		return domain.Lecture{}, decodeErr
	}
	return lecture, nil
}

func lectureSnapshot(lecture domain.Lecture) map[string]any {
	return map[string]any{
		"name": lecture.Name, "description": lecture.Description,
		"academicYearStart": lecture.AcademicYearStart, "academicYearEnd": lecture.AcademicYearEnd,
		"fieldId": lecture.FieldID, "organizerGroupIds": lecture.OrganizerGroupIDs,
		"organizerUserIds": lecture.OrganizerUserIDs, "contactGroupIds": lecture.ContactGroupIDs,
		"contactUserIds": lecture.ContactUserIDs, "targetAudience": lecture.TargetAudience,
		"isIntroductory": lecture.IsIntroductory, "traqChannelId": lecture.TraQChannelID,
		"resources": lecture.Resources, "relations": lecture.Relations,
	}
}

func (store *MySQL) ListLectures(ctx context.Context, filter LectureFilter, userID string) ([]domain.Lecture, error) {
	query := "SELECT l.id FROM lectures l WHERE 1=1"
	args := make([]any, 0)
	if !filter.IncludeDraft {
		query += " AND EXISTS (SELECT 1 FROM sessions s WHERE s.lecture_id = l.id AND s.status = 'published' AND JSON_LENGTH(s.replay_of_session_ids) = 0)"
	}
	for _, word := range strings.Fields(strings.TrimSpace(filter.Query)) {
		query += " AND (l.name LIKE ? OR l.description LIKE ?)"
		pattern := "%" + word + "%"
		args = append(args, pattern, pattern)
	}
	if filter.Year != 0 {
		query += " AND l.academic_year_start <= ? AND l.academic_year_end >= ?"
		args = append(args, filter.Year, filter.Year)
	}
	if filter.FieldID != "" {
		query += " AND l.field_id = ?"
		args = append(args, filter.FieldID)
	}
	query += " ORDER BY l.updated_at DESC, l.id LIMIT 200"
	rows, err := store.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list lecture ids: %w", err)
	}
	ids := make([]string, 0)
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return nil, err
		}
		ids = append(ids, id)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	result := make([]domain.Lecture, 0, len(ids))
	for _, id := range ids {
		lecture, err := store.GetLecture(ctx, id, userID, filter.IncludeDraft)
		if err != nil {
			return nil, err
		}
		result = append(result, lecture)
	}
	return result, nil
}

func (store *MySQL) GetLecture(ctx context.Context, id, userID string, includeDraft bool) (domain.Lecture, error) {
	condition := ""
	if !includeDraft {
		condition = " AND EXISTS (SELECT 1 FROM sessions ps WHERE ps.lecture_id = lectures.id AND ps.status = 'published' AND JSON_LENGTH(ps.replay_of_session_ids) = 0)"
	}
	lecture, err := scanLecture(store.db.QueryRowContext(ctx, "SELECT "+lectureColumns+" FROM lectures WHERE id = ?"+condition, id))
	if errors.Is(err, sql.ErrNoRows) {
		return domain.Lecture{}, ErrNotFound
	}
	if err != nil {
		return domain.Lecture{}, fmt.Errorf("get lecture: %w", err)
	}

	relationRows, err := store.db.QueryContext(ctx, `SELECT to_lecture_id, relation_type FROM lecture_relations
		WHERE from_lecture_id = ? ORDER BY relation_type, to_lecture_id`, id)
	if err != nil {
		return domain.Lecture{}, err
	}
	lecture.Relations = make([]domain.Relation, 0)
	for relationRows.Next() {
		var relation domain.Relation
		if err := relationRows.Scan(&relation.ToLectureID, &relation.Type); err != nil {
			relationRows.Close()
			return domain.Lecture{}, err
		}
		lecture.Relations = append(lecture.Relations, relation)
	}
	if err := relationRows.Close(); err != nil {
		return domain.Lecture{}, err
	}

	query := `SELECT id, lecture_id, name, description, display_order,
		COALESCE(DATE_FORMAT(session_date, '%Y-%m-%d'), ''), COALESCE(TIME_FORMAT(start_time, '%H:%i'), ''),
		location, COALESCE(knoq_url, ''), instructor_ids, resources, replay_of_session_ids, status,
		revision, created_at, updated_at FROM sessions WHERE lecture_id = ?`
	if !includeDraft {
		query += " AND status = 'published' AND JSON_LENGTH(replay_of_session_ids) = 0"
	}
	query += " ORDER BY display_order, id"
	rows, err := store.db.QueryContext(ctx, query, id)
	if err != nil {
		return domain.Lecture{}, err
	}
	lecture.Sessions = make([]domain.Session, 0)
	for rows.Next() {
		session, err := scanSession(rows)
		if err != nil {
			rows.Close()
			return domain.Lecture{}, err
		}
		if userID != "" {
			_ = store.db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM session_completions WHERE user_id = ? AND session_id = ?)", userID, session.ID).Scan(&session.IsCompleted)
		}
		lecture.Sessions = append(lecture.Sessions, session)
	}
	if err := rows.Close(); err != nil {
		return domain.Lecture{}, err
	}
	return lecture, nil
}

func encodeLecture(lecture domain.Lecture) ([]any, error) {
	values := []any{lecture.Name, lecture.Description, lecture.AcademicYearStart, lecture.AcademicYearEnd, nullable(lecture.FieldID)}
	for _, value := range []any{lecture.OrganizerGroupIDs, lecture.OrganizerUserIDs, lecture.ContactGroupIDs, lecture.ContactUserIDs} {
		encoded, err := encodeJSON(value)
		if err != nil {
			return nil, err
		}
		values = append(values, encoded)
	}
	values = append(values, lecture.TargetAudience, lecture.IsIntroductory, nullable(lecture.TraQChannelID))
	resources, err := encodeJSON(lecture.Resources)
	if err != nil {
		return nil, err
	}
	return append(values, resources), nil
}

func insertRelations(ctx context.Context, tx *sql.Tx, lectureID string, relations []domain.Relation, now time.Time) error {
	for _, relation := range relations {
		if relation.ToLectureID == lectureID {
			return fmt.Errorf("%w: lecture relation cannot reference itself", ErrInvalid)
		}
		var targetExists bool
		if err := tx.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM lectures WHERE id = ?)", relation.ToLectureID).Scan(&targetExists); err != nil {
			return err
		}
		if !targetExists {
			return fmt.Errorf("%w: related lecture not found", ErrInvalid)
		}
		_, err := tx.ExecContext(ctx, `INSERT INTO lecture_relations
			(from_lecture_id, to_lecture_id, relation_type, created_at) VALUES (?, ?, ?, ?)`, lectureID, relation.ToLectureID, relation.Type, now)
		if err != nil {
			return fmt.Errorf("insert lecture relation: %w", err)
		}
	}
	return nil
}

func (store *MySQL) CreateLecture(ctx context.Context, lecture domain.Lecture, actorID string) (domain.Lecture, error) {
	lecture.ID, lecture.Revision, lecture.CreatedAt, lecture.UpdatedAt = newID(), 1, store.now(), store.now()
	values, err := encodeLecture(lecture)
	if err != nil {
		return domain.Lecture{}, err
	}
	tx, err := store.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.Lecture{}, err
	}
	defer tx.Rollback()
	args := append([]any{lecture.ID}, values...)
	args = append(args, lecture.Revision, actorID, actorID, lecture.CreatedAt, lecture.UpdatedAt)
	_, err = tx.ExecContext(ctx, `INSERT INTO lectures (id, name, description, academic_year_start, academic_year_end,
		field_id, organizer_group_ids, organizer_user_ids, contact_group_ids, contact_user_ids, target_audience,
		is_introductory, traq_channel_id, resources, revision, created_by, updated_by, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, args...)
	if err != nil {
		return domain.Lecture{}, fmt.Errorf("create lecture: %w", err)
	}
	if err := insertRelations(ctx, tx, lecture.ID, lecture.Relations, lecture.CreatedAt); err != nil {
		return domain.Lecture{}, err
	}
	if err := recordEvents(ctx, tx, "lecture", lecture.ID, actorID, map[string]any{}, lectureSnapshot(lecture), lecture.CreatedAt); err != nil {
		return domain.Lecture{}, err
	}
	if err := tx.Commit(); err != nil {
		return domain.Lecture{}, err
	}
	return store.GetLecture(ctx, lecture.ID, actorID, true)
}

func (store *MySQL) UpdateLecture(ctx context.Context, lecture domain.Lecture, expectedRevision int, actorID string) (domain.Lecture, error) {
	before, err := store.GetLecture(ctx, lecture.ID, actorID, true)
	if err != nil {
		return domain.Lecture{}, err
	}
	values, err := encodeLecture(lecture)
	if err != nil {
		return domain.Lecture{}, err
	}
	now := store.now()
	tx, err := store.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.Lecture{}, err
	}
	defer tx.Rollback()
	args := append(values, actorID, now, lecture.ID, expectedRevision)
	result, err := tx.ExecContext(ctx, `UPDATE lectures SET name=?, description=?, academic_year_start=?, academic_year_end=?,
		field_id=?, organizer_group_ids=?, organizer_user_ids=?, contact_group_ids=?, contact_user_ids=?, target_audience=?,
		is_introductory=?, traq_channel_id=?, resources=?, revision=revision+1, updated_by=?, updated_at=? WHERE id=? AND revision=?`, args...)
	if err != nil {
		return domain.Lecture{}, fmt.Errorf("update lecture: %w", err)
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return domain.Lecture{}, ErrConflict
	}
	if _, err := tx.ExecContext(ctx, "DELETE FROM lecture_relations WHERE from_lecture_id = ?", lecture.ID); err != nil {
		return domain.Lecture{}, err
	}
	if err := insertRelations(ctx, tx, lecture.ID, lecture.Relations, now); err != nil {
		return domain.Lecture{}, err
	}
	if err := recordEvents(ctx, tx, "lecture", lecture.ID, actorID, lectureSnapshot(before), lectureSnapshot(lecture), now); err != nil {
		return domain.Lecture{}, err
	}
	if err := tx.Commit(); err != nil {
		return domain.Lecture{}, err
	}
	return store.GetLecture(ctx, lecture.ID, actorID, true)
}

func scanSession(row scanner) (domain.Session, error) {
	var session domain.Session
	var instructors, resources, replay []byte
	err := row.Scan(&session.ID, &session.LectureID, &session.Name, &session.Description, &session.Order,
		&session.Date, &session.StartTime, &session.Location, &session.KnoQURL, &instructors, &resources,
		&replay, &session.Status, &session.Revision, &session.CreatedAt, &session.UpdatedAt)
	if err != nil {
		return domain.Session{}, err
	}
	var decodeErr error
	if session.InstructorIDs, decodeErr = decodeJSON(instructors, []string{}); decodeErr != nil {
		return domain.Session{}, decodeErr
	}
	if session.Resources, decodeErr = decodeJSON(resources, []domain.Resource{}); decodeErr != nil {
		return domain.Session{}, decodeErr
	}
	if session.ReplayOfSessionIDs, decodeErr = decodeJSON(replay, []string{}); decodeErr != nil {
		return domain.Session{}, decodeErr
	}
	return session, nil
}

func sessionSnapshot(session domain.Session) map[string]any {
	return map[string]any{"name": session.Name, "description": session.Description, "order": session.Order,
		"date": session.Date, "startTime": session.StartTime, "location": session.Location, "knoqUrl": session.KnoQURL,
		"instructorIds": session.InstructorIDs, "resources": session.Resources,
		"replayOfSessionIds": session.ReplayOfSessionIDs, "status": session.Status}
}

func (store *MySQL) GetSession(ctx context.Context, id, userID string, includeDraft bool) (domain.Session, error) {
	query := `SELECT id, lecture_id, name, description, display_order,
		COALESCE(DATE_FORMAT(session_date, '%Y-%m-%d'), ''), COALESCE(TIME_FORMAT(start_time, '%H:%i'), ''),
		location, COALESCE(knoq_url, ''), instructor_ids, resources, replay_of_session_ids, status,
		revision, created_at, updated_at FROM sessions WHERE id = ?`
	if !includeDraft {
		query += " AND status = 'published'"
	}
	session, err := scanSession(store.db.QueryRowContext(ctx, query, id))
	if errors.Is(err, sql.ErrNoRows) {
		return domain.Session{}, ErrNotFound
	}
	if err != nil {
		return domain.Session{}, fmt.Errorf("get session: %w", err)
	}
	if userID != "" {
		_ = store.db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM session_completions WHERE user_id = ? AND session_id = ?)", userID, id).Scan(&session.IsCompleted)
	}
	return session, nil
}

func encodeSession(session domain.Session) ([]any, error) {
	instructors, err := encodeJSON(session.InstructorIDs)
	if err != nil {
		return nil, err
	}
	resources, err := encodeJSON(session.Resources)
	if err != nil {
		return nil, err
	}
	replay, err := encodeJSON(session.ReplayOfSessionIDs)
	if err != nil {
		return nil, err
	}
	return []any{session.Name, session.Description, session.Order, nullable(session.Date), nullable(session.StartTime),
		session.Location, nullable(session.KnoQURL), instructors, resources, replay, session.Status}, nil
}

func (store *MySQL) validateReplay(ctx context.Context, session domain.Session) error {
	seen := make(map[string]bool)
	for _, sourceID := range session.ReplayOfSessionIDs {
		if sourceID == session.ID || seen[sourceID] {
			return fmt.Errorf("%w: invalid replay source", ErrInvalid)
		}
		seen[sourceID] = true
		var lectureID string
		var replayCount int
		err := store.db.QueryRowContext(ctx, "SELECT lecture_id, JSON_LENGTH(replay_of_session_ids) FROM sessions WHERE id = ?", sourceID).Scan(&lectureID, &replayCount)
		if errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("%w: replay source not found", ErrInvalid)
		}
		if err != nil {
			return err
		}
		if lectureID != session.LectureID || replayCount > 0 {
			return fmt.Errorf("%w: replay source must be a normal session in the same lecture", ErrInvalid)
		}
	}
	return nil
}

func (store *MySQL) CreateSession(ctx context.Context, session domain.Session, actorID string) (domain.Session, error) {
	if _, err := store.GetLecture(ctx, session.LectureID, actorID, true); err != nil {
		return domain.Session{}, err
	}
	session.ID, session.Revision, session.CreatedAt, session.UpdatedAt = newID(), 1, store.now(), store.now()
	if err := store.validateReplay(ctx, session); err != nil {
		return domain.Session{}, err
	}
	values, err := encodeSession(session)
	if err != nil {
		return domain.Session{}, err
	}
	tx, err := store.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.Session{}, err
	}
	defer tx.Rollback()
	args := append([]any{session.ID, session.LectureID}, values...)
	args = append(args, session.Revision, actorID, actorID, session.CreatedAt, session.UpdatedAt)
	_, err = tx.ExecContext(ctx, `INSERT INTO sessions (id, lecture_id, name, description, display_order, session_date,
		start_time, location, knoq_url, instructor_ids, resources, replay_of_session_ids, status, revision,
		created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, args...)
	if err != nil {
		return domain.Session{}, fmt.Errorf("create session: %w", err)
	}
	if err := recordEvents(ctx, tx, "session", session.ID, actorID, map[string]any{}, sessionSnapshot(session), session.CreatedAt); err != nil {
		return domain.Session{}, err
	}
	if err := tx.Commit(); err != nil {
		return domain.Session{}, err
	}
	return store.GetSession(ctx, session.ID, actorID, true)
}

func (store *MySQL) UpdateSession(ctx context.Context, session domain.Session, expectedRevision int, actorID string) (domain.Session, error) {
	before, err := store.GetSession(ctx, session.ID, actorID, true)
	if err != nil {
		return domain.Session{}, err
	}
	session.LectureID = before.LectureID
	if err := store.validateReplay(ctx, session); err != nil {
		return domain.Session{}, err
	}
	values, err := encodeSession(session)
	if err != nil {
		return domain.Session{}, err
	}
	now := store.now()
	tx, err := store.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.Session{}, err
	}
	defer tx.Rollback()
	args := append(values, actorID, now, session.ID, expectedRevision)
	result, err := tx.ExecContext(ctx, `UPDATE sessions SET name=?, description=?, display_order=?, session_date=?,
		start_time=?, location=?, knoq_url=?, instructor_ids=?, resources=?, replay_of_session_ids=?, status=?,
		revision=revision+1, updated_by=?, updated_at=? WHERE id=? AND revision=?`, args...)
	if err != nil {
		return domain.Session{}, fmt.Errorf("update session: %w", err)
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return domain.Session{}, ErrConflict
	}
	if err := recordEvents(ctx, tx, "session", session.ID, actorID, sessionSnapshot(before), sessionSnapshot(session), now); err != nil {
		return domain.Session{}, err
	}
	if err := tx.Commit(); err != nil {
		return domain.Session{}, err
	}
	return store.GetSession(ctx, session.ID, actorID, true)
}
