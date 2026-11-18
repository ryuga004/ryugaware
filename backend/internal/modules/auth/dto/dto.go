package dto

type RequestOTP struct {
	Email string `json:"email" binding:"required,max=254"`
}

type VerifyOTP struct {
	Email string `json:"email" binding:"required,max=254"`
	OTP   string `json:"otp" binding:"required,len=6,number"`
}

type Register struct {
	OrgName           string `json:"orgName" binding:"required,min=1,max=80"`
	FullName          string `json:"fullName" binding:"required,min=1,max=80"`
	Email             string `json:"email" binding:"required,max=254"`
	Password          string `json:"password" binding:"required,min=8,max=128"`
	RegistrationToken string `json:"registrationToken" binding:"required,max=128"`
}

type Login struct {
	Email    string `json:"email" binding:"required,max=254"`
	Password string `json:"password" binding:"required,max=128"`
}

type ForgotPassword struct {
	Email string `json:"email" binding:"required,max=254"`
}

type ResetPassword struct {
	Token       string `json:"token" binding:"required,max=128"`
	NewPassword string `json:"newPassword" binding:"required,min=8,max=128"`
}

type ChangePassword struct {
	CurrentPassword string `json:"currentPassword" binding:"required,max=128"`
	NewPassword     string `json:"newPassword" binding:"required,min=8,max=128"`
}

type Sent struct {
	Sent bool `json:"sent"`
}

type Verified struct {
	Verified          bool   `json:"verified"`
	RegistrationToken string `json:"registrationToken"`
}

type Registered struct {
	Registered bool   `json:"registered"`
	Email      string `json:"email"`
	OrgName    string `json:"orgName"`
}

type SessionUser struct {
	FullName string `json:"fullName"`
	Email    string `json:"email"`
	OrgName  string `json:"orgName"`
}

type Authenticated struct {
	Authenticated bool        `json:"authenticated"`
	User          SessionUser `json:"user"`
}

type CurrentUser struct {
	ID         string   `json:"id"`
	FullName   string   `json:"fullName"`
	Email      string   `json:"email"`
	OrgName    string   `json:"orgName"`
	TenantID   string   `json:"tenantId"`
	Role       string   `json:"role"`
	Privileges []string `json:"privileges"`
}

type Me struct {
	Authenticated bool         `json:"authenticated"`
	User          *CurrentUser `json:"user"`
}

type Refreshed struct {
	Refreshed bool `json:"refreshed"`
}

type LoggedOut struct {
	LoggedOut bool `json:"loggedOut"`
}

type ResetTokenCheck struct {
	Valid bool `json:"valid"`
}

type Reset struct {
	Reset bool `json:"reset"`
}

type Changed struct {
	Changed bool `json:"changed"`
}
