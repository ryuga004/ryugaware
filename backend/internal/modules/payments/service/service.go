package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/ryuga/ryugaware/backend/internal/modules/payments/model"
	"github.com/ryuga/ryugaware/backend/internal/modules/payments/repository"
	"github.com/ryuga/ryugaware/backend/internal/platform/database"
	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
)

const (
	DefaultPageSize = 20
	MaxPageSize     = 100
	DefaultCODName  = "Cash on delivery"
)

type Repo interface {
	List(ctx context.Context, f repository.Filter) ([]model.Method, error)
	Count(ctx context.Context, f repository.Filter) (int64, error)
	CountEnabled(ctx context.Context, tenantID uuid.UUID) (int64, error)
	ByTypeProvider(ctx context.Context, tenantID uuid.UUID, kind, provider string) (*model.Method, error)
	Get(ctx context.Context, tenantID, id uuid.UUID) (*model.Method, error)
	Create(ctx context.Context, m *model.Method) error
	Update(ctx context.Context, tenantID, id uuid.UUID, fields map[string]any) error
	Delete(ctx context.Context, tenantID, id uuid.UUID) error
}

type Service struct {
	repo       Repo
	strategies map[string]Strategy
	now        func() time.Time
}

func New(repo Repo) *Service {
	return &Service{repo: repo, strategies: strategies(), now: time.Now}
}

func (s *Service) WithClock(now func() time.Time) *Service {
	s.now = now
	return s
}

func (s *Service) strategyFor(kind string) (Strategy, error) {
	st, ok := s.strategies[kind]
	if !ok {
		return nil, fieldError("type", "choose cash on delivery, UPI or card")
	}
	return st, nil
}

type ListInput struct {
	TenantID uuid.UUID
	Search   string
	Type     string
	Page     int
	PageSize int
}

type ListResult struct {
	Methods  []model.Method
	Page     int
	PageSize int
	Total    int64
	Enabled  int64
}

func (s *Service) List(ctx context.Context, in ListInput) (*ListResult, error) {
	page := in.Page
	if page < 1 {
		page = 1
	}
	pageSize := in.PageSize
	if pageSize < 1 {
		pageSize = DefaultPageSize
	}
	if pageSize > MaxPageSize {
		pageSize = MaxPageSize
	}

	kind := in.Type
	if kind == "all" {
		kind = ""
	}

	filter := repository.Filter{
		TenantID: in.TenantID,
		Search:   strings.TrimSpace(in.Search),
		Type:     kind,
		Limit:    pageSize,
		Offset:   (page - 1) * pageSize,
	}

	total, err := s.repo.Count(ctx, filter)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	methods, err := s.repo.List(ctx, filter)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	enabled, err := s.repo.CountEnabled(ctx, in.TenantID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}

	return &ListResult{Methods: methods, Page: page, PageSize: pageSize, Total: total, Enabled: enabled}, nil
}

func (s *Service) Get(ctx context.Context, tenantID, id uuid.UUID) (*model.Method, error) {
	m, err := s.repo.Get(ctx, tenantID, id)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if m == nil {
		return nil, apperrors.NotFound("payment method")
	}
	return m, nil
}

func (s *Service) Create(ctx context.Context, tenantID uuid.UUID, in MethodInput) (*model.Method, error) {
	strategy, err := s.strategyFor(in.Type)
	if err != nil {
		return nil, err
	}
	if err := strategy.Create(ctx, in); err != nil {
		return nil, err
	}

	now := s.now().UTC()
	m := &model.Method{
		ID:          uuid.New(),
		TenantID:    tenantID,
		Type:        in.Type,
		Provider:    in.Provider,
		DisplayName: strings.TrimSpace(in.DisplayName),
		Enabled:     in.Enabled,
		TestMode:    in.TestMode,
		FeePercent:  in.FeePercent,
		FeeFixed:    in.FeeFixed,
		MinOrder:    in.MinOrder,
		MaxOrder:    in.MaxOrder,
		KeyID:       optional(in.KeyID),
		KeySecret:   optional(in.KeySecret),
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if err := s.repo.Create(ctx, m); err != nil {
		if database.IsUniqueViolation(err) {
			return nil, apperrors.Conflict("that payment method is already set up")
		}
		return nil, apperrors.Internal(err)
	}
	return m, nil
}

type Patch struct {
	DisplayName *string
	Enabled     *bool
	TestMode    *bool
	FeePercent  *float64
	FeeFixed    *float64
	MinOrder    *float64
	MaxOrder    *float64
	KeyID       *string
	KeySecret   *string
	ClearLimits bool
}

func (s *Service) Update(ctx context.Context, tenantID, id uuid.UUID, p Patch) (*model.Method, error) {
	current, err := s.Get(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}

	merged := MethodInput{
		Type:        current.Type,
		Provider:    current.Provider,
		DisplayName: current.DisplayName,
		Enabled:     current.Enabled,
		TestMode:    current.TestMode,
		FeePercent:  current.FeePercent,
		FeeFixed:    current.FeeFixed,
		MinOrder:    current.MinOrder,
		MaxOrder:    current.MaxOrder,
	}
	if current.KeyID != nil {
		merged.KeyID = *current.KeyID
	}

	fields := map[string]any{"updated_at": s.now().UTC()}

	if p.DisplayName != nil {
		merged.DisplayName = strings.TrimSpace(*p.DisplayName)
		fields["display_name"] = merged.DisplayName
	}
	if p.Enabled != nil {
		merged.Enabled = *p.Enabled
		fields["enabled"] = merged.Enabled
	}
	if p.TestMode != nil {
		merged.TestMode = *p.TestMode
		fields["test_mode"] = merged.TestMode
	}
	if p.FeePercent != nil {
		merged.FeePercent = *p.FeePercent
		fields["fee_percent"] = merged.FeePercent
	}
	if p.FeeFixed != nil {
		merged.FeeFixed = *p.FeeFixed
		fields["fee_fixed"] = merged.FeeFixed
	}
	if p.MinOrder != nil {
		merged.MinOrder = p.MinOrder
		fields["min_order"] = p.MinOrder
	}
	if p.MaxOrder != nil {
		merged.MaxOrder = p.MaxOrder
		fields["max_order"] = p.MaxOrder
	}
	if p.ClearLimits {
		merged.MinOrder, merged.MaxOrder = nil, nil
		fields["min_order"], fields["max_order"] = nil, nil
	}
	if p.KeyID != nil && *p.KeyID != "" {
		merged.KeyID = *p.KeyID
		fields["key_id"] = *p.KeyID
	}
	if p.KeySecret != nil && *p.KeySecret != "" {
		merged.KeySecret = *p.KeySecret
		fields["key_secret"] = *p.KeySecret
	}

	strategy, err := s.strategyFor(current.Type)
	if err != nil {
		return nil, err
	}
	if err := strategy.Create(ctx, merged); err != nil {
		return nil, err
	}

	if err := s.repo.Update(ctx, tenantID, id, fields); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.NotFound("payment method")
		}
		return nil, apperrors.Internal(err)
	}
	return s.Get(ctx, tenantID, id)
}

func (s *Service) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	if err := s.repo.Delete(ctx, tenantID, id); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return apperrors.NotFound("payment method")
		}
		return apperrors.Internal(err)
	}
	return nil
}

type ProcessResult struct {
	Method  *model.Method
	Outcome ChargeOutcome
	FeeRs   float64
}

func (s *Service) Process(ctx context.Context, tenantID, id uuid.UUID, c Charge) (*ProcessResult, error) {
	m, err := s.Get(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if !m.Enabled {
		return nil, apperrors.Validation("that payment method is switched off")
	}
	if c.AmountRs <= 0 {
		return nil, fieldError("amount", "enter an amount greater than zero")
	}

	strategy, err := s.strategyFor(m.Type)
	if err != nil {
		return nil, err
	}
	outcome, err := strategy.Process(ctx, m, c)
	if err != nil {
		return nil, err
	}

	return &ProcessResult{
		Method:  m,
		Outcome: outcome,
		FeeRs:   c.AmountRs*m.FeePercent/100 + m.FeeFixed,
	}, nil
}

func optional(v string) *string {
	if v == "" {
		return nil
	}
	return &v
}

func (s *Service) EnsureDefaultMethod(ctx context.Context, tenantID uuid.UUID) (uuid.UUID, error) {
	existing, err := s.repo.ByTypeProvider(ctx, tenantID, model.TypeCOD, model.ProviderOffline)
	if err != nil {
		return uuid.Nil, apperrors.Internal(err)
	}
	if existing != nil {
		return existing.ID, nil
	}

	now := s.now().UTC()
	m := &model.Method{
		ID:          uuid.New(),
		TenantID:    tenantID,
		Type:        model.TypeCOD,
		Provider:    model.ProviderOffline,
		DisplayName: DefaultCODName,
		Enabled:     true,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if err := s.repo.Create(ctx, m); err != nil {
		if database.IsUniqueViolation(err) {
			raced, lookupErr := s.repo.ByTypeProvider(ctx, tenantID, model.TypeCOD, model.ProviderOffline)
			if lookupErr != nil {
				return uuid.Nil, apperrors.Internal(lookupErr)
			}
			if raced != nil {
				return raced.ID, nil
			}
		}
		return uuid.Nil, apperrors.Internal(err)
	}
	return m.ID, nil
}
