package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"reflect"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/traP-jp/1m26_13/backend/internal/domain"
)

func decodeValue[T any](value any) (T, error) {
	var result T
	raw, err := json.Marshal(value)
	if err != nil {
		return result, err
	}
	if err := json.Unmarshal(raw, &result); err != nil {
		return result, err
	}
	return result, nil
}

func validResource(resource *domain.Resource) bool {
	if resource == nil {
		return true
	}
	if utf8.RuneCountInString(resource.Title) > 120 || len(resource.URL) > 2048 {
		return false
	}
	parsed, err := url.ParseRequestURI(resource.URL)
	return err == nil && (parsed.Scheme == "http" || parsed.Scheme == "https") && parsed.Host != ""
}

func flowClassTx(ctx context.Context, tx *sql.Tx, id, expectedType string) (domain.FlowClass, error) {
	var value domain.FlowClass
	err := tx.QueryRowContext(ctx, "SELECT "+flowClassColumns+" FROM flow_classes WHERE id=?", id).Scan(
		&value.ID, &value.Name, &value.Type, &value.Text, &value.FormatVersion, &value.Listed,
		&value.Revision, &value.CreatedAt, &value.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return value, ErrNotFound
	}
	if err != nil {
		return value, err
	}
	if value.Type != expectedType {
		return value, fmt.Errorf("%w: expected %s FlowClass", ErrInvalid, expectedType)
	}
	return value, nil
}

func insertFlowTx(ctx context.Context, tx *sql.Tx, class domain.FlowClass, lectureID, sessionID, actorID string, now time.Time) (domain.Flow, error) {
	targetID, lectureValue, sessionValue := lectureID, any(lectureID), any(nil)
	if sessionID != "" {
		targetID, lectureValue, sessionValue = sessionID, nil, sessionID
	}
	flow := domain.Flow{ID: newID(), FlowClassID: class.ID, TargetID: targetID, Type: class.Type,
		Text: class.Text, FormatVersion: class.FormatVersion, CurrentPage: 0, Revision: 1, CreatedAt: now, UpdatedAt: now}
	_, err := tx.ExecContext(ctx, `INSERT INTO flows
		(id, flow_class_id, flow_type, lecture_id, session_id, text, format_version, answers, tasks, current_page,
		status, revision, created_by, updated_by, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, '{}', '{}', 0, 'active', 1, ?, ?, ?, ?)`,
		flow.ID, flow.FlowClassID, flow.Type, lectureValue, sessionValue, flow.Text, flow.FormatVersion,
		actorID, actorID, now, now)
	if err != nil {
		return domain.Flow{}, fmt.Errorf("insert flow: %w", err)
	}
	if err := recordEvents(ctx, tx, "flow", flow.ID, actorID, map[string]any{}, map[string]any{
		"flowClassId": flow.FlowClassID, "targetId": flow.TargetID, "text": flow.Text}, now); err != nil {
		return domain.Flow{}, err
	}
	return flow, nil
}

func (store *MySQL) CreateLectureWorkspace(ctx context.Context, input LectureCreate, actorID string) (domain.LectureWorkspace, error) {
	if strings.TrimSpace(input.Name) == "" || input.AcademicYearStart > input.AcademicYearEnd {
		return domain.LectureWorkspace{}, ErrInvalid
	}
	tx, err := store.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.LectureWorkspace{}, err
	}
	defer tx.Rollback()
	pre, err := flowClassTx(ctx, tx, input.LecturePreFlowClassID, "lecture_pre")
	if err != nil {
		return domain.LectureWorkspace{}, err
	}
	main, err := flowClassTx(ctx, tx, input.SessionMainFlowClassID, "session_main")
	if err != nil {
		return domain.LectureWorkspace{}, err
	}
	post, err := flowClassTx(ctx, tx, input.LecturePostFlowClassID, "lecture_post")
	if err != nil {
		return domain.LectureWorkspace{}, err
	}
	now := store.now()
	result, err := tx.ExecContext(ctx, `INSERT INTO lectures
		(name, description, academic_year_start, academic_year_end, organizer_group_ids, organizer_user_ids,
		contact_group_ids, contact_user_ids, target_audience, is_introductory, resources, revision,
		created_by, updated_by, created_at, updated_at)
		VALUES (?, '', ?, ?, '[]', '[]', '[]', '[]', '', FALSE, '[]', 1, ?, ?, ?, ?)`,
		strings.TrimSpace(input.Name), input.AcademicYearStart, input.AcademicYearEnd, actorID, actorID, now, now)
	if err != nil {
		return domain.LectureWorkspace{}, fmt.Errorf("insert lecture: %w", err)
	}
	lectureNumber, err := result.LastInsertId()
	if err != nil {
		return domain.LectureWorkspace{}, err
	}
	lectureID := strconv.FormatInt(lectureNumber, 10)
	sessionResult, err := tx.ExecContext(ctx, `INSERT INTO sessions
		(lecture_id, name, description, display_order, location, instructor_ids, resources,
		replay_of_session_ids, status, revision, created_by, updated_by, created_at, updated_at)
		VALUES (?, '第1回', '', 0, '', '[]', '[]', '[]', 'draft', 1, ?, ?, ?, ?)`,
		lectureID, actorID, actorID, now, now)
	if err != nil {
		return domain.LectureWorkspace{}, fmt.Errorf("insert first session: %w", err)
	}
	sessionNumber, err := sessionResult.LastInsertId()
	if err != nil {
		return domain.LectureWorkspace{}, err
	}
	sessionID := strconv.FormatInt(sessionNumber, 10)
	if _, err := insertFlowTx(ctx, tx, pre, lectureID, "", actorID, now); err != nil {
		return domain.LectureWorkspace{}, err
	}
	if _, err := insertFlowTx(ctx, tx, main, "", sessionID, actorID, now); err != nil {
		return domain.LectureWorkspace{}, err
	}
	if _, err := insertFlowTx(ctx, tx, post, lectureID, "", actorID, now); err != nil {
		return domain.LectureWorkspace{}, err
	}
	if err := recordEvents(ctx, tx, "lecture", lectureID, actorID, map[string]any{}, map[string]any{"name": strings.TrimSpace(input.Name)}, now); err != nil {
		return domain.LectureWorkspace{}, err
	}
	if err := recordEvents(ctx, tx, "session", sessionID, actorID, map[string]any{}, map[string]any{"name": "第1回", "order": 0, "status": "draft"}, now); err != nil {
		return domain.LectureWorkspace{}, err
	}
	if err := tx.Commit(); err != nil {
		return domain.LectureWorkspace{}, err
	}
	return store.GetLectureWorkspace(ctx, lectureID, actorID)
}

func (store *MySQL) GetLectureWorkspace(ctx context.Context, lectureID, actorID string) (domain.LectureWorkspace, error) {
	lecture, err := store.GetLecture(ctx, lectureID, actorID, true)
	if err != nil {
		return domain.LectureWorkspace{}, err
	}
	flows, err := store.ListFlows(ctx, "lecture", lectureID)
	if err != nil {
		return domain.LectureWorkspace{}, err
	}
	for _, session := range lecture.Sessions {
		sessionFlows, err := store.ListFlows(ctx, "session", session.ID)
		if err != nil {
			return domain.LectureWorkspace{}, err
		}
		flows = append(flows, sessionFlows...)
	}
	counts := map[string]int{}
	for _, flow := range flows {
		counts[flow.Type+":"+flow.TargetID]++
	}
	if counts["lecture_pre:"+lectureID] != 1 || counts["lecture_post:"+lectureID] != 1 {
		return domain.LectureWorkspace{}, ErrIncompleteWorkspace
	}
	for _, session := range lecture.Sessions {
		if counts["session_main:"+session.ID] != 1 {
			return domain.LectureWorkspace{}, ErrIncompleteWorkspace
		}
	}
	return domain.LectureWorkspace{Lecture: lecture, Flows: flows}, nil
}

func lectureForUpdate(ctx context.Context, tx *sql.Tx, id string) (domain.Lecture, error) {
	lecture, err := scanLecture(tx.QueryRowContext(ctx, "SELECT "+lectureColumns+" FROM lectures WHERE id=? FOR UPDATE", id))
	if errors.Is(err, sql.ErrNoRows) {
		return domain.Lecture{}, ErrNotFound
	}
	if err != nil {
		return domain.Lecture{}, err
	}
	rows, err := tx.QueryContext(ctx, "SELECT to_lecture_id, relation_type FROM lecture_relations WHERE from_lecture_id=? ORDER BY relation_type, to_lecture_id", id)
	if err != nil {
		return domain.Lecture{}, err
	}
	defer rows.Close()
	for rows.Next() {
		var relation domain.Relation
		if err := rows.Scan(&relation.ToLectureID, &relation.Type); err != nil {
			return domain.Lecture{}, err
		}
		lecture.Relations = append(lecture.Relations, relation)
	}
	return lecture, rows.Err()
}

func compareBase[T any](base any, current T, hasBase bool) bool {
	if !hasBase {
		return false
	}
	normalized, err := decodeValue[T](base)
	return err != nil || !reflect.DeepEqual(normalized, current)
}

func (store *MySQL) PatchLectureAttribute(ctx context.Context, id, path string, baseValue, nextValue any, hasBase bool, actorID string) (domain.Lecture, bool, error) {
	tx, err := store.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.Lecture{}, false, err
	}
	defer tx.Rollback()
	before, err := lectureForUpdate(ctx, tx, id)
	if err != nil {
		return domain.Lecture{}, false, err
	}
	var current, next any
	var conflict bool
	switch path {
	case "name", "description", "fieldId", "targetAudience", "traqChannelId":
		value, err := decodeValue[string](nextValue)
		if err != nil || (path == "name" && strings.TrimSpace(value) == "") {
			return domain.Lecture{}, false, ErrInvalid
		}
		value = strings.TrimSpace(value)
		limits := map[string]int{"name": 200, "description": 10000, "fieldId": 64, "targetAudience": 2000, "traqChannelId": 64}
		if utf8.RuneCountInString(value) > limits[path] {
			return domain.Lecture{}, false, ErrInvalid
		}
		var old string
		switch path {
		case "name":
			old = before.Name
		case "description":
			old = before.Description
		case "fieldId":
			old = before.FieldID
		case "targetAudience":
			old = before.TargetAudience
		default:
			old = before.TraQChannelID
		}
		current, next, conflict = old, value, compareBase(baseValue, old, hasBase)
	case "academicYearStart", "academicYearEnd":
		value, err := decodeValue[int](nextValue)
		if err != nil || value < 2000 || value > 2200 {
			return domain.Lecture{}, false, ErrInvalid
		}
		old := before.AcademicYearStart
		if path == "academicYearEnd" {
			old = before.AcademicYearEnd
		}
		if (path == "academicYearStart" && value > before.AcademicYearEnd) || (path == "academicYearEnd" && value < before.AcademicYearStart) {
			return domain.Lecture{}, false, ErrInvalid
		}
		current, next, conflict = old, value, compareBase(baseValue, old, hasBase)
	case "isIntroductory":
		value, err := decodeValue[bool](nextValue)
		if err != nil {
			return domain.Lecture{}, false, ErrInvalid
		}
		current, next, conflict = before.IsIntroductory, value, compareBase(baseValue, before.IsIntroductory, hasBase)
	case "organizer":
		value, err := decodeValue[*domain.Organizer](nextValue)
		if err != nil || (value != nil && (value.ID == "" || (value.Kind != "user" && value.Kind != "group"))) {
			return domain.Lecture{}, false, ErrInvalid
		}
		if value != nil && (len(value.ID) > 64 || utf8.RuneCountInString(value.GroupName) > 200) {
			return domain.Lecture{}, false, ErrInvalid
		}
		if value != nil && value.Kind != "group" {
			value.GroupName = ""
		}
		current, next, conflict = before.Organizer, value, compareBase(baseValue, before.Organizer, hasBase)
	case "material":
		value, err := decodeValue[*domain.Resource](nextValue)
		if err != nil || !validResource(value) {
			return domain.Lecture{}, false, ErrInvalid
		}
		current, next, conflict = before.Material, value, compareBase(baseValue, before.Material, hasBase)
	case "resources":
		value, err := decodeValue[[]domain.Resource](nextValue)
		if err != nil || len(value) > 100 {
			return domain.Lecture{}, false, ErrInvalid
		}
		for i := range value {
			if !validResource(&value[i]) {
				return domain.Lecture{}, false, ErrInvalid
			}
		}
		current, next, conflict = before.Resources, value, compareBase(baseValue, before.Resources, hasBase)
	case "relations":
		value, err := decodeValue[[]domain.Relation](nextValue)
		if err != nil || len(value) > 200 {
			return domain.Lecture{}, false, ErrInvalid
		}
		seen := map[string]bool{}
		for _, relation := range value {
			key := relation.ToLectureID + ":" + relation.Type
			if relation.ToLectureID == id || seen[key] || (relation.Type != "prerequisite" && relation.Type != "previous_year" && relation.Type != "recommended_next") {
				return domain.Lecture{}, false, ErrInvalid
			}
			seen[key] = true
		}
		current, next, conflict = before.Relations, value, compareBase(baseValue, before.Relations, hasBase)
	default:
		return domain.Lecture{}, false, ErrInvalid
	}
	if reflect.DeepEqual(current, next) {
		if err := tx.Commit(); err != nil {
			return domain.Lecture{}, false, err
		}
		return before, conflict, nil
	}
	now := store.now()
	var result sql.Result
	switch path {
	case "name", "description", "targetAudience":
		column := map[string]string{"name": "name", "description": "description", "targetAudience": "target_audience"}[path]
		result, err = tx.ExecContext(ctx, "UPDATE lectures SET "+column+"=?, revision=revision+1, updated_by=?, updated_at=? WHERE id=?", next, actorID, now, id)
	case "fieldId", "traqChannelId":
		column := map[string]string{"fieldId": "field_id", "traqChannelId": "traq_channel_id"}[path]
		result, err = tx.ExecContext(ctx, "UPDATE lectures SET "+column+"=?, revision=revision+1, updated_by=?, updated_at=? WHERE id=?", nullable(next.(string)), actorID, now, id)
	case "academicYearStart", "academicYearEnd":
		column := map[string]string{"academicYearStart": "academic_year_start", "academicYearEnd": "academic_year_end"}[path]
		result, err = tx.ExecContext(ctx, "UPDATE lectures SET "+column+"=?, revision=revision+1, updated_by=?, updated_at=? WHERE id=?", next, actorID, now, id)
	case "isIntroductory":
		result, err = tx.ExecContext(ctx, "UPDATE lectures SET is_introductory=?, revision=revision+1, updated_by=?, updated_at=? WHERE id=?", next, actorID, now, id)
	case "organizer":
		organizer := next.(*domain.Organizer)
		if organizer == nil {
			result, err = tx.ExecContext(ctx, "UPDATE lectures SET organizer_type=NULL, organizer_id=NULL, organizer_group_name=NULL, revision=revision+1, updated_by=?, updated_at=? WHERE id=?", actorID, now, id)
		} else {
			result, err = tx.ExecContext(ctx, "UPDATE lectures SET organizer_type=?, organizer_id=?, organizer_group_name=?, revision=revision+1, updated_by=?, updated_at=? WHERE id=?", organizer.Kind, organizer.ID, nullable(organizer.GroupName), actorID, now, id)
		}
	case "material", "resources":
		var value any
		if path == "material" && next == nil {
			value = nil
		} else {
			value, err = encodeJSON(next)
			if err != nil {
				return domain.Lecture{}, false, err
			}
		}
		result, err = tx.ExecContext(ctx, "UPDATE lectures SET "+path+"=?, revision=revision+1, updated_by=?, updated_at=? WHERE id=?", value, actorID, now, id)
	case "relations":
		if _, err = tx.ExecContext(ctx, "DELETE FROM lecture_relations WHERE from_lecture_id=?", id); err == nil {
			err = insertRelations(ctx, tx, id, next.([]domain.Relation), now)
		}
		if err == nil {
			result, err = tx.ExecContext(ctx, "UPDATE lectures SET revision=revision+1, updated_by=?, updated_at=? WHERE id=?", actorID, now, id)
		}
	}
	if err != nil {
		return domain.Lecture{}, false, err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return domain.Lecture{}, false, ErrNotFound
	}
	if err := recordEvents(ctx, tx, "lecture", id, actorID, map[string]any{path: current}, map[string]any{path: next}, now); err != nil {
		return domain.Lecture{}, false, err
	}
	if err := tx.Commit(); err != nil {
		return domain.Lecture{}, false, err
	}
	updated, err := store.GetLecture(ctx, id, actorID, true)
	return updated, conflict, err
}

func sessionForUpdate(ctx context.Context, tx *sql.Tx, id string) (domain.Session, error) {
	query := `SELECT id, lecture_id, name, description, display_order,
		COALESCE(DATE_FORMAT(session_date, '%Y-%m-%d'), ''), COALESCE(TIME_FORMAT(start_time, '%H:%i'), ''),
		location, COALESCE(knoq_url, ''), instructor_id, instructor_ids, material, resources, replay_of_session_ids,
		status, revision, created_at, updated_at FROM sessions WHERE id=? FOR UPDATE`
	session, err := scanSession(tx.QueryRowContext(ctx, query, id))
	if errors.Is(err, sql.ErrNoRows) {
		return domain.Session{}, ErrNotFound
	}
	return session, err
}

func validateReplayTx(ctx context.Context, tx *sql.Tx, lectureID, sessionID string, sourceIDs []string) error {
	seen := map[string]bool{}
	for _, sourceID := range sourceIDs {
		if sourceID == sessionID || seen[sourceID] {
			return ErrInvalid
		}
		seen[sourceID] = true
		var owner string
		var replayCount int
		err := tx.QueryRowContext(ctx, "SELECT lecture_id, JSON_LENGTH(replay_of_session_ids) FROM sessions WHERE id=?", sourceID).Scan(&owner, &replayCount)
		if err != nil || owner != lectureID || replayCount > 0 {
			return ErrInvalid
		}
	}
	return nil
}

func insertSessionTx(ctx context.Context, tx *sql.Tx, session domain.Session, actorID string, now time.Time) (domain.Session, error) {
	var material any
	var err error
	if session.Material != nil {
		material, err = encodeJSON(session.Material)
		if err != nil {
			return session, err
		}
	}
	resources, err := encodeJSON(session.Resources)
	if err != nil {
		return session, err
	}
	replay, err := encodeJSON(session.ReplayOfSessionIDs)
	if err != nil {
		return session, err
	}
	legacyInstructors := "[]"
	if session.InstructorID != "" {
		legacyInstructors, _ = encodeJSON([]string{session.InstructorID})
	}
	result, err := tx.ExecContext(ctx, `INSERT INTO sessions
		(lecture_id,name,description,display_order,session_date,start_time,location,knoq_url,instructor_id,
		instructor_ids,material,resources,replay_of_session_ids,status,revision,created_by,updated_by,created_at,updated_at)
		VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,?,?)`,
		session.LectureID, session.Name, session.Description, session.Order, nullable(session.Date), nullable(session.StartTime),
		session.Location, nullable(session.KnoQURL), nullable(session.InstructorID), legacyInstructors, material, resources,
		replay, session.Status, actorID, actorID, now, now)
	if err != nil {
		return session, err
	}
	number, err := result.LastInsertId()
	if err != nil {
		return session, err
	}
	session.ID, session.Revision, session.CreatedAt, session.UpdatedAt = strconv.FormatInt(number, 10), 1, now, now
	return session, nil
}

func (store *MySQL) CreateSessionWorkspace(ctx context.Context, lectureID string, input SessionCreate, actorID string) (domain.SessionCreateResult, error) {
	if input.Mode != "empty" && input.Mode != "duplicate" {
		return domain.SessionCreateResult{}, ErrInvalid
	}
	tx, err := store.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.SessionCreateResult{}, err
	}
	defer tx.Rollback()
	if _, err := lectureForUpdate(ctx, tx, lectureID); err != nil {
		return domain.SessionCreateResult{}, err
	}
	class, err := flowClassTx(ctx, tx, input.FlowClassID, "session_main")
	if err != nil {
		return domain.SessionCreateResult{}, err
	}
	var nextOrder int
	if err := tx.QueryRowContext(ctx, "SELECT COALESCE(MAX(display_order), -1)+1 FROM sessions WHERE lecture_id=?", lectureID).Scan(&nextOrder); err != nil {
		return domain.SessionCreateResult{}, err
	}
	session := domain.Session{LectureID: lectureID, Name: fmt.Sprintf("第%d回", nextOrder+1), Order: nextOrder,
		Resources: []domain.Resource{}, ReplayOfSessionIDs: append([]string{}, input.ReplayOfSessionIDs...), Status: "draft"}
	if input.Mode == "duplicate" {
		if input.SourceSessionID == "" {
			return domain.SessionCreateResult{}, ErrInvalid
		}
		source, err := sessionForUpdate(ctx, tx, input.SourceSessionID)
		if err != nil || source.LectureID != lectureID {
			return domain.SessionCreateResult{}, ErrInvalid
		}
		session.Name, session.Description, session.Date, session.StartTime, session.Location = source.Name, source.Description, source.Date, source.StartTime, source.Location
		session.KnoQURL, session.InstructorID, session.Material = source.KnoQURL, source.InstructorID, source.Material
		session.Resources = append([]domain.Resource{}, source.Resources...)
	}
	if err := validateReplayTx(ctx, tx, lectureID, "", session.ReplayOfSessionIDs); err != nil {
		return domain.SessionCreateResult{}, err
	}
	now := store.now()
	session, err = insertSessionTx(ctx, tx, session, actorID, now)
	if err != nil {
		return domain.SessionCreateResult{}, err
	}
	flow, err := insertFlowTx(ctx, tx, class, "", session.ID, actorID, now)
	if err != nil {
		return domain.SessionCreateResult{}, err
	}
	if err := recordEvents(ctx, tx, "session", session.ID, actorID, map[string]any{}, sessionSnapshot(session), now); err != nil {
		return domain.SessionCreateResult{}, err
	}
	if err := tx.Commit(); err != nil {
		return domain.SessionCreateResult{}, err
	}
	workspace, err := store.GetLectureWorkspace(ctx, lectureID, actorID)
	if err != nil {
		return domain.SessionCreateResult{}, err
	}
	created, err := store.GetSession(ctx, session.ID, actorID, true)
	if err != nil {
		return domain.SessionCreateResult{}, err
	}
	createdFlow, err := store.GetFlow(ctx, flow.ID)
	return domain.SessionCreateResult{Workspace: workspace, Session: created, Flow: createdFlow}, err
}

func (store *MySQL) PatchSessionAttribute(ctx context.Context, id, path string, baseValue, nextValue any, hasBase bool, actorID string) (domain.Session, bool, error) {
	tx, err := store.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.Session{}, false, err
	}
	defer tx.Rollback()
	before, err := sessionForUpdate(ctx, tx, id)
	if err != nil {
		return domain.Session{}, false, err
	}
	var current, next any
	var conflict bool
	switch path {
	case "name", "description", "date", "startTime", "location", "knoqUrl", "instructorId", "status":
		value, err := decodeValue[string](nextValue)
		if err != nil || (path == "name" && strings.TrimSpace(value) == "") || (path == "status" && value != "draft" && value != "published") {
			return domain.Session{}, false, ErrInvalid
		}
		limits := map[string]int{"name": 200, "description": 10000, "date": 10, "startTime": 5, "location": 1000, "knoqUrl": 2048, "instructorId": 64, "status": 9}
		if utf8.RuneCountInString(value) > limits[path] {
			return domain.Session{}, false, ErrInvalid
		}
		if path == "knoqUrl" && value != "" && !validResource(&domain.Resource{URL: value}) {
			return domain.Session{}, false, ErrInvalid
		}
		if path == "date" && value != "" {
			if _, err := time.Parse("2006-01-02", value); err != nil {
				return domain.Session{}, false, ErrInvalid
			}
		}
		if path == "startTime" && value != "" {
			if _, err := time.Parse("15:04", value); err != nil || before.Date == "" {
				return domain.Session{}, false, ErrInvalid
			}
		}
		if path == "date" && value == "" && before.StartTime != "" {
			return domain.Session{}, false, ErrInvalid
		}
		var old string
		switch path {
		case "name":
			old = before.Name
		case "description":
			old = before.Description
		case "date":
			old = before.Date
		case "startTime":
			old = before.StartTime
		case "location":
			old = before.Location
		case "knoqUrl":
			old = before.KnoQURL
		case "instructorId":
			old = before.InstructorID
		default:
			old = before.Status
		}
		current, next, conflict = old, strings.TrimSpace(value), compareBase(baseValue, old, hasBase)
	case "material":
		value, err := decodeValue[*domain.Resource](nextValue)
		if err != nil || !validResource(value) {
			return domain.Session{}, false, ErrInvalid
		}
		current, next, conflict = before.Material, value, compareBase(baseValue, before.Material, hasBase)
	case "resources":
		value, err := decodeValue[[]domain.Resource](nextValue)
		if err != nil || len(value) > 100 {
			return domain.Session{}, false, ErrInvalid
		}
		for i := range value {
			if !validResource(&value[i]) {
				return domain.Session{}, false, ErrInvalid
			}
		}
		current, next, conflict = before.Resources, value, compareBase(baseValue, before.Resources, hasBase)
	case "replayOfSessionIds":
		value, err := decodeValue[[]string](nextValue)
		if err != nil || validateReplayTx(ctx, tx, before.LectureID, before.ID, value) != nil {
			return domain.Session{}, false, ErrInvalid
		}
		current, next, conflict = before.ReplayOfSessionIDs, value, compareBase(baseValue, before.ReplayOfSessionIDs, hasBase)
	default:
		return domain.Session{}, false, ErrInvalid
	}
	if reflect.DeepEqual(current, next) {
		if err := tx.Commit(); err != nil {
			return domain.Session{}, false, err
		}
		return before, conflict, nil
	}
	now := store.now()
	column := map[string]string{"name": "name", "description": "description", "date": "session_date", "startTime": "start_time",
		"location": "location", "knoqUrl": "knoq_url", "instructorId": "instructor_id", "status": "status",
		"material": "material", "resources": "resources", "replayOfSessionIds": "replay_of_session_ids"}[path]
	value := next
	if path == "date" || path == "startTime" || path == "knoqUrl" || path == "instructorId" {
		value = nullable(next.(string))
	}
	if path == "material" || path == "resources" || path == "replayOfSessionIds" {
		if path == "material" && next == nil {
			value = nil
		} else {
			raw, err := encodeJSON(next)
			if err != nil {
				return domain.Session{}, false, err
			}
			value = raw
		}
	}
	result, err := tx.ExecContext(ctx, "UPDATE sessions SET "+column+"=?, revision=revision+1, updated_by=?, updated_at=? WHERE id=?", value, actorID, now, id)
	if err != nil {
		return domain.Session{}, false, err
	}
	if affected, _ := result.RowsAffected(); affected == 0 {
		return domain.Session{}, false, ErrNotFound
	}
	if err := recordEvents(ctx, tx, "session", id, actorID, map[string]any{path: current}, map[string]any{path: next}, now); err != nil {
		return domain.Session{}, false, err
	}
	if err := tx.Commit(); err != nil {
		return domain.Session{}, false, err
	}
	updated, err := store.GetSession(ctx, id, actorID, true)
	return updated, conflict, err
}

func (store *MySQL) ReorderSessions(ctx context.Context, lectureID string, items []SessionOrderItem, actorID string) ([]domain.Session, error) {
	tx, err := store.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	rows, err := tx.QueryContext(ctx, "SELECT id, display_order, replay_of_session_ids FROM sessions WHERE lecture_id=? ORDER BY display_order,id FOR UPDATE", lectureID)
	if err != nil {
		return nil, err
	}
	before := map[string]int{}
	replayByID := map[string][]string{}
	for rows.Next() {
		var id string
		var order int
		var raw []byte
		if err := rows.Scan(&id, &order, &raw); err != nil {
			return nil, err
		}
		before[id] = order
		replayByID[id], err = decodeJSON(raw, []string{})
		if err != nil {
			return nil, err
		}
	}
	rows.Close()
	if len(before) != len(items) {
		return nil, ErrInvalid
	}
	seen := map[string]bool{}
	orderByID := map[string]int{}
	normalOrders := map[int]bool{}
	for _, item := range items {
		if _, ok := before[item.SessionID]; !ok || seen[item.SessionID] || item.Order < 0 {
			return nil, ErrInvalid
		}
		seen[item.SessionID] = true
		orderByID[item.SessionID] = item.Order
		if len(replayByID[item.SessionID]) == 0 {
			if normalOrders[item.Order] {
				return nil, ErrInvalid
			}
			normalOrders[item.Order] = true
		}
	}
	for id, sources := range replayByID {
		for _, sourceID := range sources {
			if orderByID[id] != orderByID[sourceID] {
				return nil, ErrInvalid
			}
		}
	}
	if _, err = tx.ExecContext(ctx, "UPDATE sessions SET display_order=display_order+1000000 WHERE lecture_id=?", lectureID); err != nil {
		return nil, err
	}
	now, changeSet := store.now(), newID()
	for _, item := range items {
		if _, err = tx.ExecContext(ctx, "UPDATE sessions SET display_order=?, revision=revision+1, updated_by=?, updated_at=? WHERE id=?", item.Order, actorID, now, item.SessionID); err != nil {
			return nil, err
		}
		if err := recordEventsInChangeSet(ctx, tx, "session", item.SessionID, actorID, map[string]any{"order": before[item.SessionID]}, map[string]any{"order": item.Order}, now, changeSet); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	lecture, err := store.GetLecture(ctx, lectureID, actorID, true)
	return lecture.Sessions, err
}
