import { ArrowUpRight, Ellipsis, Pencil, Trash2 } from "lucide-react";
import { ActionMenu } from "@/components/platform/ActionMenu";
import { DataTable, type Column } from "@/components/platform/DataTable";
import { TemplateShot } from "@/components/platform/TemplateShot";
import { IconButton } from "@/components/ui/Button";
import { formatDate } from "@/lib/format";
import { TYPE_LABEL } from "../constants";
import type { Website } from "../types";
import { StatusBadge } from "./StatusBadge";

/** Table presentation of websites, built on the shared DataTable. */
export function WebsitesTable({
  rows,
  loading,
  onEdit,
  onDelete,
  onOpenAdmin,
}: {
  rows: Website[] | undefined;
  loading?: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenAdmin: (website: Website) => void;
}) {
  const columns: Column<Website>[] = [
    {
      key: "name",
      header: "Website",
      cell: (w) => (
        <div className="flex items-center gap-3">
          <div className="w-14 shrink-0 overflow-hidden rounded border border-line">
            <TemplateShot theme={w.thumbnailTheme} muted={w.status === "draft"} sizes="56px" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{w.name}</p>
            <p className="truncate text-xs text-muted">{w.customDomain ?? w.url.replace("https://", "")}</p>
          </div>
        </div>
      ),
    },
    { key: "status", header: "Status", cell: (w) => <StatusBadge status={w.status} /> },
    { key: "type", header: "Type", cell: (w) => TYPE_LABEL[w.type] },
    { key: "template", header: "Template", cell: (w) => w.templateName },
    { key: "updated", header: "Updated", cell: (w) => formatDate(w.updatedAt), className: "tabular-nums" },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      cell: (w) => (
        <ActionMenu
          trigger={
            <IconButton label={`Actions for ${w.name}`}>
              <Ellipsis className="size-4" />
            </IconButton>
          }
          items={[
            { key: "admin", label: "Open admin", icon: <ArrowUpRight className="size-4 text-muted" />, onSelect: () => onOpenAdmin(w) },
            { key: "edit", label: "Edit details", icon: <Pencil className="size-4 text-muted" />, onSelect: () => onEdit(w.id) },
            { key: "delete", label: "Delete website", icon: <Trash2 className="size-4" />, tone: "danger", separated: true, onSelect: () => onDelete(w.id) },
          ]}
        />
      ),
    },
  ];

  return <DataTable caption="Websites" columns={columns} rows={rows} getRowId={(w) => w.id} loading={loading} skeletonRows={6} />;
}
