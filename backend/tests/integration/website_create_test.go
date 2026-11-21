//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/google/uuid"

	"github.com/ryuga/ryugaware/backend/internal/modules/websites/repository"
	"github.com/ryuga/ryugaware/backend/internal/modules/websites/service"
)

type fixedLicense struct{ n int }

func (f fixedLicense) WebsiteAllowance(ctx context.Context, tenantID uuid.UUID) (int, error) {
	return f.n, nil
}

type noMethods struct{}

func (noMethods) EnabledMethodIDs(ctx context.Context, tenantID uuid.UUID) ([]uuid.UUID, error) {
	return nil, nil
}

func TestCreateWebsite_CopiesTemplateContent(t *testing.T) {
	db := open(t)
	repo := repository.New(db)
	tenant := seedTenant(t, db)
	templateID(t, db)

	svc := service.New(repo, fixedLicense{n: 5}, noMethods{}, noMethods{}, nil)

	id := uuid.New().String()[:8]
	w, err := svc.Create(t.Context(), service.CreateInput{
		TenantID: tenant, Name: "Flow " + id, Subdomain: "flow-" + id,
		TemplateSlug: "aurelia_commerce",
		Theme:        map[string]any{"brandName": "Bloom"},
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if w.Status != "draft" {
		t.Errorf("status = %q, want draft", w.Status)
	}

	var chrome []map[string]any
	if err := json.Unmarshal(w.Chrome, &chrome); err != nil {
		t.Fatalf("chrome is not JSON: %v", err)
	}
	if len(chrome) != 3 {
		t.Errorf("chrome sections = %d, want 3", len(chrome))
	}
	if chrome[0]["id"] != "sec_001" {
		t.Errorf("first chrome section id = %v, want sec_001", chrome[0]["id"])
	}

	content, err := svc.Content(t.Context(), tenant, w.ID)
	if err != nil {
		t.Fatalf("Content: %v", err)
	}
	if len(content.Pages) != 13 {
		t.Fatalf("pages = %d, want 13", len(content.Pages))
	}

	byKey := map[string][]map[string]any{}
	titles := map[string]string{}
	for _, p := range content.Pages {
		var sections []map[string]any
		if err := json.Unmarshal(p.Sections, &sections); err != nil {
			t.Fatalf("page %s sections not JSON: %v", p.Key, err)
		}
		byKey[p.Key] = sections
		titles[p.Key] = p.Title
	}

	if got := len(byKey["landing"]); got != 8 {
		t.Errorf("landing sections = %d, want 8", got)
	}
	if got := len(byKey["shop"]); got != 6 {
		t.Errorf("shop sections = %d, want 6", got)
	}
	if titles["landing"] != "Home" {
		t.Errorf("landing title = %q, want Home", titles["landing"])
	}

	seen := map[string]bool{}
	for key, sections := range byKey {
		for _, s := range sections {
			id, _ := s["id"].(string)
			if id == "" {
				t.Errorf("a %s section has no id", key)
			}
			if seen[id] {
				t.Errorf("section id %q is reused", id)
			}
			seen[id] = true
			if _, ok := s["settings"]; !ok {
				t.Errorf("a %s section lost its settings", key)
			}
		}
	}

	var theme map[string]any
	if err := json.Unmarshal(w.Theme, &theme); err != nil {
		t.Fatalf("theme not JSON: %v", err)
	}
	if theme["brandName"] != "Bloom" {
		t.Errorf("brandName = %v, want Bloom", theme["brandName"])
	}
	if theme["primary"] != "#17352f" {
		t.Errorf("template primary lost: %v", theme["primary"])
	}
}

func TestSaveContent_RoundTrips(t *testing.T) {
	db := open(t)
	repo := repository.New(db)
	tenant := seedTenant(t, db)
	templateID(t, db)
	svc := service.New(repo, fixedLicense{n: 5}, noMethods{}, noMethods{}, nil)

	id := uuid.New().String()[:8]
	w, err := svc.Create(t.Context(), service.CreateInput{
		TenantID: tenant, Name: "Save " + id, Subdomain: "save-" + id,
		TemplateSlug: "aurelia_commerce",
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	edited := []byte(`[{"id":"sec_900","type":"hero","enabled":true,"settings":{"heading":"Edited"}}]`)
	saved, err := svc.SaveContent(t.Context(), tenant, w.ID, service.SaveContentInput{
		Theme:  []byte(`{"brandName":"Changed"}`),
		Chrome: []byte(`[]`),
		Pages:  []service.PageContent{{Key: "landing", Title: "Home", Enabled: true, Sections: edited}},
	})
	if err != nil {
		t.Fatalf("SaveContent: %v", err)
	}

	for _, p := range saved.Pages {
		if p.Key != "landing" {
			continue
		}
		var sections []map[string]any
		if err := json.Unmarshal(p.Sections, &sections); err != nil {
			t.Fatalf("sections not JSON: %v", err)
		}
		if len(sections) != 1 || sections[0]["id"] != "sec_900" {
			t.Errorf("edited sections not persisted: %v", sections)
		}
	}
	var theme map[string]any
	if err := json.Unmarshal(saved.Website.Theme, &theme); err != nil {
		t.Fatalf("theme not JSON: %v", err)
	}
	if theme["brandName"] != "Changed" {
		t.Errorf("brandName = %v, want Changed", theme["brandName"])
	}
}

func TestSaveContent_RejectsAnUnknownPage(t *testing.T) {
	db := open(t)
	repo := repository.New(db)
	tenant := seedTenant(t, db)
	templateID(t, db)
	svc := service.New(repo, fixedLicense{n: 5}, noMethods{}, noMethods{}, nil)

	id := uuid.New().String()[:8]
	w, err := svc.Create(t.Context(), service.CreateInput{
		TenantID: tenant, Name: "Rej " + id, Subdomain: "rej-" + id,
		TemplateSlug: "aurelia_commerce",
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	_, err = svc.SaveContent(t.Context(), tenant, w.ID, service.SaveContentInput{
		Pages: []service.PageContent{{Key: "not_a_page"}},
	})
	if err == nil {
		t.Fatal("saving an unknown page key was accepted")
	}
}

func TestStorefront_OnlyServesLiveWebsites(t *testing.T) {
	db := open(t)
	repo := repository.New(db)
	tenant := seedTenant(t, db)
	templateID(t, db)
	svc := service.New(repo, fixedLicense{n: 5}, noMethods{}, noMethods{}, nil)

	id := uuid.New().String()[:8]
	sub := "front-" + id
	w, err := svc.Create(t.Context(), service.CreateInput{
		TenantID: tenant, Name: "Front " + id, Subdomain: sub,
		TemplateSlug: "aurelia_commerce",
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	if _, err := svc.StorefrontBySubdomain(t.Context(), sub); err == nil {
		t.Error("a draft website was served publicly")
	}

	publish := true
	if _, err := svc.Update(t.Context(), tenant, w.ID, service.Patch{Publish: &publish}); err != nil {
		t.Fatalf("publish: %v", err)
	}

	front, err := svc.StorefrontBySubdomain(t.Context(), sub)
	if err != nil {
		t.Fatalf("StorefrontBySubdomain: %v", err)
	}
	if len(front.Content.Pages) != 13 {
		t.Errorf("pages = %d, want 13", len(front.Content.Pages))
	}
}

func (f fixedLicense) StorageLimitBytes(ctx context.Context, tenantID uuid.UUID) (int64, error) {
	return 10 << 30, nil
}
