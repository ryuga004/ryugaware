package model

import (
	"time"

	"github.com/google/uuid"
)

const (
	StatusDraft  = "draft"
	StatusLive   = "live"
	StatusPaused = "paused"
)

type Website struct {
	ID              uuid.UUID  `gorm:"column:id;primaryKey"`
	TenantID        uuid.UUID  `gorm:"column:tenant_id"`
	TemplateID      uuid.UUID  `gorm:"column:template_id"`
	TemplateVersion string     `gorm:"column:template_version"`
	Name            string     `gorm:"column:name"`
	Subdomain       string     `gorm:"column:subdomain"`
	CustomDomain    *string    `gorm:"column:custom_domain"`
	Status          string     `gorm:"column:status"`
	StoragePrefix   string     `gorm:"column:storage_prefix"`
	Theme           []byte     `gorm:"column:theme;type:jsonb"`
	Chrome          []byte     `gorm:"column:chrome;type:jsonb"`
	CreatedBy       *uuid.UUID `gorm:"column:created_by"`
	CreatedAt       time.Time  `gorm:"column:created_at"`
	UpdatedAt       time.Time  `gorm:"column:updated_at"`
	PublishedAt     *time.Time `gorm:"column:published_at"`
}

func (Website) TableName() string { return "websites" }

type Page struct {
	ID        uuid.UUID `gorm:"column:id;primaryKey"`
	WebsiteID uuid.UUID `gorm:"column:website_id"`
	TenantID  uuid.UUID `gorm:"column:tenant_id"`
	Key       string    `gorm:"column:key"`
	Path      string    `gorm:"column:path"`
	Kind      string    `gorm:"column:kind"`
	Title     string    `gorm:"column:title"`
	Enabled   bool      `gorm:"column:enabled"`
	SortOrder int16     `gorm:"column:sort_order"`
	SEO       []byte    `gorm:"column:seo;type:jsonb"`
	Sections  []byte    `gorm:"column:sections;type:jsonb"`
	Settings  []byte    `gorm:"column:settings;type:jsonb"`
	CreatedAt time.Time `gorm:"column:created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at"`
}

func (Page) TableName() string { return "website_pages" }

type PaymentLink struct {
	WebsiteID       uuid.UUID `gorm:"column:website_id"`
	PaymentMethodID uuid.UUID `gorm:"column:payment_method_id"`
	TenantID        uuid.UUID `gorm:"column:tenant_id"`
	CreatedAt       time.Time `gorm:"column:created_at"`
}

func (PaymentLink) TableName() string { return "website_payment_methods" }

type DeliveryLink struct {
	WebsiteID        uuid.UUID `gorm:"column:website_id"`
	DeliveryMethodID uuid.UUID `gorm:"column:delivery_method_id"`
	TenantID         uuid.UUID `gorm:"column:tenant_id"`
	CreatedAt        time.Time `gorm:"column:created_at"`
}

func (DeliveryLink) TableName() string { return "website_delivery_methods" }

type WebsiteRow struct {
	Website
	TemplateSlug   string `gorm:"column:template_slug"`
	TemplateName   string `gorm:"column:template_name"`
	ThumbnailTheme string `gorm:"column:thumbnail_theme"`
}

type TemplateSource struct {
	ID             uuid.UUID `gorm:"column:id"`
	Slug           string    `gorm:"column:slug"`
	Name           string    `gorm:"column:name"`
	Version        string    `gorm:"column:version"`
	Chrome         []byte    `gorm:"column:chrome"`
	ThumbnailTheme string    `gorm:"column:thumbnail_theme"`
	Theme          []byte    `gorm:"column:default_theme"`
}

type TemplatePage struct {
	Key       string `gorm:"column:key"`
	Path      string `gorm:"column:path"`
	Kind      string `gorm:"column:kind"`
	SortOrder int16  `gorm:"column:sort_order"`
	Variables []byte `gorm:"column:variables"`
}

type PaymentOption struct {
	ID          uuid.UUID `gorm:"column:id"`
	Type        string    `gorm:"column:type"`
	Provider    string    `gorm:"column:provider"`
	DisplayName string    `gorm:"column:display_name"`
	FeeFixed    float64   `gorm:"column:fee_fixed"`
	MinOrder    *float64  `gorm:"column:min_order"`
	MaxOrder    *float64  `gorm:"column:max_order"`
	TestMode    bool      `gorm:"column:test_mode"`
}

type DeliveryOption struct {
	ID        uuid.UUID `gorm:"column:id"`
	Name      string    `gorm:"column:name"`
	Partner   string    `gorm:"column:partner"`
	MinDays   int16     `gorm:"column:min_days"`
	MaxDays   int16     `gorm:"column:max_days"`
	RateType  string    `gorm:"column:rate_type"`
	Price     float64   `gorm:"column:price"`
	FreeAbove *float64  `gorm:"column:free_above"`
}
