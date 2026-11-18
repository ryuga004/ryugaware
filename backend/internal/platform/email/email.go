package email

import (
	"context"
	"crypto/rand"
	"crypto/tls"
	"encoding/base64"
	"fmt"
	"math/big"
	"mime"
	"net"
	"net/smtp"
	"strings"
	"time"

	"github.com/ryuga/ryugaware/backend/internal/config"
)

type Message struct {
	To      string
	Subject string
	HTML    string
}

type Sender struct {
	cfg config.SMTP
}

func New(cfg config.SMTP) *Sender { return &Sender{cfg: cfg} }

func (s *Sender) Send(ctx context.Context, msg Message) error {
	if msg.To == "" {
		return fmt.Errorf("email: recipient is empty")
	}

	body, err := s.build(msg)
	if err != nil {
		return err
	}

	deadline := time.Now().Add(s.cfg.Timeout)
	if ctxDeadline, ok := ctx.Deadline(); ok && ctxDeadline.Before(deadline) {
		deadline = ctxDeadline
	}

	client, err := s.dial(ctx, deadline)
	if err != nil {
		return err
	}
	defer func() { _ = client.Close() }()

	if s.cfg.TLSMode == "starttls" {
		if ok, _ := client.Extension("STARTTLS"); ok {
			if err := client.StartTLS(s.tlsConfig()); err != nil {
				return fmt.Errorf("email: starttls: %w", err)
			}
		}
	}

	if s.cfg.Username != "" {
		auth := smtp.PlainAuth("", s.cfg.Username, s.cfg.Password, s.cfg.Host)
		if err := client.Auth(auth); err != nil {
			return fmt.Errorf("email: auth: %w", err)
		}
	}

	if err := client.Mail(s.cfg.FromAddress); err != nil {
		return fmt.Errorf("email: mail from: %w", err)
	}
	if err := client.Rcpt(msg.To); err != nil {
		return fmt.Errorf("email: rcpt to: %w", err)
	}

	writer, err := client.Data()
	if err != nil {
		return fmt.Errorf("email: data: %w", err)
	}
	if _, err := writer.Write(body); err != nil {
		_ = writer.Close()
		return fmt.Errorf("email: write body: %w", err)
	}
	if err := writer.Close(); err != nil {
		return fmt.Errorf("email: close body: %w", err)
	}

	return client.Quit()
}

func (s *Sender) dial(ctx context.Context, deadline time.Time) (*smtp.Client, error) {
	dialer := &net.Dialer{Deadline: deadline}
	addr := s.cfg.Addr()

	if s.cfg.TLSMode == "tls" {
		conn, err := tls.DialWithDialer(dialer, "tcp", addr, s.tlsConfig())
		if err != nil {
			return nil, fmt.Errorf("email: dial tls %s: %w", addr, err)
		}
		client, err := smtp.NewClient(conn, s.cfg.Host)
		if err != nil {
			_ = conn.Close()
			return nil, fmt.Errorf("email: smtp client: %w", err)
		}
		return client, nil
	}

	conn, err := dialer.DialContext(ctx, "tcp", addr)
	if err != nil {
		return nil, fmt.Errorf("email: dial %s: %w", addr, err)
	}
	if err := conn.SetDeadline(deadline); err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("email: deadline: %w", err)
	}
	client, err := smtp.NewClient(conn, s.cfg.Host)
	if err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("email: smtp client: %w", err)
	}
	return client, nil
}

func (s *Sender) tlsConfig() *tls.Config {
	return &tls.Config{
		ServerName:         s.cfg.Host,
		InsecureSkipVerify: s.cfg.InsecureSkipVerify,
		MinVersion:         tls.VersionTLS12,
	}
}

func (s *Sender) build(msg Message) ([]byte, error) {
	boundaryBytes := make([]byte, 16)
	if _, err := rand.Read(boundaryBytes); err != nil {
		return nil, fmt.Errorf("email: boundary: %w", err)
	}

	messageID, err := s.messageID()
	if err != nil {
		return nil, err
	}

	from := s.cfg.FromAddress
	if s.cfg.FromName != "" {
		from = mime.QEncoding.Encode("utf-8", s.cfg.FromName) + " <" + s.cfg.FromAddress + ">"
	}

	var b strings.Builder
	b.WriteString("From: " + from + "\r\n")
	b.WriteString("To: " + msg.To + "\r\n")
	b.WriteString("Subject: " + mime.QEncoding.Encode("utf-8", msg.Subject) + "\r\n")
	b.WriteString("Date: " + time.Now().UTC().Format(time.RFC1123Z) + "\r\n")
	b.WriteString("Message-ID: " + messageID + "\r\n")
	b.WriteString("MIME-Version: 1.0\r\n")
	b.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
	b.WriteString("Content-Transfer-Encoding: base64\r\n")
	b.WriteString("\r\n")

	encoded := base64.StdEncoding.EncodeToString([]byte(msg.HTML))
	for i := 0; i < len(encoded); i += 76 {
		end := i + 76
		if end > len(encoded) {
			end = len(encoded)
		}
		b.WriteString(encoded[i:end] + "\r\n")
	}

	return []byte(b.String()), nil
}

func (s *Sender) messageID() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(1<<62))
	if err != nil {
		return "", fmt.Errorf("email: message id: %w", err)
	}
	domain := s.cfg.FromAddress
	if at := strings.LastIndex(domain, "@"); at >= 0 {
		domain = domain[at+1:]
	}
	return fmt.Sprintf("<%d.%d@%s>", time.Now().UnixNano(), n.Int64(), domain), nil
}
