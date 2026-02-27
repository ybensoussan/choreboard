package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

//go:embed static/*
var staticFiles embed.FS

func main() {
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "choreboard.db"
	}

	db, err := InitDB(dbPath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	h := &Handlers{db: db, sessions: make(map[string]*Session)}

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// API routes
	r.Route("/api", func(r chi.Router) {
		// Public routes
		r.Post("/login", h.Login)
		r.Post("/logout", h.Logout)
		r.Get("/me", h.Me)

		r.Get("/children", h.ListChildren)
		r.Get("/children/{id}/points", h.GetPoints)
		r.Get("/children/{id}/chores", h.GetChildChores)
		r.Get("/children/{id}/rewards", h.GetChildRewards)
		r.Get("/chores", h.ListChores)
		r.Get("/rewards", h.ListRewards)
		r.Get("/completions", h.ListCompletions)
		r.Get("/redemptions", h.ListRedemptions)

		r.Post("/completions", h.AddCompletion)
		r.Post("/redemptions", h.AddRedemption)

		// Protected routes (require authentication)
		r.Group(func(r chi.Router) {
			r.Use(h.RequireAuth)

			r.Post("/children", h.AddChild)
			r.Put("/children/{id}", h.UpdateChild)
			r.Delete("/children/{id}", h.DeleteChild)
			r.Post("/children/{id}/chores/{choreId}", h.ToggleChildChore)
			r.Post("/children/{id}/rewards/{rewardId}", h.ToggleChildReward)

			r.Post("/chores", h.AddChore)
			r.Put("/chores/{id}", h.UpdateChore)
			r.Delete("/chores/{id}", h.DeleteChore)

			r.Post("/rewards", h.AddReward)
			r.Put("/rewards/{id}", h.UpdateReward)
			r.Delete("/rewards/{id}", h.DeleteReward)

			r.Delete("/completions/{id}", h.DeleteCompletion)
			r.Delete("/redemptions/{id}", h.DeleteRedemption)

			r.Get("/export", h.ExportDB)
			r.Post("/import", h.ImportDB)

			r.Get("/users", h.ListUsers)
			r.Post("/users", h.AddUser)
			r.Put("/users/{id}/password", h.ResetPassword)
			r.Delete("/users/{id}", h.DeleteUser)
		})
	})

	// Serve static files
	staticFS, err := fs.Sub(staticFiles, "static")
	if err != nil {
		log.Fatalf("Failed to create sub filesystem: %v", err)
	}
	r.Handle("/*", http.FileServer(http.FS(staticFS)))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("ChoreBoard starting on :%s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
