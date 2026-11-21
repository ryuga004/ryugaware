package handler

import (
	"github.com/gin-gonic/gin"

	"github.com/ryuga/ryugaware/backend/internal/modules/websites/dto"
	"github.com/ryuga/ryugaware/backend/internal/modules/websites/service"
	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
	"github.com/ryuga/ryugaware/backend/internal/shared/response"
)

func (h *Handler) UploadAsset(c *gin.Context) {
	tenantID, _, id, ok := scope(c)
	if !ok {
		response.Error(c, apperrors.Unauthorized("Sign in to continue"))
		return
	}

	header, err := c.FormFile("file")
	if err != nil {
		response.Error(c, apperrors.BadRequest("Attach a file to upload"))
		return
	}

	file, err := header.Open()
	if err != nil {
		response.Error(c, apperrors.BadRequest("That file could not be read"))
		return
	}
	defer file.Close()

	asset, err := h.svc.Upload(c.Request.Context(), tenantID, id, service.UploadInput{
		Body:        file,
		Size:        header.Size,
		ContentType: header.Header.Get("Content-Type"),
		FileName:    header.Filename,
	})
	if err != nil {
		response.Error(c, err)
		return
	}

	response.Created(c, dto.Asset{
		Key:         asset.Key,
		URL:         asset.URL,
		Size:        asset.Size,
		ContentType: asset.ContentType,
	})
}

func (h *Handler) Storage(c *gin.Context) {
	tenantID, _, _, ok := scope(c)
	if !ok {
		response.Error(c, apperrors.Unauthorized("Sign in to continue"))
		return
	}

	usage, err := h.svc.StorageUsage(c.Request.Context(), tenantID)
	if err != nil {
		response.Error(c, err)
		return
	}

	sites := make([]dto.WebsiteStorage, 0, len(usage.Websites))
	for _, u := range usage.Websites {
		sites = append(sites, dto.WebsiteStorage{
			WebsiteID: u.WebsiteID.String(),
			Name:      u.Name,
			Prefix:    u.Prefix,
			Bytes:     u.Bytes,
			Objects:   u.Objects,
		})
	}

	response.OK(c, dto.Storage{
		Provider:   "platform",
		Websites:   sites,
		BytesUsed:  usage.BytesUsed,
		Objects:    usage.Objects,
		QuotaBytes: usage.QuotaBytes,
	})
}
