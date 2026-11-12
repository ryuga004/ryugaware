"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Drawer } from "@/components/platform/Drawer";
import { FormField } from "@/components/platform/FormField";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { isApiError } from "@/lib/api/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useGetMeQuery, useUpdateMeMutation } from "../api";
import { closeEditProfile, selectEditProfileOpen } from "../slice";

const schema = z.object({ fullName: z.string().trim().min(1, "Enter your full name.").max(80, "Use 80 characters or fewer.") });
type Values = z.infer<typeof schema>;

export function EditProfileDrawer() {
  const open = useAppSelector(selectEditProfileOpen);
  return open ? <EditProfileForm /> : null;
}

function EditProfileForm() {
  const dispatch = useAppDispatch();
  const { data: me } = useGetMeQuery();
  const [updateMe, { isLoading }] = useUpdateMeMutation();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { fullName: "" }, mode: "onTouched" });

  useEffect(() => {
    if (me) reset({ fullName: me.fullName });
  }, [me, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateMe(values).unwrap(); // slice closes the drawer
    } catch (e) {
      if (isApiError(e) && e.data.fieldErrors?.fullName) setError("fullName", { message: e.data.fieldErrors.fullName });
    }
  });

  return (
    <Drawer
      open
      onClose={() => dispatch(closeEditProfile())}
      title="Edit profile"
      description="Update your name. Email changes aren’t available yet."
      busy={isLoading}
      dirty={isDirty}
      footer={({ requestClose }) => (
        <>
          <Button variant="secondary" onClick={requestClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" form="edit-profile-form" loading={isLoading} disabled={!isDirty}>
            {isLoading ? "Saving…" : "Save changes"}
          </Button>
        </>
      )}
    >
      <form id="edit-profile-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <FormField label="Full name" error={errors.fullName?.message}>
          {(c) => <Input {...c} autoComplete="name" disabled={isLoading || !me} {...register("fullName")} />}
        </FormField>
        <FormField label="Email" hint="Email changes aren’t available yet.">
          {(c) => <Input {...c} readOnly value={me?.email ?? ""} />}
        </FormField>
      </form>
    </Drawer>
  );
}
