package service

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/ryuga/ryugaware/backend/internal/modules/delivery/model"
	"github.com/ryuga/ryugaware/backend/internal/modules/delivery/repository"
	"github.com/ryuga/ryugaware/backend/internal/platform/database"
	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
)

const (
	DefaultPageSize = 20
	MaxPageSize     = 100
	MaxRegions      = 60

	DefaultPickupName = "Store pickup"
	CoverageAllIndia  = "all_india"
)

type Repo interface {
	List(ctx context.Context, f repository.Filter) ([]model.Method, error)
	Count(ctx context.Context, f repository.Filter) (int64, error)
	CountEnabled(ctx context.Context, tenantID uuid.UUID) (int64, error)
	ByPartner(ctx context.Context, tenantID uuid.UUID, partner string) (*model.Method, error)
	ByName(ctx context.Context, tenantID uuid.UUID, name string) (*model.Method, error)
	Get(ctx context.Context, tenantID, id uuid.UUID) (*model.Method, error)
	Create(ctx context.Context, m *model.Method) error
	Update(ctx context.Context, tenantID, id uuid.UUID, fields map[string]any) error
	Delete(ctx context.Context, tenantID, id uuid.UUID) error
}

type Service struct {
	repo     Repo
	partners map[string]Partner
	now      func() time.Time
}

func New(repo Repo) *Service {
	return &Service{repo: repo, partners: partners(), now: time.Now}
}

func (s *Service) WithClock(now func() time.Time) *Service {
	s.now = now
	return s
}

func (s *Service) partnerFor(name string) (Partner, error) {
	p, ok := s.partners[name]
	if !ok {
		return nil, fieldError("partner", "choose Shiprocket, your own fleet or store pickup")
	}
	return p, nil
}

type MethodInput struct {
	Name      string
	Partner   string
	Type      string
	MinDays   int
	MaxDays   int
	RateType  string
	Price     float64
	FreeAbove *float64
	Coverage  string
	Regions   []string
	Enabled   bool
}

type ListInput struct {
	TenantID uuid.UUID
	Search   string
	Status   string
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

	status := in.Status
	if status == "all" {
		status = ""
	}

	filter := repository.Filter{
		TenantID: in.TenantID,
		Search:   strings.TrimSpace(in.Search),
		Status:   status,
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
		return nil, apperrors.NotFound("delivery method")
	}
	return m, nil
}

func (s *Service) validate(ctx context.Context, in MethodInput) (Partner, error) {
	partner, err := s.partnerFor(in.Partner)
	if err != nil {
		return nil, err
	}
	if in.MaxDays < in.MinDays {
		return nil, fieldError("maxDays", "the longest time cannot be shorter than the shortest")
	}
	if in.RateType == model.RateFreeAbove && in.FreeAbove == nil {
		return nil, fieldError("freeAbove", "set the order value above which delivery is free")
	}
	if in.RateType != model.RateFreeAbove && in.FreeAbove != nil {
		return nil, fieldError("freeAbove", "this only applies to the free-above-a-value rate")
	}
	if in.RateType == model.RateFree && in.Price != 0 {
		return nil, fieldError("price", "a free method cannot have a price")
	}
	regionsAllowed := in.Coverage == "states" || in.Coverage == "pincodes"
	if !regionsAllowed && len(in.Regions) > 0 {
		return nil, fieldError("regions", "regions apply to state or PIN code coverage only")
	}
	if regionsAllowed && len(in.Regions) == 0 {
		return nil, fieldError("regions", "add at least one region")
	}
	if len(in.Regions) > MaxRegions {
		return nil, fieldError("regions", "use 60 regions or fewer")
	}
	if err := partner.Create(ctx, in); err != nil {
		return nil, err
	}
	return partner, nil
}

func (s *Service) Create(ctx context.Context, tenantID uuid.UUID, in MethodInput) (*model.Method, error) {
	if _, err := s.validate(ctx, in); err != nil {
		return nil, err
	}

	regions, err := json.Marshal(in.Regions)
	if err != nil {
		return nil, apperrors.Internal(err)
	}

	now := s.now().UTC()
	m := &model.Method{
		ID:        uuid.New(),
		TenantID:  tenantID,
		Name:      strings.TrimSpace(in.Name),
		Partner:   in.Partner,
		Type:      in.Type,
		MinDays:   int16(in.MinDays),
		MaxDays:   int16(in.MaxDays),
		RateType:  in.RateType,
		Price:     in.Price,
		FreeAbove: in.FreeAbove,
		Coverage:  in.Coverage,
		Regions:   regions,
		Enabled:   in.Enabled,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := s.repo.Create(ctx, m); err != nil {
		if database.IsUniqueViolation(err) {
			return nil, apperrors.Conflict("a delivery method with that name already exists")
		}
		return nil, apperrors.Internal(err)
	}
	return m, nil
}

type Patch struct {
	Name      *string
	MinDays   *int
	MaxDays   *int
	RateType  *string
	Price     *float64
	FreeAbove *float64
	Coverage  *string
	Regions   *[]string
	Enabled   *bool
}

func (s *Service) Update(ctx context.Context, tenantID, id uuid.UUID, p Patch) (*model.Method, error) {
	current, err := s.Get(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}

	var currentRegions []string
	if len(current.Regions) > 0 {
		_ = json.Unmarshal(current.Regions, &currentRegions)
	}

	merged := MethodInput{
		Name:      current.Name,
		Partner:   current.Partner,
		Type:      current.Type,
		MinDays:   int(current.MinDays),
		MaxDays:   int(current.MaxDays),
		RateType:  current.RateType,
		Price:     current.Price,
		FreeAbove: current.FreeAbove,
		Coverage:  current.Coverage,
		Regions:   currentRegions,
		Enabled:   current.Enabled,
	}

	fields := map[string]any{"updated_at": s.now().UTC()}
	if p.Name != nil {
		merged.Name = strings.TrimSpace(*p.Name)
		fields["name"] = merged.Name
	}
	if p.MinDays != nil {
		merged.MinDays = *p.MinDays
		fields["min_days"] = int16(*p.MinDays)
	}
	if p.MaxDays != nil {
		merged.MaxDays = *p.MaxDays
		fields["max_days"] = int16(*p.MaxDays)
	}
	if p.RateType != nil {
		merged.RateType = *p.RateType
		fields["rate_type"] = merged.RateType
		if merged.RateType != model.RateFreeAbove {
			merged.FreeAbove = nil
			fields["free_above"] = nil
		}
		if merged.RateType == model.RateFree {
			merged.Price = 0
			fields["price"] = float64(0)
		}
	}
	if p.Price != nil {
		merged.Price = *p.Price
		fields["price"] = merged.Price
	}
	if p.FreeAbove != nil {
		merged.FreeAbove = p.FreeAbove
		fields["free_above"] = p.FreeAbove
	}
	if p.Coverage != nil {
		merged.Coverage = *p.Coverage
		fields["coverage"] = merged.Coverage
		if merged.Coverage != "states" && merged.Coverage != "pincodes" {
			merged.Regions = nil
			fields["regions"] = []byte("[]")
		}
	}
	if p.Regions != nil {
		merged.Regions = *p.Regions
		encoded, err := json.Marshal(*p.Regions)
		if err != nil {
			return nil, apperrors.Internal(err)
		}
		fields["regions"] = encoded
	}
	if p.Enabled != nil {
		merged.Enabled = *p.Enabled
		fields["enabled"] = merged.Enabled
	}

	if _, err := s.validate(ctx, merged); err != nil {
		return nil, err
	}

	if err := s.repo.Update(ctx, tenantID, id, fields); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.NotFound("delivery method")
		}
		if database.IsUniqueViolation(err) {
			return nil, apperrors.Conflict("a delivery method with that name already exists")
		}
		return nil, apperrors.Internal(err)
	}
	return s.Get(ctx, tenantID, id)
}

func (s *Service) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	if err := s.repo.Delete(ctx, tenantID, id); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return apperrors.NotFound("delivery method")
		}
		return apperrors.Internal(err)
	}
	return nil
}

type ProcessResult struct {
	Method   *model.Method
	Dispatch Dispatch
	FeeRs    float64
}

func (s *Service) Process(ctx context.Context, tenantID, id uuid.UUID, c Consignment) (*ProcessResult, error) {
	m, err := s.Get(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if !m.Enabled {
		return nil, apperrors.Validation("that delivery method is switched off")
	}

	partner, err := s.partnerFor(m.Partner)
	if err != nil {
		return nil, err
	}
	dispatch, err := partner.Process(ctx, m, c)
	if err != nil {
		return nil, err
	}

	return &ProcessResult{Method: m, Dispatch: dispatch, FeeRs: DeliveryFee(m, c.OrderRs)}, nil
}

func DeliveryFee(m *model.Method, orderRs float64) float64 {
	switch m.RateType {
	case model.RateFree:
		return 0
	case model.RateFreeAbove:
		if m.FreeAbove != nil && orderRs >= *m.FreeAbove {
			return 0
		}
		return m.Price
	default:
		return m.Price
	}
}

func Regions(m *model.Method) []string {
	out := []string{}
	if len(m.Regions) == 0 {
		return out
	}
	if err := json.Unmarshal(m.Regions, &out); err != nil {
		return []string{}
	}
	return out
}

func (s *Service) EnsureDefaultMethod(ctx context.Context, tenantID uuid.UUID) (uuid.UUID, error) {
	existing, err := s.repo.ByPartner(ctx, tenantID, model.PartnerPickup)
	if err != nil {
		return uuid.Nil, apperrors.Internal(err)
	}
	if existing != nil {
		return existing.ID, nil
	}

	now := s.now().UTC()
	m := &model.Method{
		ID:        uuid.New(),
		TenantID:  tenantID,
		Name:      DefaultPickupName,
		Partner:   model.PartnerPickup,
		Type:      model.TypePickup,
		MinDays:   0,
		MaxDays:   0,
		RateType:  model.RateFree,
		Price:     0,
		Coverage:  CoverageAllIndia,
		Regions:   []byte("[]"),
		Enabled:   true,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := s.repo.Create(ctx, m); err != nil {
		if database.IsUniqueViolation(err) {
			raced, lookupErr := s.repo.ByName(ctx, tenantID, DefaultPickupName)
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
