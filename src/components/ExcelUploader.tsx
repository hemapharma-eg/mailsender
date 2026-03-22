'use client';

import React, { useRef, useState } from 'react';
import * as xlsx from 'xlsx';
import { UploadCloud } from 'lucide-react';

export interface Contact {
  name: string;
  email: string;
}

interface Props {
  onContactsLoaded: (contacts: Contact[]) => void;
}

export default function ExcelUploader({ onContactsLoaded }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
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
          return { name, email };
        }).filter(c => c.email); // Only keep rows with an email

        if (contacts.length === 0) {
          setError('No valid emails found. Please ensure your Excel file has an "Email" column.');
          return;
        }

        onContactsLoaded(contacts);
      } catch (err: any) {
        setError('Error parsing Excel file. Please try again.');
        console.error(err);
      }
    };

    reader.readAsBinaryString(file);
    // Reset input so the same file could be uploaded again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
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
          Supports .xlsx and .xls. Keep columns as "Name" and "Email".
        </p>
      </div>
      <input 
        type="file" 
        accept=".xlsx, .xls, .csv" 
        style={{ display: 'none' }} 
        ref={fileInputRef}
        onChange={handleFileUpload}
      />
      {error && <p className="text-error" style={{ marginTop: '1rem', fontSize: '0.875rem' }}>{error}</p>}
    </div>
  );
}
