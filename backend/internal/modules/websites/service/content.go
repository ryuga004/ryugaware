package service

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/ryuga/ryugaware/backend/internal/modules/websites/model"
	"github.com/ryuga/ryugaware/backend/internal/modules/websites/repository"
	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
)

const MaxPagesPerSave = 60

type Content struct {
	Website model.WebsiteRow
	Pages   []model.Page
}

type Commerce struct {
	Payments []model.PaymentOption
	Delivery []model.DeliveryOption
}

type Storefront struct {
	Content  Content
	Commerce Commerce
}

func (s *Service) Content(ctx context.Context, tenantID, websiteID uuid.UUID) (*Content, error) {
	website, err := s.Get(ctx, tenantID, websiteID)
	if err != nil {
		return nil, err
	}
	pages, err := s.repo.Pages(ctx, tenantID, websiteID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	return &Content{Website: *website, Pages: pages}, nil
}

type PageContent struct {
	Key      string
	Title    string
	Enabled  bool
	SEO      json.RawMessage
	Sections json.RawMessage
	Settings json.RawMessage
}

type SaveContentInput struct {
	Theme  json.RawMessage
	Chrome json.RawMessage
	Pages  []PageContent
}

func (s *Service) SaveContent(ctx context.Context, tenantID, websiteID uuid.UUID, in SaveContentInput) (*Content, error) {
	if len(in.Pages) > MaxPagesPerSave {
		return nil, fieldError("pages", "too many pages in one save")
	}
	if _, err := s.Get(ctx, tenantID, websiteID); err != nil {
		return nil, err
	}

	existing, err := s.repo.Pages(ctx, tenantID, websiteID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	known := make(map[string]bool, len(existing))
	for i := range existing {
		known[existing[i].Key] = true
	}
	for _, p := range in.Pages {
		if !known[p.Key] {
			return nil, fieldError("pages", "unknown page "+p.Key)
		}
	}

	now := s.now().UTC()
	err = s.repo.InTransaction(ctx, func(tx repository.Tx) error {
		if err := s.repo.SaveContent(ctx, tx, tenantID, websiteID,
			rawOrDefault(in.Theme, "{}"), rawOrDefault(in.Chrome, "[]"), now); err != nil {
			return err
		}
		for _, p := range in.Pages {
			fields := map[string]any{
				"title":      strings.TrimSpace(p.Title),
				"enabled":    p.Enabled,
				"seo":        rawOrDefault(p.SEO, "{}"),
				"sections":   rawOrDefault(p.Sections, "[]"),
				"settings":   rawOrDefault(p.Settings, "{}"),
				"updated_at": now,
			}
			if err := s.repo.SavePage(ctx, tx, tenantID, websiteID, p.Key, fields); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.NotFound("website")
		}
		return nil, apperrors.Internal(err)
	}
	return s.Content(ctx, tenantID, websiteID)
}

func (s *Service) StorefrontBySubdomain(ctx context.Context, subdomain string) (*Storefront, error) {
	website, err := s.repo.BySubdomain(ctx, strings.ToLower(strings.TrimSpace(subdomain)))
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if website == nil || website.Status != model.StatusLive {
		return nil, apperrors.NotFound("website")
	}

	pages, err := s.repo.Pages(ctx, website.TenantID, website.ID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	payments, err := s.repo.PaymentOptions(ctx, website.TenantID, website.ID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	delivery, err := s.repo.DeliveryOptions(ctx, website.TenantID, website.ID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}

	return &Storefront{
		Content:  Content{Website: *website, Pages: pages},
		Commerce: Commerce{Payments: payments, Delivery: delivery},
	}, nil
}
