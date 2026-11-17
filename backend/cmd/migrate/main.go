// Command migrate applies versioned SQL migrations to PostgreSQL.
//
// It is a separate binary from the API on purpose: schema changes are a
// deployment step with their own failure mode and their own rollback, not
// something that should happen implicitly when a replica boots. Running N API
// replicas must not mean running N concurrent migrators.
//
// Usage:
//
//	migrate up              apply all pending migrations
//	migrate down [n]        roll back n migrations (default 1)
//	migrate drop            drop everything (refused outside development)
//	migrate goto <version>  migrate to an exact version
//	migrate force <version> mark a version as applied, clearing the dirty flag
//	migrate version         print the current version
package main

import (
	"database/sql"
	"errors"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/golang-migrate/migrate/v4"
	pgxmigrate "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	_ "github.com/jackc/pgx/v5/stdlib" // registers the "pgx/v5" database/sql driver

	"github.com/ryuga/ryugaware/backend/internal/config"
	"github.com/ryuga/ryugaware/backend/migrations"
)

// migrationsTable is where golang-migrate records the applied version.
const migrationsTable = "schema_migrations"

func main() {
	if err := run(os.Args[1:]); err != nil {
		fmt.Fprintf(os.Stderr, "migrate: %v\n", err)
		os.Exit(1)
	}
}

func run(args []string) error {
	if len(args) == 0 {
		return errors.New("missing command; try: up | down [n] | drop | goto <v> | force <v> | version")
	}

	cfg, err := config.Load()
	if err != nil {
		return err
	}

	m, closeFn, err := open(cfg)
	if err != nil {
		return err
	}
	defer closeFn()

	cmd := args[0]
	switch cmd {
	case "up":
		err = m.Up()
	case "down":
		n := 1
		if len(args) > 1 {
			if n, err = strconv.Atoi(args[1]); err != nil {
				return fmt.Errorf("down: %q is not a number", args[1])
			}
		}
		err = m.Steps(-n)
	case "drop":
		// Dropping every table is unrecoverable, so it is gated on the
		// environment rather than on a flag someone can paste into prod.
		if cfg.App.Env != config.EnvDevelopment && cfg.App.Env != config.EnvTest {
			return fmt.Errorf("drop refused: APP_ENV is %q, expected development or test", cfg.App.Env)
		}
		err = m.Drop()
	case "goto":
		if len(args) < 2 {
			return errors.New("goto: missing version")
		}
		v, convErr := strconv.ParseUint(args[1], 10, 64)
		if convErr != nil {
			return fmt.Errorf("goto: %q is not a version", args[1])
		}
		err = m.Migrate(uint(v))
	case "force":
		if len(args) < 2 {
			return errors.New("force: missing version")
		}
		v, convErr := strconv.Atoi(args[1])
		if convErr != nil {
			return fmt.Errorf("force: %q is not a version", args[1])
		}
		err = m.Force(v)
	case "version":
		version, dirty, vErr := m.Version()
		if errors.Is(vErr, migrate.ErrNilVersion) {
			fmt.Println("no migrations applied")
			return nil
		}
		if vErr != nil {
			return vErr
		}
		fmt.Printf("version=%d dirty=%t\n", version, dirty)
		return nil
	default:
		return fmt.Errorf("unknown command %q", cmd)
	}

	// "No change" is the expected outcome of re-running `up`, which every
	// deployment does. Treating it as success keeps pipelines idempotent.
	if errors.Is(err, migrate.ErrNoChange) {
		fmt.Println("no change")
		return nil
	}
	if err != nil {
		return err
	}

	version, dirty, err := m.Version()
	if err != nil && !errors.Is(err, migrate.ErrNilVersion) {
		return err
	}
	fmt.Printf("ok: %s complete (version=%d dirty=%t)\n", cmd, version, dirty)
	return nil
}

// open wires the embedded source and the pgx database driver together.
func open(cfg *config.Config) (*migrate.Migrate, func(), error) {
	src, err := iofs.New(migrations.FS, ".")
	if err != nil {
		return nil, nil, fmt.Errorf("reading embedded migrations: %w", err)
	}

	db, err := sql.Open("pgx/v5", cfg.Postgres.URL())
	if err != nil {
		return nil, nil, fmt.Errorf("opening database: %w", err)
	}

	// Wait for the database rather than failing instantly: in Compose and in
	// most CD pipelines the migrator starts the moment the container is up,
	// which is a little before Postgres accepts connections.
	if err := waitForDB(db, 30*time.Second); err != nil {
		_ = db.Close()
		return nil, nil, err
	}

	driver, err := pgxmigrate.WithInstance(db, &pgxmigrate.Config{
		MigrationsTable: migrationsTable,
		DatabaseName:    cfg.Postgres.Database,
		// Without this, a migration that acquires a lock can hang a deploy
		// indefinitely instead of failing and alerting.
		StatementTimeout: 5 * time.Minute,
	})
	if err != nil {
		_ = db.Close()
		return nil, nil, fmt.Errorf("creating migrate driver: %w", err)
	}

	m, err := migrate.NewWithInstance("iofs", src, "pgx5", driver)
	if err != nil {
		_ = db.Close()
		return nil, nil, fmt.Errorf("creating migrator: %w", err)
	}

	return m, func() { _ = db.Close() }, nil
}

func waitForDB(db *sql.DB, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	var lastErr error
	for time.Now().Before(deadline) {
		if lastErr = db.Ping(); lastErr == nil {
			return nil
		}
		time.Sleep(time.Second)
	}
	return fmt.Errorf("database unreachable after %s: %w", timeout, lastErr)
}
