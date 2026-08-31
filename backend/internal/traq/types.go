package traq

import "time"

type User struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	DisplayName string `json:"displayName"`
	IconFileID  string `json:"iconFileId"`
	Bot         bool   `json:"bot"`
	State       int    `json:"state"`
}

type Group struct {
	ID          string        `json:"id"`
	Name        string        `json:"name"`
	Description string        `json:"description"`
	Type        string        `json:"type"`
	Icon        string        `json:"icon"`
	Members     []GroupMember `json:"members"`
	Admins      []string      `json:"admins"`
	CreatedAt   time.Time     `json:"createdAt"`
	UpdatedAt   time.Time     `json:"updatedAt"`
}

type GroupMember struct {
	UserID string `json:"id"`
	Role   string `json:"role"`
}
