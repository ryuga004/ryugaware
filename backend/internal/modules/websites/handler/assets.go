package handler

import (
	"github.com/gin-gonic/gin"

	"github.com/ryuga/ryugaware/backend/internal/modules/websites/dto"
	"github.com/ryuga/ryugaware/backend/internal/modules/websites/service"
	"github.com/ryuga/ryugaware/backend/internal/shared/apperrors"
	"github.com/ryuga/ryugaware/backend/internal/shared/binding"
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

func (h *Handler) ListAssets(c *gin.Context) {
	tenantID, _, id, ok := scope(c)
	if !ok {
		response.Error(c, apperrors.Unauthorized("Sign in to continue"))
		return
	}

	var q dto.AssetListQuery
	if err := binding.Query(c, &q); err != nil {
		response.Error(c, err)
		return
	}

	listing, err := h.svc.ListAssets(c.Request.Context(), tenantID, id, q.Path)
	if err != nil {
		response.Error(c, err)
		return
	}

	folders := make([]dto.AssetFolder, 0, len(listing.Folders))
	for _, f := range listing.Folders {
		folders = append(folders, dto.AssetFolder{Name: f.Name, Path: f.Path, Bytes: f.Bytes, Objects: f.Objects})
	}
	files := make([]dto.AssetFile, 0, len(listing.Files))
	for _, f := range listing.Files {
		files = append(files, dto.AssetFile{
			Key:         f.Key,
			Name:        f.Name,
			URL:         f.URL,
			Size:        f.Size,
			ContentType: f.ContentType,
			UpdatedAt:   f.UpdatedAt,
		})
	}

	response.OK(c, dto.AssetListing{
		WebsiteID: id.String(),
		Path:      listing.Path,
		Folders:   folders,
		Files:     files,
		Bytes:     listing.Bytes,
		Objects:   listing.Objects,
		Truncated: listing.Truncated,
	})
}

func (h *Handler) DeleteAsset(c *gin.Context) {
	tenantID, _, id, ok := scope(c)
	if !ok {
		response.Error(c, apperrors.Unauthorized("Sign in to continue"))
		return
	}

	var q dto.AssetDeleteQuery
	if err := binding.Query(c, &q); err != nil {
		response.Error(c, err)
		return
	}

	if err := h.svc.DeleteAsset(c.Request.Context(), tenantID, id, q.Key); err != nil {
		response.Error(c, err)
		return
	}
	response.NoContent(c)
}
