package response

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/ryuga/ryugaware/backend/internal/platform/logger"
	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
)

const RequestIDKey = "request_id"

type Body struct {
	Data any `json:"data"`
	Meta any `json:"meta,omitempty"`
}

type CursorMeta struct {
	NextCursor string `json:"next_cursor,omitempty"`
	HasMore    bool   `json:"has_more"`
	PageSize   int    `json:"page_size"`
}

type PageMeta struct {
	Page       int   `json:"page"`
	PageSize   int   `json:"page_size"`
	TotalItems int64 `json:"total_items"`
	TotalPages int   `json:"total_pages"`
}

const ProblemContentType = "application/problem+json; charset=utf-8"

const problemTypeBase = "/problems/"

type Problem struct {
	Type     string `json:"type"`
	Title    string `json:"title"`
	Status   int    `json:"status"`
	Detail   string `json:"detail,omitempty"`
	Instance string `json:"instance,omitempty"`

	Code      string         `json:"code"`
	Errors    []InvalidParam `json:"errors,omitempty"`
	RequestID string         `json:"request_id,omitempty"`
}

type InvalidParam struct {
	Field   string `json:"field"`
	Pointer string `json:"pointer"`
	Detail  string `json:"detail"`
}

func NewPageMeta(page, pageSize int, total int64) *PageMeta {
	if pageSize < 1 {
		pageSize = 1
	}
	totalPages := int((total + int64(pageSize) - 1) / int64(pageSize))
	return &PageMeta{Page: page, PageSize: pageSize, TotalItems: total, TotalPages: totalPages}
}

func NewCursorMeta(nextCursor string, pageSize int) *CursorMeta {
	return &CursorMeta{NextCursor: nextCursor, HasMore: nextCursor != "", PageSize: pageSize}
}

func OK(c *gin.Context, data any) { c.JSON(http.StatusOK, Body{Data: data}) }

func Created(c *gin.Context, data any) { c.JSON(http.StatusCreated, Body{Data: data}) }

func Accepted(c *gin.Context, data any) { c.JSON(http.StatusAccepted, Body{Data: data}) }

func NoContent(c *gin.Context) { c.Status(http.StatusNoContent) }

func List(c *gin.Context, items any, meta any) {
	c.JSON(http.StatusOK, Body{Data: items, Meta: meta})
}

func Error(c *gin.Context, err error) {
	appErr := apperrors.From(err)
	if appErr == nil {
		appErr = apperrors.Internal(errors.New("nil error passed to response.Error"))
	}

	status := appErr.Status()
	requestID, _ := c.Get(RequestIDKey)
	reqID, _ := requestID.(string)

	_ = c.Error(err) //nolint:errcheck

	if status >= http.StatusInternalServerError {
		logger.FromContext(c.Request.Context(), nil).Error("request failed",
			slog.String("code", string(appErr.Code)),
			slog.Int("status", status),
			logger.Err(err),
		)
	}

	problem := Problem{
		Type:      problemTypeBase + string(appErr.Code),
		Title:     appErr.Title(),
		Status:    status,
		Detail:    appErr.Message,
		Code:      string(appErr.Code),
		Errors:    invalidParams(appErr.Details),
		RequestID: reqID,
	}
	if c.Request != nil && c.Request.URL != nil {
		problem.Instance = c.Request.URL.Path
	}

	c.Abort()
	c.Header("Content-Type", ProblemContentType)
	c.JSON(status, problem)
}

func invalidParams(details []apperrors.FieldError) []InvalidParam {
	if len(details) == 0 {
		return nil
	}
	out := make([]InvalidParam, 0, len(details))
	for _, d := range details {
		out = append(out, InvalidParam{
			Field:   d.Field,
			Pointer: "/" + d.Field,
			Detail:  d.Message,
		})
	}
	return out
}
