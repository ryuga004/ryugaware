package model

import (
	"time"

	"github.com/google/uuid"
)

var PlatformTenantID = uuid.MustParse("00000000-0000-0000-0000-000000000001")

var (
	RoleSuperAdminID = uuid.MustParse("00000000-0000-0000-0000-00000000000a")
	RoleAdminID      = uuid.MustParse("00000000-0000-0000-0000-00000000000b")
	RoleMemberID     = uuid.MustParse("00000000-0000-0000-0000-00000000000c")
)

type Tenant struct {
	ID             uuid.UUID `gorm:"column:id;primaryKey"`
	Name           string    `gorm:"column:name"`
	PasswordPepper string    `gorm:"column:password_pepper"`
	JWTSecret      string    `gorm:"column:jwt_secret"`
	IsActive       bool      `gorm:"column:is_active"`
	IsPlatform     bool      `gorm:"column:is_platform"`
	CreatedAt      time.Time `gorm:"column:created_at"`
	UpdatedAt      time.Time `gorm:"column:updated_at"`
}

func (Tenant) TableName() string { return "tenants" }

type Role struct {
	ID        uuid.UUID  `gorm:"column:id;primaryKey"`
	TenantID  *uuid.UUID `gorm:"column:tenant_id"`
	Name      string     `gorm:"column:name"`
	Type      string     `gorm:"column:type"`
	CreatedAt time.Time  `gorm:"column:created_at"`
	UpdatedAt time.Time  `gorm:"column:updated_at"`
}

func (Role) TableName() string { return "roles" }

type User struct {
	ID                uuid.UUID  `gorm:"column:id;primaryKey"`
	TenantID          uuid.UUID  `gorm:"column:tenant_id"`
	RoleID            uuid.UUID  `gorm:"column:role_id"`
	RoleTenantID      *uuid.UUID `gorm:"column:role_tenant_id"`
	FullName          string     `gorm:"column:full_name"`
	Email             string     `gorm:"column:email"`
	PasswordHash      string     `gorm:"column:password_hash"`
	PasswordChangedAt time.Time  `gorm:"column:password_changed_at"`
	LastLoginAt       *time.Time `gorm:"column:last_login_at"`
	IsActive          bool       `gorm:"column:is_active"`
	CreatedAt         time.Time  `gorm:"column:created_at"`
	UpdatedAt         time.Time  `gorm:"column:updated_at"`
}

func (User) TableName() string { return "platform_users" }

type License struct {
	ID                uuid.UUID `gorm:"column:id;primaryKey"`
	TenantID          uuid.UUID `gorm:"column:tenant_id"`
	Plan              string    `gorm:"column:plan"`
	MaxWebsites       int       `gorm:"column:max_websites"`
	StorageLimitBytes int64     `gorm:"column:storage_limit_bytes"`
	StartsAt          time.Time `gorm:"column:starts_at"`
	ExpiresAt         time.Time `gorm:"column:expires_at"`
	CreatedAt         time.Time `gorm:"column:created_at"`
	UpdatedAt         time.Time `gorm:"column:updated_at"`
}

func (License) TableName() string { return "licenses" }

type OutboxEvent struct {
	EventID     uuid.UUID  `gorm:"column:event_id;primaryKey"`
	EventType   string     `gorm:"column:event_type"`
	AggregateID *uuid.UUID `gorm:"column:aggregate_id"`
	TenantID    *uuid.UUID `gorm:"column:tenant_id"`
	Payload     []byte     `gorm:"column:payload;type:jsonb"`
	Metadata    []byte     `gorm:"column:metadata;type:jsonb"`
	Status      string     `gorm:"column:status"`
	Attempts    int        `gorm:"column:attempts"`
	AvailableAt time.Time  `gorm:"column:available_at"`
	CreatedAt   time.Time  `gorm:"column:created_at"`
	PublishedAt *time.Time `gorm:"column:published_at"`
}

func (OutboxEvent) TableName() string { return "outbox_events" }
