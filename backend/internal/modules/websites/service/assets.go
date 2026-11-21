package service

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"path"
	"strings"

	"github.com/google/uuid"

	"github.com/ryuga/ryugaware/backend/internal/modules/websites/repository"
	"github.com/ryuga/ryugaware/backend/internal/platform/storage"
	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
)

type AssetPolicy struct {
	MaxBytes    int64
	AllowedMIME []string
}

type UploadInput struct {
	Body        io.Reader
	Size        int64
	ContentType string
	FileName    string
}

type Asset struct {
	Key         string
	URL         string
	Size        int64
	ContentType string
}

type Usage struct {
	WebsiteID uuid.UUID
	Name      string
	Prefix    string
	Bytes     int64
	Objects   int64
}

type StorageReport struct {
	Websites   []Usage
	BytesUsed  int64
	Objects    int64
	QuotaBytes int64
}

var mimeExtension = map[string]string{
	"image/jpeg":    ".jpg",
	"image/png":     ".png",
	"image/webp":    ".webp",
	"image/gif":     ".gif",
	"image/svg+xml": ".svg",
}

func (s *Service) WithAssetPolicy(p AssetPolicy) *Service {
	s.assets = p
	return s
}

func (s *Service) Upload(ctx context.Context, tenantID, websiteID uuid.UUID, in UploadInput) (*Asset, error) {
	if s.store == nil {
		return nil, apperrors.Unavailable("Storage is not configured")
	}
	website, err := s.Get(ctx, tenantID, websiteID)
	if err != nil {
		return nil, err
	}

	if s.assets.MaxBytes > 0 && in.Size > s.assets.MaxBytes {
		return nil, apperrors.TooLarge("That file is larger than the upload limit")
	}

	sniffed, body, err := sniffContentType(in.Body)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if !s.allowed(sniffed) {
		return nil, fieldError("file", "that file type is not allowed")
	}

	ext := mimeExtension[sniffed]
	if ext == "" {
		ext = strings.ToLower(path.Ext(in.FileName))
	}
	key := website.StoragePrefix + "media/" + uuid.NewString() + ext

	object, err := s.store.Put(ctx, storage.PutInput{
		Key:         key,
		Body:        body,
		Size:        in.Size,
		ContentType: sniffed,
	})
	if err != nil {
		return nil, apperrors.Internal(err)
	}

	return &Asset{
		Key:         object.Key,
		URL:         s.store.PublicURL(object.Key),
		Size:        in.Size,
		ContentType: sniffed,
	}, nil
}

func (s *Service) allowed(contentType string) bool {
	if len(s.assets.AllowedMIME) == 0 {
		return strings.HasPrefix(contentType, "image/")
	}
	for _, m := range s.assets.AllowedMIME {
		if strings.EqualFold(strings.TrimSpace(m), contentType) {
			return true
		}
	}
	return false
}

func (s *Service) StorageUsage(ctx context.Context, tenantID uuid.UUID) (*StorageReport, error) {
	if s.store == nil {
		return nil, apperrors.Unavailable("Storage is not configured")
	}
	sites, err := s.repo.List(ctx, repositoryFilterAll(tenantID))
	if err != nil {
		return nil, apperrors.Internal(err)
	}

	quota, err := s.licenses.StorageLimitBytes(ctx, tenantID)
	if err != nil {
		return nil, err
	}

	report := &StorageReport{Websites: make([]Usage, 0, len(sites)), QuotaBytes: quota}
	for i := range sites {
		w := &sites[i]
		usage, err := s.store.Usage(ctx, w.StoragePrefix)
		if err != nil {
			return nil, apperrors.Internal(err)
		}
		report.BytesUsed += usage.BytesUsed
		report.Objects += usage.Objects
		report.Websites = append(report.Websites, Usage{
			WebsiteID: w.ID,
			Name:      w.Name,
			Prefix:    w.StoragePrefix,
			Bytes:     usage.BytesUsed,
			Objects:   usage.Objects,
		})
	}
	return report, nil
}

func sniffContentType(r io.Reader) (string, io.Reader, error) {
	head := make([]byte, 512)
	n, err := io.ReadFull(r, head)
	if err != nil && err != io.ErrUnexpectedEOF && err != io.EOF {
		return "", nil, err
	}
	head = head[:n]
	detected := http.DetectContentType(head)
	if i := strings.IndexByte(detected, ';'); i >= 0 {
		detected = strings.TrimSpace(detected[:i])
	}
	return detected, io.MultiReader(bytes.NewReader(head), r), nil
}

func repositoryFilterAll(tenantID uuid.UUID) repository.Filter {
	return repository.Filter{TenantID: tenantID, Limit: MaxPageSize}
}
