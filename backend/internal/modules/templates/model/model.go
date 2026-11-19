package model

import (
	"time"

	"github.com/google/uuid"
)

type Category struct {
	ID        uuid.UUID `gorm:"column:id;primaryKey"`
	Slug      string    `gorm:"column:slug"`
	Name      string    `gorm:"column:name"`
	SortOrder int16     `gorm:"column:sort_order"`
	CreatedAt time.Time `gorm:"column:created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at"`
}

func (Category) TableName() string { return "template_categories" }

type Template struct {
	ID             uuid.UUID  `gorm:"column:id;primaryKey"`
	TenantID       *uuid.UUID `gorm:"column:tenant_id"`
	CategoryID     uuid.UUID  `gorm:"column:category_id"`
	Slug           string     `gorm:"column:slug"`
	Name           string     `gorm:"column:name"`
	Description    string     `gorm:"column:description"`
	Version        string     `gorm:"column:version"`
	Status         string     `gorm:"column:status"`
	ThumbnailTheme string     `gorm:"column:thumbnail_theme"`
	PreviewURL     *string    `gorm:"column:preview_url"`
	Features       []byte     `gorm:"column:features;type:jsonb"`
	PaymentMethods []byte     `gorm:"column:payment_methods;type:jsonb"`
	DefaultTheme   []byte     `gorm:"column:default_theme;type:jsonb"`
	CreatedAt      time.Time  `gorm:"column:created_at"`
	UpdatedAt      time.Time  `gorm:"column:updated_at"`
}

func (Template) TableName() string { return "templates" }

type TemplateListRow struct {
	Template
	CategorySlug string `gorm:"column:category_slug"`
	PageCount    int    `gorm:"column:page_count"`
}

type Page struct {
	ID         uuid.UUID `gorm:"column:id;primaryKey"`
	TemplateID uuid.UUID `gorm:"column:template_id"`
	Key        string    `gorm:"column:key"`
	Path       string    `gorm:"column:path"`
	Kind       string    `gorm:"column:kind"`
	SortOrder  int16     `gorm:"column:sort_order"`
	Variables  []byte    `gorm:"column:variables;type:jsonb"`
	PreviewURL *string   `gorm:"column:preview_url"`
	CreatedAt  time.Time `gorm:"column:created_at"`
	UpdatedAt  time.Time `gorm:"column:updated_at"`
}

func (Page) TableName() string { return "template_pages" }

type CategoryCount struct {
	Slug  string `gorm:"column:slug"`
	Name  string `gorm:"column:name"`
	Count int64  `gorm:"column:count"`
}
