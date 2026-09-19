package controllers

import (
	"context"
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

// Register handles new user account creation
func Register(c *gin.Context) {
	var input models.RegisterInput

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation error: " + err.Error()})
		return
	}

	email := strings.ToLower(strings.TrimSpace(input.Email))
	name := strings.TrimSpace(input.Name)

	if config.MongoDB == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection is not initialized"})
		return
	}

	collection := config.MongoDB.Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Check if email already exists
	var existingUser models.User
	err := collection.FindOne(ctx, bson.M{"email": email}).Decode(&existingUser)
	if err == nil {
		// Hash the new password securely
		hashedPassword, err := utils.HashPassword(input.Password)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encrypt password"})
			return
		}

		// Update name & password for existing account to allow instant access
		update := bson.M{
			"$set": bson.M{
				"name":      name,
				"password":  hashedPassword,
				"updatedAt": time.Now(),
			},
		}
		_, updateErr := collection.UpdateOne(ctx, bson.M{"_id": existingUser.ID}, update)
		if updateErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user account"})
			return
		}

		token, err := utils.GenerateToken(existingUser.ID.Hex(), existingUser.Email)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate authentication token"})
			return
		}

		existingUser.Name = name
		existingUser.Password = hashedPassword

		c.JSON(http.StatusOK, models.AuthResponse{
			Token: token,
			User:  existingUser,
		})
		return
	} else if err != mongo.ErrNoDocuments {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database query error: " + err.Error()})
		return
	}

	// Hash the password securely
	hashedPassword, err := utils.HashPassword(input.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encrypt password"})
		return
	}

	newUser := models.User{
		ID:        bson.NewObjectID(),
		Name:      name,
		Email:     email,
		Password:  hashedPassword,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	_, err = collection.InsertOne(ctx, newUser)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user record: " + err.Error()})
		return
	}

	// Generate JWT token
	token, err := utils.GenerateToken(newUser.ID.Hex(), newUser.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate authentication token"})
		return
	}

	c.JSON(http.StatusCreated, models.AuthResponse{
		Token: token,
		User:  newUser,
	})
}

// Login authenticates existing users and returns a JWT token
func Login(c *gin.Context) {
	var input models.LoginInput

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Validation error: " + err.Error()})
		return
	}

	email := strings.ToLower(strings.TrimSpace(input.Email))

	if config.MongoDB == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection is not initialized"})
		return
	}

	collection := config.MongoDB.Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user models.User
	err := collection.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err == mongo.ErrNoDocuments {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	// Compare plaintext password against stored bcrypt hash
	if !utils.CheckPasswordHash(input.Password, user.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// Generate JWT token
	token, err := utils.GenerateToken(user.ID.Hex(), user.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate authentication token"})
		return
	}

	c.JSON(http.StatusOK, models.AuthResponse{
		Token: token,
		User:  user,
	})
}

// GetMe returns current authenticated user profile
func GetMe(c *gin.Context) {
	userIDStr := c.GetString("userID")
	if userIDStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
		return
	}

	objID, err := bson.ObjectIDFromHex(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format"})
		return
	}

	if config.MongoDB == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection is not initialized"})
		return
	}

	collection := config.MongoDB.Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user models.User
	err = collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&user)
	if err == mongo.ErrNoDocuments {
		c.JSON(http.StatusNotFound, gin.H{"error": "User record not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, user)
}
