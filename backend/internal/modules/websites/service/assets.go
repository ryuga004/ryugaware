package service

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"path"
	"sort"
	"strings"
	"time"

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

const MaxListedObjects = 1000

type Folder struct {
	Name    string
	Path    string
	Bytes   int64
	Objects int64
}

type File struct {
	Key         string
	Name        string
	URL         string
	Size        int64
	ContentType string
	UpdatedAt   time.Time
}

type Listing struct {
	Path      string
	Folders   []Folder
	Files     []File
	Bytes     int64
	Objects   int64
	Truncated bool
}

func (s *Service) ListAssets(ctx context.Context, tenantID, websiteID uuid.UUID, at string) (*Listing, error) {
	if s.store == nil {
		return nil, apperrors.Unavailable("Storage is not configured")
	}
	folder, err := cleanFolder(at)
	if err != nil {
		return nil, err
	}
	website, err := s.Get(ctx, tenantID, websiteID)
	if err != nil {
		return nil, err
	}

	objects, err := s.store.List(ctx, website.StoragePrefix+folder, MaxListedObjects+1)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	truncated := len(objects) > MaxListedObjects
	if truncated {
		objects = objects[:MaxListedObjects]
	}

	base := website.StoragePrefix + folder
	listing := &Listing{Path: folder, Folders: []Folder{}, Files: []File{}, Truncated: truncated}
	index := make(map[string]int)

	for _, object := range objects {
		rest := strings.TrimPrefix(object.Key, base)
		if rest == "" || rest == object.Key {
			continue
		}
		listing.Bytes += object.Size
		listing.Objects++

		if cut := strings.IndexByte(rest, '/'); cut >= 0 {
			name := rest[:cut]
			at, seen := index[name]
			if !seen {
				index[name] = len(listing.Folders)
				listing.Folders = append(listing.Folders, Folder{Name: name, Path: folder + name + "/"})
				at = len(listing.Folders) - 1
			}
			listing.Folders[at].Bytes += object.Size
			listing.Folders[at].Objects++
			continue
		}

		listing.Files = append(listing.Files, File{
			Key:         object.Key,
			Name:        rest,
			URL:         s.store.PublicURL(object.Key),
			Size:        object.Size,
			ContentType: object.ContentType,
			UpdatedAt:   object.LastModified,
		})
	}

	sort.Slice(listing.Folders, func(i, j int) bool { return listing.Folders[i].Name < listing.Folders[j].Name })
	sort.Slice(listing.Files, func(i, j int) bool { return listing.Files[i].Name < listing.Files[j].Name })
	return listing, nil
}

func (s *Service) DeleteAsset(ctx context.Context, tenantID, websiteID uuid.UUID, key string) error {
	if s.store == nil {
		return apperrors.Unavailable("Storage is not configured")
	}
	website, err := s.Get(ctx, tenantID, websiteID)
	if err != nil {
		return err
	}
	if key == "" || strings.Contains(key, "..") || !strings.HasPrefix(key, website.StoragePrefix) {
		return apperrors.NotFound("file")
	}
	if strings.HasSuffix(key, "/") {
		return fieldError("key", "delete a file, not a folder")
	}
	if err := s.store.Delete(ctx, key); err != nil {
		return apperrors.Internal(err)
	}
	return nil
}

func cleanFolder(at string) (string, error) {
	folder := strings.TrimPrefix(strings.TrimSpace(at), "/")
	if folder == "" {
		return "", nil
	}
	if !strings.HasSuffix(folder, "/") {
		folder += "/"
	}
	if strings.Contains(folder, "..") || strings.Contains(folder, "//") || len(folder) > 300 {
		return "", fieldError("path", "that folder name is not allowed")
	}
	for _, r := range folder {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9':
		case r == '-', r == '_', r == '.', r == '/':
		default:
			return "", fieldError("path", "that folder name is not allowed")
		}
	}
	return folder, nil
}
