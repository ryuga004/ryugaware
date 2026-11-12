export interface Organization {
  id: string;
  name: string;
  defaultLanguage: string;
  defaultTimezone: string;
  defaultCurrency: string;
  createdAt: string;
  updatedAt: string;
}

export type OrganizationEditable = Pick<Organization, "name" | "defaultLanguage" | "defaultTimezone" | "defaultCurrency">;

export type UpdateOrganizationInput = Partial<OrganizationEditable>;

export interface OptionItem {
  value: string;
  label: string;
}

export interface SettingsOptions {
  languages: OptionItem[];
  timezones: OptionItem[];
  currencies: OptionItem[];
}

export interface Session {
  id: string;
  device: string;
  deviceType: "desktop" | "mobile";
  location: string;
  ip: string;
  lastActiveAt: string;
  current: boolean;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  signOutOthers: boolean;
}
