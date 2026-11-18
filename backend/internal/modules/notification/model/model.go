package model

import (
	"time"

	"github.com/google/uuid"
)

type EmailTemplate struct {
	ID        uuid.UUID  `gorm:"column:id;primaryKey"`
	TenantID  *uuid.UUID `gorm:"column:tenant_id"`
	Name      string     `gorm:"column:name"`
	Subject   string     `gorm:"column:subject"`
	Body      string     `gorm:"column:body"`
	Variables []byte     `gorm:"column:variables;type:jsonb"`
	CreatedAt time.Time  `gorm:"column:created_at"`
	UpdatedAt time.Time  `gorm:"column:updated_at"`
}

func (EmailTemplate) TableName() string { return "email_templates" }

type EmailDelivery struct {
	EventID   uuid.UUID  `gorm:"column:event_id;primaryKey"`
	TenantID  *uuid.UUID `gorm:"column:tenant_id"`
	Template  string     `gorm:"column:template"`
	ToAddress string     `gorm:"column:to_address"`
	Status    string     `gorm:"column:status"`
	Attempts  int        `gorm:"column:attempts"`
	Error     *string    `gorm:"column:error"`
	SentAt    *time.Time `gorm:"column:sent_at"`
	CreatedAt time.Time  `gorm:"column:created_at"`
}

func (EmailDelivery) TableName() string { return "email_deliveries" }

const (
	StatusSent   = "SENT"
	StatusFailed = "FAILED"
)
