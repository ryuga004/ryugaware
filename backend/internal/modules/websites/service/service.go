package service

import (
	"context"
	"encoding/json"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/ryuga/ryugaware/backend/internal/modules/websites/model"
	"github.com/ryuga/ryugaware/backend/internal/modules/websites/repository"
	"github.com/ryuga/ryugaware/backend/internal/platform/database"
	"github.com/ryuga/ryugaware/backend/internal/platform/storage"
	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
)

const (
	DefaultPageSize = 20
	MaxPageSize     = 100
)

var reservedSubdomains = map[string]bool{
	"www": true, "api": true, "admin": true, "app": true, "mail": true, "smtp": true,
	"static": true, "assets": true, "cdn": true, "media": true, "files": true,
	"status": true, "docs": true, "help": true, "support": true, "blog": true,
	"dashboard": true, "console": true, "preview": true, "sites": true, "ryugaware": true,
}

type Repo interface {
	InTransaction(ctx context.Context, fn func(tx repository.Tx) error) error
	List(ctx context.Context, f repository.Filter) ([]model.WebsiteRow, error)
	Count(ctx context.Context, f repository.Filter) (int64, error)
	CountByStatus(ctx context.Context, tenantID uuid.UUID) (map[string]int64, error)
	LockTenantAndCount(ctx context.Context, tx repository.Tx, tenantID uuid.UUID) (int64, error)
	Get(ctx context.Context, tenantID, id uuid.UUID) (*model.WebsiteRow, error)
	Create(ctx context.Context, tx repository.Tx, w *model.Website) error
	CreatePages(ctx context.Context, tx repository.Tx, pages []model.Page) error
	LinkPaymentMethods(ctx context.Context, tx repository.Tx, links []model.PaymentLink) error
	LinkDeliveryMethods(ctx context.Context, tx repository.Tx, links []model.DeliveryLink) error
	Update(ctx context.Context, tenantID, id uuid.UUID, fields map[string]any) error
	Delete(ctx context.Context, tenantID, id uuid.UUID) error
	Pages(ctx context.Context, tenantID, websiteID uuid.UUID) ([]model.Page, error)
	TemplateBySlug(ctx context.Context, tenantID uuid.UUID, slug string) (*model.TemplateSource, error)
	TemplatePages(ctx context.Context, templateID uuid.UUID) ([]model.TemplatePage, error)
	SubdomainTaken(ctx context.Context, subdomain string) (bool, error)
	BySubdomain(ctx context.Context, subdomain string) (*model.WebsiteRow, error)
	SaveContent(ctx context.Context, tx repository.Tx, tenantID, websiteID uuid.UUID, theme, chrome []byte, at time.Time) error
	SavePage(ctx context.Context, tx repository.Tx, tenantID, websiteID uuid.UUID, key string, fields map[string]any) error
	PaymentChoices(ctx context.Context, tenantID, websiteID uuid.UUID) ([]model.PaymentChoice, error)
	DeliveryChoices(ctx context.Context, tenantID, websiteID uuid.UUID) ([]model.DeliveryChoice, error)
	SelectPaymentMethod(ctx context.Context, tenantID, websiteID, methodID uuid.UUID, at time.Time) error
	DeselectPaymentMethod(ctx context.Context, tenantID, websiteID, methodID uuid.UUID) error
	SelectDeliveryMethod(ctx context.Context, tenantID, websiteID, methodID uuid.UUID, at time.Time) error
	DeselectDeliveryMethod(ctx context.Context, tenantID, websiteID, methodID uuid.UUID) error
	PaymentOptions(ctx context.Context, tenantID, websiteID uuid.UUID) ([]model.PaymentOption, error)
	DeliveryOptions(ctx context.Context, tenantID, websiteID uuid.UUID) ([]model.DeliveryOption, error)
}

type Licenses interface {
	WebsiteAllowance(ctx context.Context, tenantID uuid.UUID) (int, error)
	StorageLimitBytes(ctx context.Context, tenantID uuid.UUID) (int64, error)
}

type Methods interface {
	EnsureDefaultMethod(ctx context.Context, tenantID uuid.UUID) (uuid.UUID, error)
}

type Service struct {
	repo     Repo
	licenses Licenses
	payments Methods
	delivery Methods
	store    storage.Store
	assets   AssetPolicy
	now      func() time.Time
}

func New(repo Repo, licenses Licenses, payments, delivery Methods, store storage.Store) *Service {
	return &Service{repo: repo, licenses: licenses, payments: payments, delivery: delivery, store: store, now: time.Now}
}

func (s *Service) WithClock(now func() time.Time) *Service {
	s.now = now
	return s
}

type CreateInput struct {
	TenantID     uuid.UUID
	CreatedBy    uuid.UUID
	Name         string
	Subdomain    string
	TemplateSlug string
	Theme        map[string]any
	DisabledPage map[string]bool
}

type Detail struct {
	Website      model.Website
	Pages        []model.Page
	TemplateName string
}

func (s *Service) Create(ctx context.Context, in CreateInput) (*model.WebsiteRow, error) {
	name := strings.TrimSpace(in.Name)
	subdomain := strings.ToLower(strings.TrimSpace(in.Subdomain))
	if err := validateSubdomain(subdomain); err != nil {
		return nil, err
	}

	template, err := s.repo.TemplateBySlug(ctx, in.TenantID, in.TemplateSlug)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if template == nil {
		return nil, apperrors.NotFound("template")
	}

	templatePages, err := s.repo.TemplatePages(ctx, template.ID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}

	allowance, err := s.licenses.WebsiteAllowance(ctx, in.TenantID)
	if err != nil {
		return nil, err
	}

	paymentID, err := s.payments.EnsureDefaultMethod(ctx, in.TenantID)
	if err != nil {
		return nil, err
	}
	deliveryID, err := s.delivery.EnsureDefaultMethod(ctx, in.TenantID)
	if err != nil {
		return nil, err
	}

	theme := template.Theme
	if len(in.Theme) > 0 {
		merged, err := mergeTheme(template.Theme, in.Theme)
		if err != nil {
			return nil, apperrors.Internal(err)
		}
		theme = merged
	}

	now := s.now().UTC()
	websiteID := uuid.New()
	website := &model.Website{
		ID:              websiteID,
		TenantID:        in.TenantID,
		TemplateID:      template.ID,
		TemplateVersion: template.Version,
		Name:            name,
		Subdomain:       subdomain,
		Status:          model.StatusDraft,
		StoragePrefix:   storage.WebsitePrefix(in.TenantID, websiteID),
		Theme:           jsonOrDefault(theme, "{}"),
		Chrome:          []byte("[]"),
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if in.CreatedBy != uuid.Nil {
		owner := in.CreatedBy
		website.CreatedBy = &owner
	}

	ids := &sectionNumberer{}
	chrome, err := instantiateChrome(template.Chrome, ids)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	website.Chrome = chrome

	pages := make([]model.Page, 0, len(templatePages))
	for _, tp := range templatePages {
		preset := decodePage(tp.Variables)
		sections, err := instantiateSections(preset.Sections, ids)
		if err != nil {
			return nil, apperrors.Internal(err)
		}

		enabled := preset.Enabled == nil || *preset.Enabled
		if in.DisabledPage[tp.Key] {
			enabled = false
		}
		if preset.Required {
			enabled = true
		}

		title := preset.Title
		if title == "" {
			title = preset.Label
		}

		pages = append(pages, model.Page{
			ID:        uuid.New(),
			WebsiteID: websiteID,
			TenantID:  in.TenantID,
			Key:       tp.Key,
			Path:      tp.Path,
			Kind:      tp.Kind,
			Title:     title,
			Enabled:   enabled,
			SortOrder: tp.SortOrder,
			SEO:       rawOrDefault(preset.SEO, "{}"),
			Sections:  sections,
			Settings:  rawOrDefault(preset.Settings, "{}"),
			CreatedAt: now,
			UpdatedAt: now,
		})
	}

	paymentLinks := []model.PaymentLink{
		{WebsiteID: websiteID, PaymentMethodID: paymentID, TenantID: in.TenantID, CreatedAt: now},
	}
	deliveryLinks := []model.DeliveryLink{
		{WebsiteID: websiteID, DeliveryMethodID: deliveryID, TenantID: in.TenantID, CreatedAt: now},
	}

	err = s.repo.InTransaction(ctx, func(tx repository.Tx) error {
		used, err := s.repo.LockTenantAndCount(ctx, tx, in.TenantID)
		if err != nil {
			return err
		}
		if used >= int64(allowance) {
			return apperrors.Forbidden("Your licence includes " + plural(allowance, "website") + ". Remove one or upgrade to add another.")
		}
		if err := s.repo.Create(ctx, tx, website); err != nil {
			return err
		}
		if err := s.repo.CreatePages(ctx, tx, pages); err != nil {
			return err
		}
		if err := s.repo.LinkPaymentMethods(ctx, tx, paymentLinks); err != nil {
			return err
		}
		return s.repo.LinkDeliveryMethods(ctx, tx, deliveryLinks)
	})
	if err != nil {
		if appErr, ok := apperrors.As(err); ok {
			return nil, appErr
		}
		if database.IsUniqueViolation(err) {
			switch database.ConstraintName(err) {
			case "websites_subdomain_key":
				return nil, apperrors.Conflict("that address is already taken")
			case "websites_tenant_id_name_key":
				return nil, apperrors.Conflict("you already have a website with that name")
			}
			return nil, apperrors.Conflict("that website already exists")
		}
		return nil, apperrors.Internal(err)
	}
	return &model.WebsiteRow{
		Website:        *website,
		TemplateSlug:   template.Slug,
		TemplateName:   template.Name,
		ThumbnailTheme: template.ThumbnailTheme,
	}, nil
}

type ListInput struct {
	TenantID uuid.UUID
	Search   string
	Status   string
	Page     int
	PageSize int
}

type ListResult struct {
	Websites []model.WebsiteRow
	Counts   map[string]int64
	Page     int
	PageSize int
	Total    int64
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
	sites, err := s.repo.List(ctx, filter)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	counts, err := s.repo.CountByStatus(ctx, in.TenantID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	return &ListResult{Websites: sites, Counts: counts, Page: page, PageSize: pageSize, Total: total}, nil
}

func (s *Service) Get(ctx context.Context, tenantID, id uuid.UUID) (*model.WebsiteRow, error) {
	w, err := s.repo.Get(ctx, tenantID, id)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if w == nil {
		return nil, apperrors.NotFound("website")
	}
	return w, nil
}

func (s *Service) Pages(ctx context.Context, tenantID, id uuid.UUID) ([]model.Page, error) {
	if _, err := s.Get(ctx, tenantID, id); err != nil {
		return nil, err
	}
	pages, err := s.repo.Pages(ctx, tenantID, id)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	return pages, nil
}

type Patch struct {
	Name    *string
	Status  *string
	Publish *bool
}

func (s *Service) Update(ctx context.Context, tenantID, id uuid.UUID, p Patch) (*model.WebsiteRow, error) {
	current, err := s.Get(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}

	now := s.now().UTC()
	fields := map[string]any{"updated_at": now}

	if p.Name != nil {
		name := strings.TrimSpace(*p.Name)
		if name == "" {
			return nil, fieldError("name", "enter a website name")
		}
		fields["name"] = name
	}
	if p.Status != nil {
		status := *p.Status
		if status != model.StatusDraft && status != model.StatusLive && status != model.StatusPaused {
			return nil, fieldError("status", "choose draft, live or paused")
		}
		if status == model.StatusLive && current.PublishedAt == nil {
			fields["published_at"] = now
		}
		fields["status"] = status
	}
	if p.Publish != nil && *p.Publish {
		fields["status"] = model.StatusLive
		if current.PublishedAt == nil {
			fields["published_at"] = now
		}
	}

	if err := s.repo.Update(ctx, tenantID, id, fields); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.NotFound("website")
		}
		if database.IsUniqueViolation(err) {
			return nil, apperrors.Conflict("you already have a website with that name")
		}
		return nil, apperrors.Internal(err)
	}
	return s.Get(ctx, tenantID, id)
}

func (s *Service) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	website, err := s.Get(ctx, tenantID, id)
	if err != nil {
		return err
	}
	if err := s.repo.Delete(ctx, tenantID, id); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return apperrors.NotFound("website")
		}
		return apperrors.Internal(err)
	}
	if s.store != nil {
		if _, err := s.store.DeletePrefix(ctx, website.StoragePrefix); err != nil {
			return apperrors.Internal(err)
		}
	}
	return nil
}

func validateSubdomain(sub string) error {
	if len(sub) < 3 || len(sub) > 63 {
		return fieldError("subdomain", "use between 3 and 63 characters")
	}
	if reservedSubdomains[sub] {
		return fieldError("subdomain", "that address is reserved")
	}
	for i, r := range sub {
		isLower := r >= 'a' && r <= 'z'
		isDigit := r >= '0' && r <= '9'
		isHyphen := r == '-'
		if !isLower && !isDigit && !isHyphen {
			return fieldError("subdomain", "use lowercase letters, numbers and hyphens only")
		}
		if isHyphen && (i == 0 || i == len(sub)-1) {
			return fieldError("subdomain", "cannot start or end with a hyphen")
		}
	}
	return nil
}

func mergeTheme(base []byte, overrides map[string]any) ([]byte, error) {
	merged := map[string]any{}
	if len(base) > 0 {
		if err := json.Unmarshal(base, &merged); err != nil {
			merged = map[string]any{}
		}
	}
	for k, v := range overrides {
		merged[k] = v
	}
	return json.Marshal(merged)
}

func jsonOrDefault(raw []byte, fallback string) []byte {
	if len(raw) == 0 {
		return []byte(fallback)
	}
	return raw
}

func plural(n int, noun string) string {
	if n == 1 {
		return "1 " + noun
	}
	return strconv.Itoa(n) + " " + noun + "s"
}

func fieldError(field, message string) error {
	return apperrors.Validation("the request is invalid", apperrors.FieldError{Field: field, Message: message})
}

type SubdomainCheck struct {
	Subdomain  string
	Available  bool
	Suggestion string
}

func (s *Service) CheckSubdomain(ctx context.Context, raw string) (*SubdomainCheck, error) {
	sub := strings.ToLower(strings.TrimSpace(raw))
	check := &SubdomainCheck{Subdomain: sub}

	if err := validateSubdomain(sub); err != nil {
		return check, nil
	}
	taken, err := s.repo.SubdomainTaken(ctx, sub)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if !taken {
		check.Available = true
		return check, nil
	}

	for i := 2; i < 12; i++ {
		candidate := sub + "-" + strconv.Itoa(i)
		if err := validateSubdomain(candidate); err != nil {
			break
		}
		free, err := s.repo.SubdomainTaken(ctx, candidate)
		if err != nil {
			return nil, apperrors.Internal(err)
		}
		if !free {
			check.Suggestion = candidate
			break
		}
	}
	return check, nil
}

func (s *Service) CountForTenant(ctx context.Context, tenantID uuid.UUID) (int64, error) {
	return s.repo.Count(ctx, repository.Filter{TenantID: tenantID})
}
