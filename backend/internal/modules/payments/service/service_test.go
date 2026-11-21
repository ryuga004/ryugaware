package service

import (
	"context"
	"testing"

	"github.com/google/uuid"

	"github.com/ryuga/ryugaware/backend/internal/modules/payments/model"
	"github.com/ryuga/ryugaware/backend/internal/modules/payments/repository"
	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
)

type fakeRepo struct {
	methods    []model.Method
	created    *model.Method
	lastFilter repository.Filter
	lastTenant uuid.UUID
	deleted    bool
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
func (f *fakeRepo) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	f.lastTenant = tenantID
	f.deleted = true
	return nil
}

func rs(v float64) *float64 { return &v }

func newSvc() (*Service, *fakeRepo) {
	repo := &fakeRepo{}
	return New(repo), repo
}

func TestCreate_CODRejectsGatewayCredentials(t *testing.T) {
	svc, _ := newSvc()
	_, err := svc.Create(t.Context(), uuid.New(), MethodInput{
		Type: model.TypeCOD, Provider: model.ProviderOffline,
		DisplayName: "Cash on delivery", KeyID: "rzp_live_abc",
	})
	if !apperrors.IsCode(err, apperrors.CodeValidation) {
		t.Fatalf("err = %v, want %s", err, apperrors.CodeValidation)
	}
}

func TestCreate_CODRejectsTestMode(t *testing.T) {
	svc, _ := newSvc()
	_, err := svc.Create(t.Context(), uuid.New(), MethodInput{
		Type: model.TypeCOD, Provider: model.ProviderOffline,
		DisplayName: "Cash on delivery", TestMode: true,
	})
	if !apperrors.IsCode(err, apperrors.CodeValidation) {
		t.Fatalf("err = %v, want %s", err, apperrors.CodeValidation)
	}
}

func TestCreate_UPIRequiresKeyID(t *testing.T) {
	svc, _ := newSvc()
	_, err := svc.Create(t.Context(), uuid.New(), MethodInput{
		Type: model.TypeUPI, Provider: model.ProviderPhonePe, DisplayName: "PhonePe",
	})
	if !apperrors.IsCode(err, apperrors.CodeValidation) {
		t.Fatalf("err = %v, want %s", err, apperrors.CodeValidation)
	}
}

func TestCreate_GatewayRejectsOrderLimits(t *testing.T) {
	svc, _ := newSvc()
	_, err := svc.Create(t.Context(), uuid.New(), MethodInput{
		Type: model.TypeCard, Provider: model.ProviderRazorpay,
		DisplayName: "Card", KeyID: "rzp_live_abc", MinOrder: rs(100),
	})
	if !apperrors.IsCode(err, apperrors.CodeValidation) {
		t.Fatalf("err = %v, want %s", err, apperrors.CodeValidation)
	}
}

func TestCreate_UnknownProviderForType(t *testing.T) {
	cases := []struct{ name, kind, provider string }{
		{"upi with a card provider", model.TypeUPI, model.ProviderRazorpay},
		{"card with a upi provider", model.TypeCard, model.ProviderPhonePe},
		{"cod with a gateway provider", model.TypeCOD, model.ProviderPaytm},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			svc, _ := newSvc()
			_, err := svc.Create(t.Context(), uuid.New(), MethodInput{
				Type: tc.kind, Provider: tc.provider, DisplayName: "X", KeyID: "k",
			})
			if !apperrors.IsCode(err, apperrors.CodeValidation) {
				t.Fatalf("err = %v, want %s", err, apperrors.CodeValidation)
			}
		})
	}
}

func TestCreate_EachSupportedProviderIsAccepted(t *testing.T) {
	cases := []struct{ kind, provider, key string }{
		{model.TypeCOD, model.ProviderOffline, ""},
		{model.TypeUPI, model.ProviderPhonePe, "k1"},
		{model.TypeUPI, model.ProviderPaytm, "k2"},
		{model.TypeUPI, model.ProviderGPay, "k3"},
		{model.TypeCard, model.ProviderRazorpay, "k4"},
	}
	for _, tc := range cases {
		t.Run(tc.kind+"/"+tc.provider, func(t *testing.T) {
			svc, repo := newSvc()
			tenant := uuid.New()
			m, err := svc.Create(t.Context(), tenant, MethodInput{
				Type: tc.kind, Provider: tc.provider, DisplayName: "X", KeyID: tc.key, Enabled: true,
			})
			if err != nil {
				t.Fatalf("Create: %v", err)
			}
			if m.TenantID != tenant {
				t.Errorf("tenant = %s, want %s", m.TenantID, tenant)
			}
			if repo.created == nil {
				t.Error("nothing was persisted")
			}
		})
	}
}

func seedMethod(repo *fakeRepo, tenant uuid.UUID, m model.Method) uuid.UUID {
	m.ID = uuid.New()
	m.TenantID = tenant
	m.Enabled = true
	repo.methods = append(repo.methods, m)
	return m.ID
}

func TestProcess_CODHonoursOrderLimits(t *testing.T) {
	svc, repo := newSvc()
	tenant := uuid.New()
	id := seedMethod(repo, tenant, model.Method{
		Type: model.TypeCOD, Provider: model.ProviderOffline,
		MinOrder: rs(200), MaxOrder: rs(5000),
	})

	if _, err := svc.Process(t.Context(), tenant, id, Charge{OrderID: "o1", AmountRs: 100}); !apperrors.IsCode(err, apperrors.CodeValidation) {
		t.Errorf("below minimum: err = %v, want %s", err, apperrors.CodeValidation)
	}
	if _, err := svc.Process(t.Context(), tenant, id, Charge{OrderID: "o2", AmountRs: 9000}); !apperrors.IsCode(err, apperrors.CodeValidation) {
		t.Errorf("above maximum: err = %v, want %s", err, apperrors.CodeValidation)
	}
	got, err := svc.Process(t.Context(), tenant, id, Charge{OrderID: "o3", AmountRs: 1000, Reference: "o3"})
	if err != nil {
		t.Fatalf("within range: %v", err)
	}
	if got.Outcome.Status != StatusPending {
		t.Errorf("status = %q, want %q", got.Outcome.Status, StatusPending)
	}
}

func TestProcess_RoutesToTheProvidersAdapter(t *testing.T) {
	cases := []struct{ kind, provider, wantLabel string }{
		{model.TypeUPI, model.ProviderPhonePe, "PhonePe"},
		{model.TypeUPI, model.ProviderPaytm, "Paytm"},
		{model.TypeUPI, model.ProviderGPay, "Google Pay"},
		{model.TypeCard, model.ProviderRazorpay, "Razorpay"},
		{model.TypeCOD, model.ProviderOffline, "Cash on delivery"},
	}
	for _, tc := range cases {
		t.Run(tc.provider, func(t *testing.T) {
			svc, repo := newSvc()
			tenant := uuid.New()
			key := "k"
			id := seedMethod(repo, tenant, model.Method{Type: tc.kind, Provider: tc.provider, KeyID: &key})

			got, err := svc.Process(t.Context(), tenant, id, Charge{OrderID: "o1", AmountRs: 500, Reference: "o1"})
			if err != nil {
				t.Fatalf("Process: %v", err)
			}
			if got.Outcome.ProviderLabel != tc.wantLabel {
				t.Errorf("provider label = %q, want %q", got.Outcome.ProviderLabel, tc.wantLabel)
			}
		})
	}
}

func TestProcess_FeeIsPercentPlusFixed(t *testing.T) {
	svc, repo := newSvc()
	tenant := uuid.New()
	key := "k"
	id := seedMethod(repo, tenant, model.Method{
		Type: model.TypeCard, Provider: model.ProviderRazorpay,
		KeyID: &key, FeePercent: 2, FeeFixed: 3,
	})

	got, err := svc.Process(t.Context(), tenant, id, Charge{OrderID: "o1", AmountRs: 1000, Reference: "o1"})
	if err != nil {
		t.Fatalf("Process: %v", err)
	}
	if got.FeeRs != 23 {
		t.Errorf("fee = %v, want 23 (2%% of 1000 + 3)", got.FeeRs)
	}
}

func TestProcess_DisabledMethodIsRejected(t *testing.T) {
	svc, repo := newSvc()
	tenant := uuid.New()
	m := model.Method{ID: uuid.New(), TenantID: tenant, Type: model.TypeCOD, Provider: model.ProviderOffline, Enabled: false}
	repo.methods = append(repo.methods, m)

	_, err := svc.Process(t.Context(), tenant, m.ID, Charge{OrderID: "o1", AmountRs: 100})
	if !apperrors.IsCode(err, apperrors.CodeValidation) {
		t.Fatalf("err = %v, want %s", err, apperrors.CodeValidation)
	}
}

func TestProcess_GatewayMethodWithoutCredentialsIsRejected(t *testing.T) {
	svc, repo := newSvc()
	tenant := uuid.New()
	id := seedMethod(repo, tenant, model.Method{Type: model.TypeUPI, Provider: model.ProviderPhonePe})

	_, err := svc.Process(t.Context(), tenant, id, Charge{OrderID: "o1", AmountRs: 100})
	if !apperrors.IsCode(err, apperrors.CodeValidation) {
		t.Fatalf("err = %v, want %s", err, apperrors.CodeValidation)
	}
}

func TestGet_AnotherTenantsMethodIsNotFound(t *testing.T) {
	svc, repo := newSvc()
	owner, other := uuid.New(), uuid.New()
	id := seedMethod(repo, owner, model.Method{Type: model.TypeCOD, Provider: model.ProviderOffline})

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
	id := seedMethod(repo, owner, model.Method{Type: model.TypeCOD, Provider: model.ProviderOffline})

	_, err := svc.Process(t.Context(), other, id, Charge{OrderID: "o1", AmountRs: 100})
	if !apperrors.IsCode(err, apperrors.CodeNotFound) {
		t.Fatalf("err = %v, want %s", err, apperrors.CodeNotFound)
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

func (f *fakeRepo) EnabledIDs(ctx context.Context, tenantID uuid.UUID) ([]uuid.UUID, error) {
	f.lastTenant = tenantID
	ids := make([]uuid.UUID, 0, len(f.methods))
	for i := range f.methods {
		if f.methods[i].TenantID == tenantID && f.methods[i].Enabled {
			ids = append(ids, f.methods[i].ID)
		}
	}
	return ids, nil
}
