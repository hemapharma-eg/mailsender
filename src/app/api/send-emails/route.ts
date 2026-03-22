import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { smtp, contacts, subject, text, html } = body;

    // Validate inputs
    if (!smtp || !smtp.host || !smtp.port || !smtp.user || !smtp.pass) {
      return NextResponse.json({ error: 'Missing SMTP credentials' }, { status: 400 });
    }
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ error: 'No contacts provided' }, { status: 400 });
    }
    if (!subject || (!text && !html)) {
      return NextResponse.json({ error: 'Missing email content' }, { status: 400 });
    }

    // Initialize transporter
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: Number(smtp.port),
      secure: Number(smtp.port) === 465, // true for 465, false for other ports
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
    });

    // Verify connection config
    await transporter.verify();

    // Send emails
    const results = [];
    for (const contact of contacts) {
      try {
        // Replace placeholders in text/html (e.g. {{Name}})
        const personalizedText = text ? text.replace(/{{\s*Name\s*}}/gi, contact.name || '') : undefined;
        let personalizedHtml = html ? html.replace(/{{\s*Name\s*}}/gi, contact.name || '') : undefined;
        if (!personalizedHtml && personalizedText) {
          personalizedHtml = personalizedText.replace(/\n/g, '<br/>');
        }

        const info = await transporter.sendMail({
          from: smtp.user,
          to: contact.email,
          subject: subject,
          text: personalizedText,
          html: personalizedHtml,
        });

        results.push({ email: contact.email, success: true, messageId: info.messageId });
      } catch (error: any) {
        results.push({ email: contact.email, success: false, error: error.message });
      }
      
      // Add a small delay between each email to avoid rate limits (optional, but good practice)
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({ 
      message: `Completed processing ${contacts.length} emails.`,
      successful,
      failed,
      results 
    });

  } catch (error: any) {
    console.error('Email sending error:', error);
    return NextResponse.json({ error: error.message || 'Failed to send emails' }, { status: 500 });
  }
}
