'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import ExcelUploader, { Contact } from '../components/ExcelUploader';
import { Mail, Settings, Send, Users, CheckCircle, XCircle, Trash2, Paperclip, X, Maximize, Minimize } from 'lucide-react';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(async () => {
  const { default: RQ } = await import('react-quill');
  const { default: ImageResize } = await import('quill-image-resize-module-react');
  if (typeof window !== 'undefined') {
    (window as any).Quill = RQ.Quill;
  }
  RQ.Quill.register('modules/imageResize', ImageResize);
  return RQ;
}, { ssr: false }) as any;

export default function Home() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [smtp, setSmtp] = useState({ host: '', port: '465', user: '', pass: '', senderName: '' });
  const [emailContent, setEmailContent] = useState({ subject: '' });
  const [emailHtml, setEmailHtml] = useState('');
  const [signatureHtml, setSignatureHtml] = useState('');
  const [attachments, setAttachments] = useState<{ filename: string; content: string }[]>([]);
  
  const [isBodyFullscreen, setIsBodyFullscreen] = useState(false);
  const [isSignatureFullscreen, setIsSignatureFullscreen] = useState(false);

  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{successful: number, failed: number} | null>(null);

  const handleSmtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSmtp({ ...smtp, [e.target.name]: e.target.value });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailContent({ ...emailContent, [e.target.name]: e.target.value });
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ],
    imageResize: {
      modules: [ 'Resize', 'DisplaySize' ]
    }
  };

  const appendToEmail = (text: string) => {
    setEmailHtml(prev => {
      if (!prev) return `<p>${text}</p>`;
      if (prev.trim().endsWith('</p>')) {
        return prev.trim().substring(0, prev.trim().length - 4) + text + '</p>';
      }
      return prev + text;
    });
  };

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const clearAllContacts = () => {
    if (confirm('Are you sure you want to delete all imported contacts?')) {
      setContacts([]);
    }
  };

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64String = (evt.target?.result as string).split(',')[1];
        if (base64String) {
          setAttachments(prev => [...prev, { filename: file.name, content: base64String }]);
        }
      };
      reader.readAsDataURL(file);
    });
    // clear input
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const sendEmails = async () => {
    if (contacts.length === 0) return alert('Please import contacts first');
    if (!smtp.host || !smtp.user || !smtp.pass) return alert('Please fill in required SMTP credentials');
    if (!emailContent.subject || (!emailHtml && !signatureHtml)) return alert('Please fill in email subject and body');

    setIsSending(true);
    setProgress(10);
    setResults(null);

    // Combine email body and signature
    const finalHtml = `${emailHtml}<br/><br/>${signatureHtml}`;

    try {
      const res = await fetch('/api/send-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtp,
          contacts,
          subject: emailContent.subject,
          html: finalHtml,
          attachments
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ marginBottom: 0 }}><Users size={20} /> {contacts.length} Contacts Loaded</h2>
                <button onClick={clearAllContacts} className="btn" style={{ width: 'auto', padding: '0.5rem 1rem', backgroundColor: 'var(--error)' }}>
                  <Trash2 size={16} /> Delete All
                </button>
              </div>
              <div className="table-responsive">
                <table className="contacts-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th style={{ width: '50px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.slice(0, 50).map((c, i) => (
                      <tr key={i}>
                        <td>{c.title || '-'}</td>
                        <td>{c.name || '-'}</td>
                        <td>{c.email}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            onClick={() => removeContact(i)}
                            style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }}
                          >
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {contacts.length > 50 && (
                <p style={{ marginTop: '1rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                  And {contacts.length - 50} more... (only showing first 50)
                </p>
              )}
            </div>
          )}

          <div className="card">
            <h2><Settings size={20} /> SMTP Configuration</h2>
            <div className="form-group">
              <label>Sender Name (Appears to recipients)</label>
              <input type="text" name="senderName" className="form-input" placeholder="John Doe" value={smtp.senderName} onChange={handleSmtpChange} />
            </div>
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
            <div className="form-group" style={{ marginBottom: '4rem' }}>
              {!isBodyFullscreen && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ margin: 0 }}>Message Body</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button onClick={() => appendToEmail('{{Title}} ')} className="btn" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', width: 'auto', backgroundColor: '#334155' }}>Insert {'{{Title}}'}</button>
                    <button onClick={() => appendToEmail('{{Name}} ')} className="btn" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', width: 'auto', backgroundColor: '#334155' }}>Insert {'{{Name}}'}</button>
                    <button onClick={() => setIsBodyFullscreen(true)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: '1rem' }}>
                      <Maximize size={16} /> Fullscreen Editor
                    </button>
                  </div>
                </div>
              )}
              <div className={isBodyFullscreen ? "fullscreen-editor" : ""} style={{ backgroundColor: 'white', color: 'black', borderRadius: '8px', overflow: 'hidden' }}>
                {isBodyFullscreen && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', padding: '1rem', borderBottom: '1px solid var(--surface-border)', color: 'white' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Message Body (Fullscreen)</h2>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => appendToEmail('{{Title}} ')} className="btn" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', width: 'auto', backgroundColor: '#334155' }}>Insert {'{{Title}}'}</button>
                        <button onClick={() => appendToEmail('{{Name}} ')} className="btn" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', width: 'auto', backgroundColor: '#334155' }}>Insert {'{{Name}}'}</button>
                      </div>
                    </div>
                    <button onClick={() => setIsBodyFullscreen(false)} className="btn" style={{ width: 'auto', backgroundColor: 'var(--error)', padding: '0.5rem 1rem' }}>
                      <X size={20} /> Close Fullscreen
                    </button>
                  </div>
                )}
                <ReactQuill theme="snow" modules={quillModules} value={emailHtml} onChange={setEmailHtml} style={{ height: isBodyFullscreen ? 'calc(100vh - 100px)' : '300px' }} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '4rem' }}>
              {!isSignatureFullscreen && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ margin: 0 }}>Signature</label>
                  <button onClick={() => setIsSignatureFullscreen(true)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Maximize size={16} /> Fullscreen Editor
                  </button>
                </div>
              )}
              <div className={isSignatureFullscreen ? "fullscreen-editor" : ""} style={{ backgroundColor: 'white', color: 'black', borderRadius: '8px', overflow: 'hidden' }}>
                {isSignatureFullscreen && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', padding: '1rem', borderBottom: '1px solid var(--surface-border)', color: 'white' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Signature (Fullscreen)</h2>
                    <button onClick={() => setIsSignatureFullscreen(false)} className="btn" style={{ width: 'auto', backgroundColor: 'var(--error)', padding: '0.5rem 1rem' }}>
                      <X size={20} /> Close Fullscreen
                    </button>
                  </div>
                )}
                <ReactQuill theme="snow" modules={quillModules} value={signatureHtml} onChange={setSignatureHtml} style={{ height: isSignatureFullscreen ? 'calc(100vh - 100px)' : '150px' }} />
              </div>
            </div>

            <div className="form-group">
              <label>Attachments</label>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <label className="btn" style={{ width: 'auto', backgroundColor: '#334155', cursor: 'pointer' }}>
                  <Paperclip size={20} /> Add Files
                  <input type="file" multiple style={{ display: 'none' }} onChange={handleAttachmentUpload} />
                </label>
              </div>
              {attachments.length > 0 && (
                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {attachments.map((att, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f172a', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.875rem' }}>{att.filename}</span>
                      <button onClick={() => removeAttachment(i)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }}>
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
