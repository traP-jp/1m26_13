package flow

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
)

type Checkbox struct {
	PageIndex int
	Index     int
	Text      string
	Checked   bool
}

type Document struct {
	PageCount  int
	Checkboxes []Checkbox
	InputKeys  []string
}

var (
	inputPattern    = regexp.MustCompile(`^\{\{\s*(?:edit\s+)?([a-z][a-zA-Z0-9_.-]*)\s*\}\}$`)
	checkboxPattern = regexp.MustCompile(`^- \[([ xX])\](?:\{#[a-z][a-z0-9-]{0,63}\})?\s+(.+)$`)
	valuePattern    = regexp.MustCompile(`\[\[\s*([a-z][a-zA-Z0-9_.-]*)\s*\]\]`)
)

func Parse(text, flowType string) (Document, error) {
	text = strings.ReplaceAll(text, "\r\n", "\n")
	if strings.TrimSpace(text) == "" {
		return Document{}, errors.New("flow text is empty")
	}
	pages := strings.Split(text, "\n---\n")
	document := Document{PageCount: len(pages), Checkboxes: []Checkbox{}}
	seenInputs := map[string]bool{}
	for pageIndex, page := range pages {
		lines := strings.Split(strings.TrimSpace(page), "\n")
		if len(lines) == 0 || !strings.HasPrefix(strings.TrimSpace(lines[0]), "# ") {
			return Document{}, fmt.Errorf("page %d must start with an H1 heading", pageIndex+1)
		}
		fence, checkboxIndex := "", 0
		for _, raw := range lines[1:] {
			line := strings.TrimSpace(raw)
			if strings.HasPrefix(line, "```") {
				if fence == "" {
					if line == "```copy" {
						fence = "copy"
					} else {
						fence = "code"
					}
				} else {
					fence = ""
				}
				continue
			}
			if fence == "code" {
				continue
			}
			if fence == "copy" {
				if err := validateValues(line, flowType); err != nil {
					return Document{}, err
				}
				continue
			}
			if matches := inputPattern.FindStringSubmatch(line); len(matches) > 0 {
				key := matches[1]
				if !allowedInput(key, flowType) {
					return Document{}, fmt.Errorf("input %q is not allowed in %s", key, flowType)
				}
				if seenInputs[key] {
					return Document{}, fmt.Errorf("input %q is duplicated", key)
				}
				seenInputs[key] = true
				document.InputKeys = append(document.InputKeys, key)
				continue
			}
			if strings.HasPrefix(line, "- [") {
				matches := checkboxPattern.FindStringSubmatch(line)
				if len(matches) == 0 {
					return Document{}, fmt.Errorf("invalid checkbox: %s", line)
				}
				document.Checkboxes = append(document.Checkboxes, Checkbox{PageIndex: pageIndex, Index: checkboxIndex, Text: matches[2], Checked: strings.TrimSpace(matches[1]) != ""})
				checkboxIndex++
			}
			if err := validateValues(line, flowType); err != nil {
				return Document{}, err
			}
		}
		if fence != "" {
			return Document{}, fmt.Errorf("page %d has an unclosed code fence", pageIndex+1)
		}
	}
	return document, nil
}

func SetCheckbox(text, flowType string, pageIndex, checkboxIndex int, checked bool, expectedText string) (string, error) {
	if _, err := Parse(text, flowType); err != nil {
		return "", err
	}
	pages := strings.Split(strings.ReplaceAll(text, "\r\n", "\n"), "\n---\n")
	if pageIndex < 0 || pageIndex >= len(pages) || checkboxIndex < 0 {
		return "", errors.New("checkbox is out of range")
	}
	lines, current := strings.Split(pages[pageIndex], "\n"), 0
	for index, raw := range lines {
		indent := raw[:len(raw)-len(strings.TrimLeft(raw, " \t"))]
		matches := checkboxPattern.FindStringSubmatch(strings.TrimSpace(raw))
		if len(matches) == 0 {
			continue
		}
		if current != checkboxIndex {
			current++
			continue
		}
		if expectedText != "" && matches[2] != expectedText {
			return "", errors.New("checkbox text changed")
		}
		marker := " "
		if checked {
			marker = "x"
		}
		line := strings.TrimSpace(raw)
		line = line[:3] + marker + line[4:]
		lines[index] = indent + line
		pages[pageIndex] = strings.Join(lines, "\n")
		return strings.Join(pages, "\n---\n"), nil
	}
	return "", errors.New("checkbox is out of range")
}

func allowedInput(key, flowType string) bool {
	if flowType == "session_main" {
		return sessionKeys[key]
	}
	return lectureKeys[key]
}

func allowedValue(key, flowType string) bool {
	if lectureKeys[key] {
		return true
	}
	return flowType == "session_main" && sessionKeys[key]
}

var lectureKeys = map[string]bool{
	"lecture.name": true, "lecture.description": true, "lecture.academicYearStart": true,
	"lecture.academicYearEnd": true, "lecture.fieldId": true, "lecture.organizer": true,
	"lecture.targetAudience": true, "lecture.isIntroductory": true, "lecture.traqChannelId": true,
	"lecture.material": true, "lecture.resources": true, "lecture.relations": true,
}

var sessionKeys = map[string]bool{
	"session.name": true, "session.description": true, "session.date": true,
	"session.startTime": true, "session.location": true, "session.knoqUrl": true,
	"session.instructorId": true, "session.material": true, "session.resources": true,
	"session.replayOfSessionIds": true, "session.status": true,
}

func validateValues(line, flowType string) error {
	for _, matches := range valuePattern.FindAllStringSubmatch(line, -1) {
		if !allowedValue(matches[1], flowType) {
			return fmt.Errorf("value %q is not allowed in %s", matches[1], flowType)
		}
	}
	return nil
}
