package dto

import "time"

type ListQuery struct {
	Search   string `form:"search" binding:"max=80"`
	Status   string `form:"status" binding:"omitempty,oneof=all enabled disabled"`
	Page     int    `form:"page" binding:"omitempty,min=1"`
	PageSize int    `form:"pageSize" binding:"omitempty,min=1,max=100"`
}

type MethodInput struct {
	Name      string   `json:"name" binding:"required,min=1,max=80"`
	Partner   string   `json:"partner" binding:"required,oneof=shiprocket self pickup"`
	Type      string   `json:"type" binding:"required,oneof=standard express same_day pickup"`
	MinDays   int      `json:"minDays" binding:"min=0,max=365"`
	MaxDays   int      `json:"maxDays" binding:"min=0,max=365"`
	RateType  string   `json:"rateType" binding:"required,oneof=flat free free_above"`
	Price     float64  `json:"price" binding:"min=0"`
	FreeAbove *float64 `json:"freeAbove" binding:"omitempty,min=0"`
	Coverage  string   `json:"coverage" binding:"required,oneof=all_india metro states pincodes"`
	Regions   []string `json:"regions" binding:"max=60,dive,max=60"`
	Enabled   bool     `json:"enabled"`
}

type MethodUpdate struct {
	Name      *string   `json:"name" binding:"omitempty,min=1,max=80"`
	MinDays   *int      `json:"minDays" binding:"omitempty,min=0,max=365"`
	MaxDays   *int      `json:"maxDays" binding:"omitempty,min=0,max=365"`
	RateType  *string   `json:"rateType" binding:"omitempty,oneof=flat free free_above"`
	Price     *float64  `json:"price" binding:"omitempty,min=0"`
	FreeAbove *float64  `json:"freeAbove" binding:"omitempty,min=0"`
	Coverage  *string   `json:"coverage" binding:"omitempty,oneof=all_india metro states pincodes"`
	Regions   *[]string `json:"regions" binding:"omitempty,max=60,dive,max=60"`
	Enabled   *bool     `json:"enabled"`
}

type Method struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Partner      string    `json:"partner"`
	PartnerLabel string    `json:"partnerLabel"`
	Type         string    `json:"type"`
	MinDays      int       `json:"minDays"`
	MaxDays      int       `json:"maxDays"`
	RateType     string    `json:"rateType"`
	Price        float64   `json:"price"`
	FreeAbove    *float64  `json:"freeAbove"`
	Coverage     string    `json:"coverage"`
	Regions      []string  `json:"regions"`
	Enabled      bool      `json:"enabled"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type MethodCounts struct {
	All      int64 `json:"all"`
	Enabled  int64 `json:"enabled"`
	Disabled int64 `json:"disabled"`
}

type ConsignmentInput struct {
	OrderID   string  `json:"orderId" binding:"required,max=64"`
	Pincode   string  `json:"pincode" binding:"omitempty,max=10"`
	ItemCount int     `json:"itemCount" binding:"min=0,max=1000"`
	OrderRs   float64 `json:"orderTotal" binding:"min=0"`
}

type DispatchResult struct {
	Status       string  `json:"status"`
	AWB          string  `json:"awb,omitempty"`
	TrackingURL  string  `json:"trackingUrl,omitempty"`
	PartnerLabel string  `json:"partnerLabel"`
	MethodID     string  `json:"methodId"`
	Fee          float64 `json:"fee"`
	Note         string  `json:"note,omitempty"`
}
