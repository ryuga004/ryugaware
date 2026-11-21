package model

import (
	"time"

	"github.com/google/uuid"
)

const (
	PartnerShiprocket = "shiprocket"
	PartnerSelf       = "self"
	PartnerPickup     = "pickup"
)

const (
	RateFlat      = "flat"
	RateFree      = "free"
	RateFreeAbove = "free_above"
)

type Method struct {
	ID        uuid.UUID `gorm:"column:id;primaryKey"`
	TenantID  uuid.UUID `gorm:"column:tenant_id"`
	Name      string    `gorm:"column:name"`
	Partner   string    `gorm:"column:partner"`
	Type      string    `gorm:"column:type"`
	MinDays   int16     `gorm:"column:min_days"`
	MaxDays   int16     `gorm:"column:max_days"`
	RateType  string    `gorm:"column:rate_type"`
	Price     float64   `gorm:"column:price"`
	FreeAbove *float64  `gorm:"column:free_above"`
	Coverage  string    `gorm:"column:coverage"`
	Regions   []byte    `gorm:"column:regions;type:jsonb"`
	Enabled   bool      `gorm:"column:enabled"`
	CreatedAt time.Time `gorm:"column:created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at"`
}

func (Method) TableName() string { return "delivery_methods" }
