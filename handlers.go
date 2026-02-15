package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
)

type Handlers struct {
	db *sql.DB
}

type Child struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	Emoji     string `json:"emoji"`
	Color     string `json:"color"`
	CreatedAt string `json:"created_at"`
}

type Chore struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	Emoji     string `json:"emoji"`
	Points    int    `json:"points"`
	Frequency string `json:"frequency"`
	Recurring bool   `json:"recurring"`
	CreatedAt string `json:"created_at"`
}

type Reward struct {
	ID             int    `json:"id"`
	Name           string `json:"name"`
	Emoji          string `json:"emoji"`
	PointsCost     int    `json:"points_cost"`
	ClaimFrequency string `json:"claim_frequency"`
	CreatedAt      string `json:"created_at"`
}

type Completion struct {
	ID          int    `json:"id"`
	ChildID     int    `json:"child_id"`
	ChoreID     int    `json:"chore_id"`
	CompletedAt string `json:"completed_at"`
	Date        string `json:"date"`
	ChoreName   string `json:"chore_name,omitempty"`
	ChoreEmoji  string `json:"chore_emoji,omitempty"`
	ChorePoints int    `json:"chore_points,omitempty"`
}

type Redemption struct {
	ID         int    `json:"id"`
	ChildID    int    `json:"child_id"`
	RewardID   int    `json:"reward_id"`
	PointsCost int    `json:"points_cost"`
	RedeemedAt string `json:"redeemed_at"`
	RewardName  string `json:"reward_name,omitempty"`
	RewardEmoji string `json:"reward_emoji,omitempty"`
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// --- Children ---

func (h *Handlers) ListChildren(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query("SELECT id, name, emoji, color, created_at FROM children ORDER BY id")
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	defer rows.Close()

	children := []Child{}
	for rows.Next() {
		var c Child
		if err := rows.Scan(&c.ID, &c.Name, &c.Emoji, &c.Color, &c.CreatedAt); err != nil {
			writeError(w, 500, err.Error())
			return
		}
		children = append(children, c)
	}
	writeJSON(w, 200, children)
}

func (h *Handlers) AddChild(w http.ResponseWriter, r *http.Request) {
	var c Child
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		writeError(w, 400, "Invalid JSON")
		return
	}
	if c.Name == "" {
		writeError(w, 400, "Name is required")
		return
	}
	if c.Emoji == "" {
		c.Emoji = "🌟"
	}
	if c.Color == "" {
		c.Color = "#FFB347"
	}

	result, err := h.db.Exec("INSERT INTO children (name, emoji, color) VALUES (?, ?, ?)", c.Name, c.Emoji, c.Color)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	id, _ := result.LastInsertId()
	c.ID = int(id)
	writeJSON(w, 201, c)
}

func (h *Handlers) UpdateChild(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var c Child
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		writeError(w, 400, "Invalid JSON")
		return
	}

	_, err := h.db.Exec("UPDATE children SET name=?, emoji=?, color=? WHERE id=?",
		c.Name, c.Emoji, c.Color, id)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, c)
}

func (h *Handlers) DeleteChild(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, err := h.db.Exec("DELETE FROM children WHERE id = ?", id)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, map[string]string{"status": "deleted"})
}

func (h *Handlers) GetPoints(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var earned int
	err := h.db.QueryRow(`
		SELECT COALESCE(SUM(ch.points), 0)
		FROM completions c
		JOIN chores ch ON c.chore_id = ch.id
		WHERE c.child_id = ?`, id).Scan(&earned)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}

	var spent int
	err = h.db.QueryRow(`
		SELECT COALESCE(SUM(points_cost), 0)
		FROM redemptions
		WHERE child_id = ?`, id).Scan(&spent)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}

	balance := earned - spent
	if balance < 0 {
		balance = 0
	}
	writeJSON(w, 200, map[string]int{
		"earned":  earned,
		"spent":   spent,
		"balance": balance,
	})
}

// --- Chores ---

func (h *Handlers) ListChores(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query("SELECT id, name, emoji, points, frequency, recurring, created_at FROM chores ORDER BY id")
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	defer rows.Close()

	chores := []Chore{}
	for rows.Next() {
		var c Chore
		if err := rows.Scan(&c.ID, &c.Name, &c.Emoji, &c.Points, &c.Frequency, &c.Recurring, &c.CreatedAt); err != nil {
			writeError(w, 500, err.Error())
			return
		}
		chores = append(chores, c)
	}
	writeJSON(w, 200, chores)
}

func (h *Handlers) AddChore(w http.ResponseWriter, r *http.Request) {
	var c Chore
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		writeError(w, 400, "Invalid JSON")
		return
	}
	if c.Name == "" {
		writeError(w, 400, "Name is required")
		return
	}
	if c.Emoji == "" {
		c.Emoji = "✅"
	}
	if c.Points <= 0 {
		c.Points = 5
	}
	if c.Frequency == "" {
		c.Frequency = "daily"
	}

	result, err := h.db.Exec("INSERT INTO chores (name, emoji, points, frequency, recurring) VALUES (?, ?, ?, ?, ?)",
		c.Name, c.Emoji, c.Points, c.Frequency, c.Recurring)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	id, _ := result.LastInsertId()
	c.ID = int(id)
	writeJSON(w, 201, c)
}

func (h *Handlers) UpdateChore(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var c Chore
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		writeError(w, 400, "Invalid JSON")
		return
	}

	_, err := h.db.Exec("UPDATE chores SET name=?, emoji=?, points=?, frequency=?, recurring=? WHERE id=?",
		c.Name, c.Emoji, c.Points, c.Frequency, c.Recurring, id)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, c)
}

func (h *Handlers) DeleteChore(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, err := h.db.Exec("DELETE FROM chores WHERE id = ?", id)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, map[string]string{"status": "deleted"})
}

// --- Rewards ---

func (h *Handlers) ListRewards(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query("SELECT id, name, emoji, points_cost, claim_frequency, created_at FROM rewards ORDER BY points_cost")
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	defer rows.Close()

	rewards := []Reward{}
	for rows.Next() {
		var rw Reward
		if err := rows.Scan(&rw.ID, &rw.Name, &rw.Emoji, &rw.PointsCost, &rw.ClaimFrequency, &rw.CreatedAt); err != nil {
			writeError(w, 500, err.Error())
			return
		}
		rewards = append(rewards, rw)
	}
	writeJSON(w, 200, rewards)
}

func (h *Handlers) AddReward(w http.ResponseWriter, r *http.Request) {
	var rw Reward
	if err := json.NewDecoder(r.Body).Decode(&rw); err != nil {
		writeError(w, 400, "Invalid JSON")
		return
	}
	if rw.Name == "" {
		writeError(w, 400, "Name is required")
		return
	}
	if rw.Emoji == "" {
		rw.Emoji = "🎁"
	}
	if rw.PointsCost <= 0 {
		rw.PointsCost = 10
	}
	if rw.ClaimFrequency == "" {
		rw.ClaimFrequency = "continuous"
	}

	result, err := h.db.Exec("INSERT INTO rewards (name, emoji, points_cost, claim_frequency) VALUES (?, ?, ?, ?)",
		rw.Name, rw.Emoji, rw.PointsCost, rw.ClaimFrequency)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	id, _ := result.LastInsertId()
	rw.ID = int(id)
	writeJSON(w, 201, rw)
}

func (h *Handlers) UpdateReward(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var rw Reward
	if err := json.NewDecoder(r.Body).Decode(&rw); err != nil {
		writeError(w, 400, "Invalid JSON")
		return
	}

	_, err := h.db.Exec("UPDATE rewards SET name=?, emoji=?, points_cost=?, claim_frequency=? WHERE id=?",
		rw.Name, rw.Emoji, rw.PointsCost, rw.ClaimFrequency, id)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, rw)
}

func (h *Handlers) DeleteReward(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, err := h.db.Exec("DELETE FROM rewards WHERE id = ?", id)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, map[string]string{"status": "deleted"})
}

// --- Completions ---

func (h *Handlers) ListCompletions(w http.ResponseWriter, r *http.Request) {
	childID := r.URL.Query().Get("child_id")
	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")

	query := `
		SELECT c.id, c.child_id, c.chore_id, c.completed_at, c.date,
		       ch.name, ch.emoji, ch.points
		FROM completions c
		JOIN chores ch ON c.chore_id = ch.id
		WHERE 1=1`
	args := []interface{}{}

	if childID != "" {
		query += " AND c.child_id = ?"
		args = append(args, childID)
	}
	if from != "" {
		query += " AND c.date >= ?"
		args = append(args, from)
	}
	if to != "" {
		query += " AND c.date <= ?"
		args = append(args, to)
	}
	query += " ORDER BY c.completed_at DESC"

	rows, err := h.db.Query(query, args...)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	defer rows.Close()

	completions := []Completion{}
	for rows.Next() {
		var c Completion
		if err := rows.Scan(&c.ID, &c.ChildID, &c.ChoreID, &c.CompletedAt, &c.Date,
			&c.ChoreName, &c.ChoreEmoji, &c.ChorePoints); err != nil {
			writeError(w, 500, err.Error())
			return
		}
		completions = append(completions, c)
	}
	writeJSON(w, 200, completions)
}

func (h *Handlers) AddCompletion(w http.ResponseWriter, r *http.Request) {
	var input struct {
		ChildID int    `json:"child_id"`
		ChoreID int    `json:"chore_id"`
		Date    string `json:"date"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, 400, "Invalid JSON")
		return
	}
	if input.ChildID == 0 || input.ChoreID == 0 {
		writeError(w, 400, "child_id and chore_id are required")
		return
	}

	dateStr := input.Date
	if dateStr == "" {
		dateStr = time.Now().Format("2006-01-02")
	}
	result, err := h.db.Exec("INSERT INTO completions (child_id, chore_id, date) VALUES (?, ?, ?)",
		input.ChildID, input.ChoreID, dateStr)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}

	id, _ := result.LastInsertId()

	// Fetch the chore points to return
	var points int
	h.db.QueryRow("SELECT points FROM chores WHERE id = ?", input.ChoreID).Scan(&points)

	writeJSON(w, 201, map[string]interface{}{
		"id":       id,
		"child_id": input.ChildID,
		"chore_id": input.ChoreID,
		"date":     dateStr,
		"points":   points,
	})
}

func (h *Handlers) DeleteCompletion(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, err := h.db.Exec("DELETE FROM completions WHERE id = ?", id)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, map[string]string{"status": "deleted"})
}

// --- Redemptions ---

func (h *Handlers) AddRedemption(w http.ResponseWriter, r *http.Request) {
	var input struct {
		ChildID  int `json:"child_id"`
		RewardID int `json:"reward_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, 400, "Invalid JSON")
		return
	}
	if input.ChildID == 0 || input.RewardID == 0 {
		writeError(w, 400, "child_id and reward_id are required")
		return
	}

	// Get reward cost and claim frequency
	var cost int
	var claimFreq string
	err := h.db.QueryRow("SELECT points_cost, claim_frequency FROM rewards WHERE id = ?", input.RewardID).Scan(&cost, &claimFreq)
	if err != nil {
		writeError(w, 404, "Reward not found")
		return
	}

	// Check claim frequency limits
	if claimFreq == "daily" {
		todayStr := time.Now().Format("2006-01-02")
		var claimCount int
		h.db.QueryRow(`SELECT COUNT(*) FROM redemptions WHERE child_id = ? AND reward_id = ? AND DATE(redeemed_at) = ?`,
			input.ChildID, input.RewardID, todayStr).Scan(&claimCount)
		if claimCount > 0 {
			writeError(w, 400, "This reward can only be claimed once per day")
			return
		}
	} else if claimFreq == "weekly" {
		// Check if claimed in the last 7 days
		var claimCount int
		h.db.QueryRow(`SELECT COUNT(*) FROM redemptions WHERE child_id = ? AND reward_id = ? AND DATE(redeemed_at) >= DATE('now', '-6 days')`,
			input.ChildID, input.RewardID).Scan(&claimCount)
		if claimCount > 0 {
			writeError(w, 400, "This reward can only be claimed once per week")
			return
		}
	}

	// Check balance
	var earned int
	h.db.QueryRow(`SELECT COALESCE(SUM(ch.points), 0) FROM completions c JOIN chores ch ON c.chore_id = ch.id WHERE c.child_id = ?`, input.ChildID).Scan(&earned)
	var spent int
	h.db.QueryRow(`SELECT COALESCE(SUM(points_cost), 0) FROM redemptions WHERE child_id = ?`, input.ChildID).Scan(&spent)

	balance := earned - spent
	if balance < cost {
		writeError(w, 400, "Not enough points")
		return
	}

	result, err := h.db.Exec("INSERT INTO redemptions (child_id, reward_id, points_cost) VALUES (?, ?, ?)",
		input.ChildID, input.RewardID, cost)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}

	id, _ := result.LastInsertId()
	writeJSON(w, 201, map[string]interface{}{
		"id":          id,
		"child_id":    input.ChildID,
		"reward_id":   input.RewardID,
		"points_cost": cost,
		"new_balance": balance - cost,
	})
}

func (h *Handlers) DeleteRedemption(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, err := h.db.Exec("DELETE FROM redemptions WHERE id = ?", id)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, map[string]string{"status": "deleted"})
}

func (h *Handlers) ListRedemptions(w http.ResponseWriter, r *http.Request) {
	childID := r.URL.Query().Get("child_id")
	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")

	query := `
		SELECT r.id, r.child_id, r.reward_id, r.points_cost, r.redeemed_at,
		       rw.name, rw.emoji
		FROM redemptions r
		JOIN rewards rw ON r.reward_id = rw.id
		WHERE 1=1`
	args := []interface{}{}

	if childID != "" {
		query += " AND r.child_id = ?"
		args = append(args, childID)
	}
	if from != "" {
		query += " AND DATE(r.redeemed_at) >= ?"
		args = append(args, from)
	}
	if to != "" {
		query += " AND DATE(r.redeemed_at) <= ?"
		args = append(args, to)
	}
	query += " ORDER BY r.redeemed_at DESC"

	rows, err := h.db.Query(query, args...)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	defer rows.Close()

	redemptions := []Redemption{}
	for rows.Next() {
		var rd Redemption
		if err := rows.Scan(&rd.ID, &rd.ChildID, &rd.RewardID, &rd.PointsCost, &rd.RedeemedAt,
			&rd.RewardName, &rd.RewardEmoji); err != nil {
			writeError(w, 500, err.Error())
			return
		}
		redemptions = append(redemptions, rd)
	}
	writeJSON(w, 200, redemptions)
}

// --- Export / Import ---

type DatabaseExport struct {
	Version     int                `json:"version"`
	ExportedAt  string             `json:"exported_at"`
	Children    []Child            `json:"children"`
	Chores      []Chore            `json:"chores"`
	Rewards     []Reward           `json:"rewards"`
	Completions []ExportCompletion `json:"completions"`
	Redemptions []ExportRedemption `json:"redemptions"`
}

type ExportCompletion struct {
	ID          int    `json:"id"`
	ChildID     int    `json:"child_id"`
	ChoreID     int    `json:"chore_id"`
	CompletedAt string `json:"completed_at"`
	Date        string `json:"date"`
}

type ExportRedemption struct {
	ID         int    `json:"id"`
	ChildID    int    `json:"child_id"`
	RewardID   int    `json:"reward_id"`
	PointsCost int    `json:"points_cost"`
	RedeemedAt string `json:"redeemed_at"`
}

func (h *Handlers) ExportDB(w http.ResponseWriter, r *http.Request) {
	export := DatabaseExport{
		Version:    1,
		ExportedAt: time.Now().Format(time.RFC3339),
	}

	// Children
	rows, err := h.db.Query("SELECT id, name, emoji, color, created_at FROM children ORDER BY id")
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	defer rows.Close()
	for rows.Next() {
		var c Child
		rows.Scan(&c.ID, &c.Name, &c.Emoji, &c.Color, &c.CreatedAt)
		export.Children = append(export.Children, c)
	}

	// Chores
	rows2, err := h.db.Query("SELECT id, name, emoji, points, frequency, recurring, created_at FROM chores ORDER BY id")
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	defer rows2.Close()
	for rows2.Next() {
		var c Chore
		rows2.Scan(&c.ID, &c.Name, &c.Emoji, &c.Points, &c.Frequency, &c.Recurring, &c.CreatedAt)
		export.Chores = append(export.Chores, c)
	}

	// Rewards
	rows3, err := h.db.Query("SELECT id, name, emoji, points_cost, claim_frequency, created_at FROM rewards ORDER BY id")
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	defer rows3.Close()
	for rows3.Next() {
		var rw Reward
		rows3.Scan(&rw.ID, &rw.Name, &rw.Emoji, &rw.PointsCost, &rw.ClaimFrequency, &rw.CreatedAt)
		export.Rewards = append(export.Rewards, rw)
	}

	// Completions
	rows4, err := h.db.Query("SELECT id, child_id, chore_id, completed_at, date FROM completions ORDER BY id")
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	defer rows4.Close()
	for rows4.Next() {
		var c ExportCompletion
		rows4.Scan(&c.ID, &c.ChildID, &c.ChoreID, &c.CompletedAt, &c.Date)
		export.Completions = append(export.Completions, c)
	}

	// Redemptions
	rows5, err := h.db.Query("SELECT id, child_id, reward_id, points_cost, redeemed_at FROM redemptions ORDER BY id")
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	defer rows5.Close()
	for rows5.Next() {
		var rd ExportRedemption
		rows5.Scan(&rd.ID, &rd.ChildID, &rd.RewardID, &rd.PointsCost, &rd.RedeemedAt)
		export.Redemptions = append(export.Redemptions, rd)
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=choreboard-backup-%s.json", time.Now().Format("2006-01-02")))
	json.NewEncoder(w).Encode(export)
}

func (h *Handlers) ImportDB(w http.ResponseWriter, r *http.Request) {
	var data DatabaseExport
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		writeError(w, 400, "Invalid JSON: "+err.Error())
		return
	}

	tx, err := h.db.Begin()
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	defer tx.Rollback()

	// Clear all tables (order matters for foreign keys)
	for _, table := range []string{"redemptions", "completions", "rewards", "chores", "children"} {
		if _, err := tx.Exec("DELETE FROM " + table); err != nil {
			writeError(w, 500, fmt.Sprintf("Failed to clear %s: %v", table, err))
			return
		}
	}

	// Insert children
	for _, c := range data.Children {
		_, err := tx.Exec("INSERT INTO children (id, name, emoji, color, created_at) VALUES (?, ?, ?, ?, ?)",
			c.ID, c.Name, c.Emoji, c.Color, c.CreatedAt)
		if err != nil {
			writeError(w, 500, fmt.Sprintf("Failed to import child: %v", err))
			return
		}
	}

	// Insert chores
	for _, c := range data.Chores {
		_, err := tx.Exec("INSERT INTO chores (id, name, emoji, points, frequency, recurring, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
			c.ID, c.Name, c.Emoji, c.Points, c.Frequency, c.Recurring, c.CreatedAt)
		if err != nil {
			writeError(w, 500, fmt.Sprintf("Failed to import chore: %v", err))
			return
		}
	}

	// Insert rewards
	for _, rw := range data.Rewards {
		claimFreq := rw.ClaimFrequency
		if claimFreq == "" {
			claimFreq = "continuous"
		}
		_, err := tx.Exec("INSERT INTO rewards (id, name, emoji, points_cost, claim_frequency, created_at) VALUES (?, ?, ?, ?, ?, ?)",
			rw.ID, rw.Name, rw.Emoji, rw.PointsCost, claimFreq, rw.CreatedAt)
		if err != nil {
			writeError(w, 500, fmt.Sprintf("Failed to import reward: %v", err))
			return
		}
	}

	// Insert completions
	for _, c := range data.Completions {
		_, err := tx.Exec("INSERT INTO completions (id, child_id, chore_id, completed_at, date) VALUES (?, ?, ?, ?, ?)",
			c.ID, c.ChildID, c.ChoreID, c.CompletedAt, c.Date)
		if err != nil {
			writeError(w, 500, fmt.Sprintf("Failed to import completion: %v", err))
			return
		}
	}

	// Insert redemptions
	for _, rd := range data.Redemptions {
		_, err := tx.Exec("INSERT INTO redemptions (id, child_id, reward_id, points_cost, redeemed_at) VALUES (?, ?, ?, ?, ?)",
			rd.ID, rd.ChildID, rd.RewardID, rd.PointsCost, rd.RedeemedAt)
		if err != nil {
			writeError(w, 500, fmt.Sprintf("Failed to import redemption: %v", err))
			return
		}
	}

	if err := tx.Commit(); err != nil {
		writeError(w, 500, err.Error())
		return
	}

	writeJSON(w, 200, map[string]interface{}{
		"status":      "imported",
		"children":    len(data.Children),
		"chores":      len(data.Chores),
		"rewards":     len(data.Rewards),
		"completions": len(data.Completions),
		"redemptions": len(data.Redemptions),
	})
}
