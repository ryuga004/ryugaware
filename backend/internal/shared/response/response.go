// Package response renders every HTTP response this API produces.
//
// Keeping serialisation in one place is what makes "consistent error
// responses" true rather than aspirational: handlers call Error(c, err) and
// the status code, payload shape and logging all follow from the error value.
package response

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/ryuga/ryugaware/backend/internal/platform/logger"
	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
)

// RequestIDKey is the gin context key holding the current request id.
// It is set by middleware.RequestID and echoed in error payloads so a user can
// quote it in a support ticket.
const RequestIDKey = "request_id"

// Body is the success envelope. Every 2xx payload is wrapped so clients can
// tell data from metadata without guessing.
type Body struct {
	Data any   `json:"data"`
	Meta *Meta `json:"meta,omitempty"`
}

// Meta carries pagination information for list endpoints.
type Meta struct {
	Page       int   `json:"page"`
	PageSize   int   `json:"page_size"`
	TotalItems int64 `json:"total_items"`
	TotalPages int   `json:"total_pages"`
}

// ErrorBody is the failure envelope.
type ErrorBody struct {
	Error ErrorPayload `json:"error"`
}

// ErrorPayload is the client-facing description of a failure.
type ErrorPayload struct {
	Code      string                 `json:"code"`
	Message   string                 `json:"message"`
	Details   []apperrors.FieldError `json:"details,omitempty"`
	RequestID string                 `json:"request_id,omitempty"`
}

// NewMeta computes pagination metadata.
func NewMeta(page, pageSize int, total int64) *Meta {
	if pageSize < 1 {
		pageSize = 1
	}
	totalPages := int((total + int64(pageSize) - 1) / int64(pageSize))
	return &Meta{Page: page, PageSize: pageSize, TotalItems: total, TotalPages: totalPages}
}

// OK writes 200 with a data envelope.
func OK(c *gin.Context, data any) { c.JSON(http.StatusOK, Body{Data: data}) }

// Created writes 201 with a data envelope.
func Created(c *gin.Context, data any) { c.JSON(http.StatusCreated, Body{Data: data}) }

// Accepted writes 202, for work handed to a background worker.
func Accepted(c *gin.Context, data any) { c.JSON(http.StatusAccepted, Body{Data: data}) }

// NoContent writes 204.
func NoContent(c *gin.Context) { c.Status(http.StatusNoContent) }

// List writes 200 with items and pagination metadata.
func List(c *gin.Context, items any, meta *Meta) {
	c.JSON(http.StatusOK, Body{Data: items, Meta: meta})
}

// Error translates err into an HTTP response.
//
// This is the only place internal errors are turned into client output, and
// the only place server-side failures are logged, so neither can be forgotten
// at a call site.
func Error(c *gin.Context, err error) {
	appErr := apperrors.From(err)
	if appErr == nil {
		appErr = apperrors.Internal(errors.New("nil error passed to response.Error"))
	}

	status := appErr.Status()
	requestID, _ := c.Get(RequestIDKey)
	reqID, _ := requestID.(string)

	// Record the error on the gin context so access logging can report it,
	// and log the full chain (including the cause) for 5xx responses only:
	// client mistakes are not operator problems.
	_ = c.Error(err) //nolint:errcheck // gin only fails on a nil error

	if status >= http.StatusInternalServerError {
		logger.FromContext(c.Request.Context(), nil).Error("request failed",
			slog.String("code", string(appErr.Code)),
			slog.Int("status", status),
			logger.Err(err),
		)
	}

	c.AbortWithStatusJSON(status, ErrorBody{Error: ErrorPayload{
		Code:      string(appErr.Code),
		Message:   appErr.Message,
		Details:   appErr.Details,
		RequestID: reqID,
	}})
}
