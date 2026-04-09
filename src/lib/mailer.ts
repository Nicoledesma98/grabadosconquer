import * as nodemailer from "nodemailer";

export function getTransport() {
  const host = process.env.SMTP_HOST!;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER!;
  const pass = process.env.SMTP_PASS!;

  
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}
export async function testTransport() {
  const transport = getTransport();
  await transport.verify();
  console.log("SMTP OK");
}
export async function sendMail(opts: { to: string; subject: string; html: string; replyTo?: string}) {
  const transport = getTransport();
  await transport.sendMail({
    from: process.env.MAIL_FROM!,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    replyTo: opts.replyTo,
  });
}
