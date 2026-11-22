package dto

import (
	"encoding/json"
	"time"
)

type SiteSection struct {
	ID       string          `json:"id"`
	Type     string          `json:"type"`
	Enabled  bool            `json:"enabled"`
	Settings json.RawMessage `json:"settings"`
}

type SEO struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

type SitePage struct {
	ID       string          `json:"id"`
	Key      string          `json:"key"`
	Path     string          `json:"path"`
	Title    string          `json:"title"`
	Kind     string          `json:"kind"`
	Enabled  bool            `json:"enabled"`
	SEO      json.RawMessage `json:"seo"`
	Sections json.RawMessage `json:"sections"`
	Settings json.RawMessage `json:"settings"`
}

type SiteContent struct {
	WebsiteID       string          `json:"websiteId"`
	TemplateID      string          `json:"templateId"`
	TemplateVersion string          `json:"templateVersion"`
	Theme           json.RawMessage `json:"theme"`
	Chrome          json.RawMessage `json:"chrome"`
	Pages           []SitePage      `json:"pages"`
	UpdatedAt       time.Time       `json:"updatedAt"`
}

type SavePageInput struct {
	Key      string          `json:"key" binding:"required,max=50"`
	Title    string          `json:"title" binding:"max=120"`
	Enabled  bool            `json:"enabled"`
	SEO      json.RawMessage `json:"seo"`
	Sections json.RawMessage `json:"sections"`
	Settings json.RawMessage `json:"settings"`
}

type SaveContentInput struct {
	Theme  json.RawMessage `json:"theme"`
	Chrome json.RawMessage `json:"chrome"`
	Pages  []SavePageInput `json:"pages" binding:"max=60,dive"`
}

type CheckoutPayment struct {
	ID       string   `json:"id"`
	Kind     string   `json:"kind"`
	Label    string   `json:"label"`
	Hint     string   `json:"hint"`
	Mark     string   `json:"mark"`
	Fee      float64  `json:"fee"`
	MinOrder *float64 `json:"minOrder"`
	MaxOrder *float64 `json:"maxOrder"`
	TestMode bool     `json:"testMode"`
}

type CheckoutDelivery struct {
	ID        string   `json:"id"`
	Name      string   `json:"name"`
	Carrier   string   `json:"carrier"`
	DaysLabel string   `json:"daysLabel"`
	MaxDays   int      `json:"maxDays"`
	RateType  string   `json:"rateType"`
	Price     float64  `json:"price"`
	FreeAbove *float64 `json:"freeAbove"`
	Mark      string   `json:"mark"`
}

type SignIn struct {
	Email  bool `json:"email"`
	Google bool `json:"google"`
}

type StoreCommerce struct {
	Payments []CheckoutPayment  `json:"payments"`
	Delivery []CheckoutDelivery `json:"delivery"`
	SignIn   SignIn             `json:"signIn"`
}

type StorefrontResponse struct {
	WebsiteID string        `json:"websiteId"`
	Name      string        `json:"name"`
	Subdomain string        `json:"subdomain"`
	Status    string        `json:"status"`
	Preview   bool          `json:"preview"`
	Content   SiteContent   `json:"content"`
	Commerce  StoreCommerce `json:"commerce"`
}

type Asset struct {
	Key         string `json:"key"`
	URL         string `json:"url"`
	Size        int64  `json:"size"`
	ContentType string `json:"contentType"`
}

type WebsiteStorage struct {
	WebsiteID string `json:"websiteId"`
	Name      string `json:"name"`
	Prefix    string `json:"prefix"`
	Bytes     int64  `json:"bytes"`
	Objects   int64  `json:"objects"`
}

type Storage struct {
	Provider   string           `json:"provider"`
	Websites   []WebsiteStorage `json:"websites"`
	BytesUsed  int64            `json:"bytesUsed"`
	Objects    int64            `json:"objects"`
	QuotaBytes int64            `json:"quotaBytes"`
}

type WebsitePaymentOption struct {
	ID              string   `json:"id"`
	Type            string   `json:"type"`
	Provider        string   `json:"provider"`
	DisplayName     string   `json:"displayName"`
	EnabledGlobally bool     `json:"enabledGlobally"`
	TestMode        bool     `json:"testMode"`
	FeePercent      float64  `json:"feePercent"`
	FeeFixed        float64  `json:"feeFixed"`
	MinOrder        *float64 `json:"minOrder"`
	MaxOrder        *float64 `json:"maxOrder"`
	Selected        bool     `json:"selected"`
}

type WebsiteDeliveryOption struct {
	ID              string   `json:"id"`
	Name            string   `json:"name"`
	Type            string   `json:"type"`
	Carrier         string   `json:"carrier"`
	MinDays         int      `json:"minDays"`
	MaxDays         int      `json:"maxDays"`
	RateType        string   `json:"rateType"`
	Price           float64  `json:"price"`
	FreeAbove       *float64 `json:"freeAbove"`
	Coverage        string   `json:"coverage"`
	EnabledGlobally bool     `json:"enabledGlobally"`
	Selected        bool     `json:"selected"`
}

type StoreSettings struct {
	WebsiteID string                  `json:"websiteId"`
	Payments  []WebsitePaymentOption  `json:"payments"`
	Delivery  []WebsiteDeliveryOption `json:"delivery"`
}

type MethodSelection struct {
	ID       string `json:"id" binding:"required,uuid"`
	Selected bool   `json:"selected"`
}

type StoreSettingsPatch struct {
	Payment  *MethodSelection `json:"payment"`
	Delivery *MethodSelection `json:"delivery"`
}

type AssetFolder struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	Bytes   int64  `json:"bytes"`
	Objects int64  `json:"objects"`
}

type AssetFile struct {
	Key         string    `json:"key"`
	Name        string    `json:"name"`
	URL         string    `json:"url"`
	Size        int64     `json:"size"`
	ContentType string    `json:"contentType"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type AssetListing struct {
	WebsiteID string        `json:"websiteId"`
	Path      string        `json:"path"`
	Folders   []AssetFolder `json:"folders"`
	Files     []AssetFile   `json:"files"`
	Bytes     int64         `json:"bytes"`
	Objects   int64         `json:"objects"`
	Truncated bool          `json:"truncated"`
}

type AssetListQuery struct {
	Path string `form:"path" binding:"max=300"`
}

type AssetDeleteQuery struct {
	Key string `form:"key" binding:"required,max=400"`
}
