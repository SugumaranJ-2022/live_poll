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

		// Poll Routes
		polls := api.Group("/polls")
		{
			// Protected Poll Management Routes (Declare static routes first to prevent :id wildcard parameter collision)
			protectedPolls := polls.Group("")
			protectedPolls.Use(middleware.AuthMiddleware())
			{
				protectedPolls.POST("", controllers.CreatePoll)
				protectedPolls.GET("", controllers.GetUserPolls)
				protectedPolls.GET("/stats", controllers.GetDashboardStats)
				protectedPolls.PATCH("/:id/toggle", controllers.TogglePollStatus)
				protectedPolls.DELETE("/:id", controllers.DeletePoll)
			}

			// Public Parametrized Routes
			polls.GET("/:id", controllers.GetPollByID)
			polls.POST("/:id/vote", controllers.VotePoll)
			polls.GET("/:id/stream", controllers.StreamPollUpdates)
		}
	}
}
