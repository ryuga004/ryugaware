package service

import (
	"context"
	"testing"

	"github.com/google/uuid"

	"github.com/ryuga/ryugaware/backend/internal/modules/templates/model"
	"github.com/ryuga/ryugaware/backend/internal/modules/templates/repository"
	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
)

type fakeRepo struct {
	rows       []model.TemplateListRow
	pages      []model.Page
	categories []model.CategoryCount
	lastFilter repository.Filter
	lastTenant uuid.UUID
	lastSlug   string
	lastKey    string
}

func (f *fakeRepo) List(ctx context.Context, filter repository.Filter) ([]model.TemplateListRow, error) {
	f.lastFilter = filter
	return f.rows, nil
}

func (f *fakeRepo) Count(ctx context.Context, filter repository.Filter) (int64, error) {
	f.lastFilter = filter
	return int64(len(f.rows)), nil
}

func (f *fakeRepo) CategoryCounts(ctx context.Context, tenantID uuid.UUID) ([]model.CategoryCount, error) {
	f.lastTenant = tenantID
	return f.categories, nil
}

func (f *fakeRepo) GetBySlug(ctx context.Context, tenantID uuid.UUID, slug string) (*model.TemplateListRow, error) {
	f.lastTenant = tenantID
	f.lastSlug = slug
	for i := range f.rows {
		if f.rows[i].Slug == slug {
			return &f.rows[i], nil
		}
	}
	return nil, nil
}

func (f *fakeRepo) ListPages(ctx context.Context, templateID uuid.UUID) ([]model.Page, error) {
	return f.pages, nil
}

func (f *fakeRepo) GetPage(ctx context.Context, templateID uuid.UUID, key string) (*model.Page, error) {
	f.lastKey = key
	for i := range f.pages {
		if f.pages[i].Key == key {
			return &f.pages[i], nil
		}
	}
	return nil, nil
}

func seeded() *fakeRepo {
	return &fakeRepo{
		rows: []model.TemplateListRow{{
			Template:     model.Template{ID: uuid.New(), Slug: "aurelia_commerce", Name: "Aurelia Commerce", Status: "published"},
			CategorySlug: "ecommerce",
			PageCount:    13,
		}},
		pages:      []model.Page{{ID: uuid.New(), Key: "landing", Path: "/", Kind: "content"}},
		categories: []model.CategoryCount{{Slug: "ecommerce", Name: "Ecommerce", Count: 1}},
	}
}

func TestList_DefaultsAndOffset(t *testing.T) {
	repo := seeded()
	got, err := New(repo).List(t.Context(), ListInput{TenantID: uuid.New()})
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if got.Page != 1 || got.PageSize != DefaultPageSize {
		t.Errorf("page/pageSize = %d/%d, want 1/%d", got.Page, got.PageSize, DefaultPageSize)
	}
	if repo.lastFilter.Offset != 0 || repo.lastFilter.Limit != DefaultPageSize {
		t.Errorf("filter limit/offset = %d/%d", repo.lastFilter.Limit, repo.lastFilter.Offset)
	}
}

func TestList_PageSizeIsClampedNotHonoured(t *testing.T) {
	repo := seeded()
	got, err := New(repo).List(t.Context(), ListInput{TenantID: uuid.New(), Page: 3, PageSize: 5000})
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if got.PageSize != MaxPageSize {
		t.Errorf("pageSize = %d, want it clamped to %d", got.PageSize, MaxPageSize)
	}
	if repo.lastFilter.Offset != 2*MaxPageSize {
		t.Errorf("offset = %d, want %d", repo.lastFilter.Offset, 2*MaxPageSize)
	}
}

func TestList_CategoryAllMeansNoFilter(t *testing.T) {
	repo := seeded()
	if _, err := New(repo).List(t.Context(), ListInput{TenantID: uuid.New(), Category: "all"}); err != nil {
		t.Fatalf("List: %v", err)
	}
	if repo.lastFilter.Category != "" {
		t.Errorf("category = %q, want it cleared", repo.lastFilter.Category)
	}
}

func TestList_PassesCallerTenantToEveryQuery(t *testing.T) {
	repo := seeded()
	tenant := uuid.New()
	if _, err := New(repo).List(t.Context(), ListInput{TenantID: tenant}); err != nil {
		t.Fatalf("List: %v", err)
	}
	if repo.lastFilter.TenantID != tenant {
		t.Errorf("filter tenant = %s, want %s", repo.lastFilter.TenantID, tenant)
	}
	if repo.lastTenant != tenant {
		t.Errorf("category-count tenant = %s, want %s", repo.lastTenant, tenant)
	}
}

func TestList_OverlongSearchIsValidationError(t *testing.T) {
	repo := seeded()
	long := make([]byte, MaxSearchLength+1)
	for i := range long {
		long[i] = 'a'
	}
	_, err := New(repo).List(t.Context(), ListInput{TenantID: uuid.New(), Search: string(long)})
	if !apperrors.IsCode(err, apperrors.CodeValidation) {
		t.Fatalf("err = %v, want %s", err, apperrors.CodeValidation)
	}
}

func TestGet_UnknownSlug_NotFound(t *testing.T) {
	_, err := New(seeded()).Get(t.Context(), uuid.New(), "does_not_exist")
	if !apperrors.IsCode(err, apperrors.CodeNotFound) {
		t.Fatalf("err = %v, want %s", err, apperrors.CodeNotFound)
	}
}

func TestGet_PassesCallerTenant(t *testing.T) {
	repo := seeded()
	tenant := uuid.New()
	if _, err := New(repo).Get(t.Context(), tenant, "aurelia_commerce"); err != nil {
		t.Fatalf("Get: %v", err)
	}
	if repo.lastTenant != tenant {
		t.Errorf("lookup tenant = %s, want %s", repo.lastTenant, tenant)
	}
}

func TestPage_UnknownKey_NotFound(t *testing.T) {
	_, err := New(seeded()).Page(t.Context(), uuid.New(), "aurelia_commerce", "nope")
	if !apperrors.IsCode(err, apperrors.CodeNotFound) {
		t.Fatalf("err = %v, want %s", err, apperrors.CodeNotFound)
	}
}

func TestPage_UnknownTemplate_NotFoundBeforePageLookup(t *testing.T) {
	repo := seeded()
	_, err := New(repo).Page(t.Context(), uuid.New(), "other_template", "landing")
	if !apperrors.IsCode(err, apperrors.CodeNotFound) {
		t.Fatalf("err = %v, want %s", err, apperrors.CodeNotFound)
	}
	if repo.lastKey != "" {
		t.Error("page lookup ran for a template the caller cannot see")
	}
}

func TestPage_Found(t *testing.T) {
	got, err := New(seeded()).Page(t.Context(), uuid.New(), "aurelia_commerce", "landing")
	if err != nil {
		t.Fatalf("Page: %v", err)
	}
	if got.Path != "/" || got.Kind != "content" {
		t.Errorf("page = %+v", got)
	}
}
