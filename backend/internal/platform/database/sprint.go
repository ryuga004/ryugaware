package database

import (
	"fmt"
	"strings"
)

// sprint renders GORM's variadic log arguments without interpreting them as a
// format string, so a stray %s in user data cannot corrupt the output.
func sprint(args []any) string {
	parts := make([]string, 0, len(args))
	for _, a := range args {
		parts = append(parts, fmt.Sprint(a))
	}
	return strings.Join(parts, " ")
}
