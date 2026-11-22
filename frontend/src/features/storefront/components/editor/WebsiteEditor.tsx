"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Rocket } from "lucide-react";
import { ConfirmDialog } from "@/components/platform/ConfirmDialog";
import { ErrorState } from "@/components/platform/ErrorState";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/features/websites/components/StatusBadge";
import { useGetWebsiteQuery, useUpdateWebsiteMutation, useUploadAssetMutation } from "@/features/websites/api";
import { useGetStoreSettingsQuery, useUpdateStoreSettingsMutation } from "@/features/website-settings/api";
import { toCommerce } from "@/features/website-settings/commerce";
import { pushToast } from "@/features/ui/slice";
import { cn } from "@/lib/cn";
import { pluralize } from "@/lib/format";
import { useAppDispatch } from "@/store/hooks";
import { useGetSiteContentQuery, useSaveSiteContentMutation } from "../../api";
import { commitAssets, pendingAssets } from "../../assets";
import * as ops from "../../editorOps";
import { getTemplate } from "../../templates";
import type { SiteContent } from "../../types";
import { DeviceFrame, DeviceSwitcher, type Device } from "../DeviceFrame";
import { Storefront } from "../Storefront";
import { CHROME, EditorPanel, type EditorView, type PanelActions } from "./EditorPanel";
import { AssetUploadProvider } from "./FieldsForm";

/**
 * The website editor: a form panel on the left, the real storefront on the right.
 *
 * Edits go into a local draft so the preview updates as you type; saving writes the whole content
 * document back. The preview is the same renderer that serves the published website — not a mock —
 * so what you see here is what a visitor gets.
 */
export function WebsiteEditor({ websiteId }: { websiteId: string }) {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const website = useGetWebsiteQuery(websiteId);
  const content = useGetSiteContentQuery(websiteId);
  const storeSettings = useGetStoreSettingsQuery(websiteId);
  const [updateStoreSettings] = useUpdateStoreSettingsMutation();
  const [save, { isLoading: saving }] = useSaveSiteContentMutation();
  const [uploadAsset] = useUploadAssetMutation();

  const upload = useCallback(
    async (file: File) => (await uploadAsset({ websiteId, file }).unwrap()).url,
    [uploadAsset, websiteId],
  );
  // No `upload` here on purpose: a picked picture stays a data URL in the draft and reaches S3 only
  // when the customer saves, so a discarded edit leaves nothing behind in the bucket.
  const assets = useMemo(() => ({ websiteId }), [websiteId]);
  const [updateWebsite, { isLoading: publishing }] = useUpdateWebsiteMutation();

  // The draft only exists once something has been edited; until then the loaded content is shown.
  const [edited, setEdited] = useState<SiteContent | null>(null);
  const [view, setView] = useState<EditorView>({ kind: "root" });
  const [device, setDevice] = useState<Device>("desktop");
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [path, setPath] = useState("/");
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [uploadingAssets, setUploadingAssets] = useState<{ done: number; total: number } | null>(null);

  const site = edited ?? content.data;
  // The preview shows the same payment, delivery and sign-in options a shopper would get.
  const commerce = storeSettings.data ? toCommerce(storeSettings.data) : undefined;
  const dirty = edited !== null && content.data !== undefined && JSON.stringify(edited) !== JSON.stringify(content.data);
  // Pictures chosen but not uploaded yet. They live in the draft and the preview only.
  const waiting = site ? pendingAssets(site).length : 0;
  const busy = saving || publishing || uploadingAssets !== null;

  const edit = useCallback(
    (fn: (current: SiteContent) => SiteContent) => setEdited((current) => (current ? fn(current) : content.data ? fn(content.data) : null)),
    [content.data],
  );

  const onError = useCallback((message: string) => dispatch(pushToast({ tone: "error", title: "Couldn’t use that file", description: message })), [dispatch]);

  const actions: PanelActions = {
    setThemeValue: (key, value) => edit((s) => ops.setThemeValue(s, key, value)),
    setChromeValue: (id, key, value) => edit((s) => ops.setChromeValue(s, id, key, value)),
    setPageSetting: (pageKey, key, value) => edit((s) => ops.setPageSetting(s, pageKey, key, value)),
    setPageSeo: (pageKey, key, value) => edit((s) => ops.setPageSeo(s, pageKey, key, value)),
    setPageEnabled: (pageKey, enabled) => edit((s) => ops.setPageEnabled(s, pageKey, enabled)),
    setSectionValue: (pageKey, id, key, value) => edit((s) => ops.setSectionValue(s, pageKey, id, key, value)),
    setSectionEnabled: (pageKey, id, enabled) =>
      edit((s) => (pageKey === CHROME ? s : ops.setSectionEnabled(s, pageKey, id, enabled))),
    moveSection: (pageKey, id, by) => edit((s) => ops.moveSection(s, pageKey, id, by)),
    removeSection: (pageKey, id) => edit((s) => ops.removeSection(s, pageKey, id)),
    addSection: (pageKey, type) => edit((s) => ops.addSection(s, pageKey, type, ops.nextSectionId(s))),
    onError,
  };

  /** Opening a page in the panel moves the preview to it. */
  const changeView = (next: EditorView) => {
    setView(next);
    const pageKey = next.kind === "page" ? next.pageKey : next.kind === "section" ? next.pageKey : null;
    const page = pageKey && pageKey !== CHROME ? site?.pages.find((p) => p.key === pageKey) : null;
    if (page) setPath(ops.previewPathFor(page.path));
    if (next.kind !== "root") setTab("edit");
  };

  /**
   * Uploads the pictures chosen since the last save, then returns the draft pointing at them.
   * Returns null when an upload failed — the content must not be saved still holding a data URL.
   * The committed draft is kept either way, so retrying never uploads the same picture twice.
   */
  const commit = async (current: SiteContent) => {
    const total = pendingAssets(current).length;
    if (total === 0) return current;
    setUploadingAssets({ done: 0, total });
    try {
      const committed = await commitAssets(current, upload, (done, total) => setUploadingAssets({ done, total }));
      setEdited(committed);
      return committed;
    } catch {
      dispatch(
        pushToast({
          tone: "error",
          title: "Couldn’t upload your pictures",
          description: "Nothing was saved. Check your connection and try again.",
        }),
      );
      return null;
    } finally {
      setUploadingAssets(null);
    }
  };

  const onSave = async () => {
    if (!site) return;
    const committed = await commit(site);
    if (!committed) return;
    await save({ websiteId, content: committed }).unwrap().catch(() => null);
    setEdited(null);
  };

  const onPublish = async () => {
    if (!site) return;
    const committed = await commit(site);
    if (!committed) return;
    await save({ websiteId, content: committed }).unwrap().catch(() => null);
    setEdited(null);
    await updateWebsite({ id: websiteId, patch: { publish: true } }).unwrap().catch(() => null);
  };

  const leave = () => (dirty ? setConfirmLeave(true) : router.push("/websites"));

  if (website.isError || content.isError) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <ErrorState
          title="We couldn’t open this website"
          description="Its content could not be loaded. Try again, or go back to your websites."
          onRetry={() => {
            website.refetch();
            content.refetch();
          }}
        />
      </div>
    );
  }

  const manifest = site ? getTemplate(site.templateId)?.manifest : undefined;

  return (
    <div className="flex h-dvh flex-col bg-page">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-3 sm:gap-3 sm:px-4">
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="size-4" />} onClick={leave}>
          <span className="max-sm:sr-only">Websites</span>
        </Button>

        <div className="flex min-w-0 items-center gap-2">
          {website.data ? (
            <>
              <p className="font-heading truncate text-sm font-semibold text-ink max-sm:hidden">{website.data.name}</p>
              <span className="max-sm:hidden">
                <StatusBadge status={website.data.status} />
              </span>
            </>
          ) : (
            <Skeleton className="h-5 w-40 max-sm:hidden" />
          )}
          {dirty && (
            <span className="text-xs whitespace-nowrap text-muted max-sm:hidden">
              {waiting > 0 ? `${pluralize(waiting, "picture")} will upload when you save` : "Unsaved changes"}
            </span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <SegmentedControl
            ariaLabel="Editor view"
            className="md:hidden"
            value={tab}
            onChange={setTab}
            options={[
              { value: "edit", label: "Edit" },
              { value: "preview", label: "Preview" },
            ]}
          />
          <DeviceSwitcher value={device} onChange={setDevice} className="max-md:hidden" />
          {website.data && (
            <a
              href={`/sites/${website.data.subdomain}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-subtle max-lg:hidden"
            >
              Open
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          )}
          {dirty && (
            <Button variant="ghost" size="sm" onClick={() => setEdited(null)} disabled={busy}>
              Discard
            </Button>
          )}
          <Button size="sm" onClick={onSave} loading={saving || uploadingAssets !== null} disabled={!dirty || publishing}>
            {uploadingAssets ? (
              `Uploading ${Math.min(uploadingAssets.done + 1, uploadingAssets.total)} of ${uploadingAssets.total}…`
            ) : saving ? (
              "Saving…"
            ) : (
              <>
                Save<span className="max-sm:hidden">&nbsp;changes</span>
              </>
            )}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Rocket className="size-4" />}
            onClick={onPublish}
            loading={publishing}
            disabled={busy && !publishing}
            className="max-sm:hidden"
          >
            {publishing ? "Publishing…" : "Publish"}
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className={cn("w-full shrink-0 overflow-y-auto border-line bg-page md:w-[348px] md:border-r", tab === "preview" && "max-md:hidden")}>
          {site && manifest ? (
            <AssetUploadProvider value={assets}>
              <EditorPanel
                site={site}
                manifest={manifest}
                view={view}
                onView={changeView}
                actions={actions}
                store={{
                  settings: storeSettings.data,
                  loading: storeSettings.isLoading,
                  update: (patch) => updateStoreSettings({ websiteId, patch }),
                }}
              />
            </AssetUploadProvider>
          ) : (
            <div className="space-y-2 p-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          )}
        </aside>

        <div className={cn("min-w-0 flex-1", tab === "edit" && "max-md:hidden")}>
          {site ? (
            <DeviceFrame device={device}>
              <Storefront site={site} commerce={commerce} path={path} onNavigate={setPath} hrefFor={() => "#"} preview />
            </DeviceFrame>
          ) : (
            <div className="h-full space-y-4 bg-subtle p-6">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-72 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmLeave}
        title="Leave without saving?"
        description="Your changes to this website will be lost."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        tone="danger"
        onConfirm={() => router.push("/websites")}
        onCancel={() => setConfirmLeave(false)}
      />
    </div>
  );
}
