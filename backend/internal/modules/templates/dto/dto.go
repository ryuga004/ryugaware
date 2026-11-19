package dto

import "time"

type ListQuery struct {
	Search   string `form:"search" binding:"max=80"`
	Category string `form:"category" binding:"omitempty,max=50"`
	Page     int    `form:"page" binding:"omitempty,min=1"`
	PageSize int    `form:"pageSize" binding:"omitempty,min=1,max=100"`
}

type Template struct {
	ID             string    `json:"id"`
	Slug           string    `json:"slug"`
	Name           string    `json:"name"`
	Category       string    `json:"category"`
	Description    string    `json:"description"`
	Pages          int       `json:"pages"`
	Features       []string  `json:"features"`
	PaymentMethods []string  `json:"paymentMethods"`
	ThumbnailTheme string    `json:"thumbnailTheme"`
	Version        string    `json:"version"`
	Status         string    `json:"status"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type Page struct {
	ID         string `json:"id"`
	Key        string `json:"key"`
	Path       string `json:"path"`
	Kind       string `json:"kind"`
	SortOrder  int    `json:"sortOrder"`
	PreviewURL string `json:"previewUrl"`
}

type CategoryCount struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	Count int64  `json:"count"`
}
