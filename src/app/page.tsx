'use client';

import React, { useState } from 'react';
import ExcelUploader, { Contact } from '../components/ExcelUploader';
import { Mail, Settings, Send, Users, CheckCircle, XCircle } from 'lucide-react';

export default function Home() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [smtp, setSmtp] = useState({ host: '', port: '465', user: '', pass: '' });
  const [emailContent, setEmailContent] = useState({ subject: '', text: '' });
  
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{successful: number, failed: number} | null>(null);

  const handleSmtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSmtp({ ...smtp, [e.target.name]: e.target.value });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEmailContent({ ...emailContent, [e.target.name]: e.target.value });
  };

  const sendEmails = async () => {
    if (contacts.length === 0) return alert('Please import contacts first');
    if (!smtp.host || !smtp.user || !smtp.pass) return alert('Please fill in required SMTP credentials');
    if (!emailContent.subject || !emailContent.text) return alert('Please fill in email subject and text');

    setIsSending(true);
    setProgress(10);
    setResults(null);

    try {
      // In a real scenario, you'd probably chunk the array to not overwhelm the server
      // But since the API route loops through sequentially, we'll just send it all
      const res = await fetch('/api/send-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtp,
          contacts,
          subject: emailContent.subject,
          text: emailContent.text
        })
      });

      setProgress(50);
      const data = await res.json();
      setProgress(100);

      if (res.ok) {
        setResults({ successful: data.successful, failed: data.failed });
      } else {
        alert('Server Error: ' + data.error);
      }
    } catch (err: any) {
      console.error(err);
      alert('Error sending emails: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Email Sender Pro</h1>
        <p>Send bulk emails easily from your own SMTP server</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div>
          <ExcelUploader onContactsLoaded={setContacts} />

          {contacts.length > 0 && (
            <div className="card">
              <h2><Users size={20} /> {contacts.length} Contacts Loaded</h2>
              <div className="contacts-grid">
                {contacts.slice(0, 10).map((c, i) => (
                  <div key={i} className="contact-badge">
                    <div className="contact-name">{c.name || 'No Name'}</div>
                    <div className="contact-email">{c.email}</div>
                  </div>
                ))}
              </div>
              {contacts.length > 10 && (
                <p style={{ marginTop: '1rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                  And {contacts.length - 10} more...
                </p>
              )}
            </div>
          )}

          <div className="card">
            <h2><Settings size={20} /> SMTP Configuration</h2>
            <div className="form-group">
              <label>SMTP Host</label>
              <input type="text" name="host" className="form-input" placeholder="smtp.gmail.com" value={smtp.host} onChange={handleSmtpChange} />
            </div>
            <div className="form-group">
              <label>SMTP Port</label>
              <input type="number" name="port" className="form-input" placeholder="465" value={smtp.port} onChange={handleSmtpChange} />
            </div>
            <div className="form-group">
              <label>Email Username / Address</label>
              <input type="email" name="user" className="form-input" placeholder="you@domain.com" value={smtp.user} onChange={handleSmtpChange} />
            </div>
            <div className="form-group">
              <label>Password / App Password</label>
              <input type="password" name="pass" className="form-input" placeholder="••••••••" value={smtp.pass} onChange={handleSmtpChange} />
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <h2><Mail size={20} /> Compose Email</h2>
            <div className="form-group">
              <label>Subject</label>
              <input type="text" name="subject" className="form-input" placeholder="Exciting news!" value={emailContent.subject} onChange={handleContentChange} />
            </div>
            <div className="form-group">
              <label>Message Body (Use {'{{Name}}'} to personalize)</label>
              <textarea 
                name="text" 
                className="form-input" 
                rows={10} 
                style={{ resize: 'vertical' }}
                placeholder="Hi {{Name}},\n\nHere's the final update..." 
                value={emailContent.text} 
                onChange={handleContentChange} 
              />
            </div>

            <button 
              className="btn" 
              onClick={sendEmails}
              disabled={isSending || contacts.length === 0}
            >
              <Send size={20} />
              {isSending ? 'Sending in Progress...' : 'Start Sending Emails'}
            </button>

            {isSending && (
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
              </div>
            )}

            {results && (
              <div className="status-grid">
                <div className="status-box">
                  <CheckCircle size={32} className="text-success" style={{ margin: '0 auto 0.5rem' }} />
                  <div className="value">{results.successful}</div>
                  <div className="label">Sent Successfully</div>
                </div>
                <div className="status-box">
                  <XCircle size={32} className="text-error" style={{ margin: '0 auto 0.5rem' }} />
                  <div className="value">{results.failed}</div>
                  <div className="label">Failed</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
