package config

import (
	"context"
	"crypto/tls"
	"log"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
)

var RedisClient *redis.Client

// ConnectRedis initializes the connection to Redis server
func ConnectRedis() *redis.Client {
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "localhost:6379"
	}

	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		// Fallback to direct host:port format if not formatted as redis:// scheme
		opt = &redis.Options{
			Addr: redisURL,
		}
	}

	if opt.TLSConfig != nil {
		opt.TLSConfig.InsecureSkipVerify = true
	} else if len(redisURL) > 6 && redisURL[:6] == "rediss" {
		opt.TLSConfig = &tls.Config{InsecureSkipVerify: true}
	}

	client := redis.NewClient(opt)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		log.Printf("⚠️ Redis Ping Note: Could not connect to Redis at %s (%v). Ensure Redis server is running.", redisURL, err)
	} else {
		log.Printf("✅ Connected successfully to Redis at: '%s'", redisURL)
	}

	RedisClient = client
	return RedisClient
}
