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

export async function POST(req: NextRequest) {
  try {
    let payload: unknown;

    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      // JSON -> unknown
      payload = await req.json();
    } else if (
      ct.includes("multipart/form-data") ||
      ct.includes("application/x-www-form-urlencoded")
    ) {
      const form = await req.formData();
      if (botTrap(form)) return NextResponse.json({ ok: true });

      const email = form.get("email");
      const productNo = form.get("productNo");

      payload = {
        email: typeof email === "string" ? email : "",
        productNo: typeof productNo === "string" ? productNo : "",
      };
    } else {
      return NextResponse.json({ error: "Unsupported content type" }, { status: 415 });
    }

    // Walidacja bez rzucania wyjątków
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { email, productNo } = parsed.data as InquiryPayload;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: String(process.env.SMTP_SECURE ?? "false") === "true",
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
    });

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

    await transporter.sendMail({
      from: process.env.INQUIRY_FROM || process.env.SMTP_USER!,
      to: process.env.INQUIRY_TO!,
      replyTo: email,
      subject,
      text,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    // err jest unknown (nie any) -> logujemy bezpiecznie
    console.error("[/api/inquiry] send failed:", err);
    return NextResponse.json({ error: "SEND_FAILED" }, { status: 500 });
  }
}
