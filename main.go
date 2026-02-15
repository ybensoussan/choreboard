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

	h := &Handlers{db: db}

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// API routes
	r.Route("/api", func(r chi.Router) {
		r.Get("/children", h.ListChildren)
		r.Post("/children", h.AddChild)
		r.Put("/children/{id}", h.UpdateChild)
		r.Delete("/children/{id}", h.DeleteChild)
		r.Get("/children/{id}/points", h.GetPoints)

		r.Get("/chores", h.ListChores)
		r.Post("/chores", h.AddChore)
		r.Put("/chores/{id}", h.UpdateChore)
		r.Delete("/chores/{id}", h.DeleteChore)

		r.Get("/rewards", h.ListRewards)
		r.Post("/rewards", h.AddReward)
		r.Put("/rewards/{id}", h.UpdateReward)
		r.Delete("/rewards/{id}", h.DeleteReward)

		r.Get("/completions", h.ListCompletions)
		r.Post("/completions", h.AddCompletion)
		r.Delete("/completions/{id}", h.DeleteCompletion)

		r.Post("/redemptions", h.AddRedemption)
		r.Get("/redemptions", h.ListRedemptions)
		r.Delete("/redemptions/{id}", h.DeleteRedemption)

		r.Get("/export", h.ExportDB)
		r.Post("/import", h.ImportDB)
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
