//go:build integration

package integration

import (
	"bytes"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/ryuga/ryugaware/backend/internal/platform/storage"
)

func openStore(t *testing.T) *storage.S3Store {
	t.Helper()
	endpoint := os.Getenv("TEST_S3_ENDPOINT")
	if endpoint == "" {
		t.Skip("TEST_S3_ENDPOINT is not set")
	}
	store, err := storage.NewS3(storage.Config{
		Region:         envOr("TEST_S3_REGION", "us-east-1"),
		Bucket:         os.Getenv("TEST_S3_BUCKET"),
		Endpoint:       endpoint,
		PublicEndpoint: endpoint,
		AccessKey:      os.Getenv("TEST_S3_ACCESS_KEY"),
		SecretKey:      os.Getenv("TEST_S3_SECRET_KEY"),
		UsePathStyle:   true,
		PresignExpiry:  10 * time.Minute,
	})
	if err != nil {
		t.Fatalf("NewS3: %v", err)
	}
	return store
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func TestStore_PutListUsageDeletePrefix(t *testing.T) {
	store := openStore(t)
	tenant, website := uuid.New(), uuid.New()
	prefix := storage.WebsitePrefix(tenant, website)

	body := []byte("hello storage")
	obj, err := store.Put(t.Context(), storage.PutInput{
		Key: prefix + "media/one.txt", Body: bytes.NewReader(body),
		Size: int64(len(body)), ContentType: "text/plain",
	})
	if err != nil {
		t.Fatalf("Put: %v", err)
	}
	if obj.Key != prefix+"media/one.txt" {
		t.Errorf("key = %q", obj.Key)
	}

	objects, err := store.List(t.Context(), prefix, 10)
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(objects) != 1 {
		t.Fatalf("listed %d objects, want 1", len(objects))
	}

	usage, err := store.Usage(t.Context(), prefix)
	if err != nil {
		t.Fatalf("Usage: %v", err)
	}
	if usage.Objects != 1 || usage.BytesUsed != int64(len(body)) {
		t.Errorf("usage = %+v, want 1 object of %d bytes", usage, len(body))
	}

	url, err := store.PresignGet(t.Context(), obj.Key, time.Minute)
	if err != nil {
		t.Fatalf("PresignGet: %v", err)
	}
	if !strings.Contains(url, "X-Amz-Signature") {
		t.Errorf("presigned url is not signed: %s", url)
	}

	removed, err := store.DeletePrefix(t.Context(), prefix)
	if err != nil {
		t.Fatalf("DeletePrefix: %v", err)
	}
	if removed != 1 {
		t.Errorf("removed %d objects, want 1", removed)
	}

	after, err := store.Usage(t.Context(), prefix)
	if err != nil {
		t.Fatalf("Usage after delete: %v", err)
	}
	if after.Objects != 0 {
		t.Errorf("%d objects survived the prefix delete", after.Objects)
	}
}

func TestStore_DeletePrefixRefusesAnUnboundedPrefix(t *testing.T) {
	store := openStore(t)
	for _, prefix := range []string{"", "t/abc", "media"} {
		if _, err := store.DeletePrefix(t.Context(), prefix); err == nil {
			t.Errorf("DeletePrefix(%q) was allowed; it must require a trailing /", prefix)
		}
	}
}

func TestStore_OneWebsitesDeleteLeavesAnotherAlone(t *testing.T) {
	store := openStore(t)
	tenant := uuid.New()
	a, b := storage.WebsitePrefix(tenant, uuid.New()), storage.WebsitePrefix(tenant, uuid.New())

	for _, prefix := range []string{a, b} {
		body := []byte("x")
		if _, err := store.Put(t.Context(), storage.PutInput{
			Key: prefix + "media/f.txt", Body: bytes.NewReader(body),
			Size: 1, ContentType: "text/plain",
		}); err != nil {
			t.Fatalf("Put: %v", err)
		}
	}

	if _, err := store.DeletePrefix(t.Context(), a); err != nil {
		t.Fatalf("DeletePrefix: %v", err)
	}

	usage, err := store.Usage(t.Context(), b)
	if err != nil {
		t.Fatalf("Usage: %v", err)
	}
	if usage.Objects != 1 {
		t.Errorf("deleting one website's prefix removed another's objects")
	}
	_, _ = store.DeletePrefix(t.Context(), b)
}
