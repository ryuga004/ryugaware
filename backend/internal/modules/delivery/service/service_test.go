package service

import (
	"context"
	"testing"

	"github.com/google/uuid"

	"github.com/ryuga/ryugaware/backend/internal/modules/delivery/model"
	"github.com/ryuga/ryugaware/backend/internal/modules/delivery/repository"
	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
)

type fakeRepo struct {
	methods    []model.Method
	created    *model.Method
	lastFilter repository.Filter
	lastTenant uuid.UUID
}

func (f *fakeRepo) List(ctx context.Context, filter repository.Filter) ([]model.Method, error) {
	f.lastFilter = filter
	return f.methods, nil
}
func (f *fakeRepo) Count(ctx context.Context, filter repository.Filter) (int64, error) {
	f.lastFilter = filter
	return int64(len(f.methods)), nil
}
func (f *fakeRepo) CountEnabled(ctx context.Context, tenantID uuid.UUID) (int64, error) {
	f.lastTenant = tenantID
	return 1, nil
}
func (f *fakeRepo) Get(ctx context.Context, tenantID, id uuid.UUID) (*model.Method, error) {
	f.lastTenant = tenantID
	for i := range f.methods {
		if f.methods[i].ID == id && f.methods[i].TenantID == tenantID {
			return &f.methods[i], nil
		}
	}
	return nil, nil
}
func (f *fakeRepo) Create(ctx context.Context, m *model.Method) error {
	f.created = m
	f.methods = append(f.methods, *m)
	return nil
}
func (f *fakeRepo) Update(ctx context.Context, tenantID, id uuid.UUID, fields map[string]any) error {
	return nil
}
func (f *fakeRepo) Delete(ctx context.Context, tenantID, id uuid.UUID) error { return nil }

func rs(v float64) *float64 { return &v }

func newSvc() (*Service, *fakeRepo) {
	repo := &fakeRepo{}
	return New(repo), repo
}

func validInput() MethodInput {
	return MethodInput{
		Name: "Shiprocket standard", Partner: model.PartnerShiprocket, Type: "standard",
		MinDays: 3, MaxDays: 6, RateType: model.RateFlat, Price: 49,
		Coverage: "all_india", Enabled: true,
	}
}

func TestCreate_Valid(t *testing.T) {
	svc, repo := newSvc()
	tenant := uuid.New()
	m, err := svc.Create(t.Context(), tenant, validInput())
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if m.TenantID != tenant {
		t.Errorf("tenant = %s, want %s", m.TenantID, tenant)
	}
	if repo.created == nil {
		t.Error("nothing persisted")
	}
}

func TestCreate_PartnerRules(t *testing.T) {
	cases := []struct {
		name   string
		mutate func(*MethodInput)
	}{
		{"shiprocket cannot do store pickup", func(in *MethodInput) { in.Type = "pickup" }},
		{"shiprocket needs a delivery window", func(in *MethodInput) { in.MinDays, in.MaxDays = 0, 0 }},
		{"own fleet is not the pickup partner", func(in *MethodInput) {
			in.Partner, in.Type = model.PartnerSelf, "pickup"
		}},
		{"pickup partner only serves pickup", func(in *MethodInput) {
			in.Partner, in.Type = model.PartnerPickup, "standard"
		}},
		{"pickup cannot charge", func(in *MethodInput) {
			in.Partner, in.Type, in.RateType, in.Price = model.PartnerPickup, "pickup", model.RateFlat, 50
		}},
		{"unknown partner", func(in *MethodInput) { in.Partner = "bluedart" }},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			svc, _ := newSvc()
			in := validInput()
			tc.mutate(&in)
			if _, err := svc.Create(t.Context(), uuid.New(), in); !apperrors.IsCode(err, apperrors.CodeValidation) {
				t.Fatalf("err = %v, want %s", err, apperrors.CodeValidation)
			}
		})
	}
}

func TestCreate_RateAndCoverageRules(t *testing.T) {
	cases := []struct {
		name   string
		mutate func(*MethodInput)
	}{
		{"free_above without a value", func(in *MethodInput) { in.RateType = model.RateFreeAbove }},
		{"free_above value on a flat rate", func(in *MethodInput) { in.FreeAbove = rs(999) }},
		{"free rate with a price", func(in *MethodInput) { in.RateType, in.Price = model.RateFree, 50 }},
		{"regions without region coverage", func(in *MethodInput) { in.Regions = []string{"Maharashtra"} }},
		{"region coverage without regions", func(in *MethodInput) { in.Coverage = "states" }},
		{"max shorter than min", func(in *MethodInput) { in.MinDays, in.MaxDays = 6, 3 }},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			svc, _ := newSvc()
			in := validInput()
			tc.mutate(&in)
			if _, err := svc.Create(t.Context(), uuid.New(), in); !apperrors.IsCode(err, apperrors.CodeValidation) {
				t.Fatalf("err = %v, want %s", err, apperrors.CodeValidation)
			}
		})
	}
}

func seed(repo *fakeRepo, tenant uuid.UUID, m model.Method) uuid.UUID {
	m.ID = uuid.New()
	m.TenantID = tenant
	m.Enabled = true
	if m.Regions == nil {
		m.Regions = []byte("[]")
	}
	repo.methods = append(repo.methods, m)
	return m.ID
}

func TestProcess_RoutesToThePartnersAdapter(t *testing.T) {
	cases := []struct {
		partner, kind, wantLabel, wantStatus string
		wantAWB                              bool
	}{
		{model.PartnerShiprocket, "standard", "Shiprocket", StatusProcessing, true},
		{model.PartnerSelf, "standard", "Own fleet", StatusProcessing, true},
		{model.PartnerPickup, "pickup", "Store pickup", StatusReady, false},
	}
	for _, tc := range cases {
		t.Run(tc.partner, func(t *testing.T) {
			svc, repo := newSvc()
			tenant := uuid.New()
			id := seed(repo, tenant, model.Method{Partner: tc.partner, Type: tc.kind, RateType: model.RateFree})

			got, err := svc.Process(t.Context(), tenant, id, Consignment{
				OrderID: "o1", Reference: "o1", Pincode: "400001", OrderRs: 999,
			})
			if err != nil {
				t.Fatalf("Process: %v", err)
			}
			if got.Dispatch.PartnerLabel != tc.wantLabel {
				t.Errorf("label = %q, want %q", got.Dispatch.PartnerLabel, tc.wantLabel)
			}
			if got.Dispatch.Status != tc.wantStatus {
				t.Errorf("status = %q, want %q", got.Dispatch.Status, tc.wantStatus)
			}
			if (got.Dispatch.AWB != "") != tc.wantAWB {
				t.Errorf("awb = %q, wantAWB = %v", got.Dispatch.AWB, tc.wantAWB)
			}
		})
	}
}

func TestProcess_ShiprocketNeedsAPincode(t *testing.T) {
	svc, repo := newSvc()
	tenant := uuid.New()
	id := seed(repo, tenant, model.Method{Partner: model.PartnerShiprocket, Type: "standard", RateType: model.RateFree})

	_, err := svc.Process(t.Context(), tenant, id, Consignment{OrderID: "o1", Reference: "o1"})
	if !apperrors.IsCode(err, apperrors.CodeValidation) {
		t.Fatalf("err = %v, want %s", err, apperrors.CodeValidation)
	}
}

func TestDeliveryFee_RateRules(t *testing.T) {
	cases := []struct {
		name    string
		method  model.Method
		orderRs float64
		want    float64
	}{
		{"flat always charges", model.Method{RateType: model.RateFlat, Price: 49}, 10000, 49},
		{"free never charges", model.Method{RateType: model.RateFree, Price: 0}, 10, 0},
		{"free_above below the threshold", model.Method{RateType: model.RateFreeAbove, Price: 99, FreeAbove: rs(1500)}, 1499, 99},
		{"free_above at the threshold", model.Method{RateType: model.RateFreeAbove, Price: 99, FreeAbove: rs(1500)}, 1500, 0},
		{"free_above over the threshold", model.Method{RateType: model.RateFreeAbove, Price: 99, FreeAbove: rs(1500)}, 2000, 0},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := DeliveryFee(&tc.method, tc.orderRs); got != tc.want {
				t.Errorf("fee = %v, want %v", got, tc.want)
			}
		})
	}
}

func TestProcess_DisabledMethodIsRejected(t *testing.T) {
	svc, repo := newSvc()
	tenant := uuid.New()
	m := model.Method{
		ID: uuid.New(), TenantID: tenant, Partner: model.PartnerSelf,
		Type: "standard", RateType: model.RateFree, Enabled: false, Regions: []byte("[]"),
	}
	repo.methods = append(repo.methods, m)

	_, err := svc.Process(t.Context(), tenant, m.ID, Consignment{OrderID: "o1"})
	if !apperrors.IsCode(err, apperrors.CodeValidation) {
		t.Fatalf("err = %v, want %s", err, apperrors.CodeValidation)
	}
}

func TestGet_AnotherTenantsMethodIsNotFound(t *testing.T) {
	svc, repo := newSvc()
	owner, other := uuid.New(), uuid.New()
	id := seed(repo, owner, model.Method{Partner: model.PartnerSelf, Type: "standard", RateType: model.RateFree})

	if _, err := svc.Get(t.Context(), other, id); !apperrors.IsCode(err, apperrors.CodeNotFound) {
		t.Fatalf("other tenant: err = %v, want %s", err, apperrors.CodeNotFound)
	}
	if _, err := svc.Get(t.Context(), owner, id); err != nil {
		t.Fatalf("owning tenant: %v", err)
	}
}

func TestProcess_AnotherTenantsMethodIsNotFound(t *testing.T) {
	svc, repo := newSvc()
	owner, other := uuid.New(), uuid.New()
	id := seed(repo, owner, model.Method{Partner: model.PartnerSelf, Type: "standard", RateType: model.RateFree})

	_, err := svc.Process(t.Context(), other, id, Consignment{OrderID: "o1"})
	if !apperrors.IsCode(err, apperrors.CodeNotFound) {
		t.Fatalf("err = %v, want %s", err, apperrors.CodeNotFound)
	}
}

func TestUpdate_SwitchingToFreeClearsThePrice(t *testing.T) {
	svc, repo := newSvc()
	tenant := uuid.New()
	id := seed(repo, tenant, model.Method{
		Partner: model.PartnerSelf, Type: "standard", RateType: model.RateFlat, Price: 99,
	})

	free := model.RateFree
	if _, err := svc.Update(t.Context(), tenant, id, Patch{RateType: &free}); err != nil {
		t.Fatalf("Update: %v", err)
	}
}

func TestList_PageSizeIsClamped(t *testing.T) {
	svc, repo := newSvc()
	got, err := svc.List(t.Context(), ListInput{TenantID: uuid.New(), Page: 2, PageSize: 5000})
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if got.PageSize != MaxPageSize {
		t.Errorf("pageSize = %d, want %d", got.PageSize, MaxPageSize)
	}
	if repo.lastFilter.Offset != MaxPageSize {
		t.Errorf("offset = %d, want %d", repo.lastFilter.Offset, MaxPageSize)
	}
}

func (f *fakeRepo) ByPartner(ctx context.Context, tenantID uuid.UUID, partner string) (*model.Method, error) {
	f.lastTenant = tenantID
	for i := range f.methods {
		m := &f.methods[i]
		if m.TenantID == tenantID && m.Partner == partner {
			return m, nil
		}
	}
	return nil, nil
}

func (f *fakeRepo) ByName(ctx context.Context, tenantID uuid.UUID, name string) (*model.Method, error) {
	f.lastTenant = tenantID
	for i := range f.methods {
		m := &f.methods[i]
		if m.TenantID == tenantID && m.Name == name {
			return m, nil
		}
	}
	return nil, nil
}

func TestEnsureDefaultMethod_CreatesAFreeStorePickupWhenTheTenantHasNone(t *testing.T) {
	repo := &fakeRepo{}
	tenant := uuid.New()

	id, err := New(repo).EnsureDefaultMethod(t.Context(), tenant)
	if err != nil {
		t.Fatalf("EnsureDefaultMethod: %v", err)
	}
	if repo.created == nil {
		t.Fatal("no method was created")
	}
	if repo.created.ID != id {
		t.Errorf("returned id = %s, want the created method %s", id, repo.created.ID)
	}
	if repo.created.TenantID != tenant {
		t.Errorf("tenant = %s, want %s", repo.created.TenantID, tenant)
	}
	if repo.created.Partner != model.PartnerPickup || repo.created.Type != model.TypePickup {
		t.Errorf("created %s/%s, want %s/%s", repo.created.Partner, repo.created.Type, model.PartnerPickup, model.TypePickup)
	}
	if repo.created.RateType != model.RateFree || repo.created.Price != 0 {
		t.Errorf("rate = %s at %.2f, want %s at 0", repo.created.RateType, repo.created.Price, model.RateFree)
	}
	if repo.created.FreeAbove != nil {
		t.Error("a free method must not carry a free-above threshold")
	}
	if string(repo.created.Regions) != "[]" {
		t.Errorf("regions = %q, want []", repo.created.Regions)
	}
	if !repo.created.Enabled {
		t.Error("the default method was created switched off")
	}
}

func TestEnsureDefaultMethod_ReusesTheTenantsOwnPickupMethod(t *testing.T) {
	tenant := uuid.New()
	existing := model.Method{
		ID: uuid.New(), TenantID: tenant, Name: "Collect from Andheri",
		Partner: model.PartnerPickup, Type: model.TypePickup, RateType: model.RateFree, Enabled: true,
	}
	repo := &fakeRepo{methods: []model.Method{existing}}

	id, err := New(repo).EnsureDefaultMethod(t.Context(), tenant)
	if err != nil {
		t.Fatalf("EnsureDefaultMethod: %v", err)
	}
	if id != existing.ID {
		t.Errorf("id = %s, want the existing method %s", id, existing.ID)
	}
	if repo.created != nil {
		t.Error("a second pickup method was created")
	}
}

func TestEnsureDefaultMethod_IgnoresAnotherTenantsPickupMethod(t *testing.T) {
	other := model.Method{
		ID: uuid.New(), TenantID: uuid.New(), Name: "Store pickup",
		Partner: model.PartnerPickup, Type: model.TypePickup, RateType: model.RateFree, Enabled: true,
	}
	repo := &fakeRepo{methods: []model.Method{other}}

	id, err := New(repo).EnsureDefaultMethod(t.Context(), uuid.New())
	if err != nil {
		t.Fatalf("EnsureDefaultMethod: %v", err)
	}
	if id == other.ID {
		t.Fatal("another tenant's delivery method was linked")
	}
	if repo.created == nil {
		t.Fatal("no method was created for the caller's tenant")
	}
}
