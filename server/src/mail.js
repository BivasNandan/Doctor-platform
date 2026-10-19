import nodemailer from "nodemailer";
import { env } from "./config/env.js";

/**
 * Outgoing email.
 *  - With SMTP_HOST set, mail is sent through that SMTP server (Gmail, Resend SMTP, ...).
 *  - Without it, the message is printed to the console so development works offline.
 *  - In tests nothing leaves the machine: messages are collected in `outbox` for assertions.
 */
export const outbox = [];

let transport;
const smtpReady = Boolean(env.smtp.host && env.smtp.user && env.smtp.password);
const getTransport = () =>
  (transport ??= nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.password },
  }));

/**
 * Sends one email. Never throws: a mail problem must not break sign-up or password reset,
 * and the caller cannot do anything useful about it. Failures are logged without the body.
 */
export async function sendMail({ to, subject, text }) {
  const message = { from: env.smtp.from, to, subject, text };
  if (env.nodeEnv === "test") {
    outbox.push(message);
    return true;
  }
  if (!smtpReady) {
    console.log(`\n[mail:not-sent] To: ${to}\nSubject: ${subject}\n${text}\n`);
    return false;
  }
  try {
    await getTransport().sendMail(message);
    return true;
  } catch (error) {
    console.error(`[mail] could not send "${subject}" to ${to}: ${error.message}`);
    return false;
  }
}

// ── Message templates ──────────────────────────────────────────────────────────────────────
const sign = "\n\nCarewell\nThis is an automated message. Please do not reply.";

export const sendVerificationEmail = ({ to, name, code, minutes }) =>
  sendMail({
    to,
    subject: `${code} is your Carewell verification code`,
    text:
      `Hello ${name},\n\nYour Carewell verification code is: ${code}\n\n` +
      `It expires in ${minutes} minutes. If you did not create a Carewell account, you can ignore this email.${sign}`,
  });

export const sendPasswordResetEmail = ({ to, name, link, minutes }) =>
  sendMail({
    to,
    subject: "Reset your Carewell password",
    text:
      `Hello ${name},\n\nWe received a request to reset your Carewell password. Open this link to choose a new one:\n\n${link}\n\n` +
      `The link works once and expires in ${minutes} minutes. If you did not ask for this, you can ignore this email; your password stays the same.${sign}`,
  });
