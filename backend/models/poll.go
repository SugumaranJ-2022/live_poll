package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

// Option represents a choice in a poll
type Option struct {
	ID    string `bson:"id" json:"id"`
	Text  string `bson:"text" json:"text"`
	Votes int64  `bson:"votes" json:"votes"`
}

// Poll represents a live poll document in MongoDB
type Poll struct {
	ID        bson.ObjectID `bson:"_id,omitempty" json:"id"`
	Question  string        `bson:"question" json:"question"`
	Options   []Option      `bson:"options" json:"options"`
	CreatedBy bson.ObjectID `bson:"createdBy" json:"createdBy"`
	Voters    []string      `bson:"voters,omitempty" json:"voters,omitempty"` // IPs or User IDs to prevent duplicate voting
	IsActive  bool          `bson:"isActive" json:"isActive"`
	CreatedAt time.Time     `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time     `bson:"updatedAt" json:"updatedAt"`
}

// CreateOptionInput defines option payload during poll creation
type CreateOptionInput struct {
	Text string `json:"text" binding:"required,min=1"`
}

// CreatePollInput defines payload validation for poll creation
type CreatePollInput struct {
	Question string              `json:"question" binding:"required,min=5"`
	Options  []CreateOptionInput `json:"options" binding:"required,min=2,max=10"`
}

// VoteInput defines payload for casting a vote
type VoteInput struct {
	OptionID string `json:"optionId" binding:"required"`
}

// VoteEvent defines payload broadcasted over Redis Pub/Sub
type VoteEvent struct {
	Type     string   `json:"type"` // "vote", "status", "presence"
	PollID   string   `json:"pollId"`
	OptionID string   `json:"optionId,omitempty"`
	Options  []Option `json:"options,omitempty"`
	IsActive bool     `json:"isActive,omitempty"`
	Viewers  int      `json:"viewers,omitempty"`
}

// TogglePollInput defines payload for toggling active state of poll
type TogglePollInput struct {
	IsActive bool `json:"isActive"`
}

// PollStatsResponse defines response for user dashboard metrics
type PollStatsResponse struct {
	TotalPolls  int64  `json:"totalPolls"`
	TotalVotes  int64  `json:"totalVotes"`
	ActivePolls int64  `json:"activePolls"`
	TopQuestion string `json:"topQuestion"`
	TopVotes    int64  `json:"topVotes"`
}

