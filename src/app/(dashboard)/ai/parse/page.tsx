'use client';

import { useState } from 'react';
import { aiAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';

export default function AIDocumentParserPage() {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setError(null);
    }
  };

  const handleParseLease = async () => {
    if (!file) return;

    setParsing(true);
    setError(null);

    try {
      const response = await aiAPI.parseLease(file);
      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to parse document');
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI Document Parser</h1>
        <p className="mt-2 text-sm text-gray-600">
          Upload a lease or contract to extract key information automatically
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-10 h-10 mb-3 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PDF or DOCX (MAX. 10MB)</p>
                  {file && (
                    <p className="mt-2 text-sm text-indigo-600 font-medium">{file.name}</p>
                  )}
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            <Button
              onClick={handleParseLease}
              disabled={!file || parsing}
              className="w-full"
            >
              {parsing ? (
                'Parsing...'
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Parse Lease Document
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-sm text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && result.data && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Extracted Information</CardTitle>
              {result.data.confidence_score > 0.8 ? (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span className="text-sm font-medium">
                    {(result.data.confidence_score * 100).toFixed(0)}% Confidence
                  </span>
                </div>
              ) : (
                <div className="flex items-center text-yellow-600">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  <span className="text-sm font-medium">
                    {(result.data.confidence_score * 100).toFixed(0)}% Confidence - Review Needed
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DataField label="Monthly Rent" value={`$${result.data.monthly_rent}`} />
              <DataField label="Security Deposit" value={`$${result.data.security_deposit}`} />
              <DataField label="Lease Start" value={result.data.lease_start_date} />
              <DataField label="Lease End" value={result.data.lease_end_date} />
              <DataField label="Term" value={`${result.data.lease_term_months} months`} />
              <DataField label="Tenants" value={result.data.tenant_names?.join(', ')} />
              <DataField label="Property" value={result.data.property_address} />
              <DataField label="Pet Policy" value={result.data.pet_policy} />
            </dl>

            {result.data.warnings && result.data.warnings.length > 0 && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">Warnings:</h4>
                <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                  {result.data.warnings.map((warning: string, i: number) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 flex space-x-3">
              <Button variant="outline" className="flex-1">
                Edit & Import
              </Button>
              <Button className="flex-1">
                Create Lease from This Data
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DataField({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value || 'N/A'}</dd>
    </div>
  );
}
