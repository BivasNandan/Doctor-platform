import nodemailer from "nodemailer";
import { env } from "../config/env.js";

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
export async function sendMail({ to, subject, text, replyTo }) {
  const message = { from: env.smtp.from, to, subject, text, ...(replyTo ? { replyTo } : {}) };
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

/**
 * Forwards a help-page message to the Carewell support mailbox. "Reply" in the mail program
 * answers the person directly, because their address is set as Reply-To.
 */
export const sendSupportRequestEmail = ({ to, replyTo, name, email, message, id, signedIn }) =>
  sendMail({
    to,
    replyTo,
    subject: `[Carewell support] ${message.replace(/\s+/g, " ").slice(0, 70)}`,
    text:
      `A new message arrived through the Carewell help page.\n\n` +
      `From: ${name ? `${name} (${signedIn ? "signed-in patient" : "visitor"})` : "a visitor"}\n` +
      `Email: ${email ?? "not provided: you cannot reply by email"}\n` +
      `Reference: ${id}\n\nMessage:\n${message}\n\n` +
      `You can also review and reply to it in the administrator area (Support requests).`,
  });

export const sendPasswordResetEmail = ({ to, name, link, minutes }) =>
  sendMail({
    to,
    subject: "Reset your Carewell password",
    text:
      `Hello ${name},\n\nWe received a request to reset your Carewell password. Open this link to choose a new one:\n\n${link}\n\n` +
      `The link works once and expires in ${minutes} minutes. If you did not ask for this, you can ignore this email; your password stays the same.${sign}`,
  });

// ── Doctor applications ────────────────────────────────────────────────────────────────────
export const sendDoctorInvitationEmail = ({ to, name, link, hours }) =>
  sendMail({
    to,
    subject: "You are invited to join Carewell",
    text:
      `Hello ${name},\n\nThe Carewell administration has added you as a doctor. Open this link to choose your password:\n\n${link}\n\n` +
      `The link works once and expires in ${hours} hours. After that, complete your profile and upload your BMDC registration certificate; ` +
      `the administration checks it with the BMDC register before your profile is published.\n\n` +
      `If you were not expecting this, you can ignore this email.${sign}`,
  });

export const sendApplicationReceivedEmail = ({ to, name }) =>
  sendMail({
    to,
    subject: "We received your Carewell application",
    text:
      `Hello ${name},\n\nThank you for applying to Carewell. The administration will check your BMDC registration certificate ` +
      `with the BMDC register and review your profile. We will email you when there is a decision.${sign}`,
  });

/** Tells one administrator that an application is waiting. */
export const sendNewApplicationEmail = ({ to, doctorName, link }) =>
  sendMail({
    to,
    subject: `[Carewell] New doctor application: ${doctorName}`,
    text:
      `${doctorName} submitted an application to join Carewell.\n\n` +
      `Check the BMDC certificate against the BMDC register and decide in the administrator area:\n${link}`,
  });

const DECISIONS = {
  approved: [
    "Your Carewell application was approved",
    (note) =>
      `The administration checked your BMDC registration and approved your application. Your workspace is now open; ` +
      `your profile becomes visible to patients once it is published.${note}`,
  ],
  changes_requested: [
    "Your Carewell application needs changes",
    (note) => `The administration asked for changes before it can approve your application.${note}\n\nSign in, make the changes and submit again.`,
  ],
  rejected: [
    "Your Carewell application was not approved",
    (note, reapplyDate) =>
      `The administration could not approve your application.${note}\n\nYou can apply again from ${reapplyDate}.`,
  ],
};

export const sendApplicationDecisionEmail = ({ to, name, decision, note, reapplyDate, link }) => {
  const [subject, body] = DECISIONS[decision];
  return sendMail({
    to,
    subject,
    text: `Hello ${name},\n\n${body(note ? `\n\nMessage from the administration:\n${note}` : "", reapplyDate)}\n\n${link}${sign}`,
  });
};

export const sendProfilePublishedEmail = ({ to, name, link }) =>
  sendMail({
    to,
    subject: "Your Carewell profile is live",
    text: `Hello ${name},\n\nYour profile is now visible on Carewell. Patients can find you and request appointments.\n\n${link}${sign}`,
  });
