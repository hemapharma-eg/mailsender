import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { smtp, contacts, subject, text, html, attachments } = body;

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

    // Initialize transporter with connection pooling
    const transporter = nodemailer.createTransport({
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      host: smtp.host,
      port: Number(smtp.port),
      secure: Number(smtp.port) === 465, // true for 465, false for other ports
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
    });

    // We do not await transporter.verify() here because it slows down every batch request and 
    // any auth error will be caught during sendMail.

    // Format sender
    const sender = smtp.senderName ? `"${smtp.senderName}" <${smtp.user}>` : smtp.user;

    // Send emails concurrently via the pool
    const promises = contacts.map(async (contact: any) => {
      try {
        const personalizedText = text ? text.replace(/{{\s*Name\s*}}/gi, contact.name || '').replace(/{{\s*Title\s*}}/gi, contact.title || '') : undefined;
        let personalizedHtml = html ? html.replace(/{{\s*Name\s*}}/gi, contact.name || '').replace(/{{\s*Title\s*}}/gi, contact.title || '') : undefined;
        if (!personalizedHtml && personalizedText) {
          personalizedHtml = personalizedText.replace(/\n/g, '<br/>');
        }

        const info = await transporter.sendMail({
          from: sender,
          to: contact.email,
          subject: subject,
          text: personalizedText,
          html: personalizedHtml,
          attachments: attachments ? attachments.map((a: any) => ({ filename: a.filename, content: a.content, encoding: 'base64' })) : []
        });

        return { email: contact.email, success: true, messageId: info.messageId };
      } catch (error: any) {
        return { email: contact.email, success: false, error: error.message };
      }
    });

    const results = await Promise.all(promises);
    
    // Close the pool to ensure the serverless function can exit or doesn't leak connections
    transporter.close();

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
