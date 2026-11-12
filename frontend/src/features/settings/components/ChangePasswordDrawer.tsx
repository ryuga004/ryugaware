"use client";

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Drawer } from "@/components/platform/Drawer";
import { FormField } from "@/components/platform/FormField";
import { PasswordInput } from "@/components/platform/PasswordInput";
import { PasswordRules } from "@/components/platform/PasswordRules";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { isApiError } from "@/lib/api/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useChangePasswordMutation } from "../api";
import { changePasswordSchema, type ChangePasswordValues } from "../schemas";
import { closeChangePassword, selectChangePasswordOpen } from "../slice";

export function ChangePasswordDrawer() {
  const open = useAppSelector(selectChangePasswordOpen);
  // Mount the form only while open so every opening starts from a clean state.
  return open ? <ChangePasswordForm /> : null;
}

function ChangePasswordForm() {
  const dispatch = useAppDispatch();
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "", signOutOthers: true },
    mode: "onTouched",
  });
  const newPassword = useWatch({ control, name: "newPassword" });

  const onSubmit = handleSubmit(async ({ currentPassword, newPassword, signOutOthers }) => {
    try {
      await changePassword({ currentPassword, newPassword, signOutOthers }).unwrap(); // slice closes the drawer
    } catch (e) {
      if (isApiError(e) && e.data.fieldErrors?.currentPassword) setError("currentPassword", { message: e.data.fieldErrors.currentPassword });
    }
  });

  return (
    <Drawer
      open
      onClose={() => dispatch(closeChangePassword())}
      title="Change password"
      description="Use a password you don’t use anywhere else."
      busy={isLoading}
      dirty={isDirty}
      footer={({ requestClose }) => (
        <>
          <Button variant="secondary" onClick={requestClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" form="change-password-form" loading={isLoading}>
            {isLoading ? "Updating…" : "Update password"}
          </Button>
        </>
      )}
    >
      <form id="change-password-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <FormField label="Current password" error={errors.currentPassword?.message}>
          {(c) => <PasswordInput {...c} autoComplete="current-password" disabled={isLoading} {...register("currentPassword")} />}
        </FormField>
        <div className="flex flex-col gap-3">
          <FormField label="New password" error={errors.newPassword?.message}>
            {(c) => <PasswordInput {...c} autoComplete="new-password" disabled={isLoading} {...register("newPassword")} />}
          </FormField>
          <PasswordRules value={newPassword} />
        </div>
        <FormField label="Confirm new password" error={errors.confirmPassword?.message}>
          {(c) => <PasswordInput {...c} autoComplete="new-password" disabled={isLoading} {...register("confirmPassword")} />}
        </FormField>
        <Controller
          control={control}
          name="signOutOthers"
          render={({ field }) => <Checkbox label="Sign out of other sessions" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} disabled={isLoading} />}
        />
      </form>
    </Drawer>
  );
}
