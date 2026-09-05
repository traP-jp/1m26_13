package store

import (
	"strconv"
	"testing"
	"time"

	"github.com/traP-jp/1m26_13/backend/internal/domain"
)

func TestLectureCursorRoundTrip(t *testing.T) {
	lecture := domain.Lecture{
		ID:        "18446744073709551615",
		UpdatedAt: time.Date(2026, time.September, 5, 12, 34, 56, 789123000, time.UTC),
	}
	encoded, err := encodeLectureCursor(lecture)
	if err != nil {
		t.Fatal(err)
	}
	decoded, err := decodeLectureCursor(encoded)
	if err != nil {
		t.Fatal(err)
	}
	if strconv.FormatUint(decoded.ID, 10) != lecture.ID || decoded.UpdatedAt != "2026-09-05 12:34:56.789123" {
		t.Fatalf("decodeLectureCursor() = %#v", decoded)
	}
}

func TestLectureCursorRejectsInvalidValues(t *testing.T) {
	for _, value := range []string{"not-base64", "e30", "eyJ1cGRhdGVkQXQiOiIyMDI2LTA5LTA1IDEyOjM0OjU2LjAwMDAwMCIsImlkIjowfQ"} {
		if _, err := decodeLectureCursor(value); err == nil {
			t.Fatalf("decodeLectureCursor(%q) unexpectedly succeeded", value)
		}
	}
}

func TestLectureCursorRejectsNonNumericLectureID(t *testing.T) {
	_, err := encodeLectureCursor(domain.Lecture{ID: "not-numeric", UpdatedAt: time.Now()})
	if err == nil {
		t.Fatal("encodeLectureCursor() unexpectedly succeeded")
	}
}

func TestLecturePageSize(t *testing.T) {
	tests := []struct {
		input int
		want  int
		valid bool
	}{
		{input: 0, want: defaultLecturePageSize, valid: true},
		{input: 1, want: 1, valid: true},
		{input: maxLecturePageSize, want: maxLecturePageSize, valid: true},
		{input: -1, valid: false},
		{input: maxLecturePageSize + 1, valid: false},
	}
	for _, test := range tests {
		got, err := lecturePageSize(test.input)
		if test.valid && (err != nil || got != test.want) {
			t.Fatalf("lecturePageSize(%d) = %d, %v", test.input, got, err)
		}
		if !test.valid && err == nil {
			t.Fatalf("lecturePageSize(%d) unexpectedly succeeded", test.input)
		}
	}
}
