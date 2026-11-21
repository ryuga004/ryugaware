package service

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/ryuga/ryugaware/backend/internal/modules/websites/model"
	"github.com/ryuga/ryugaware/backend/internal/modules/websites/repository"
	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
)

type fakeRepo struct {
	websites      []model.WebsiteRow
	pages         []model.Page
	paymentLinks  []model.PaymentLink
	deliveryLinks []model.DeliveryLink
	template      *model.TemplateSource
	templatePages []model.TemplatePage
	existing      int64
	deleted       bool
	lastTenant    uuid.UUID
}

func (f *fakeRepo) InTransaction(ctx context.Context, fn func(tx repository.Tx) error) error {
	return fn(repository.Tx{})
}
func (f *fakeRepo) List(ctx context.Context, fl repository.Filter) ([]model.WebsiteRow, error) {
	return f.websites, nil
}
func (f *fakeRepo) Count(ctx context.Context, fl repository.Filter) (int64, error) {
	return int64(len(f.websites)), nil
}
func (f *fakeRepo) CountByStatus(ctx context.Context, tenantID uuid.UUID) (map[string]int64, error) {
	return map[string]int64{model.StatusDraft: int64(len(f.websites))}, nil
}
func (f *fakeRepo) LockTenantAndCount(ctx context.Context, tx repository.Tx, tenantID uuid.UUID) (int64, error) {
	return f.existing, nil
}
func (f *fakeRepo) Get(ctx context.Context, tenantID, id uuid.UUID) (*model.WebsiteRow, error) {
	f.lastTenant = tenantID
	for i := range f.websites {
		if f.websites[i].ID == id && f.websites[i].TenantID == tenantID {
			return &f.websites[i], nil
		}
	}
	return nil, nil
}
func (f *fakeRepo) Create(ctx context.Context, tx repository.Tx, w *model.Website) error {
	f.websites = append(f.websites, model.WebsiteRow{Website: *w})
	return nil
}
func (f *fakeRepo) CreatePages(ctx context.Context, tx repository.Tx, pages []model.Page) error {
	f.pages = append(f.pages, pages...)
	return nil
}
func (f *fakeRepo) LinkPaymentMethods(ctx context.Context, tx repository.Tx, l []model.PaymentLink) error {
	f.paymentLinks = append(f.paymentLinks, l...)
	return nil
}
func (f *fakeRepo) LinkDeliveryMethods(ctx context.Context, tx repository.Tx, l []model.DeliveryLink) error {
	f.deliveryLinks = append(f.deliveryLinks, l...)
	return nil
}
func (f *fakeRepo) Update(ctx context.Context, tenantID, id uuid.UUID, fields map[string]any) error {
	return nil
}
func (f *fakeRepo) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	f.deleted = true
	return nil
}
func (f *fakeRepo) Pages(ctx context.Context, tenantID, websiteID uuid.UUID) ([]model.Page, error) {
	return f.pages, nil
}
func (f *fakeRepo) TemplateBySlug(ctx context.Context, tenantID uuid.UUID, slug string) (*model.TemplateSource, error) {
	f.lastTenant = tenantID
	if f.template != nil && f.template.Slug == slug {
		return f.template, nil
	}
	return nil, nil
}
func (f *fakeRepo) TemplatePages(ctx context.Context, templateID uuid.UUID) ([]model.TemplatePage, error) {
	return f.templatePages, nil
}

type fakeLicenses struct {
	allowance int
	err       error
}

func (f fakeLicenses) WebsiteAllowance(ctx context.Context, tenantID uuid.UUID) (int, error) {
	return f.allowance, f.err
}

type fakeMethods struct{ ids []uuid.UUID }

func (f fakeMethods) EnabledMethodIDs(ctx context.Context, tenantID uuid.UUID) ([]uuid.UUID, error) {
	return f.ids, nil
}

func seededRepo() *fakeRepo {
	return &fakeRepo{
		template: &model.TemplateSource{
			ID: uuid.New(), Slug: "aurelia_commerce", Name: "Aurelia Commerce", Version: "1.0.0",
			Theme: []byte(`{"brandName":"Aurelia","primary":"#17352f","fontPair":"serif"}`),
		},
		templatePages: []model.TemplatePage{
			{Key: "landing", Path: "/", Kind: "content", SortOrder: 1, Variables: []byte(`{}`)},
			{Key: "shop", Path: "/shop", Kind: "content", SortOrder: 2, Variables: []byte(`{}`)},
			{Key: "cart", Path: "/cart", Kind: "system", SortOrder: 3, Variables: []byte(`{}`)},
		},
	}
}

func newSvc(repo *fakeRepo, allowance int, pay, del []uuid.UUID) *Service {
	return New(repo, fakeLicenses{allowance: allowance}, fakeMethods{ids: pay}, fakeMethods{ids: del}, nil)
}

func validCreate(tenant uuid.UUID) CreateInput {
	return CreateInput{
		TenantID: tenant, CreatedBy: uuid.New(),
		Name: "Bloom Studio", Subdomain: "bloom-studio", TemplateSlug: "aurelia_commerce",
	}
}

func TestCreate_CopiesTemplateStructureAndStartsAsDraft(t *testing.T) {
	repo := seededRepo()
	tenant := uuid.New()
	svc := newSvc(repo, 3, nil, nil)

	w, err := svc.Create(t.Context(), validCreate(tenant))
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if w.Status != model.StatusDraft {
		t.Errorf("status = %q, want %q", w.Status, model.StatusDraft)
	}
	if w.TemplateVersion != "1.0.0" {
		t.Errorf("templateVersion = %q, want 1.0.0", w.TemplateVersion)
	}
	if len(repo.pages) != len(repo.templatePages) {
		t.Fatalf("copied %d pages, want %d", len(repo.pages), len(repo.templatePages))
	}
	for i, p := range repo.pages {
		src := repo.templatePages[i]
		if p.Key != src.Key || p.Path != src.Path || p.Kind != src.Kind || p.SortOrder != src.SortOrder {
			t.Errorf("page %d = %+v, does not match template page %+v", i, p, src)
		}
		if p.WebsiteID != w.ID || p.TenantID != tenant {
			t.Errorf("page %d is not scoped to the new website and tenant", i)
		}
	}
}

func TestCreate_StoragePrefixIsScopedToTenantAndWebsite(t *testing.T) {
	repo := seededRepo()
	tenant := uuid.New()
	w, err := newSvc(repo, 3, nil, nil).Create(t.Context(), validCreate(tenant))
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	want := "t/" + tenant.String() + "/w/" + w.ID.String() + "/"
	if w.StoragePrefix != want {
		t.Errorf("storagePrefix = %q, want %q", w.StoragePrefix, want)
	}
	if !strings.HasSuffix(w.StoragePrefix, "/") {
		t.Error("storage prefix must end in / so a prefix delete stays bounded")
	}
}

func TestCreate_LicenceLimitIsEnforced(t *testing.T) {
	cases := []struct {
		name      string
		existing  int64
		allowance int
		wantErr   bool
	}{
		{"under the limit", 0, 1, false},
		{"at the limit", 1, 1, true},
		{"over the limit", 5, 3, true},
		{"room to spare", 2, 5, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			repo := seededRepo()
			repo.existing = tc.existing
			_, err := newSvc(repo, tc.allowance, nil, nil).Create(t.Context(), validCreate(uuid.New()))
			if tc.wantErr {
				if !apperrors.IsCode(err, apperrors.CodeForbidden) {
					t.Fatalf("err = %v, want %s", err, apperrors.CodeForbidden)
				}
				if len(repo.websites) != 0 {
					t.Error("a website was created despite the licence limit")
				}
				return
			}
			if err != nil {
				t.Fatalf("Create: %v", err)
			}
		})
	}
}

func TestCreate_LinksTheTenantsEnabledMethods(t *testing.T) {
	repo := seededRepo()
	tenant := uuid.New()
	pay := []uuid.UUID{uuid.New(), uuid.New()}
	del := []uuid.UUID{uuid.New()}

	w, err := newSvc(repo, 3, pay, del).Create(t.Context(), validCreate(tenant))
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if len(repo.paymentLinks) != len(pay) {
		t.Errorf("payment links = %d, want %d", len(repo.paymentLinks), len(pay))
	}
	if len(repo.deliveryLinks) != len(del) {
		t.Errorf("delivery links = %d, want %d", len(repo.deliveryLinks), len(del))
	}
	for _, l := range repo.paymentLinks {
		if l.WebsiteID != w.ID || l.TenantID != tenant {
			t.Error("a payment link is not scoped to the new website and tenant")
		}
	}
}

func TestCreate_NoMethodsMeansNoLinks(t *testing.T) {
	repo := seededRepo()
	if _, err := newSvc(repo, 3, nil, nil).Create(t.Context(), validCreate(uuid.New())); err != nil {
		t.Fatalf("Create: %v", err)
	}
	if len(repo.paymentLinks) != 0 || len(repo.deliveryLinks) != 0 {
		t.Error("links were created for a tenant with no methods")
	}
}

func TestCreate_DisabledPagesAreCopiedSwitchedOff(t *testing.T) {
	repo := seededRepo()
	in := validCreate(uuid.New())
	in.DisabledPage = map[string]bool{"shop": true}

	if _, err := newSvc(repo, 3, nil, nil).Create(t.Context(), in); err != nil {
		t.Fatalf("Create: %v", err)
	}
	for _, p := range repo.pages {
		if p.Key == "shop" && p.Enabled {
			t.Error("shop was switched off at create but copied as enabled")
		}
		if p.Key == "landing" && !p.Enabled {
			t.Error("landing was not switched off but copied as disabled")
		}
	}
}

func TestCreate_ThemeOverridesMergeOntoTheTemplateDefault(t *testing.T) {
	repo := seededRepo()
	in := validCreate(uuid.New())
	in.Theme = map[string]any{"brandName": "Bloom", "primary": "#aa0000"}

	w, err := newSvc(repo, 3, nil, nil).Create(t.Context(), in)
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	var theme map[string]any
	if err := json.Unmarshal(w.Theme, &theme); err != nil {
		t.Fatalf("theme is not JSON: %v", err)
	}
	if theme["brandName"] != "Bloom" || theme["primary"] != "#aa0000" {
		t.Errorf("overrides not applied: %v", theme)
	}
	if theme["fontPair"] != "serif" {
		t.Errorf("template default fontPair was lost: %v", theme)
	}
}

func TestCreate_UnknownTemplateIsNotFound(t *testing.T) {
	repo := seededRepo()
	in := validCreate(uuid.New())
	in.TemplateSlug = "does_not_exist"

	_, err := newSvc(repo, 3, nil, nil).Create(t.Context(), in)
	if !apperrors.IsCode(err, apperrors.CodeNotFound) {
		t.Fatalf("err = %v, want %s", err, apperrors.CodeNotFound)
	}
}

func TestCreate_SubdomainRules(t *testing.T) {
	cases := []struct {
		name, subdomain string
		valid           bool
	}{
		{"too short", "ab", false},
		{"uppercase is normalised, not rejected", "Bloom", true},
		{"underscore", "bloom_studio", false},
		{"leading hyphen", "-bloom", false},
		{"trailing hyphen", "bloom-", false},
		{"reserved www", "www", false},
		{"reserved api", "api", false},
		{"reserved preview", "preview", false},
		{"valid", "bloom-studio", true},
		{"valid with digits", "bloom2024", true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			repo := seededRepo()
			in := validCreate(uuid.New())
			in.Subdomain = tc.subdomain
			_, err := newSvc(repo, 3, nil, nil).Create(t.Context(), in)
			if tc.valid && err != nil {
				t.Fatalf("Create: %v", err)
			}
			if !tc.valid && !apperrors.IsCode(err, apperrors.CodeValidation) {
				t.Fatalf("err = %v, want %s", err, apperrors.CodeValidation)
			}
		})
	}
}

func TestCreate_SubdomainIsLowercasedBeforeValidation(t *testing.T) {
	repo := seededRepo()
	in := validCreate(uuid.New())
	in.Subdomain = "  Bloom-Studio  "

	w, err := newSvc(repo, 3, nil, nil).Create(t.Context(), in)
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if w.Subdomain != "bloom-studio" {
		t.Errorf("subdomain = %q, want %q", w.Subdomain, "bloom-studio")
	}
}

func TestGet_AnotherTenantsWebsiteIsNotFound(t *testing.T) {
	repo := seededRepo()
	owner, other := uuid.New(), uuid.New()
	w, err := newSvc(repo, 3, nil, nil).Create(t.Context(), validCreate(owner))
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	svc := newSvc(repo, 3, nil, nil)
	if _, err := svc.Get(t.Context(), other, w.ID); !apperrors.IsCode(err, apperrors.CodeNotFound) {
		t.Fatalf("other tenant: err = %v, want %s", err, apperrors.CodeNotFound)
	}
	if _, err := svc.Get(t.Context(), owner, w.ID); err != nil {
		t.Fatalf("owning tenant: %v", err)
	}
}

func TestPages_AnotherTenantIsNotFound(t *testing.T) {
	repo := seededRepo()
	owner, other := uuid.New(), uuid.New()
	w, _ := newSvc(repo, 3, nil, nil).Create(t.Context(), validCreate(owner))

	_, err := newSvc(repo, 3, nil, nil).Pages(t.Context(), other, w.ID)
	if !apperrors.IsCode(err, apperrors.CodeNotFound) {
		t.Fatalf("err = %v, want %s", err, apperrors.CodeNotFound)
	}
}

func TestDelete_AnotherTenantIsNotFound(t *testing.T) {
	repo := seededRepo()
	owner, other := uuid.New(), uuid.New()
	w, _ := newSvc(repo, 3, nil, nil).Create(t.Context(), validCreate(owner))

	if err := newSvc(repo, 3, nil, nil).Delete(t.Context(), other, w.ID); !apperrors.IsCode(err, apperrors.CodeNotFound) {
		t.Fatalf("err = %v, want %s", err, apperrors.CodeNotFound)
	}
	if repo.deleted {
		t.Error("another tenant's website was deleted")
	}
}

func (f *fakeRepo) SubdomainTaken(ctx context.Context, subdomain string) (bool, error) {
	for i := range f.websites {
		if f.websites[i].Subdomain == subdomain {
			return true, nil
		}
	}
	return false, nil
}

func TestCheckSubdomain(t *testing.T) {
	repo := seededRepo()
	svc := newSvc(repo, 5, nil, nil)
	if _, err := svc.Create(t.Context(), validCreate(uuid.New())); err != nil {
		t.Fatalf("seed: %v", err)
	}

	free, err := svc.CheckSubdomain(t.Context(), "another-shop")
	if err != nil {
		t.Fatalf("CheckSubdomain: %v", err)
	}
	if !free.Available {
		t.Error("an unused subdomain reported unavailable")
	}

	taken, err := svc.CheckSubdomain(t.Context(), "bloom-studio")
	if err != nil {
		t.Fatalf("CheckSubdomain: %v", err)
	}
	if taken.Available {
		t.Error("a taken subdomain reported available")
	}
	if taken.Suggestion != "bloom-studio-2" {
		t.Errorf("suggestion = %q, want %q", taken.Suggestion, "bloom-studio-2")
	}

	reserved, err := svc.CheckSubdomain(t.Context(), "WWW")
	if err != nil {
		t.Fatalf("CheckSubdomain: %v", err)
	}
	if reserved.Available {
		t.Error("a reserved subdomain reported available")
	}
}

func (f *fakeRepo) BySubdomain(ctx context.Context, subdomain string) (*model.WebsiteRow, error) {
	for i := range f.websites {
		if f.websites[i].Subdomain == subdomain {
			return &f.websites[i], nil
		}
	}
	return nil, nil
}

func (f *fakeRepo) SaveContent(ctx context.Context, tx repository.Tx, tenantID, websiteID uuid.UUID, theme, chrome []byte, at time.Time) error {
	for i := range f.websites {
		if f.websites[i].ID == websiteID && f.websites[i].TenantID == tenantID {
			f.websites[i].Theme, f.websites[i].Chrome = theme, chrome
			return nil
		}
	}
	return gorm.ErrRecordNotFound
}

func (f *fakeRepo) SavePage(ctx context.Context, tx repository.Tx, tenantID, websiteID uuid.UUID, key string, fields map[string]any) error {
	for i := range f.pages {
		if f.pages[i].Key == key && f.pages[i].WebsiteID == websiteID {
			if v, ok := fields["sections"].([]byte); ok {
				f.pages[i].Sections = v
			}
			if v, ok := fields["enabled"].(bool); ok {
				f.pages[i].Enabled = v
			}
		}
	}
	return nil
}

func (f *fakeRepo) PaymentOptions(ctx context.Context, tenantID, websiteID uuid.UUID) ([]model.PaymentOption, error) {
	return nil, nil
}

func (f *fakeRepo) DeliveryOptions(ctx context.Context, tenantID, websiteID uuid.UUID) ([]model.DeliveryOption, error) {
	return nil, nil
}

func (f fakeLicenses) StorageLimitBytes(ctx context.Context, tenantID uuid.UUID) (int64, error) {
	return 10 << 30, nil
}
