package routes

import (
	"backend/controllers"
	"backend/middleware"

	"github.com/gin-gonic/gin"
)

// SetupRoutes registers all API endpoints and middleware
func SetupRoutes(r *gin.Engine) {
	api := r.Group("/api")
	{
		// Authentication Routes
		auth := api.Group("/auth")
		{
			auth.POST("/register", controllers.Register)
			auth.POST("/login", controllers.Login)

			// Protected Auth Route
			protectedAuth := auth.Group("")
			protectedAuth.Use(middleware.AuthMiddleware())
			{
				protectedAuth.GET("/me", controllers.GetMe)
			}
		}

		// Poll Public Routes
		polls := api.Group("/polls")
		{
			polls.GET("/:id", controllers.GetPollByID)
			polls.POST("/:id/vote", controllers.VotePoll)
			polls.GET("/:id/stream", controllers.StreamPollUpdates)

			// Protected Poll Management Routes
			protectedPolls := polls.Group("")
			protectedPolls.Use(middleware.AuthMiddleware())
			{
				protectedPolls.POST("", controllers.CreatePoll)
				protectedPolls.GET("", controllers.GetUserPolls)
				protectedPolls.DELETE("/:id", controllers.DeletePoll)
			}
		}
	}
}
