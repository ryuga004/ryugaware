package storage

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	awsconfig "github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
)

type Config struct {
	Region         string
	Bucket         string
	Endpoint       string
	PublicEndpoint string
	AccessKey      string
	SecretKey      string
	UsePathStyle   bool
	PresignExpiry  time.Duration
}

type S3Store struct {
	client   *s3.Client
	presign  *s3.PresignClient
	bucket   string
	public   string
	presignT time.Duration
}

func NewS3(cfg Config) (*S3Store, error) {
	if cfg.Bucket == "" {
		return nil, errors.New("storage: bucket is required")
	}

	opts := []func(*s3.Options){
		func(o *s3.Options) {
			o.Region = cfg.Region
			o.UsePathStyle = cfg.UsePathStyle
			o.Credentials = awsconfig.NewCredentialsCache(
				credentials.NewStaticCredentialsProvider(cfg.AccessKey, cfg.SecretKey, ""),
			)
		},
	}
	if cfg.Endpoint != "" {
		opts = append(opts, func(o *s3.Options) { o.BaseEndpoint = awsconfig.String(cfg.Endpoint) })
	}

	client := s3.New(s3.Options{}, opts...)
	return &S3Store{
		client:   client,
		presign:  s3.NewPresignClient(client),
		bucket:   cfg.Bucket,
		public:   strings.TrimRight(cfg.PublicEndpoint, "/"),
		presignT: cfg.PresignExpiry,
	}, nil
}

func (s *S3Store) Put(ctx context.Context, in PutInput) (Object, error) {
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:        &s.bucket,
		Key:           &in.Key,
		Body:          in.Body,
		ContentType:   &in.ContentType,
		ContentLength: &in.Size,
	})
	if err != nil {
		return Object{}, fmt.Errorf("storage: put %s: %w", in.Key, err)
	}
	return Object{Key: in.Key, Size: in.Size, ContentType: in.ContentType, LastModified: time.Now().UTC()}, nil
}

func (s *S3Store) Delete(ctx context.Context, key string) error {
	if _, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{Bucket: &s.bucket, Key: &key}); err != nil {
		return fmt.Errorf("storage: delete %s: %w", key, err)
	}
	return nil
}

func (s *S3Store) DeletePrefix(ctx context.Context, prefix string) (int, error) {
	if prefix == "" || !strings.HasSuffix(prefix, "/") {
		return 0, fmt.Errorf("storage: refusing to delete the unbounded prefix %q", prefix)
	}

	removed := 0
	pages := s3.NewListObjectsV2Paginator(s.client, &s3.ListObjectsV2Input{Bucket: &s.bucket, Prefix: &prefix})
	for pages.HasMorePages() {
		page, err := pages.NextPage(ctx)
		if err != nil {
			return removed, fmt.Errorf("storage: list %s: %w", prefix, err)
		}
		if len(page.Contents) == 0 {
			continue
		}

		ids := make([]types.ObjectIdentifier, 0, len(page.Contents))
		for _, o := range page.Contents {
			ids = append(ids, types.ObjectIdentifier{Key: o.Key})
		}
		out, err := s.client.DeleteObjects(ctx, &s3.DeleteObjectsInput{
			Bucket: &s.bucket,
			Delete: &types.Delete{Objects: ids, Quiet: awsconfig.Bool(true)},
		})
		if err != nil {
			return removed, fmt.Errorf("storage: delete %s: %w", prefix, err)
		}
		removed += len(ids) - len(out.Errors)
		if len(out.Errors) > 0 {
			return removed, fmt.Errorf("storage: %d objects under %s could not be deleted", len(out.Errors), prefix)
		}
	}
	return removed, nil
}

func (s *S3Store) List(ctx context.Context, prefix string, limit int) ([]Object, error) {
	if limit <= 0 || limit > 1000 {
		limit = 1000
	}
	n := int32(limit)
	out, err := s.client.ListObjectsV2(ctx, &s3.ListObjectsV2Input{
		Bucket: &s.bucket, Prefix: &prefix, MaxKeys: &n,
	})
	if err != nil {
		return nil, fmt.Errorf("storage: list %s: %w", prefix, err)
	}

	objects := make([]Object, 0, len(out.Contents))
	for _, o := range out.Contents {
		obj := Object{Key: aws(o.Key), Size: val(o.Size)}
		if o.LastModified != nil {
			obj.LastModified = o.LastModified.UTC()
		}
		objects = append(objects, obj)
	}
	return objects, nil
}

func (s *S3Store) Usage(ctx context.Context, prefix string) (Usage, error) {
	var usage Usage
	pages := s3.NewListObjectsV2Paginator(s.client, &s3.ListObjectsV2Input{Bucket: &s.bucket, Prefix: &prefix})
	for pages.HasMorePages() {
		page, err := pages.NextPage(ctx)
		if err != nil {
			return Usage{}, fmt.Errorf("storage: usage %s: %w", prefix, err)
		}
		for _, o := range page.Contents {
			usage.Objects++
			usage.BytesUsed += val(o.Size)
			if o.LastModified != nil && (usage.LastModified == nil || o.LastModified.After(*usage.LastModified)) {
				t := o.LastModified.UTC()
				usage.LastModified = &t
			}
		}
	}
	return usage, nil
}

func (s *S3Store) PresignGet(ctx context.Context, key string, ttl time.Duration) (string, error) {
	if ttl <= 0 {
		ttl = s.presignT
	}
	req, err := s.presign.PresignGetObject(ctx,
		&s3.GetObjectInput{Bucket: &s.bucket, Key: &key},
		s3.WithPresignExpires(ttl),
	)
	if err != nil {
		return "", fmt.Errorf("storage: presign %s: %w", key, err)
	}
	return req.URL, nil
}

func (s *S3Store) PublicURL(key string) string {
	if s.public == "" {
		return key
	}
	return s.public + "/" + s.bucket + "/" + strings.TrimLeft(key, "/")
}

func aws(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func val(n *int64) int64 {
	if n == nil {
		return 0
	}
	return *n
}
