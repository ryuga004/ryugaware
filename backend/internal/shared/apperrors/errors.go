// Package apperrors defines the single error type that crosses layer
// boundaries in this application.
//
// Services return *Error (or a wrapped sentinel); the HTTP layer translates it
// into a status code and a client-safe payload exactly once, in
// response.Error. Two rules keep this honest:
//
//  1. Message is shown to the client, so it must never contain internal
//     detail. Everything diagnostic goes into the wrapped cause, which is
//     logged but not serialised.
//  2. Services never import net/http for status codes; they pick a Code and
//     the mapping lives here.
package apperrors

import (
	"errors"
	"fmt"
	"net/http"
)

// Code is a stable, machine-readable error identifier. Clients may switch on
// it; it is part of the API contract.
type Code string

// The complete set of error codes this API returns.
const (
	CodeValidation   Code = "validation_failed"
	CodeBadRequest   Code = "bad_request"
	CodeUnauthorized Code = "unauthorized"
	CodeForbidden    Code = "forbidden"
	CodeNotFound     Code = "not_found"
	CodeConflict     Code = "conflict"
	CodeTooLarge     Code = "payload_too_large"
	CodeRateLimited  Code = "rate_limited"
	CodeInternal     Code = "internal_error"
	CodeUnavailable  Code = "service_unavailable"
)

// FieldError describes one invalid input field.
type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// Error is the application error type.
type Error struct {
	Code    Code
	Message string
	Details []FieldError
	cause   error
}

// Error implements the error interface. The cause is included because this
// string is only ever used for logging, never for responses.
func (e *Error) Error() string {
	if e.cause != nil {
		return fmt.Sprintf("%s: %s: %v", e.Code, e.Message, e.cause)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

// Unwrap exposes the wrapped cause to errors.Is and errors.As.
func (e *Error) Unwrap() error { return e.cause }

// Status maps the code onto an HTTP status.
func (e *Error) Status() int {
	switch e.Code {
	case CodeValidation, CodeBadRequest:
		return http.StatusBadRequest
	case CodeUnauthorized:
		return http.StatusUnauthorized
	case CodeForbidden:
		return http.StatusForbidden
	case CodeNotFound:
		return http.StatusNotFound
	case CodeConflict:
		return http.StatusConflict
	case CodeTooLarge:
		return http.StatusRequestEntityTooLarge
	case CodeRateLimited:
		return http.StatusTooManyRequests
	case CodeUnavailable:
		return http.StatusServiceUnavailable
	default:
		return http.StatusInternalServerError
	}
}

// WithCause attaches a diagnostic cause without changing the client-facing
// message. It returns a copy so shared sentinels stay immutable.
func (e *Error) WithCause(err error) *Error {
	if err == nil {
		return e
	}
	cp := *e
	cp.cause = err
	return &cp
}

// WithDetails attaches field-level validation detail.
func (e *Error) WithDetails(details ...FieldError) *Error {
	cp := *e
	cp.Details = append(append([]FieldError(nil), cp.Details...), details...)
	return &cp
}

// New builds an error with an explicit code and client-safe message.
func New(code Code, message string) *Error {
	return &Error{Code: code, Message: message}
}

// Convenience constructors for the cases that actually occur in this codebase.

// Validation reports rejected input, with per-field detail.
func Validation(message string, details ...FieldError) *Error {
	return &Error{Code: CodeValidation, Message: message, Details: details}
}

// BadRequest reports a malformed request that is not field-specific.
func BadRequest(message string) *Error { return New(CodeBadRequest, message) }

// Unauthorized reports missing or invalid credentials.
func Unauthorized(message string) *Error { return New(CodeUnauthorized, message) }

// Forbidden reports an authenticated principal lacking permission.
func Forbidden(message string) *Error { return New(CodeForbidden, message) }

// NotFound reports a missing resource.
func NotFound(resource string) *Error {
	return New(CodeNotFound, resource+" not found")
}

// Conflict reports a state or uniqueness conflict.
func Conflict(message string) *Error { return New(CodeConflict, message) }

// TooLarge reports an oversized payload.
func TooLarge(message string) *Error { return New(CodeTooLarge, message) }

// RateLimited reports that the caller exceeded a quota.
func RateLimited(message string) *Error { return New(CodeRateLimited, message) }

// Unavailable reports a dependency outage.
func Unavailable(message string) *Error { return New(CodeUnavailable, message) }

// Internal wraps an unexpected failure. The cause is preserved for logs while
// the client sees a generic message.
func Internal(cause error) *Error {
	return (&Error{Code: CodeInternal, Message: "an internal error occurred"}).WithCause(cause)
}

// Internalf wraps an unexpected failure with added context.
func Internalf(cause error, format string, args ...any) *Error {
	return Internal(fmt.Errorf(format+": %w", append(args, cause)...))
}

// As extracts an *Error from err, reporting whether one was found.
func As(err error) (*Error, bool) {
	var appErr *Error
	if errors.As(err, &appErr) {
		return appErr, true
	}
	return nil, false
}

// From normalises any error into an *Error. Errors that did not originate from
// this package become CodeInternal so no internal detail leaks to clients.
func From(err error) *Error {
	if err == nil {
		return nil
	}
	if appErr, ok := As(err); ok {
		return appErr
	}
	return Internal(err)
}

// IsCode reports whether err carries the given code.
func IsCode(err error, code Code) bool {
	appErr, ok := As(err)
	return ok && appErr.Code == code
}
