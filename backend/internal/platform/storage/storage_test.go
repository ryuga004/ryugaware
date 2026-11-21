package storage_test

import (
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/ryuga/ryugaware/backend/internal/platform/storage"
)

func TestWebsitePrefix_IsScopedAndBounded(t *testing.T) {
	tenant, website := uuid.New(), uuid.New()
	prefix := storage.WebsitePrefix(tenant, website)

	if !strings.HasSuffix(prefix, "/") {
		t.Errorf("prefix %q must end in / so a prefix delete cannot spill into a sibling key", prefix)
	}
	if !strings.HasPrefix(prefix, "t/"+tenant.String()+"/") {
		t.Errorf("prefix %q does not start inside its tenant", prefix)
	}
	if !strings.Contains(prefix, website.String()) {
		t.Errorf("prefix %q does not name its website", prefix)
	}
	if !strings.HasPrefix(prefix, storage.TenantPrefix(tenant)) {
		t.Errorf("website prefix %q is not inside tenant prefix %q", prefix, storage.TenantPrefix(tenant))
	}
}

func TestWebsitePrefix_DiffersPerWebsiteAndTenant(t *testing.T) {
	a, b := uuid.New(), uuid.New()
	w1, w2 := uuid.New(), uuid.New()

	if storage.WebsitePrefix(a, w1) == storage.WebsitePrefix(a, w2) {
		t.Error("two websites of one tenant share a prefix")
	}
	if storage.WebsitePrefix(a, w1) == storage.WebsitePrefix(b, w1) {
		t.Error("two tenants share a prefix")
	}
	if strings.HasPrefix(storage.WebsitePrefix(a, w1), storage.TenantPrefix(b)) {
		t.Error("one tenant's prefix falls inside another's")
	}
}

func TestTenantPrefix_IsNotAPrefixOfAnotherTenant(t *testing.T) {
	a, b := uuid.New(), uuid.New()
	if strings.HasPrefix(storage.TenantPrefix(a), storage.TenantPrefix(b)) {
		t.Error("tenant prefixes overlap, so a tenant delete could remove another tenant's objects")
	}
}
