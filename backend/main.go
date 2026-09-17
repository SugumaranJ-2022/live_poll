package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"backend/config"
	"backend/routes"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables from .env if present
	if err := godotenv.Load(); err != nil {
		log.Println("ℹ️ No .env file found or using environment defaults")
	}

	// Initialize MongoDB and Redis connections
	config.ConnectDB()
	config.ConnectRedis()

	r := gin.Default()

	// CORS middleware for frontend communication
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// STEP 1 & STEP 2: Comprehensive Health Check Endpoint
	r.GET("/api/health", func(c *gin.Context) {
		mongoStatus := "connected"
		redisStatus := "connected"

		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		if config.MongoClient == nil || config.MongoClient.Ping(ctx, nil) != nil {
			mongoStatus = "disconnected/offline"
		}

		if config.RedisClient == nil || config.RedisClient.Ping(ctx).Err() != nil {
			redisStatus = "disconnected/offline"
		}

		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"message": "Live Poll API is running",
			"mongodb": mongoStatus,
			"redis":   redisStatus,
		})
	})

	// Setup Authentication and Application Routes (STEP 3)
	routes.SetupRoutes(r)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Live Poll Backend listening on port %s", port)
	r.Run(":" + port)
}
