package store

import (
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/traP-jp/1m26_13/backend/internal/domain"
)

const (
	defaultLecturePageSize  = 24
	maxLecturePageSize      = 100
	lectureCursorTimeLayout = "2006-01-02 15:04:05.000000"
)

type lectureCursor struct {
	UpdatedAt string `json:"updatedAt"`
	ID        uint64 `json:"id"`
}

type scanner interface{ Scan(...any) error }

const lectureColumns = `id, name, description, academic_year_start, academic_year_end, field_id,
	organizer_type, organizer_id, organizer_group_name, organizer_group_ids, organizer_user_ids,
	contact_group_ids, contact_user_ids, target_audience, is_introductory, traq_channel_id, material,
	resources, revision, created_at, updated_at`

func scanLecture(row scanner) (domain.Lecture, error) {
	var lecture domain.Lecture
	var fieldID, channelID, organizerType, organizerID, organizerGroupName sql.NullString
	var organizerGroups, organizerUsers, contactGroups, contactUsers, material, resources []byte
	err := row.Scan(&lecture.ID, &lecture.Name, &lecture.Description, &lecture.AcademicYearStart,
		&lecture.AcademicYearEnd, &fieldID, &organizerType, &organizerID, &organizerGroupName,
		&organizerGroups, &organizerUsers, &contactGroups, &contactUsers, &lecture.TargetAudience,
		&lecture.IsIntroductory, &channelID, &material, &resources,
		&lecture.Revision, &lecture.CreatedAt, &lecture.UpdatedAt)
	if err != nil {
		return domain.Lecture{}, err
	}
	lecture.FieldID, lecture.TraQChannelID = fieldID.String, channelID.String
	if organizerType.Valid && organizerID.Valid {
		lecture.Organizer = &domain.Organizer{Kind: organizerType.String, ID: organizerID.String, GroupName: organizerGroupName.String}
	}
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
	if len(material) > 0 {
		var value domain.Resource
		if err := json.Unmarshal(material, &value); err != nil {
			return domain.Lecture{}, fmt.Errorf("decode material: %w", err)
		}
		lecture.Material = &value
	}
	return lecture, nil
}

func lectureSnapshot(lecture domain.Lecture) map[string]any {
	return map[string]any{
		"name": lecture.Name, "description": lecture.Description,
		"academicYearStart": lecture.AcademicYearStart, "academicYearEnd": lecture.AcademicYearEnd,
		"fieldId": lecture.FieldID, "organizer": lecture.Organizer, "targetAudience": lecture.TargetAudience,
		"isIntroductory": lecture.IsIntroductory, "traqChannelId": lecture.TraQChannelID,
		"material": lecture.Material, "resources": lecture.Resources, "relations": lecture.Relations,
	}
}

func lecturePageSize(value int) (int, error) {
	if value == 0 {
		return defaultLecturePageSize, nil
	}
	if value < 1 || value > maxLecturePageSize {
		return 0, ErrInvalid
	}
	return value, nil
}

func encodeLectureCursor(lecture domain.Lecture) (string, error) {
	id, err := strconv.ParseUint(lecture.ID, 10, 64)
	if err != nil || id == 0 {
		return "", ErrInvalid
	}
	value, err := json.Marshal(lectureCursor{
		UpdatedAt: lecture.UpdatedAt.Format(lectureCursorTimeLayout),
		ID:        id,
	})
	if err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(value), nil
}

func decodeLectureCursor(value string) (lectureCursor, error) {
	decoded, err := base64.RawURLEncoding.DecodeString(value)
	if err != nil {
		return lectureCursor{}, ErrInvalid
	}
	var cursor lectureCursor
	if err := json.Unmarshal(decoded, &cursor); err != nil {
		return lectureCursor{}, ErrInvalid
	}
	if _, err := time.Parse(lectureCursorTimeLayout, cursor.UpdatedAt); err != nil {
		return lectureCursor{}, ErrInvalid
	}
	if cursor.ID == 0 {
		return lectureCursor{}, ErrInvalid
	}
	return cursor, nil
}

func queryValues(values []string) ([]any, string) {
	args := make([]any, 0, len(values))
	for _, value := range values {
		args = append(args, value)
	}
	return args, strings.TrimSuffix(strings.Repeat("?,", len(values)), ",")
}

func (store *MySQL) hydrateLecturePage(ctx context.Context, lectures []domain.Lecture, includeDraft bool, userID string) error {
	if len(lectures) == 0 {
		return nil
	}
	ids := make([]string, 0, len(lectures))
	lectureIndexes := make(map[string]int, len(lectures))
	for index := range lectures {
		lectures[index].Relations = []domain.Relation{}
		lectures[index].Sessions = []domain.Session{}
		ids = append(ids, lectures[index].ID)
		lectureIndexes[lectures[index].ID] = index
	}
	idArgs, placeholders := queryValues(ids)

	relationRows, err := store.db.QueryContext(ctx, `SELECT from_lecture_id, to_lecture_id, relation_type
		FROM lecture_relations WHERE from_lecture_id IN (`+placeholders+`)
		ORDER BY from_lecture_id, relation_type, to_lecture_id`, idArgs...)
	if err != nil {
		return fmt.Errorf("list lecture relations: %w", err)
	}
	for relationRows.Next() {
		var lectureID string
		var relation domain.Relation
		if err := relationRows.Scan(&lectureID, &relation.ToLectureID, &relation.Type); err != nil {
			relationRows.Close()
			return err
		}
		if index, ok := lectureIndexes[lectureID]; ok {
			lectures[index].Relations = append(lectures[index].Relations, relation)
		}
	}
	if err := relationRows.Err(); err != nil {
		relationRows.Close()
		return err
	}
	if err := relationRows.Close(); err != nil {
		return err
	}

	sessionQuery := `SELECT id, lecture_id, name, description, display_order,
		COALESCE(DATE_FORMAT(session_date, '%Y-%m-%d'), ''), COALESCE(TIME_FORMAT(start_time, '%H:%i'), ''),
		location, COALESCE(knoq_url, ''), instructor_id, instructor_ids, material, resources, replay_of_session_ids, status,
		revision, created_at, updated_at FROM sessions WHERE lecture_id IN (` + placeholders + `)`
	if !includeDraft {
		sessionQuery += " AND status = 'published'"
	}
	sessionQuery += " ORDER BY lecture_id, display_order, JSON_LENGTH(replay_of_session_ids), id"
	sessionRows, err := store.db.QueryContext(ctx, sessionQuery, idArgs...)
	if err != nil {
		return fmt.Errorf("list lecture sessions: %w", err)
	}
	type sessionLocation struct{ lecture, session int }
	sessionLocations := make(map[string]sessionLocation)
	sessionIDs := make([]string, 0)
	for sessionRows.Next() {
		session, err := scanSession(sessionRows)
		if err != nil {
			sessionRows.Close()
			return err
		}
		lectureIndex, ok := lectureIndexes[session.LectureID]
		if !ok {
			continue
		}
		lectures[lectureIndex].Sessions = append(lectures[lectureIndex].Sessions, session)
		sessionIndex := len(lectures[lectureIndex].Sessions) - 1
		sessionLocations[session.ID] = sessionLocation{lecture: lectureIndex, session: sessionIndex}
		sessionIDs = append(sessionIDs, session.ID)
	}
	if err := sessionRows.Err(); err != nil {
		sessionRows.Close()
		return err
	}
	if err := sessionRows.Close(); err != nil {
		return err
	}

	if userID == "" || len(sessionIDs) == 0 {
		return nil
	}
	completionArgs, completionPlaceholders := queryValues(sessionIDs)
	completionArgs = append([]any{userID}, completionArgs...)
	completionRows, err := store.db.QueryContext(ctx, `SELECT session_id FROM session_completions
		WHERE user_id = ? AND session_id IN (`+completionPlaceholders+`)`, completionArgs...)
	if err != nil {
		return fmt.Errorf("list lecture completions: %w", err)
	}
	for completionRows.Next() {
		var sessionID string
		if err := completionRows.Scan(&sessionID); err != nil {
			completionRows.Close()
			return err
		}
		if location, ok := sessionLocations[sessionID]; ok {
			lectures[location.lecture].Sessions[location.session].IsCompleted = true
		}
	}
	if err := completionRows.Err(); err != nil {
		completionRows.Close()
		return err
	}
	return completionRows.Close()
}

func (store *MySQL) ListLectures(ctx context.Context, filter LectureFilter, userID string) (domain.LecturePage, error) {
	limit, err := lecturePageSize(filter.Limit)
	if err != nil {
		return domain.LecturePage{}, err
	}
	var cursor lectureCursor
	if filter.Cursor != "" {
		cursor, err = decodeLectureCursor(filter.Cursor)
		if err != nil {
			return domain.LecturePage{}, err
		}
	}

	query := "SELECT " + lectureColumns + " FROM lectures l WHERE 1=1"
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
	if filter.Cursor != "" {
		query += " AND (l.updated_at < ? OR (l.updated_at = ? AND l.id < ?))"
		args = append(args, cursor.UpdatedAt, cursor.UpdatedAt, cursor.ID)
	}
	query += " ORDER BY l.updated_at DESC, l.id DESC LIMIT ?"
	args = append(args, limit+1)
	rows, err := store.db.QueryContext(ctx, query, args...)
	if err != nil {
		return domain.LecturePage{}, fmt.Errorf("list lectures: %w", err)
	}
	lectures := make([]domain.Lecture, 0, limit+1)
	for rows.Next() {
		lecture, err := scanLecture(rows)
		if err != nil {
			rows.Close()
			return domain.LecturePage{}, err
		}
		lectures = append(lectures, lecture)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return domain.LecturePage{}, err
	}
	if err := rows.Close(); err != nil {
		return domain.LecturePage{}, err
	}
	page := domain.LecturePage{Items: lectures}
	if len(page.Items) > limit {
		page.Items = page.Items[:limit]
		page.NextCursor, err = encodeLectureCursor(page.Items[len(page.Items)-1])
		if err != nil {
			return domain.LecturePage{}, err
		}
	}
	if err := store.hydrateLecturePage(ctx, page.Items, filter.IncludeDraft, userID); err != nil {
		return domain.LecturePage{}, err
	}
	return page, nil
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

	lectures := []domain.Lecture{lecture}
	if err := store.hydrateLecturePage(ctx, lectures, includeDraft, userID); err != nil {
		return domain.Lecture{}, err
	}
	return lectures[0], nil
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
	lecture.Revision, lecture.CreatedAt, lecture.UpdatedAt = 1, store.now(), store.now()
	values, err := encodeLecture(lecture)
	if err != nil {
		return domain.Lecture{}, err
	}
	tx, err := store.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.Lecture{}, err
	}
	defer tx.Rollback()
	args := append(values, lecture.Revision, actorID, actorID, lecture.CreatedAt, lecture.UpdatedAt)
	result, err := tx.ExecContext(ctx, `INSERT INTO lectures (name, description, academic_year_start, academic_year_end,
		field_id, organizer_group_ids, organizer_user_ids, contact_group_ids, contact_user_ids, target_audience,
		is_introductory, traq_channel_id, resources, revision, created_by, updated_by, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, args...)
	if err != nil {
		return domain.Lecture{}, fmt.Errorf("create lecture: %w", err)
	}
	insertedID, err := result.LastInsertId()
	if err != nil {
		return domain.Lecture{}, fmt.Errorf("read lecture id: %w", err)
	}
	lecture.ID = strconv.FormatInt(insertedID, 10)
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
	var instructorID sql.NullString
	var instructors, material, resources, replay []byte
	err := row.Scan(&session.ID, &session.LectureID, &session.Name, &session.Description, &session.Order,
		&session.Date, &session.StartTime, &session.Location, &session.KnoQURL, &instructorID, &instructors, &material, &resources,
		&replay, &session.Status, &session.Revision, &session.CreatedAt, &session.UpdatedAt)
	if err != nil {
		return domain.Session{}, err
	}
	var decodeErr error
	if session.InstructorIDs, decodeErr = decodeJSON(instructors, []string{}); decodeErr != nil {
		return domain.Session{}, decodeErr
	}
	session.InstructorID = instructorID.String
	if len(material) > 0 {
		var value domain.Resource
		if err := json.Unmarshal(material, &value); err != nil {
			return domain.Session{}, fmt.Errorf("decode material: %w", err)
		}
		session.Material = &value
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
		"instructorId": session.InstructorID, "material": session.Material, "resources": session.Resources,
		"replayOfSessionIds": session.ReplayOfSessionIDs, "status": session.Status}
}

func (store *MySQL) GetSession(ctx context.Context, id, userID string, includeDraft bool) (domain.Session, error) {
	query := `SELECT id, lecture_id, name, description, display_order,
		COALESCE(DATE_FORMAT(session_date, '%Y-%m-%d'), ''), COALESCE(TIME_FORMAT(start_time, '%H:%i'), ''),
		location, COALESCE(knoq_url, ''), instructor_id, instructor_ids, material, resources, replay_of_session_ids, status,
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
	if len(session.ReplayOfSessionIDs) == 0 {
		var count int
		query := `SELECT COUNT(*) FROM sessions WHERE lecture_id = ? AND display_order = ?
			AND JSON_LENGTH(replay_of_session_ids) = 0`
		args := []any{session.LectureID, session.Order}
		if session.ID != "" {
			query += " AND id <> ?"
			args = append(args, session.ID)
		}
		if err := store.db.QueryRowContext(ctx, query, args...).Scan(&count); err != nil {
			return err
		}
		if count > 0 {
			return fmt.Errorf("%w: each lecture order may contain only one normal session", ErrInvalid)
		}
		return nil
	}
	seen := make(map[string]bool)
	for _, sourceID := range session.ReplayOfSessionIDs {
		if sourceID == session.ID || seen[sourceID] {
			return fmt.Errorf("%w: invalid replay source", ErrInvalid)
		}
		seen[sourceID] = true
		var lectureID string
		var replayCount, sourceOrder int
		err := store.db.QueryRowContext(ctx, "SELECT lecture_id, display_order, JSON_LENGTH(replay_of_session_ids) FROM sessions WHERE id = ?", sourceID).Scan(&lectureID, &sourceOrder, &replayCount)
		if errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("%w: replay source not found", ErrInvalid)
		}
		if err != nil {
			return err
		}
		if lectureID != session.LectureID || replayCount > 0 || sourceOrder != session.Order {
			return fmt.Errorf("%w: replay source must be a normal session in the same lecture and order", ErrInvalid)
		}
	}
	return nil
}

func (store *MySQL) CreateSession(ctx context.Context, session domain.Session, actorID string) (domain.Session, error) {
	if _, err := store.GetLecture(ctx, session.LectureID, actorID, true); err != nil {
		return domain.Session{}, err
	}
	session.Revision, session.CreatedAt, session.UpdatedAt = 1, store.now(), store.now()
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
	args := append([]any{session.LectureID}, values...)
	args = append(args, session.Revision, actorID, actorID, session.CreatedAt, session.UpdatedAt)
	result, err := tx.ExecContext(ctx, `INSERT INTO sessions (lecture_id, name, description, display_order, session_date,
		start_time, location, knoq_url, instructor_ids, resources, replay_of_session_ids, status, revision,
		created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, args...)
	if err != nil {
		return domain.Session{}, fmt.Errorf("create session: %w", err)
	}
	insertedID, err := result.LastInsertId()
	if err != nil {
		return domain.Session{}, fmt.Errorf("read session id: %w", err)
	}
	session.ID = strconv.FormatInt(insertedID, 10)
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
