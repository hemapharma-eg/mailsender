'use client';

import React, { useRef, useState } from 'react';
import * as xlsx from 'xlsx';
import { UploadCloud } from 'lucide-react';

export interface Contact {
  title?: string;
  name: string;
  email: string;
}

interface Props {
  onContactsLoaded: (contacts: Contact[]) => void;
}

export default function ExcelUploader({ onContactsLoaded }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccessMsg('');
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = xlsx.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = xlsx.utils.sheet_to_json(ws);

        const contacts: Contact[] = data.map((row: any) => {
          // Try to guess the name and email columns
          const email = row['Email'] || row['email'] || row['EMAIL'];
          const name = row['Name'] || row['name'] || row['NAME'] || '';
          const title = row['Title'] || row['title'] || row['TITLE'] || '';
          return { title, name, email };
        }).filter(c => c.email); // Only keep rows with an email

        if (contacts.length === 0) {
          setError('No valid emails found. Please ensure your Excel file has an "Email" column.');
          return;
        }

        setSuccessMsg(`Successfully imported ${contacts.length} contacts!`);
        onContactsLoaded(contacts);
        
        // Hide success message after 5 seconds
        setTimeout(() => setSuccessMsg(''), 5000);
      } catch (err: any) {
        setError('Error parsing Excel file. Please try again.');
        console.error(err);
      }
    };

    reader.readAsBinaryString(file);
    // Reset input so the same file could be uploaded again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadTemplate = () => {
    const ws = xlsx.utils.json_to_sheet([{ Title: 'Mr.', Name: 'John Doe', Email: 'john@example.com' }]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Contacts');
    xlsx.writeFile(wb, 'Contacts_Template.xlsx');
  };

  return (
    <div className="card">
      <h2><UploadCloud size={20} /> Import Contacts</h2>
      <div 
        className="uploader"
        onClick={() => fileInputRef.current?.click()}
      >
        <UploadCloud size={48} className="uploader-icon" />
        <h3>Click to upload an Excel file</h3>
        <p style={{ color: '#94a3b8', marginTop: '0.5rem', fontSize: '0.875rem' }}>
          Supports .xlsx and .xls. Keep columns as "Title", "Name", and "Email".
        </p>
      </div>
      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        <button onClick={downloadTemplate} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.875rem', textDecoration: 'underline' }}>
          Download Example Template
        </button>
      </div>
      <input 
        type="file" 
        accept=".xlsx, .xls, .csv" 
        style={{ display: 'none' }} 
        ref={fileInputRef}
        onChange={handleFileUpload}
      />
      {error && <p className="text-error" style={{ marginTop: '1rem', fontSize: '0.875rem' }}>{error}</p>}
      {successMsg && <p className="text-success" style={{ marginTop: '1rem', fontSize: '0.875rem', fontWeight: 500 }}>{successMsg}</p>}
    </div>
  );
}
