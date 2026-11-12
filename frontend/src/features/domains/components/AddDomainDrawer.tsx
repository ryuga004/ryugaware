"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Drawer } from "@/components/platform/Drawer";
import { FormField } from "@/components/platform/FormField";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { WebsiteSelect } from "@/features/websites/components/WebsiteSelect";
import { applyFieldErrors } from "@/lib/api/helpers";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useAddDomainMutation } from "../api";
import { addDomainSchema, type AddDomainOutput, type AddDomainValues } from "../schemas";
import { closeDomainDrawer, selectDomainDrawer } from "../slice";

export function AddDomainDrawer() {
  const drawer = useAppSelector(selectDomainDrawer);
  if (drawer.mode !== "add") return null;
  return <AddDomainForm websiteId={drawer.websiteId} />;
}

function AddDomainForm({ websiteId }: { websiteId?: string }) {
  const dispatch = useAppDispatch();
  const [addDomain, { isLoading }] = useAddDomainMutation();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<AddDomainValues, unknown, AddDomainOutput>({
    resolver: zodResolver(addDomainSchema),
    defaultValues: { hostname: "", websiteId: websiteId ?? "" },
    mode: "onTouched",
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await addDomain(values).unwrap(); // the slice switches the drawer to the DNS steps on success
    } catch (e) {
      applyFieldErrors(e, ["hostname", "websiteId"] as const, setError);
    }
  });

  return (
    <Drawer
      open
      onClose={() => dispatch(closeDomainDrawer())}
      title="Add domain"
      description="Use a domain you already own. You’ll add two DNS records at your domain provider next."
      busy={isLoading}
      dirty={isDirty}
      footer={({ requestClose }) => (
        <>
          <Button variant="secondary" onClick={requestClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" form="add-domain-form" loading={isLoading}>
            {isLoading ? "Adding…" : "Add domain"}
          </Button>
        </>
      )}
    >
      <form id="add-domain-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <FormField label="Domain" required error={errors.hostname?.message} hint="For example shop.yourbrand.com or yourbrand.com.">
          {(c) => <Input {...c} {...register("hostname")} placeholder="shop.yourbrand.com" autoComplete="off" autoCapitalize="none" spellCheck={false} inputMode="url" mono autoFocus />}
        </FormField>
        <FormField label="Website" required error={errors.websiteId?.message} hint="Visitors to this domain see this website.">
          {(c) => (
            <Controller
              control={control}
              name="websiteId"
              render={({ field }) => (
                <WebsiteSelect id={c.id} value={field.value} onChange={field.onChange} allLabel="Choose a website" allValue="" />
              )}
            />
          )}
        </FormField>
      </form>
    </Drawer>
  );
}
