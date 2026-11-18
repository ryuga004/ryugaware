package service

import (
	"net/mail"
	"strings"
	"unicode"

	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
)

const (
	minPasswordLength = 8
	maxPasswordLength = 128
	maxNameLength     = 80
	maxEmailLength    = 254
)

func validateEmail(field, email string) *apperrors.Error {
	if email == "" || len(email) > maxEmailLength {
		return fieldError(field, "Enter a valid email address.")
	}
	address, err := mail.ParseAddress(email)
	if err != nil || address.Address != email || strings.Count(email, "@") != 1 {
		return fieldError(field, "Enter a valid email address.")
	}
	local, domain, _ := strings.Cut(email, "@")
	if local == "" || !strings.Contains(domain, ".") || strings.HasPrefix(domain, ".") || strings.HasSuffix(domain, ".") {
		return fieldError(field, "Enter a valid email address.")
	}
	return nil
}

func validatePassword(field, password string) *apperrors.Error {
	var hasLetter, hasDigit bool
	for _, r := range password {
		switch {
		case unicode.IsLetter(r):
			hasLetter = true
		case unicode.IsDigit(r):
			hasDigit = true
		}
	}

	switch {
	case len(password) < minPasswordLength:
		return fieldError(field, "Use at least 8 characters.")
	case len(password) > maxPasswordLength:
		return fieldError(field, "Use 128 characters or fewer.")
	case !hasLetter:
		return fieldError(field, "Include at least one letter.")
	case !hasDigit:
		return fieldError(field, "Include at least one number.")
	}
	return nil
}

func fieldError(field, message string) *apperrors.Error {
	return apperrors.Validation("Request validation failed",
		apperrors.FieldError{Field: field, Message: message})
}
