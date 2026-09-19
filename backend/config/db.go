package config

import (
	"context"
	"crypto/tls"
	"fmt"
	"log"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

var (
	MongoClient *mongo.Client
	MongoDB     *mongo.Database
)

// ConnectDB initializes the connection to MongoDB
func ConnectDB() (*mongo.Database, error) {
	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27017"
	}

	dbName := os.Getenv("MONGODB_DATABASE")
	if dbName == "" {
		dbName = "livepoll"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	clientOpts := options.Client().ApplyURI(mongoURI)

	// Set custom TLS configuration for cloud deployment (e.g. MongoDB Atlas on Render/Docker)
	tlsConfig := &tls.Config{
		InsecureSkipVerify: true,
	}
	clientOpts.SetTLSConfig(tlsConfig)

	client, err := mongo.Connect(clientOpts)
	if err != nil {
		return nil, fmt.Errorf("failed to configure MongoDB client: %w", err)
	}

	// Ping the database to verify live connectivity
	if err := client.Ping(ctx, nil); err != nil {
		log.Printf("⚠️ MongoDB Ping Note: Could not connect to %s (%v). Ensure MongoDB service is running.", mongoURI, err)
	} else {
		log.Printf("✅ Connected successfully to MongoDB database: '%s'", dbName)
	}

	MongoClient = client
	MongoDB = client.Database(dbName)
	return MongoDB, nil
}
