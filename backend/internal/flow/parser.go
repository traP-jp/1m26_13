package flow

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
)

type Document struct {
	PageCount int
	TaskKeys  []string
	InputKeys []string
}

var (
	inputPattern = regexp.MustCompile(`^\{\{\s*([a-z][a-zA-Z0-9_.-]*)\s*\}\}$`)
	taskPattern  = regexp.MustCompile(`^- \[ \]\{#([a-z][a-z0-9-]{0,63})\}\s+.+$`)
	valuePattern = regexp.MustCompile(`\[\[\s*([a-z][a-zA-Z0-9_.-]*)\s*\]\]`)
)

func Parse(text, flowType string) (Document, error) {
	text = strings.ReplaceAll(text, "\r\n", "\n")
	if strings.TrimSpace(text) == "" {
		return Document{}, errors.New("flow text is empty")
	}
	pages := strings.Split(text, "\n---\n")
	document := Document{PageCount: len(pages)}
	seenTasks, seenInputs := map[string]bool{}, map[string]bool{}
	for index, page := range pages {
		lines := strings.Split(strings.TrimSpace(page), "\n")
		if len(lines) == 0 || !strings.HasPrefix(strings.TrimSpace(lines[0]), "# ") {
			return Document{}, fmt.Errorf("page %d must start with an H1 heading", index+1)
		}
		fence := ""
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
			if strings.HasPrefix(line, "- [ ]") {
				matches := taskPattern.FindStringSubmatch(line)
				if len(matches) == 0 {
					return Document{}, fmt.Errorf("task must have a stable key: %s", line)
				}
				if seenTasks[matches[1]] {
					return Document{}, fmt.Errorf("task key %q is duplicated", matches[1])
				}
				seenTasks[matches[1]] = true
				document.TaskKeys = append(document.TaskKeys, matches[1])
			}
			if err := validateValues(line, flowType); err != nil {
				return Document{}, err
			}
		}
		if fence != "" {
			return Document{}, fmt.Errorf("page %d has an unclosed code fence", index+1)
		}
	}
	return document, nil
}

func allowedInput(key, flowType string) bool {
	if strings.HasPrefix(key, "answer.") {
		return len(strings.TrimPrefix(key, "answer.")) > 0
	}
	if flowType == "session_main" {
		return sessionKeys[key]
	}
	return lectureKeys[key]
}

func allowedValue(key, flowType string) bool {
	if strings.HasPrefix(key, "answer.") || lectureKeys[key] {
		return true
	}
	return flowType == "session_main" && sessionKeys[key]
}

var lectureKeys = map[string]bool{
	"lecture.name": true, "lecture.description": true, "lecture.targetAudience": true,
}

var sessionKeys = map[string]bool{
	"session.name": true, "session.description": true, "session.date": true,
	"session.startTime": true, "session.location": true,
}

func validateValues(line, flowType string) error {
	for _, matches := range valuePattern.FindAllStringSubmatch(line, -1) {
		if !allowedValue(matches[1], flowType) {
			return fmt.Errorf("value %q is not allowed in %s", matches[1], flowType)
		}
	}
	return nil
}
