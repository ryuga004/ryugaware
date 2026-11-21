//go:build integration

package integration

import (
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/ryuga/ryugaware/backend/internal/modules/websites/model"
	"github.com/ryuga/ryugaware/backend/internal/modules/websites/repository"
	"github.com/ryuga/ryugaware/backend/internal/platform/storage"
)

func open(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := os.Getenv("TEST_POSTGRES_DSN")
	if dsn == "" {
		t.Skip("TEST_POSTGRES_DSN is not set")
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	return db
}

func seedTenant(t *testing.T, db *gorm.DB) uuid.UUID {
	t.Helper()
	id := uuid.New()
	err := db.Exec(
		"INSERT INTO tenants (id, name, password_pepper, jwt_secret, is_active) VALUES (?, ?, ?, ?, TRUE)",
		id, "Test "+id.String()[:8], "pepper-"+id.String(), "secret-"+id.String(),
	).Error
	if err != nil {
		t.Fatalf("seed tenant: %v", err)
	}
	t.Cleanup(func() { db.Exec("DELETE FROM tenants WHERE id = ?", id) })
	return id
}

func templateID(t *testing.T, db *gorm.DB) uuid.UUID {
	t.Helper()
	var raw string
	if err := db.Raw("SELECT id::text FROM templates WHERE slug = 'aurelia_commerce'").Scan(&raw).Error; err != nil {
		t.Fatalf("template lookup: %v", err)
	}
	if raw == "" {
		t.Skip("the aurelia_commerce template is not seeded in this database")
	}
	id, err := uuid.Parse(raw)
	if err != nil {
		t.Fatalf("template id %q is not a uuid: %v", raw, err)
	}
	return id
}

func TestLockTenantAndCount_RunsAgainstPostgres(t *testing.T) {
	db := open(t)
	repo := repository.New(db)
	tenant := seedTenant(t, db)

	err := repo.InTransaction(t.Context(), func(tx repository.Tx) error {
		count, err := repo.LockTenantAndCount(t.Context(), tx, tenant)
		if err != nil {
			return err
		}
		if count != 0 {
			t.Errorf("count = %d, want 0 for a fresh tenant", count)
		}
		return nil
	})
	if err != nil {
		t.Fatalf("LockTenantAndCount: %v", err)
	}
}

func TestLockTenantAndCount_SeesExistingWebsites(t *testing.T) {
	db := open(t)
	repo := repository.New(db)
	tenant := seedTenant(t, db)
	tpl := templateID(t, db)

	websiteID := uuid.New()
	now := time.Now().UTC()
	err := repo.InTransaction(t.Context(), func(tx repository.Tx) error {
		return repo.Create(t.Context(), tx, &model.Website{
			ID: websiteID, TenantID: tenant, TemplateID: tpl,
			Name: "Site " + websiteID.String()[:8], Subdomain: "it-" + websiteID.String()[:8],
			Status: model.StatusDraft, StoragePrefix: storage.WebsitePrefix(tenant, websiteID),
			Theme: []byte("{}"), Chrome: []byte("[]"), CreatedAt: now, UpdatedAt: now,
		})
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	var count int64
	err = repo.InTransaction(t.Context(), func(tx repository.Tx) error {
		var err error
		count, err = repo.LockTenantAndCount(t.Context(), tx, tenant)
		return err
	})
	if err != nil {
		t.Fatalf("LockTenantAndCount: %v", err)
	}
	if count != 1 {
		t.Errorf("count = %d, want 1", count)
	}
}

func TestGet_JoinsTheTemplateSlug(t *testing.T) {
	db := open(t)
	repo := repository.New(db)
	tenant := seedTenant(t, db)
	tpl := templateID(t, db)

	websiteID := uuid.New()
	now := time.Now().UTC()
	err := repo.InTransaction(t.Context(), func(tx repository.Tx) error {
		return repo.Create(t.Context(), tx, &model.Website{
			ID: websiteID, TenantID: tenant, TemplateID: tpl,
			Name: "Site " + websiteID.String()[:8], Subdomain: "it-" + websiteID.String()[:8],
			Status: model.StatusDraft, StoragePrefix: storage.WebsitePrefix(tenant, websiteID),
			Theme: []byte("{}"), Chrome: []byte("[]"), CreatedAt: now, UpdatedAt: now,
		})
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	got, err := repo.Get(t.Context(), tenant, websiteID)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if got == nil {
		t.Fatal("Get returned nothing for the owning tenant")
	}
	if got.TemplateSlug != "aurelia_commerce" {
		t.Errorf("templateSlug = %q, want aurelia_commerce", got.TemplateSlug)
	}
}

func TestGet_AnotherTenantGetsNothing(t *testing.T) {
	db := open(t)
	repo := repository.New(db)
	owner := seedTenant(t, db)
	other := seedTenant(t, db)
	tpl := templateID(t, db)

	websiteID := uuid.New()
	now := time.Now().UTC()
	err := repo.InTransaction(t.Context(), func(tx repository.Tx) error {
		return repo.Create(t.Context(), tx, &model.Website{
			ID: websiteID, TenantID: owner, TemplateID: tpl,
			Name: "Site " + websiteID.String()[:8], Subdomain: "it-" + websiteID.String()[:8],
			Status: model.StatusDraft, StoragePrefix: storage.WebsitePrefix(owner, websiteID),
			Theme: []byte("{}"), Chrome: []byte("[]"), CreatedAt: now, UpdatedAt: now,
		})
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	got, err := repo.Get(t.Context(), other, websiteID)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if got != nil {
		t.Error("another tenant could read the website")
	}
}

func TestList_AndCount_RunAgainstPostgres(t *testing.T) {
	db := open(t)
	repo := repository.New(db)
	tenant := seedTenant(t, db)

	filter := repository.Filter{TenantID: tenant, Search: "bloom", Status: model.StatusDraft, Limit: 10}
	if _, err := repo.List(t.Context(), filter); err != nil {
		t.Fatalf("List: %v", err)
	}
	if _, err := repo.Count(t.Context(), filter); err != nil {
		t.Fatalf("Count: %v", err)
	}
	if _, err := repo.CountByStatus(t.Context(), tenant); err != nil {
		t.Fatalf("CountByStatus: %v", err)
	}
	if _, err := repo.SubdomainTaken(t.Context(), "bloom-studio"); err != nil {
		t.Fatalf("SubdomainTaken: %v", err)
	}
}
