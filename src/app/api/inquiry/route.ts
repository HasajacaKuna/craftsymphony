// app/api/inquiry/route.ts
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  productNo: z.string().min(1).max(6),
});
type InquiryPayload = z.infer<typeof schema>;

function botTrap(form: FormData) {
  const v = form.get("company");
  return typeof v === "string" && v.length > 0;
}

function maskEmail(v?: string | null) {
  if (!v) return "(undefined)";
  const [u, d] = v.split("@");
  if (!d) return v;
  return `${u.slice(0, 2)}***@${d}`;
}

function envOrNull(k: string) {
  const v = process.env[k];
  return v === undefined || v === "" ? null : v;
}

export async function POST(req: NextRequest) {
  const rid = Math.random().toString(36).slice(2, 8); // request id do śledzenia
  console.log(`[inquiry:${rid}] ▶️ start, method=${req.method}`);

  console.time(`[inquiry:${rid}] total`);

  try {
    // --- Parsowanie wejścia ---
    const ct = req.headers.get("content-type") ?? "";
    console.log(`[inquiry:${rid}] content-type=${ct}`);

    let payload: unknown;
    if (ct.includes("application/json")) {
      payload = await req.json();
    } else if (ct.includes("multipart/form-data") || ct.includes("application/x-www-form-urlencoded")) {
      const form = await req.formData();
      if (botTrap(form)) {
        console.warn(`[inquiry:${rid}] honeypot triggered -> OK 200 (no-op)`);
        return NextResponse.json({ ok: true });
      }
      payload = {
        email: form.get("email"),
        productNo: form.get("productNo"),
      };
    } else {
      console.warn(`[inquiry:${rid}] unsupported content type`);
      return NextResponse.json({ error: "Unsupported content type" }, { status: 415 });
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      console.warn(`[inquiry:${rid}] validation error`, parsed.error.flatten());
      return NextResponse.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
    }
    const { email, productNo } = parsed.data as InquiryPayload;
    console.log(`[inquiry:${rid}] payload OK email=${maskEmail(email)} productNo=${productNo}`);

    // --- Sprawdzenie ENV (bez wycieku wartości wrażliwych) ---
    const SMTP_HOST = envOrNull("SMTP_HOST");
    const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
    const SMTP_SECURE = String(process.env.SMTP_SECURE ?? "false") === "true";
    const SMTP_USER = envOrNull("SMTP_USER");
    const SMTP_PASS = envOrNull("SMTP_PASS");
    const INQUIRY_TO = envOrNull("INQUIRY_TO");
    const INQUIRY_FROM = envOrNull("INQUIRY_FROM") ?? SMTP_USER;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !INQUIRY_TO) {
      console.error(`[inquiry:${rid}] CONFIG_ERROR`, {
        SMTP_HOST: !!SMTP_HOST,
        SMTP_PORT,
        SMTP_SECURE,
        SMTP_USER: maskEmail(SMTP_USER ?? undefined),
        SMTP_PASS: SMTP_PASS ? "***set***" : "(missing)",
        INQUIRY_TO: maskEmail(INQUIRY_TO ?? undefined),
        INQUIRY_FROM: maskEmail(INQUIRY_FROM ?? undefined),
      });
      return NextResponse.json({ error: "CONFIG_ERROR" }, { status: 500 });
    }

    console.log(
      `[inquiry:${rid}] smtp config`,
      {
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        user: maskEmail(SMTP_USER),
        from: maskEmail(INQUIRY_FROM ?? undefined),
        to: maskEmail(INQUIRY_TO ?? undefined),
        node_env: process.env.NODE_ENV,
      }
    );

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS, // NIE logujemy
      },
      // Możesz okresowo włączyć logger/debug, ale uważaj w produkcji:
      // logger: true,
      // debug: true,
      connectionTimeout: 20_000,
      greetingTimeout: 20_000,
      socketTimeout: 30_000,
    });

    // --- Verify połączenia/auth ---
    console.time(`[inquiry:${rid}] verify`);
    try {
      console.log(`[inquiry:${rid}] verifying SMTP...`);
      const ok = await transporter.verify();
      console.timeEnd(`[inquiry:${rid}] verify`);
      console.log(`[inquiry:${rid}] verify result:`, ok);
    } catch (e) {
      console.timeEnd(`[inquiry:${rid}] verify`);
      console.error(`[inquiry:${rid}] verify FAILED`, e);
      return NextResponse.json({ error: "SMTP_VERIFY_FAILED" }, { status: 500 });
    }

    const subject = `Zapytanie o produkt #${productNo}`;
    const text = `Email klienta: ${email}\nProdukt: ${productNo}`;
    const html = `
      <div style="font-family: system-ui, Roboto, Arial, sans-serif;">
        <h2 style="margin:0 0 8px;">Nowe zapytanie produktowe</h2>
        <p><b>Email klienta:</b> ${email}</p>
        <p><b>Numer produktu:</b> ${productNo}</p>
        <hr/>
        <p style="color:#666;font-size:12px;">Wiadomość z formularza na stronie.</p>
      </div>
    `;

    // --- Wysyłka ---
    console.time(`[inquiry:${rid}] sendMail`);
    try {
      console.log(`[inquiry:${rid}] sending mail...`);
      const info = await transporter.sendMail({
        from: INQUIRY_FROM,
        to: INQUIRY_TO,
        replyTo: email,
        subject,
        text,
        html,
      });
      console.timeEnd(`[inquiry:${rid}] sendMail`);
      console.log(`[inquiry:${rid}] send ok messageId=${info.messageId}`);
    } catch (e) {
      console.timeEnd(`[inquiry:${rid}] sendMail`);
      console.error(`[inquiry:${rid}] send FAILED`, e);
      return NextResponse.json({ error: "SEND_FAILED" }, { status: 500 });
    }

    console.timeEnd(`[inquiry:${rid}] total`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.timeEnd(`[inquiry:${rid}] total`);
    console.error(`[inquiry:${rid}] unexpected error`, err);
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 500 });
  }
}
