package traq

import (
	"sort"

	"github.com/google/uuid"
)

type StaticDirectory struct {
	users  []User
	groups []Group
}

func NewStaticDirectory(traqID string) *StaticDirectory {
	userID := uuid.NewSHA1(uuid.NameSpaceOID, []byte("dev-user:"+traqID)).String()
	groupID := uuid.NewSHA1(uuid.NameSpaceOID, []byte("dev-group:trap")).String()
	return &StaticDirectory{
		users:  []User{{ID: userID, Name: traqID, DisplayName: traqID + " (開発)", State: 1}},
		groups: []Group{{ID: groupID, Name: "traP", Members: []GroupMember{{UserID: userID, Role: "member"}}}},
	}
}

func (directory *StaticDirectory) UserByID(id string) (User, bool, error) {
	for _, user := range directory.users {
		if user.ID == id {
			return user, true, nil
		}
	}
	return User{}, false, nil
}
func (directory *StaticDirectory) UserByName(name string) (User, bool, error) {
	for _, user := range directory.users {
		if user.Name == name {
			return user, true, nil
		}
	}
	return User{}, false, nil
}
func (directory *StaticDirectory) GroupByID(id string) (Group, bool, error) {
	for _, group := range directory.groups {
		if group.ID == id {
			return group, true, nil
		}
	}
	return Group{}, false, nil
}
func (directory *StaticDirectory) Users() ([]User, error) {
	result := append([]User(nil), directory.users...)
	sort.Slice(result, func(i, j int) bool { return result[i].Name < result[j].Name })
	return result, nil
}
func (directory *StaticDirectory) Groups() ([]Group, error) {
	return append([]Group(nil), directory.groups...), nil
}
func (directory *StaticDirectory) GroupsForUser(userID string) ([]Group, error) {
	result := []Group{}
	for _, group := range directory.groups {
		for _, member := range group.Members {
			if member.UserID == userID {
				result = append(result, group)
				break
			}
		}
	}
	return result, nil
}
