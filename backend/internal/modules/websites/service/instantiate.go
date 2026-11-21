package service

import (
	"encoding/json"
	"fmt"
)

type presetSection struct {
	Type     string          `json:"type"`
	Enabled  *bool           `json:"enabled"`
	Settings json.RawMessage `json:"settings"`
}

type presetPage struct {
	Title       string          `json:"title"`
	Label       string          `json:"label"`
	Description string          `json:"description"`
	Required    bool            `json:"required"`
	GovernedBy  *string         `json:"governedBy"`
	Enabled     *bool           `json:"enabled"`
	SEO         json.RawMessage `json:"seo"`
	Sections    []presetSection `json:"sections"`
	Settings    json.RawMessage `json:"settings"`
}

type siteSection struct {
	ID       string          `json:"id"`
	Type     string          `json:"type"`
	Enabled  bool            `json:"enabled"`
	Settings json.RawMessage `json:"settings"`
}

type sectionNumberer struct{ n int }

func (s *sectionNumberer) next() string {
	s.n++
	return fmt.Sprintf("sec_%03d", s.n)
}

func decodePage(raw []byte) presetPage {
	var p presetPage
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &p)
	}
	return p
}

func instantiateSections(in []presetSection, ids *sectionNumberer) ([]byte, error) {
	out := make([]siteSection, 0, len(in))
	for _, s := range in {
		enabled := true
		if s.Enabled != nil {
			enabled = *s.Enabled
		}
		settings := s.Settings
		if len(settings) == 0 {
			settings = json.RawMessage("{}")
		}
		out = append(out, siteSection{ID: ids.next(), Type: s.Type, Enabled: enabled, Settings: settings})
	}
	return json.Marshal(out)
}

func instantiateChrome(raw []byte, ids *sectionNumberer) ([]byte, error) {
	var sections []presetSection
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &sections); err != nil {
			return []byte("[]"), nil
		}
	}
	return instantiateSections(sections, ids)
}

func rawOrDefault(raw json.RawMessage, fallback string) []byte {
	if len(raw) == 0 {
		return []byte(fallback)
	}
	return raw
}
