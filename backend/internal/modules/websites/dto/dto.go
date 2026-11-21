package dto

import "time"

type ListQuery struct {
	Search   string `form:"search" binding:"max=80"`
	Status   string `form:"status" binding:"omitempty,oneof=all draft live paused"`
	Page     int    `form:"page" binding:"omitempty,min=1"`
	PageSize int    `form:"pageSize" binding:"omitempty,min=1,max=100"`
}

type CreateInput struct {
	Name          string   `json:"name" binding:"required,min=1,max=80"`
	Subdomain     string   `json:"subdomain" binding:"required,min=3,max=63"`
	TemplateID    string   `json:"templateId" binding:"required,max=50"`
	BrandName     string   `json:"brandName" binding:"max=80"`
	Description   string   `json:"description" binding:"max=240"`
	Primary       string   `json:"primary" binding:"omitempty,max=9"`
	Secondary     string   `json:"secondary" binding:"omitempty,max=9"`
	FontPair      string   `json:"fontPair" binding:"omitempty,oneof=serif sans"`
	DisabledPages []string `json:"disabledPages" binding:"max=40,dive,max=50"`
}

type UpdateInput struct {
	Name    *string `json:"name" binding:"omitempty,min=1,max=80"`
	Status  *string `json:"status" binding:"omitempty,oneof=draft live paused"`
	Publish *bool   `json:"publish"`
}

type Website struct {
	ID              string     `json:"id"`
	Name            string     `json:"name"`
	Status          string     `json:"status"`
	Subdomain       string     `json:"subdomain"`
	URL             string     `json:"url"`
	CustomDomain    *string    `json:"customDomain"`
	TemplateID      string     `json:"templateId"`
	TemplateName    string     `json:"templateName"`
	ThumbnailTheme  string     `json:"thumbnailTheme"`
	TemplateVersion string     `json:"templateVersion"`
	StoragePrefix   string     `json:"storagePrefix"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
	LastPublishedAt *time.Time `json:"lastPublishedAt"`
}

type Page struct {
	ID        string `json:"id"`
	Key       string `json:"key"`
	Path      string `json:"path"`
	Kind      string `json:"kind"`
	Title     string `json:"title"`
	Enabled   bool   `json:"enabled"`
	SortOrder int    `json:"sortOrder"`
}

type Counts struct {
	All    int64 `json:"all"`
	Live   int64 `json:"live"`
	Draft  int64 `json:"draft"`
	Paused int64 `json:"paused"`
}

type SubdomainQuery struct {
	Subdomain string `form:"subdomain" binding:"required,min=1,max=63"`
}

type SubdomainCheck struct {
	Subdomain  string `json:"subdomain"`
	Available  bool   `json:"available"`
	Suggestion string `json:"suggestion,omitempty"`
}
