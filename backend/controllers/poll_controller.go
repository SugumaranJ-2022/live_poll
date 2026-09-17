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
		event := models.VoteEvent{
			PollID:   pollIDStr,
			OptionID: input.OptionID,
			Options:  updatedPoll.Options,
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

// StreamPollUpdates handles Server-Sent Events (SSE) subscriptions via Redis Pub/Sub
func StreamPollUpdates(c *gin.Context) {
	pollIDStr := c.Param("id")
	channel := fmt.Sprintf("poll:%s:updates", pollIDStr)

	// Set headers for Server-Sent Events
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("Access-Control-Allow-Origin", "*")

	if config.RedisClient == nil {
		c.SSEvent("error", "Redis is offline")
		return
	}

	pubsub := config.RedisClient.Subscribe(context.Background(), channel)
	defer pubsub.Close()

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
