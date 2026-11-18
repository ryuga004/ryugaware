CREATE TABLE email_deliveries (
    event_id   UUID         PRIMARY KEY,
    tenant_id  UUID         REFERENCES tenants(id) ON DELETE CASCADE,
    template   VARCHAR(100) NOT NULL,
    to_address CITEXT       NOT NULL,
    status     VARCHAR(20)  NOT NULL CHECK (status IN ('SENT', 'FAILED')),
    attempts   INTEGER      NOT NULL DEFAULT 1 CHECK (attempts > 0),
    error      TEXT,
    sent_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

UPDATE email_templates
SET subject   = 'Reset your password',
    variables = '{"name": "Recipient name", "reset_url": "Password reset link", "expiry_minutes": "Minutes until the link expires"}'::jsonb,
    body      = $tpl$<!doctype html>
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
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#faf4ec;mso-hide:all;">Reset your Ryugaware password&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;</div>
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
<p style="margin:0 0 16px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:15px;line-height:23px;color:#3a302b;">Hi {{name}}, use the button below to choose a new password.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="btn" style="margin:0 0 16px 0;">
<tr>
<td align="center" bgcolor="#b8341a" style="border-radius:6px;mso-padding-alt:12px 28px;">
<a href="{{reset_url}}" style="display:inline-block;padding:12px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:15px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">Set a new password</a>
</td>
</tr>
</table>
<p style="margin:0 0 16px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;font-size:15px;line-height:23px;color:#3a302b;">The link expires in {{expiry_minutes}} minutes.</p>
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
</html>
$tpl$
WHERE tenant_id IS NULL AND name = 'password_reset';
