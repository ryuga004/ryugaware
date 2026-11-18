package apperrors

import (
	"errors"
	"fmt"
	"net/http"
)

type Code string

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

	CodeInvalidOTP                Code = "invalid_otp"
	CodeOTPExpired                Code = "otp_expired_or_invalid"
	CodeEmailVerificationRequired Code = "email_verification_required"
	CodeInvalidRegistrationToken  Code = "invalid_registration_token"
	CodeEmailAlreadyRegistered    Code = "email_already_registered"
	CodeOrganizationNameTaken     Code = "organization_name_already_exists"
)

type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

type Error struct {
	Code    Code
	Message string
	Details []FieldError
	cause   error
}

func (e *Error) Error() string {
	if e.cause != nil {
		return fmt.Sprintf("%s: %s: %v", e.Code, e.Message, e.cause)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

func (e *Error) Unwrap() error { return e.cause }

func (e *Error) Status() int {
	switch e.Code {
	case CodeValidation:
		return http.StatusUnprocessableEntity
	case CodeBadRequest:
		return http.StatusBadRequest
	case CodeUnauthorized:
		return http.StatusUnauthorized
	case CodeForbidden:
		return http.StatusForbidden
	case CodeNotFound:
		return http.StatusNotFound
	case CodeConflict, CodeEmailAlreadyRegistered, CodeOrganizationNameTaken:
		return http.StatusConflict
	case CodeInvalidOTP, CodeOTPExpired, CodeEmailVerificationRequired, CodeInvalidRegistrationToken:
		return http.StatusBadRequest
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

func (e *Error) Title() string {
	switch e.Code {
	case CodeValidation:
		return "Validation failed"
	case CodeBadRequest:
		return "Bad request"
	case CodeUnauthorized:
		return "Unauthorized"
	case CodeForbidden:
		return "Forbidden"
	case CodeNotFound:
		return "Not found"
	case CodeConflict:
		return "Conflict"
	case CodeInvalidOTP:
		return "Invalid verification code"
	case CodeOTPExpired:
		return "Verification code expired or invalid"
	case CodeEmailVerificationRequired:
		return "Email verification required"
	case CodeInvalidRegistrationToken:
		return "Invalid registration verification"
	case CodeEmailAlreadyRegistered:
		return "Email already registered"
	case CodeOrganizationNameTaken:
		return "Organization name already exists"
	case CodeTooLarge:
		return "Payload too large"
	case CodeRateLimited:
		return "Too many requests"
	case CodeUnavailable:
		return "Service unavailable"
	default:
		return "Internal server error"
	}
}

func (e *Error) WithCause(err error) *Error {
	if err == nil {
		return e
	}
	cp := *e
	cp.cause = err
	return &cp
}

func (e *Error) WithDetails(details ...FieldError) *Error {
	cp := *e
	cp.Details = append(append([]FieldError(nil), cp.Details...), details...)
	return &cp
}

func New(code Code, message string) *Error {
	return &Error{Code: code, Message: message}
}

func Validation(message string, details ...FieldError) *Error {
	return &Error{Code: CodeValidation, Message: message, Details: details}
}

func BadRequest(message string) *Error { return New(CodeBadRequest, message) }

func Unauthorized(message string) *Error { return New(CodeUnauthorized, message) }

func Forbidden(message string) *Error { return New(CodeForbidden, message) }

func NotFound(resource string) *Error {
	return New(CodeNotFound, resource+" not found")
}

func Conflict(message string) *Error { return New(CodeConflict, message) }

func TooLarge(message string) *Error { return New(CodeTooLarge, message) }

func RateLimited(message string) *Error { return New(CodeRateLimited, message) }

func Unavailable(message string) *Error { return New(CodeUnavailable, message) }

func InvalidOTP() *Error { return New(CodeInvalidOTP, "Invalid verification code") }

func OTPExpired() *Error {
	return New(CodeOTPExpired, "Verification code expired or invalid")
}

func VerificationRequired() *Error {
	return New(CodeEmailVerificationRequired, "Email verification required")
}

func InvalidRegistrationToken() *Error {
	return New(CodeInvalidRegistrationToken, "Invalid registration verification")
}

func EmailAlreadyRegistered() *Error {
	return New(CodeEmailAlreadyRegistered, "Email already registered")
}

func OrganizationNameTaken() *Error {
	return New(CodeOrganizationNameTaken, "Organization name already exists")
}

func Internal(cause error) *Error {
	return (&Error{Code: CodeInternal, Message: "an internal error occurred"}).WithCause(cause)
}

func Internalf(cause error, format string, args ...any) *Error {
	return Internal(fmt.Errorf(format+": %w", append(args, cause)...))
}

func As(err error) (*Error, bool) {
	var appErr *Error
	if errors.As(err, &appErr) {
		return appErr, true
	}
	return nil, false
}

func From(err error) *Error {
	if err == nil {
		return nil
	}
	if appErr, ok := As(err); ok {
		return appErr
	}
	return Internal(err)
}

func IsCode(err error, code Code) bool {
	appErr, ok := As(err)
	return ok && appErr.Code == code
}
