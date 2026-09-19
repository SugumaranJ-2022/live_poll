package controllers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"backend/config"
	"backend/models"
	"backend/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

// CreatePoll handles creation of a new poll by an authenticated user
func CreatePoll(c *gin.Context) {
	var input models.CreatePollInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation error: " + err.Error()})
		return
	}

	userIDStr := c.GetString("userID")
	userObjID, err := bson.ObjectIDFromHex(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Validate options uniqueness
	seen := make(map[string]bool)
	var options []models.Option
	for i, optInput := range input.Options {
		cleanText := strings.TrimSpace(optInput.Text)
		if cleanText == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Option %d cannot be empty", i+1)})
			return
		}
		if seen[strings.ToLower(cleanText)] {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Duplicate option text: '%s'", cleanText)})
			return
		}
		seen[strings.ToLower(cleanText)] = true
		options = append(options, models.Option{
			ID:    fmt.Sprintf("option_%d", i+1),
			Text:  cleanText,
			Votes: 0,
		})
	}

	newPoll := models.Poll{
		ID:        bson.NewObjectID(),
		Question:  strings.TrimSpace(input.Question),
		Options:   options,
		CreatedBy: userObjID,
		Voters:    []string{},
		IsActive:  true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if config.MongoDB == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection is unavailable"})
		return
	}

	collection := config.MongoDB.Collection("polls")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = collection.InsertOne(ctx, newPoll)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create poll: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, newPoll)
}

// GetUserPolls returns all polls created by the logged-in user
func GetUserPolls(c *gin.Context) {
	userIDStr := c.GetString("userID")
	userObjID, err := bson.ObjectIDFromHex(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	if config.MongoDB == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection is unavailable"})
		return
	}

	collection := config.MongoDB.Collection("polls")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := collection.Find(ctx, bson.M{"createdBy": userObjID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database query error: " + err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var polls []models.Poll
	if err = cursor.All(ctx, &polls); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse polls: " + err.Error()})
		return
	}

	if polls == nil {
		polls = []models.Poll{}
	}

	c.JSON(http.StatusOK, polls)
}

// GetPollByID retrieves a public poll by its ID
func GetPollByID(c *gin.Context) {
	pollIDStr := c.Param("id")
	if pollIDStr == "stats" {
		GetDashboardStats(c)
		return
	}

	pollObjID, err := bson.ObjectIDFromHex(pollIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid poll ID format"})
		return
	}

	if config.MongoDB == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection is unavailable"})
		return
	}

	collection := config.MongoDB.Collection("polls")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var poll models.Poll
	err = collection.FindOne(ctx, bson.M{"_id": pollObjID}).Decode(&poll)
	if err == mongo.ErrNoDocuments {
		c.JSON(http.StatusNotFound, gin.H{"error": "Poll not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, poll)
}

// DeletePoll deletes a poll owned by the authenticated user
func DeletePoll(c *gin.Context) {
	pollIDStr := c.Param("id")
	pollObjID, err := bson.ObjectIDFromHex(pollIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid poll ID format"})
		return
	}

	userIDStr := c.GetString("userID")
	userObjID, err := bson.ObjectIDFromHex(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	if config.MongoDB == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection is unavailable"})
		return
	}

	collection := config.MongoDB.Collection("polls")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var poll models.Poll
	err = collection.FindOne(ctx, bson.M{"_id": pollObjID}).Decode(&poll)
	if err == mongo.ErrNoDocuments {
		c.JSON(http.StatusNotFound, gin.H{"error": "Poll not found"})
		return
	}

	// Ownership check
	if poll.CreatedBy != userObjID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden: You can only delete your own polls"})
		return
	}

	_, err = collection.DeleteOne(ctx, bson.M{"_id": pollObjID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete poll"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Poll deleted successfully"})
}

// VotePoll records a vote, updates MongoDB atomically, and publishes event to Redis Pub/Sub
func VotePoll(c *gin.Context) {
	pollIDStr := c.Param("id")
	pollObjID, err := bson.ObjectIDFromHex(pollIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid poll ID format"})
		return
	}

	var input models.VoteInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation error: " + err.Error()})
		return
	}

	// Voter identifier (User ID if logged in, else client IP)
	voterID := c.GetString("userID")
	if voterID == "" {
		voterID = c.ClientIP()
	}

	if config.MongoDB == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection is unavailable"})
		return
	}

	collection := config.MongoDB.Collection("polls")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var poll models.Poll
	err = collection.FindOne(ctx, bson.M{"_id": pollObjID}).Decode(&poll)
	if err == mongo.ErrNoDocuments {
		c.JSON(http.StatusNotFound, gin.H{"error": "Poll not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	if !poll.IsActive {
		c.JSON(http.StatusBadRequest, gin.H{"error": "This poll is no longer accepting votes"})
		return
	}

	// Verify target option exists
	optionExists := false
	for _, opt := range poll.Options {
		if opt.ID == input.OptionID {
			optionExists = true
			break
		}
	}
	if !optionExists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid option ID selected"})
		return
	}

	// Anti-duplicate vote check
	for _, existingVoter := range poll.Voters {
		if existingVoter == voterID {
			c.JSON(http.StatusConflict, gin.H{"error": "You have already voted on this poll"})
			return
		}
	}

	// Atomic MongoDB Update: increment vote count for selected option & add voter to list
	filter := bson.M{"_id": pollObjID, "options.id": input.OptionID}
	update := bson.M{
		"$inc":      bson.M{"options.$.votes": 1},
		"$push":     bson.M{"voters": voterID},
		"$set":      bson.M{"updatedAt": time.Now()},
	}

	_, err = collection.UpdateOne(ctx, filter, update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save vote: " + err.Error()})
		return
	}

	// Retrieve updated poll document
	var updatedPoll models.Poll
	_ = collection.FindOne(ctx, bson.M{"_id": pollObjID}).Decode(&updatedPoll)

	// Publish Realtime Event to Redis Pub/Sub channel poll:<pollId>:updates
	if config.RedisClient != nil {
		// Increment fast Redis counter in Hash map
		redisCountKey := fmt.Sprintf("poll:%s:counts", pollIDStr)
		config.RedisClient.HIncrBy(context.Background(), redisCountKey, input.OptionID, 1)

		event := models.VoteEvent{
			Type:     "vote",
			PollID:   pollIDStr,
			OptionID: input.OptionID,
			Options:  updatedPoll.Options,
			IsActive: updatedPoll.IsActive,
		}

		eventBytes, err := json.Marshal(event)
		if err == nil {
			channel := fmt.Sprintf("poll:%s:updates", pollIDStr)
			config.RedisClient.Publish(context.Background(), channel, string(eventBytes))
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Vote recorded successfully",
		"poll":    updatedPoll,
	})
}

// TogglePollStatus toggles the active/closed state of a poll owned by user
func TogglePollStatus(c *gin.Context) {
	pollIDStr := c.Param("id")
	pollObjID, err := bson.ObjectIDFromHex(pollIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid poll ID format"})
		return
	}

	userIDStr := c.GetString("userID")
	userObjID, err := bson.ObjectIDFromHex(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var input models.TogglePollInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation error: " + err.Error()})
		return
	}

	if config.MongoDB == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection is unavailable"})
		return
	}

	collection := config.MongoDB.Collection("polls")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var poll models.Poll
	err = collection.FindOne(ctx, bson.M{"_id": pollObjID}).Decode(&poll)
	if err == mongo.ErrNoDocuments {
		c.JSON(http.StatusNotFound, gin.H{"error": "Poll not found"})
		return
	}

	if poll.CreatedBy != userObjID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden: You can only update your own polls"})
		return
	}

	update := bson.M{
		"$set": bson.M{
			"isActive":  input.IsActive,
			"updatedAt": time.Now(),
		},
	}

	_, err = collection.UpdateOne(ctx, bson.M{"_id": pollObjID}, update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update poll status"})
		return
	}

	poll.IsActive = input.IsActive

	// Publish status change event to Redis Pub/Sub
	if config.RedisClient != nil {
		event := models.VoteEvent{
			Type:     "status",
			PollID:   pollIDStr,
			IsActive: input.IsActive,
			Options:  poll.Options,
		}
		eventBytes, err := json.Marshal(event)
		if err == nil {
			channel := fmt.Sprintf("poll:%s:updates", pollIDStr)
			config.RedisClient.Publish(context.Background(), channel, string(eventBytes))
		}
	}

	c.JSON(http.StatusOK, poll)
}

// GetDashboardStats computes overview metric statistics for logged-in user
func GetDashboardStats(c *gin.Context) {
	userIDStr := c.GetString("userID")
	if userIDStr == "" {
		authHeader := c.GetHeader("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
			claims, err := utils.ValidateToken(tokenStr)
			if err == nil && claims != nil {
				userIDStr = claims.UserID
			}
		}
	}

	userObjID, err := bson.ObjectIDFromHex(userIDStr)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Please log in to view dashboard statistics"})
		return
	}

	if config.MongoDB == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection is unavailable"})
		return
	}

	collection := config.MongoDB.Collection("polls")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := collection.Find(ctx, bson.M{"createdBy": userObjID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database query error"})
		return
	}
	defer cursor.Close(ctx)

	var polls []models.Poll
	if err = cursor.All(ctx, &polls); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse polls"})
		return
	}

	var totalPolls int64 = int64(len(polls))
	var totalVotes int64 = 0
	var activePolls int64 = 0
	var topQuestion string = "No polls created yet"
	var topVotes int64 = 0

	for _, poll := range polls {
		if poll.IsActive {
			activePolls++
		}
		var pollVoteSum int64 = 0
		for _, opt := range poll.Options {
			pollVoteSum += opt.Votes
		}
		totalVotes += pollVoteSum
		if pollVoteSum >= topVotes && pollVoteSum > 0 {
			topVotes = pollVoteSum
			topQuestion = poll.Question
		}
	}

	c.JSON(http.StatusOK, models.PollStatsResponse{
		TotalPolls:  totalPolls,
		TotalVotes:  totalVotes,
		ActivePolls: activePolls,
		TopQuestion: topQuestion,
		TopVotes:    topVotes,
	})
}

// StreamPollUpdates handles Server-Sent Events (SSE) subscriptions via Redis Pub/Sub with presence tracking
func StreamPollUpdates(c *gin.Context) {
	pollIDStr := c.Param("id")
	channel := fmt.Sprintf("poll:%s:updates", pollIDStr)
	presenceKey := fmt.Sprintf("poll:%s:viewers", pollIDStr)

	// Set headers for Server-Sent Events
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("Access-Control-Allow-Origin", "*")

	if config.RedisClient == nil {
		c.SSEvent("error", "Redis is offline")
		return
	}

	// Increment live presence viewer count in Redis
	viewersVal, _ := config.RedisClient.Incr(context.Background(), presenceKey).Result()

	// Broadcast updated presence to channel
	presenceEvent := models.VoteEvent{
		Type:    "presence",
		PollID:  pollIDStr,
		Viewers: int(viewersVal),
	}
	if pBytes, err := json.Marshal(presenceEvent); err == nil {
		config.RedisClient.Publish(context.Background(), channel, string(pBytes))
	}

	pubsub := config.RedisClient.Subscribe(context.Background(), channel)
	defer func() {
		pubsub.Close()
		// Decrement live presence viewer count when connection terminates
		if config.RedisClient != nil {
			vVal, _ := config.RedisClient.Decr(context.Background(), presenceKey).Result()
			if vVal < 0 {
				config.RedisClient.Set(context.Background(), presenceKey, 0, 0)
				vVal = 0
			}
			pEvent := models.VoteEvent{
				Type:    "presence",
				PollID:  pollIDStr,
				Viewers: int(vVal),
			}
			if pBytes, err := json.Marshal(pEvent); err == nil {
				config.RedisClient.Publish(context.Background(), channel, string(pBytes))
			}
		}
	}()

	ch := pubsub.Channel()

	c.Stream(func(w io.Writer) bool {
		select {
		case msg, ok := <-ch:
			if !ok {
				return false
			}
			c.SSEvent("vote", msg.Payload)
			return true
		case <-c.Request.Context().Done():
			return false
		}
	})
}

