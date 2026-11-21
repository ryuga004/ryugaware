package dto

import "time"

type ListQuery struct {
	Search   string `form:"search" binding:"max=80"`
	Type     string `form:"type" binding:"omitempty,oneof=all cod upi card"`
	Page     int    `form:"page" binding:"omitempty,min=1"`
	PageSize int    `form:"pageSize" binding:"omitempty,min=1,max=100"`
}

type MethodInput struct {
	Type        string   `json:"type" binding:"required,oneof=cod upi card"`
	Provider    string   `json:"provider" binding:"required,oneof=offline phonepe paytm gpay razorpay"`
	DisplayName string   `json:"displayName" binding:"required,min=1,max=80"`
	Enabled     bool     `json:"enabled"`
	TestMode    bool     `json:"testMode"`
	FeePercent  float64  `json:"feePercent" binding:"min=0,max=100"`
	FeeFixed    float64  `json:"feeFixed" binding:"min=0"`
	MinOrder    *float64 `json:"minOrder" binding:"omitempty,min=0"`
	MaxOrder    *float64 `json:"maxOrder" binding:"omitempty,min=0"`
	KeyID       string   `json:"keyId" binding:"max=255"`
	KeySecret   string   `json:"keySecret" binding:"max=512"`
}

type MethodUpdate struct {
	DisplayName *string  `json:"displayName" binding:"omitempty,min=1,max=80"`
	Enabled     *bool    `json:"enabled"`
	TestMode    *bool    `json:"testMode"`
	FeePercent  *float64 `json:"feePercent" binding:"omitempty,min=0,max=100"`
	FeeFixed    *float64 `json:"feeFixed" binding:"omitempty,min=0"`
	MinOrder    *float64 `json:"minOrder" binding:"omitempty,min=0"`
	MaxOrder    *float64 `json:"maxOrder" binding:"omitempty,min=0"`
	KeyID       *string  `json:"keyId" binding:"omitempty,max=255"`
	KeySecret   *string  `json:"keySecret" binding:"omitempty,max=512"`
}

type Method struct {
	ID          string    `json:"id"`
	Type        string    `json:"type"`
	Provider    string    `json:"provider"`
	DisplayName string    `json:"displayName"`
	Enabled     bool      `json:"enabled"`
	TestMode    bool      `json:"testMode"`
	FeePercent  float64   `json:"feePercent"`
	FeeFixed    float64   `json:"feeFixed"`
	MinOrder    *float64  `json:"minOrder"`
	MaxOrder    *float64  `json:"maxOrder"`
	KeyIDMasked *string   `json:"keyIdMasked"`
	HasSecret   bool      `json:"hasSecret"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type MethodCounts struct {
	All     int64 `json:"all"`
	Enabled int64 `json:"enabled"`
}

type ChargeInput struct {
	OrderID  string  `json:"orderId" binding:"required,max=64"`
	AmountRs float64 `json:"amount" binding:"required,gt=0"`
}

type ChargeResult struct {
	Status        string  `json:"status"`
	ProviderRef   string  `json:"providerRef"`
	ProviderLabel string  `json:"providerLabel"`
	MethodID      string  `json:"methodId"`
	MethodType    string  `json:"methodType"`
	Amount        float64 `json:"amount"`
	Fee           float64 `json:"fee"`
	FailureReason string  `json:"failureReason,omitempty"`
}
