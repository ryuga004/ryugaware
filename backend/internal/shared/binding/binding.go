package binding

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"

	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
)

func JSON(c *gin.Context, target any) error {
	if ct := c.ContentType(); ct != "" && ct != "application/json" {
		return apperrors.BadRequest("Content-Type must be application/json")
	}
	return classify(c.ShouldBindJSON(target))
}

func Query(c *gin.Context, target any) error {
	return classify(c.ShouldBindQuery(target))
}

func classify(err error) error {
	if err == nil {
		return nil
	}

	var maxBytes *http.MaxBytesError
	if errors.As(err, &maxBytes) {
		return apperrors.TooLarge("Request payload too large")
	}

	var syntax *json.SyntaxError
	var unmarshal *json.UnmarshalTypeError
	if errors.As(err, &syntax) || errors.As(err, &unmarshal) || errors.Is(err, io.EOF) {
		return apperrors.BadRequest("The request body is not valid JSON")
	}

	var invalid validator.ValidationErrors
	if errors.As(err, &invalid) {
		return apperrors.Validation("Request validation failed", fieldErrors(invalid)...)
	}

	return apperrors.BadRequest("Invalid request")
}

func fieldErrors(invalid validator.ValidationErrors) []apperrors.FieldError {
	out := make([]apperrors.FieldError, 0, len(invalid))
	for _, fe := range invalid {
		out = append(out, apperrors.FieldError{
			Field:   fieldName(fe.Field()),
			Message: message(fe),
		})
	}
	return out
}

func fieldName(name string) string {
	if name == "" {
		return name
	}
	return strings.ToLower(name[:1]) + name[1:]
}

func message(fe validator.FieldError) string {
	switch fe.Tag() {
	case "required":
		return "This field is required."
	case "email":
		return "Enter a valid email address."
	case "min":
		return "Use at least " + fe.Param() + " characters."
	case "max":
		return "Use " + fe.Param() + " characters or fewer."
	case "len":
		return "Use exactly " + fe.Param() + " characters."
	case "number", "numeric":
		return "Use digits only."
	default:
		return "This value is not valid."
	}
}
