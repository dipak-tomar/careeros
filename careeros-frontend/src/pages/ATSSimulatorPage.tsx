import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface ATSIssue {
  type: 'error' | 'warning' | 'success';
  message: string;
}

export function ATSSimulatorPage() {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [issues, setIssues] = useState<ATSIssue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeText = (text: string): ATSIssue[] => {
    const issues: ATSIssue[] = [];
    const lines = text.split('\n').filter(l => l.trim());
    
    const hasEmail = /[\w.-]+@[\w.-]+\.\w+/.test(text);
    const hasPhone = /[\d\s\-().+]{10,}/.test(text);
    
    if (!hasEmail) {
      issues.push({ type: 'error', message: 'No email address detected' });
    } else {
      issues.push({ type: 'success', message: 'Email address found' });
    }
    
    if (!hasPhone) {
      issues.push({ type: 'warning', message: 'No phone number detected' });
    } else {
      issues.push({ type: 'success', message: 'Phone number found' });
    }

    const hasNumbers = /\d+%|\$[\d,]+|\d+\s*(years?|months?|users?|customers?|projects?)/i.test(text);
    if (!hasNumbers) {
      issues.push({ type: 'warning', message: 'No quantifiable metrics found - consider adding numbers to your achievements' });
    } else {
      issues.push({ type: 'success', message: 'Quantifiable metrics detected' });
    }

    const commonSections = ['experience', 'education', 'skills'];
    const foundSections = commonSections.filter(section => 
      text.toLowerCase().includes(section)
    );
    
    if (foundSections.length < 2) {
      issues.push({ type: 'warning', message: 'Missing common resume sections (Experience, Education, Skills)' });
    } else {
      issues.push({ type: 'success', message: 'Standard resume sections detected' });
    }

    if (text.length < 500) {
      issues.push({ type: 'warning', message: 'Resume appears too short - consider adding more content' });
    }

    if (lines.length > 0) {
      const firstFewLines = lines.slice(0, 5).join(' ').toLowerCase();
      if (!hasEmail || !firstFewLines.includes('@')) {
        issues.push({ type: 'warning', message: 'Contact information may not be at the top of the resume' });
      }
    }

    return issues;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }

    setIsLoading(true);
    setFileName(file.name);
    setExtractedText('');
    setIssues([]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);

      const data = new Uint8Array(arrayBuffer);
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str || '')
            .join(' ');
          fullText += pageText + '\n';
        } catch (pageErr) {
          console.warn(`Failed to extract text from page ${i}:`, pageErr);
        }
      }

      if (!fullText.trim()) {
        setExtractedText('No text could be extracted from this PDF. This might be a scanned image or a protected document. Try exporting your resume as a text-based PDF.');
      } else {
        setExtractedText(fullText);
        setIssues(analyzeText(fullText));
      }
    } catch (error) {
      console.error('Failed to parse PDF:', error);
      setExtractedText('Failed to parse this PDF. The file might be corrupted, password-protected, or in an unsupported format.');
    } finally {
      setIsLoading(false);
    }
  };

  const getIssueIcon = (type: ATSIssue['type']) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Reverse ATS Simulator</CardTitle>
          <CardDescription>
            Upload your resume to see exactly what an ATS (Applicant Tracking System) sees
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            ref={fileInputRef}
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
          >
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-sm text-gray-600">
              {isLoading ? 'Processing...' : 'Click to upload your resume (PDF)'}
            </p>
            {fileName && (
              <p className="text-sm text-gray-500 mt-2">
                Current file: {fileName}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {(pdfUrl || extractedText) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Visual View
              </CardTitle>
              <CardDescription>How humans see your resume</CardDescription>
            </CardHeader>
            <CardContent>
              {pdfUrl && (
                <iframe
                  src={pdfUrl}
                  className="w-full h-[500px] border rounded"
                  title="Resume Preview"
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                ATS View (Raw Text)
              </CardTitle>
              <CardDescription>What the ATS robot sees</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 text-green-400 font-mono text-xs p-4 rounded h-[500px] overflow-auto whitespace-pre-wrap">
                {extractedText || 'No text extracted'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">ATS Compatibility Report</CardTitle>
            <CardDescription>Issues and recommendations for your resume</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {issues.map((issue, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-2 p-3 rounded-lg ${
                    issue.type === 'error' ? 'bg-red-50' :
                    issue.type === 'warning' ? 'bg-yellow-50' :
                    'bg-green-50'
                  }`}
                >
                  {getIssueIcon(issue.type)}
                  <span className="text-sm">{issue.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
