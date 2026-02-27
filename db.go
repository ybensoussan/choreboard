package main

import (
	"database/sql"
	"log"

	"golang.org/x/crypto/bcrypt"
	_ "modernc.org/sqlite"
)

func InitDB(path string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, err
	}

	// Enable WAL mode for better concurrent access
	if _, err := db.Exec("PRAGMA journal_mode=WAL"); err != nil {
		return nil, err
	}
	if _, err := db.Exec("PRAGMA foreign_keys=ON"); err != nil {
		return nil, err
	}

	if err := migrate(db); err != nil {
		return nil, err
	}

	if err := seed(db); err != nil {
		return nil, err
	}

	if err := seedAdmin(db); err != nil {
		return nil, err
	}

	return db, nil
}

func migrate(db *sql.DB) error {
	schema := `
	CREATE TABLE IF NOT EXISTS children (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		emoji TEXT NOT NULL DEFAULT '🌟',
		color TEXT NOT NULL DEFAULT '#FFB347',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS chores (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		emoji TEXT NOT NULL DEFAULT '✅',
		points INTEGER NOT NULL DEFAULT 5,
		frequency TEXT NOT NULL DEFAULT 'daily',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS rewards (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		emoji TEXT NOT NULL DEFAULT '🎁',
		points_cost INTEGER NOT NULL DEFAULT 10,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS completions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		child_id INTEGER NOT NULL,
		chore_id INTEGER NOT NULL,
		completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		date TEXT NOT NULL,
		FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
		FOREIGN KEY (chore_id) REFERENCES chores(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS redemptions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		child_id INTEGER NOT NULL,
		reward_id INTEGER NOT NULL,
		points_cost INTEGER NOT NULL,
		redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
		FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT NOT NULL UNIQUE,
		password_hash TEXT NOT NULL,
		role TEXT NOT NULL DEFAULT 'admin',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS child_chores (
		child_id INTEGER NOT NULL,
		chore_id INTEGER NOT NULL,
		PRIMARY KEY (child_id, chore_id),
		FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
		FOREIGN KEY (chore_id) REFERENCES chores(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS child_rewards (
		child_id INTEGER NOT NULL,
		reward_id INTEGER NOT NULL,
		PRIMARY KEY (child_id, reward_id),
		FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
		FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE CASCADE
	);
	`
	_, err := db.Exec(schema)
	if err != nil {
		return err
	}

	// Add recurring column if it doesn't exist
	var hasRecurring bool
	rows, err := db.Query("PRAGMA table_info(chores)")
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var cid int
		var name, ctype string
		var notnull int
		var dfltValue sql.NullString
		var pk int
		if err := rows.Scan(&cid, &name, &ctype, &notnull, &dfltValue, &pk); err != nil {
			return err
		}
		if name == "recurring" {
			hasRecurring = true
		}
	}
	if !hasRecurring {
		if _, err := db.Exec("ALTER TABLE chores ADD COLUMN recurring INTEGER NOT NULL DEFAULT 0"); err != nil {
			return err
		}
	}

	// Add claim_frequency column to rewards if it doesn't exist
	var hasClaimFreq bool
	rows2, err := db.Query("PRAGMA table_info(rewards)")
	if err != nil {
		return err
	}
	defer rows2.Close()
	for rows2.Next() {
		var cid int
		var name, ctype string
		var notnull int
		var dfltValue sql.NullString
		var pk int
		if err := rows2.Scan(&cid, &name, &ctype, &notnull, &dfltValue, &pk); err != nil {
			return err
		}
		if name == "claim_frequency" {
			hasClaimFreq = true
		}
	}
	if !hasClaimFreq {
		if _, err := db.Exec("ALTER TABLE rewards ADD COLUMN claim_frequency TEXT NOT NULL DEFAULT 'continuous'"); err != nil {
			return err
		}
	}

	return nil
}

func seed(db *sql.DB) error {
	// Only seed if tables are empty
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM children").Scan(&count)
	if err != nil {
		return err
	}
	if count > 0 {
		return nil // Already seeded
	}

	log.Println("Seeding database with default data...")

	// Default child
	_, err = db.Exec(`INSERT INTO children (name, emoji, color) VALUES ('Kiddo', '🌟', '#FFB347')`)
	if err != nil {
		return err
	}

	// Default chores
	chores := []struct {
		name      string
		emoji     string
		points    int
		frequency string
		recurring bool
	}{
		{"Make the Bed", "🛏️", 5, "daily", false},
		{"Clean Up Toys", "🧹", 10, "daily", false},
		{"Brush Teeth (Morning)", "🪥", 5, "daily", true},
		{"Brush Teeth (Night)", "😁", 5, "daily", true},
		{"Feed the Pet", "🐕", 10, "daily", true},
		{"Put Clothes in Hamper", "🧺", 5, "daily", false},
		{"Water the Plants", "🌱", 10, "weekly", false},
		{"Read a Book", "📚", 15, "daily", false},
		{"Set the Table", "🍽️", 10, "daily", false},
		{"Take Out Trash", "🗑️", 15, "weekly", false},
		{"Tidy Your Room", "🧸", 10, "daily", false},
		{"Help with Dishes", "🫧", 10, "daily", false},
		{"Get Dressed by Yourself", "👕", 5, "daily", false},
		{"Pack School Bag", "🎒", 5, "daily", false},
		{"Practice Writing", "✏️", 15, "daily", false},
		{"Do Homework", "📝", 15, "daily", false},
		{"Wash Hands Before Meals", "🧼", 5, "daily", true},
		{"Put Shoes Away", "👟", 5, "daily", false},
		{"Help Cook Dinner", "🍳", 15, "weekly", false},
		{"Sweep the Floor", "🧹", 10, "weekly", false},
		{"Wipe the Table", "🧽", 5, "daily", false},
		{"Sort Recycling", "♻️", 10, "weekly", false},
		{"Vacuum Your Room", "🧹", 15, "bi-weekly", false},
		{"Clean the Bathroom Sink", "🚰", 15, "bi-weekly", false},
		{"Dust the Shelves", "✨", 10, "bi-weekly", false},
		{"Organize Drawers", "🗄️", 15, "monthly", false},
		{"Clean Out Backpack", "🎒", 10, "bi-weekly", false},
		{"Wash the Car (help)", "🚗", 20, "monthly", false},
		{"Deep Clean Your Room", "🧼", 25, "monthly", false},
		{"Donate Old Toys", "💝", 20, "monthly", false},
	}
	recurringInt := func(b bool) int {
		if b {
			return 1
		}
		return 0
	}
	for _, c := range chores {
		_, err = db.Exec(`INSERT INTO chores (name, emoji, points, frequency, recurring) VALUES (?, ?, ?, ?, ?)`,
			c.name, c.emoji, c.points, c.frequency, recurringInt(c.recurring))
		if err != nil {
			return err
		}
	}

	// Default rewards
	rewards := []struct {
		name       string
		emoji      string
		pointsCost int
	}{
		{"Ice Cream Treat", "🍦", 50},
		{"30 Min Screen Time", "🎮", 30},
		{"Movie Night Pick", "🎬", 80},
		{"New Small Toy", "🧸", 150},
		{"Trip to the Park", "🏞️", 40},
		{"Arts & Crafts Time", "🎨", 25},
		{"Stay Up 15 Min Late", "🌙", 60},
		{"Friend Sleepover", "🎉", 200},
		{"Pick Dinner Menu", "🍕", 35},
		{"Extra Story at Bedtime", "📖", 20},
		{"Bike Ride", "🚲", 45},
		{"Bake Cookies Together", "🍪", 55},
		{"Build a Fort", "🏰", 30},
		{"Dance Party", "💃", 20},
		{"Visit the Zoo", "🦁", 120},
		{"New Book of Choice", "📚", 75},
		{"Bubble Bath with Toys", "🛁", 25},
		{"Pick a Family Game", "🎲", 35},
	}
	for _, r := range rewards {
		_, err = db.Exec(`INSERT INTO rewards (name, emoji, points_cost) VALUES (?, ?, ?)`,
			r.name, r.emoji, r.pointsCost)
		if err != nil {
			return err
		}
	}

	log.Println("Database seeded successfully!")
	return nil
}

func seedAdmin(db *sql.DB) error {
	var count int
	if err := db.QueryRow("SELECT COUNT(*) FROM users").Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	log.Println("Seeding default admin user...")
	hash, err := bcrypt.GenerateFromPassword([]byte("admin"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	_, err = db.Exec("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
		"admin", string(hash), "admin")
	if err != nil {
		return err
	}
	log.Println("Default admin user created (username: admin, password: admin)")
	return nil
}
