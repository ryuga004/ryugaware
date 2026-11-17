CREATE TABLE email_templates (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID         REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL CHECK (name ~ '^[a-z][a-z0-9_]*$'),
    subject         VARCHAR(255) NOT NULL CHECK (btrim(subject) <> ''),
    body            TEXT         NOT NULL CHECK (btrim(body) <> ''),
    variables       JSONB        NOT NULL DEFAULT '{}'::jsonb
                                 CHECK (jsonb_typeof(variables) = 'object'),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_email_templates_tenant_name
    ON email_templates (organization_id, name)
    WHERE organization_id IS NOT NULL;

CREATE UNIQUE INDEX uq_email_templates_platform_name
    ON email_templates (name)
    WHERE organization_id IS NULL;

INSERT INTO email_templates (organization_id, name, subject, variables, body) VALUES
(
    NULL,
    'email_verification',
    'Verify your email address',
    '{"name": "Recipient name", "otp": "One-time verification code", "expiry_minutes": "Minutes until the code expires"}'::jsonb,
    $tpl$<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings xmlns:o="urn:schemas-microsoft-com:office:office"><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
@media only screen and (max-width:620px) {
  .pad { padding-left:24px !important; padding-right:24px !important; }
  .btn a { display:block !important; }
  .code { font-size:24px !important; letter-spacing:6px !important; text-indent:6px !important; }
}
</style>
</head>
<body style="margin:0;padding:0;width:100%;background-color:#faf4ec;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#faf4ec;mso-hide:all;">Your Ryugaware verification code&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#faf4ec;">
<tr>
<td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr>
<td style="padding:0 0 16px 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;letter-spacing:0.16em;color:#b8341a;">RYUGAWARE</td>
</tr>
<tr>
<td style="background-color:#ffffff;border:1px solid #e2d6c6;border-radius:10px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td class="pad" style="padding:32px 40px;">
<h1 style="margin:0 0 12px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:20px;line-height:28px;font-weight:600;color:#14100f;">Verify your email</h1>
<p style="margin:0 0 16px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:15px;line-height:23px;color:#3a302b;">Hi {{name}}, enter this code in Ryugaware to finish setting up your account.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;">
<tr>
<td class="code" align="center" style="padding:18px 12px;background-color:#f3ece2;border:1px solid #e2d6c6;border-radius:10px;font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,'Courier New',monospace;font-size:30px;line-height:38px;font-weight:600;letter-spacing:8px;text-indent:8px;color:#14100f;">{{otp}}</td>
</tr>
</table>
<p style="margin:0 0 16px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:15px;line-height:23px;color:#3a302b;">The code expires in {{expiry_minutes}} minutes. Request a new one if it runs out.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 16px 0;"><tr><td style="height:1px;line-height:1px;font-size:0;background-color:#e2d6c6;">&nbsp;</td></tr></table>
<p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;color:#5c5046;">Didn’t create a Ryugaware account? You can safely ignore this email — nothing happens until the code is used.</p>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:20px 4px 0 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:12px;line-height:19px;color:#5c5046;">
Ryugaware sends this message automatically. Replies to this address aren’t monitored.
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>$tpl$
),
(
    NULL,
    'welcome',
    'Welcome to Ryugaware',
    '{"name": "Recipient name", "organization_name": "Organization name", "login_url": "Dashboard sign-in URL"}'::jsonb,
    $tpl$<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings xmlns:o="urn:schemas-microsoft-com:office:office"><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
@media only screen and (max-width:620px) {
  .pad { padding-left:24px !important; padding-right:24px !important; }
  .btn a { display:block !important; }
  .code { font-size:24px !important; letter-spacing:6px !important; text-indent:6px !important; }
}
</style>
</head>
<body style="margin:0;padding:0;width:100%;background-color:#faf4ec;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#faf4ec;mso-hide:all;">Your workspace is ready — sign in to publish your first website&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#faf4ec;">
<tr>
<td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr>
<td style="padding:0 0 16px 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;letter-spacing:0.16em;color:#b8341a;">RYUGAWARE</td>
</tr>
<tr>
<td style="background-color:#ffffff;border:1px solid #e2d6c6;border-radius:10px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td class="pad" style="padding:32px 40px;">
<h1 style="margin:0 0 12px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:20px;line-height:28px;font-weight:600;color:#14100f;">Welcome, {{name}}</h1>
<p style="margin:0 0 16px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:15px;line-height:23px;color:#3a302b;">Your {{organization_name}} workspace is ready. Sign in to pick a template and publish your first website.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="btn" style="margin:0 0 16px 0;">
<tr>
<td align="center" bgcolor="#b8341a" style="border-radius:6px;mso-padding-alt:12px 28px;">
<a href="{{login_url}}" style="display:inline-block;padding:12px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:15px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">Go to dashboard</a>
</td>
</tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 16px 0;"><tr><td style="height:1px;line-height:1px;font-size:0;background-color:#e2d6c6;">&nbsp;</td></tr></table>
<p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;color:#5c5046;">If the button doesn’t work, paste this link into your browser:<br>
<span style="font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,'Courier New',monospace;font-size:12px;color:#3a302b;word-break:break-all;">{{login_url}}</span></p>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:20px 4px 0 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:12px;line-height:19px;color:#5c5046;">
Ryugaware sends this message automatically. Replies to this address aren’t monitored.
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>$tpl$
),
(
    NULL,
    'password_reset',
    'Reset your password',
    '{"name": "Recipient name", "otp": "One-time reset code", "expiry_minutes": "Minutes until the code expires"}'::jsonb,
    $tpl$<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings xmlns:o="urn:schemas-microsoft-com:office:office"><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
@media only screen and (max-width:620px) {
  .pad { padding-left:24px !important; padding-right:24px !important; }
  .btn a { display:block !important; }
  .code { font-size:24px !important; letter-spacing:6px !important; text-indent:6px !important; }
}
</style>
</head>
<body style="margin:0;padding:0;width:100%;background-color:#faf4ec;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#faf4ec;mso-hide:all;">Your Ryugaware password reset code&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#faf4ec;">
<tr>
<td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr>
<td style="padding:0 0 16px 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;letter-spacing:0.16em;color:#b8341a;">RYUGAWARE</td>
</tr>
<tr>
<td style="background-color:#ffffff;border:1px solid #e2d6c6;border-radius:10px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td class="pad" style="padding:32px 40px;">
<h1 style="margin:0 0 12px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:20px;line-height:28px;font-weight:600;color:#14100f;">Reset your password</h1>
<p style="margin:0 0 16px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:15px;line-height:23px;color:#3a302b;">Hi {{name}}, enter this code in Ryugaware to set a new password.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;">
<tr>
<td class="code" align="center" style="padding:18px 12px;background-color:#f3ece2;border:1px solid #e2d6c6;border-radius:10px;font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,'Courier New',monospace;font-size:30px;line-height:38px;font-weight:600;letter-spacing:8px;text-indent:8px;color:#14100f;">{{otp}}</td>
</tr>
</table>
<p style="margin:0 0 16px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:15px;line-height:23px;color:#3a302b;">The code expires in {{expiry_minutes}} minutes.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 16px 0;"><tr><td style="height:1px;line-height:1px;font-size:0;background-color:#e2d6c6;">&nbsp;</td></tr></table>
<p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;color:#5c5046;">Didn’t ask to reset your password? Ignore this email — your current password stays the same.</p>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:20px 4px 0 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:12px;line-height:19px;color:#5c5046;">
Ryugaware sends this message automatically. Replies to this address aren’t monitored.
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>$tpl$
),
(
    NULL,
    'user_invited_credentials',
    'Your Ryugaware account',
    '{"name": "Recipient name", "email": "Sign-in email", "temp_password": "Temporary password", "login_url": "Dashboard sign-in URL"}'::jsonb,
    $tpl$<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings xmlns:o="urn:schemas-microsoft-com:office:office"><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
@media only screen and (max-width:620px) {
  .pad { padding-left:24px !important; padding-right:24px !important; }
  .btn a { display:block !important; }
  .code { font-size:24px !important; letter-spacing:6px !important; text-indent:6px !important; }
}
</style>
</head>
<body style="margin:0;padding:0;width:100%;background-color:#faf4ec;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#faf4ec;mso-hide:all;">Your Ryugaware sign-in details&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#faf4ec;">
<tr>
<td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr>
<td style="padding:0 0 16px 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;letter-spacing:0.16em;color:#b8341a;">RYUGAWARE</td>
</tr>
<tr>
<td style="background-color:#ffffff;border:1px solid #e2d6c6;border-radius:10px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td class="pad" style="padding:32px 40px;">
<h1 style="margin:0 0 12px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:20px;line-height:28px;font-weight:600;color:#14100f;">Your account is ready</h1>
<p style="margin:0 0 16px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:15px;line-height:23px;color:#3a302b;">Hi {{name}}, someone on your team created a Ryugaware account for you. Sign in with these details:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0;background-color:#f3ece2;border:1px solid #e2d6c6;border-radius:10px;">
<tr><td style="padding:16px 18px;">
<p style="margin:0 0 12px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:#5c5046;">Email<br><span style="font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,'Courier New',monospace;font-size:15px;line-height:22px;color:#14100f;word-break:break-all;">{{email}}</span></p>
<p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:#5c5046;">Temporary password<br><span style="font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,'Courier New',monospace;font-size:15px;line-height:22px;color:#14100f;word-break:break-all;">{{temp_password}}</span></p>
</td></tr></table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="btn" style="margin:0 0 16px 0;">
<tr>
<td align="center" bgcolor="#b8341a" style="border-radius:6px;mso-padding-alt:12px 28px;">
<a href="{{login_url}}" style="display:inline-block;padding:12px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:15px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">Sign in</a>
</td>
</tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 16px 0;"><tr><td style="height:1px;line-height:1px;font-size:0;background-color:#e2d6c6;">&nbsp;</td></tr></table>
<p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;color:#5c5046;">Change this password as soon as you sign in. Anyone with the temporary password can use it until you do.</p>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:20px 4px 0 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:12px;line-height:19px;color:#5c5046;">
Ryugaware sends this message automatically. Replies to this address aren’t monitored.
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>$tpl$
),
(
    NULL,
    'password_changed',
    'Your password was changed',
    '{"name": "Recipient name", "changed_at": "When the change happened"}'::jsonb,
    $tpl$<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings xmlns:o="urn:schemas-microsoft-com:office:office"><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
@media only screen and (max-width:620px) {
  .pad { padding-left:24px !important; padding-right:24px !important; }
  .btn a { display:block !important; }
  .code { font-size:24px !important; letter-spacing:6px !important; text-indent:6px !important; }
}
</style>
</head>
<body style="margin:0;padding:0;width:100%;background-color:#faf4ec;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#faf4ec;mso-hide:all;">Your Ryugaware password was changed&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#faf4ec;">
<tr>
<td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr>
<td style="padding:0 0 16px 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;letter-spacing:0.16em;color:#b8341a;">RYUGAWARE</td>
</tr>
<tr>
<td style="background-color:#ffffff;border:1px solid #e2d6c6;border-radius:10px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td class="pad" style="padding:32px 40px;">
<h1 style="margin:0 0 12px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:20px;line-height:28px;font-weight:600;color:#14100f;">Password changed</h1>
<p style="margin:0 0 16px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:15px;line-height:23px;color:#3a302b;">Hi {{name}}, your Ryugaware password was changed on {{changed_at}}. Every other signed-in session was signed out.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;">
<tr>
<td style="padding:14px 16px;background-color:#fbe9e7;border:1px solid #efc4bf;border-radius:6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:14px;line-height:21px;color:#b3261e;">
<strong style="font-weight:600;">Wasn’t you?</strong> Reset your password now and contact support — someone else may have access to your account.
</td>
</tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 16px 0;"><tr><td style="height:1px;line-height:1px;font-size:0;background-color:#e2d6c6;">&nbsp;</td></tr></table>
<p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;color:#5c5046;">You’re getting this email because your Ryugaware password changed. No action is needed if you made the change.</p>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:20px 4px 0 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:12px;line-height:19px;color:#5c5046;">
Ryugaware sends this message automatically. Replies to this address aren’t monitored.
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>$tpl$
);
