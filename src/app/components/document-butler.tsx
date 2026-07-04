import { useState } from 'react';
import { Upload, CheckCircle, AlertCircle, File, X, Sparkles, FileText, CreditCard, IdCard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Document {
  id: string;
  name: string;
  type: 'passport' | 'transcript' | 'bankStatement' | 'cv' | 'sop';
  status: 'pending' | 'analyzing' | 'valid' | 'invalid';
  file?: File;
  validationMessage?: string;
  icon: any;
}

const requiredDocuments: Omit<Document, 'status' | 'file'>[] = [
  { id: '1', name: 'Passport', type: 'passport', icon: IdCard },
  { id: '2', name: 'Academic Transcripts', type: 'transcript', icon: FileText },
  { id: '3', name: 'Bank Statement', type: 'bankStatement', icon: CreditCard },
  { id: '4', name: 'CV/Resume', type: 'cv', icon: File },
  { id: '5', name: 'Statement of Purpose', type: 'sop', icon: FileText },
];

export function DocumentButler() {
  const [documents, setDocuments] = useState<Document[]>(
    requiredDocuments.map(doc => ({ ...doc, status: 'pending' }))
  );
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const simulateOCRValidation = (docId: string, fileName: string) => {
    // Simulate analyzing
    setDocuments(prev =>
      prev.map(doc =>
        doc.id === docId
          ? { ...doc, status: 'analyzing' }
          : doc
      )
    );

    // Simulate validation after 2 seconds
    setTimeout(() => {
      const isValid = Math.random() > 0.3; // 70% success rate for demo
      setDocuments(prev =>
        prev.map(doc =>
          doc.id === docId
            ? {
                ...doc,
                status: isValid ? 'valid' : 'invalid',
                validationMessage: isValid
                  ? 'Document verified successfully'
                  : 'Document quality too low or information incomplete',
              }
            : doc
        )
      );
    }, 2000);
  };

  const handleDrop = (e: React.DragEvent, docId: string) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      setDocuments(prev =>
        prev.map(doc =>
          doc.id === docId
            ? { ...doc, file, status: 'pending' }
            : doc
        )
      );
      simulateOCRValidation(docId, file.name);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, docId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocuments(prev =>
        prev.map(doc =>
          doc.id === docId
            ? { ...doc, file, status: 'pending' }
            : doc
        )
      );
      simulateOCRValidation(docId, file.name);
    }
  };

  const removeDocument = (docId: string) => {
    setDocuments(prev =>
      prev.map(doc =>
        doc.id === docId
          ? { ...doc, file: undefined, status: 'pending', validationMessage: undefined }
          : doc
      )
    );
  };

  const validDocuments = documents.filter(doc => doc.status === 'valid').length;
  const totalDocuments = documents.length;
  const progress = (validDocuments / totalDocuments) * 100;

  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0074D9]/10 mb-4">
            <Sparkles className="w-4 h-4 text-[#0074D9]" />
            <span className="text-sm text-[#0074D9] font-semibold">Document Butler</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[#001F3F] mb-4">
            Smart Document Verification
          </h2>
          <p className="text-lg text-[#001F3F]/70 max-w-2xl mx-auto">
            Upload your documents and we verify them instantly using OCR technology
          </p>
        </div>

        {/* Progress Overview */}
        <div className="bg-gradient-to-br from-[#001F3F] to-[#0074D9] rounded-3xl p-8 mb-12 text-white">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold mb-2">Document Checklist Progress</h3>
              <p className="text-white/80">
                {validDocuments} of {totalDocuments} documents verified
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold mb-1">{Math.round(progress)}%</div>
              <div className="text-sm text-white/80">Complete</div>
            </div>
          </div>
          <div className="h-4 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Document Upload Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {documents.map((doc) => {
            const Icon = doc.icon;
            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`
                  relative rounded-2xl border-2 transition-all overflow-hidden
                  ${isDragging ? 'border-[#0074D9] bg-[#0074D9]/5' : 'border-gray-200'}
                  ${doc.status === 'valid' ? 'border-green-500 bg-green-50' : ''}
                  ${doc.status === 'invalid' ? 'border-red-500 bg-red-50' : ''}
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, doc.id)}
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`
                      w-12 h-12 rounded-xl flex items-center justify-center
                      ${doc.status === 'valid' ? 'bg-green-500' : 
                        doc.status === 'invalid' ? 'bg-red-500' : 
                        'bg-gradient-to-br from-[#0074D9] to-[#001F3F]'}
                    `}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-[#001F3F]">{doc.name}</h4>
                      <p className="text-xs text-[#001F3F]/60">
                        {doc.status === 'pending' && 'Required'}
                        {doc.status === 'analyzing' && 'Analyzing...'}
                        {doc.status === 'valid' && 'Verified ✓'}
                        {doc.status === 'invalid' && 'Invalid ✗'}
                      </p>
                    </div>
                    
                    {/* Status Icon */}
                    {doc.status === 'valid' && (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    )}
                    {doc.status === 'invalid' && (
                      <AlertCircle className="w-6 h-6 text-red-500" />
                    )}
                  </div>

                  {/* Upload Zone */}
                  {!doc.file ? (
                    <label className="block">
                      <div className={`
                        border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                        ${doc.status === 'invalid' ? 'border-red-300 hover:border-red-500' : 'border-gray-300 hover:border-[#0074D9]'}
                        hover:bg-gray-50
                      `}>
                        <Upload className="w-8 h-8 mx-auto mb-3 text-[#0074D9]" />
                        <p className="font-semibold text-[#001F3F] mb-1">
                          Drop file here or click to upload
                        </p>
                        <p className="text-xs text-[#001F3F]/60">
                          PDF, JPG, PNG up to 10MB
                        </p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileInput(e, doc.id)}
                      />
                    </label>
                  ) : (
                    <div className="space-y-3">
                      {/* File Info */}
                      <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <File className="w-5 h-5 text-[#0074D9] flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[#001F3F] truncate">
                              {doc.file.name}
                            </p>
                            <p className="text-xs text-[#001F3F]/60">
                              {(doc.file.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeDocument(doc.id)}
                          className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all flex-shrink-0 ml-2"
                        >
                          <X className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>

                      {/* Analyzing Animation */}
                      <AnimatePresence>
                        {doc.status === 'analyzing' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-blue-50 rounded-xl p-4 border border-blue-200"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 border-2 border-[#0074D9] border-t-transparent rounded-full animate-spin" />
                              <div>
                                <p className="font-semibold text-[#0074D9]">
                                  Analyzing your document...
                                </p>
                                <p className="text-xs text-[#0074D9]/80">
                                  Checking validity, expiry dates, and information
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Validation Message */}
                      {doc.validationMessage && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-4 rounded-xl ${
                            doc.status === 'valid'
                              ? 'bg-green-100 border border-green-200'
                              : 'bg-red-100 border border-red-200'
                          }`}
                        >
                          <p className={`text-sm font-semibold ${
                            doc.status === 'valid' ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {doc.validationMessage}
                          </p>
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Submit Button */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: validDocuments === totalDocuments ? 1 : 0.5 }}
        >
          <button
            disabled={validDocuments !== totalDocuments}
            className={`
              px-12 py-4 rounded-xl font-semibold text-lg transition-all
              ${validDocuments === totalDocuments
                ? 'bg-gradient-to-r from-[#0074D9] to-[#001F3F] text-white hover:shadow-2xl'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {validDocuments === totalDocuments
              ? '🎉 All Documents Verified - Continue to Application'
              : `Upload ${totalDocuments - validDocuments} more document${totalDocuments - validDocuments > 1 ? 's' : ''}`
            }
          </button>
        </motion.div>
      </div>
    </section>
  );
}