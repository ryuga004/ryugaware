package storage

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/google/uuid"
)

type Object struct {
	Key          string
	Size         int64
	LastModified time.Time
	ContentType  string
}

type Usage struct {
	BytesUsed    int64
	Objects      int64
	LastModified *time.Time
}

type PutInput struct {
	Key         string
	Body        io.Reader
	Size        int64
	ContentType string
}

type Store interface {
	Put(ctx context.Context, in PutInput) (Object, error)
	Delete(ctx context.Context, key string) error
	DeletePrefix(ctx context.Context, prefix string) (int, error)
	List(ctx context.Context, prefix string, limit int) ([]Object, error)
	Usage(ctx context.Context, prefix string) (Usage, error)
	PresignGet(ctx context.Context, key string, ttl time.Duration) (string, error)
	PublicURL(key string) string
}

func WebsitePrefix(tenantID, websiteID uuid.UUID) string {
	return fmt.Sprintf("t/%s/w/%s/", tenantID, websiteID)
}

func TenantPrefix(tenantID uuid.UUID) string {
	return fmt.Sprintf("t/%s/", tenantID)
}
