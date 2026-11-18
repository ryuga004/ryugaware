package response_test

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
	"github.com/ryuga/ryugaware/backend/internal/shared/response"
)

func init() { gin.SetMode(gin.TestMode) }

func render(t *testing.T, h gin.HandlerFunc) *httptest.ResponseRecorder {
	t.Helper()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/websites/42", nil)
	c.Set(response.RequestIDKey, "req-123")
	h(c)
	return w
}

func TestError_RendersRFC9457ProblemDocument(t *testing.T) {
	w := render(t, func(c *gin.Context) {
		response.Error(c, apperrors.NotFound("website"))
	})

	if got := w.Code; got != http.StatusNotFound {
		t.Fatalf("status = %d, want %d", got, http.StatusNotFound)
	}
	if ct := w.Header().Get("Content-Type"); ct != response.ProblemContentType {
		t.Errorf("Content-Type = %q, want %q", ct, response.ProblemContentType)
	}

	var p response.Problem
	if err := json.Unmarshal(w.Body.Bytes(), &p); err != nil {
		t.Fatalf("body is not JSON: %v", err)
	}
	for _, tc := range []struct{ name, got, want string }{
		{"type", p.Type, "/problems/not_found"},
		{"title", p.Title, "Not found"},
		{"detail", p.Detail, "website not found"},
		{"instance", p.Instance, "/api/v1/websites/42"},
		{"code", p.Code, "not_found"},
		{"request_id", p.RequestID, "req-123"},
	} {
		if tc.got != tc.want {
			t.Errorf("%s = %q, want %q", tc.name, tc.got, tc.want)
		}
	}
	if p.Status != http.StatusNotFound {
		t.Errorf("status member = %d, want %d", p.Status, http.StatusNotFound)
	}
}

func TestError_ValidationCarriesFieldErrors(t *testing.T) {
	w := render(t, func(c *gin.Context) {
		response.Error(c, apperrors.Validation("the request is invalid",
			apperrors.FieldError{Field: "email", Message: "enter a valid email address"}))
	})

	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want %d", w.Code, http.StatusUnprocessableEntity)
	}
	var p response.Problem
	if err := json.Unmarshal(w.Body.Bytes(), &p); err != nil {
		t.Fatalf("body is not JSON: %v", err)
	}
	if len(p.Errors) != 1 {
		t.Fatalf("errors length = %d, want 1", len(p.Errors))
	}
	got := p.Errors[0]
	if got.Field != "email" || got.Pointer != "/email" || got.Detail != "enter a valid email address" {
		t.Errorf("errors[0] = %+v", got)
	}
}

func TestError_InternalDoesNotLeakTheCause(t *testing.T) {
	secret := "password=hunter2 dsn=postgres://user:pw@host/db"
	w := render(t, func(c *gin.Context) {
		response.Error(c, apperrors.Internal(errors.New(secret)))
	})

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d", w.Code, http.StatusInternalServerError)
	}
	body := w.Body.String()
	if strings.Contains(body, "hunter2") || strings.Contains(body, "postgres://") {
		t.Fatalf("internal cause leaked into the response body: %s", body)
	}
	var p response.Problem
	if err := json.Unmarshal([]byte(body), &p); err != nil {
		t.Fatalf("body is not JSON: %v", err)
	}
	if p.Detail != "an internal error occurred" {
		t.Errorf("detail = %q, want the generic message", p.Detail)
	}
}

func TestList_CursorMetaShape(t *testing.T) {
	w := render(t, func(c *gin.Context) {
		response.List(c, []string{"a", "b"}, response.NewCursorMeta("Y3Vyc29y", 20))
	})

	var body struct {
		Data []string            `json:"data"`
		Meta response.CursorMeta `json:"meta"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("body is not JSON: %v", err)
	}
	if len(body.Data) != 2 {
		t.Errorf("data length = %d, want 2", len(body.Data))
	}
	if body.Meta.NextCursor != "Y3Vyc29y" || !body.Meta.HasMore || body.Meta.PageSize != 20 {
		t.Errorf("meta = %+v", body.Meta)
	}
	if ct := w.Header().Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
		t.Errorf("success Content-Type = %q, want application/json", ct)
	}
}

func TestNewCursorMeta_EmptyCursorMeansEnd(t *testing.T) {
	m := response.NewCursorMeta("", 20)
	if m.HasMore {
		t.Error("HasMore = true for an empty cursor, want false")
	}
}
