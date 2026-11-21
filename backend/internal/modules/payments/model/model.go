package model

import (
	"time"

	"github.com/google/uuid"
)

const (
	TypeCOD  = "cod"
	TypeUPI  = "upi"
	TypeCard = "card"
)

const (
	ProviderOffline  = "offline"
	ProviderPhonePe  = "phonepe"
	ProviderPaytm    = "paytm"
	ProviderGPay     = "gpay"
	ProviderRazorpay = "razorpay"
)

type Method struct {
	ID          uuid.UUID `gorm:"column:id;primaryKey"`
	TenantID    uuid.UUID `gorm:"column:tenant_id"`
	Type        string    `gorm:"column:type"`
	Provider    string    `gorm:"column:provider"`
	DisplayName string    `gorm:"column:display_name"`
	Enabled     bool      `gorm:"column:enabled"`
	TestMode    bool      `gorm:"column:test_mode"`
	FeePercent  float64   `gorm:"column:fee_percent"`
	FeeFixed    float64   `gorm:"column:fee_fixed"`
	MinOrder    *float64  `gorm:"column:min_order"`
	MaxOrder    *float64  `gorm:"column:max_order"`
	KeyID       *string   `gorm:"column:key_id"`
	KeySecret   *string   `gorm:"column:key_secret"`
	CreatedAt   time.Time `gorm:"column:created_at"`
	UpdatedAt   time.Time `gorm:"column:updated_at"`
}

func (Method) TableName() string { return "payment_methods" }
