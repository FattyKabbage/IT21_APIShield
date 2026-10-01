// import { Injectable } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import * as nodemailer from 'nodemailer';

// @Injectable()
// export class MailService {
//   private readonly transporter: nodemailer.Transporter;

//   constructor(private readonly config: ConfigService) {
//     const host = this.config.get<string>('SMTP_HOST') ?? 'localhost';
//     const port = Number(this.config.get<string>('SMTP_PORT') ?? '1025');
//     const user = this.config.get<string>('SMTP_USER');
//     const pass = this.config.get<string>('SMTP_PASS');

//     this.transporter = nodemailer.createTransport({
//       host,
//       port,
//       secure: false,
//       ...(user && pass ? { auth: { user, pass } } : {}),
//     });
//   }

//   async sendMail(to: string, subject: string, html: string) {
//     const from = this.config.get<string>('MAIL_FROM') ?? 'noreply@apishield.local';

//     return this.transporter.sendMail({
//       from,
//       to,
//       subject,
//       html,
//     });
//   }
// }

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

type MailProvider = 'smtp' | 'brevo';

@Injectable()
export class MailService {
  private readonly provider: MailProvider;
  private readonly transporter: nodemailer.Transporter | null;

  constructor(private readonly config: ConfigService) {
    this.provider = (this.config.get<string>('MAIL_PROVIDER') ?? 'smtp') as MailProvider;

    if (this.provider === 'smtp') {
      const host = this.config.get<string>('MAIL_HOST') ?? 'localhost';
      const port = Number(this.config.get<string>('MAIL_PORT') ?? '1025');
      const user = this.config.get<string>('MAIL_USER');
      const pass = this.config.get<string>('MAIL_PASSWORD');

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: false,
        ...(user && pass ? { auth: { user, pass } } : {}),
      });
    } else {
      this.transporter = null;
    }
  }

  async sendMail(to: string, subject: string, html: string) {
    if (this.provider === 'brevo') {
      return this.sendWithBrevo(to, subject, html);
    }

    return this.sendWithSmtp(to, subject, html);
  }

  private async sendWithSmtp(to: string, subject: string, html: string) {
    if (!this.transporter) {
      throw new InternalServerErrorException('SMTP mail transport is not configured');
    }

    const fromEmail = this.config.get<string>('MAIL_FROM') ?? 'noreply@apishield.local';
    const fromName = this.config.get<string>('MAIL_FROM_NAME') ?? 'APIShield';

    return this.transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to,
      subject,
      html,
    });
  }

  private async sendWithBrevo(to: string, subject: string, html: string) {
    const apiKey = this.config.getOrThrow<string>('BREVO_API_KEY');
    const fromEmail = this.config.getOrThrow<string>('MAIL_FROM');
    const fromName = this.config.get<string>('MAIL_FROM_NAME') ?? 'APIShield';

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: fromName,
          email: fromEmail,
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });

    if (!response.ok) {
      const responseText = await response.text();
      console.error(`Brevo email request failed with status ${response.status}: ${responseText}`);
      throw new InternalServerErrorException('Unable to send email');
    }

    return response.json();
  }
}