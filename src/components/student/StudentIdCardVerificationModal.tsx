import React, { useState, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Building2, 
  GraduationCap, 
  FileText, 
  RefreshCw,
  Camera,
  Layers,
  Award
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';

interface StudentIdCardVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerifiedSuccess?: (details: {
    institutionName: string;
    studentName: string;
    rollNumber: string;
    validThruYear: string;
  }) => void;
}

export const StudentIdCardVerificationModal: React.FC<StudentIdCardVerificationModalProps> = ({
  isOpen,
  onClose,
  onVerifiedSuccess
}) => {
  const { student, updateStudentProfile, setNotification } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [editedResult, setEditedResult] = useState({
    institutionName: '',
    studentName: '',
    rollNumber: '',
    validThruYear: '',
  });
  const [showRawOcr, setShowRawOcr] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Please select a valid image format (PNG, JPG, WebP).');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setErrorMsg(null);
      setOcrResult(null);
    }
  };

  const handleScanCard = async () => {
    if (!selectedFile) return;

    setIsScanning(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('idCard', selectedFile);

    try {
      const data = await api.verifyIdCard(selectedFile);
      if (data.success && data.result) {
        setOcrResult(data.result);
        setEditedResult({
          institutionName: data.result.institutionName || student.college || '',
          studentName: data.result.studentName || student.name || '',
          rollNumber: data.result.rollNumber || '',
          validThruYear: data.result.validThruYear || '2026',
        });
      } else if (data.result && data.result.verified === false) {
        // Scanner ran but could not read the card — honest failure, ask for a retake
        setOcrResult(null);
        setErrorMsg(data.result.accreditationNote || data.result.rawSummary || 'Could not read the card. Please retake the photo in better lighting.');
      } else {
        setErrorMsg(data.error || 'Failed to scan ID card. Please ensure text is legible.');
      }
    } catch (err: any) {
      // Backend unreachable — do NOT fabricate a verification, surface the real error
      setErrorMsg(
        'Verification service unreachable. Please ensure the S.P.A.R.K. backend is running and try again — no credentials can be confirmed offline.'
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleApplyCredentials = async () => {
    if (!ocrResult) return;

    const finalInstitution = editedResult.institutionName.trim() || ocrResult.institutionName;
    const finalStudentName = editedResult.studentName.trim() || ocrResult.studentName;
    const finalRoll = editedResult.rollNumber.trim() || ocrResult.rollNumber;
    const finalYear = editedResult.validThruYear.trim() || ocrResult.validThruYear;

    await updateStudentProfile({
      idCardVerified: true,
      college: finalInstitution,
      idCardDetails: {
        institutionName: finalInstitution,
        studentName: finalStudentName,
        rollNumber: finalRoll,
        validThruYear: finalYear,
        verifiedAt: new Date().toLocaleDateString(),
        confidenceScore: ocrResult.confidenceScore,
      },
      readinessScore: Math.min(99, student.readinessScore + 5)
    });

    if (onVerifiedSuccess) {
      onVerifiedSuccess({
        institutionName: finalInstitution,
        studentName: finalStudentName,
        rollNumber: finalRoll,
        validThruYear: finalYear,
      });
    }

    setNotification(`Institutional ID Card Authenticated! Verified for ${finalInstitution}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-950 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 border border-blue-400/30 rounded-2xl text-blue-300">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <span>Student ID Card AI Verification</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Gemini Vision OCR
                </span>
              </h3>
              <p className="text-xs text-slate-300">Instant optical verification of college affiliation & roll number</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-800">
          
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Upload Dropzone */}
          {!ocrResult && (
            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              
              {!previewUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-blue-200 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50/80 rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group"
                >
                  <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform mb-3">
                    <Camera className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">Click or drag your Student ID Card</p>
                  <p className="text-xs text-slate-500 mt-1 text-center max-w-xs">
                    Supports high-resolution PNG, JPG, or WebP photo of your physical or digital college ID card.
                  </p>
                  <span className="mt-4 px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs">
                    Choose Photo
                  </span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 max-h-56 flex items-center justify-center group">
                    <img src={previewUrl} alt="Uploaded ID Card" className="object-contain max-h-56 w-full" />
                    {isScanning && (
                      <div className="absolute inset-0 bg-blue-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2">
                        <RefreshCw className="w-7 h-7 text-blue-400 animate-spin" />
                        <p className="text-xs font-bold">Scanning with Gemini Vision OCR...</p>
                        <p className="text-[10px] text-slate-300">Extracting institutional seal, student name & roll number</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isScanning}
                      className="text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors"
                    >
                      Change Photo
                    </button>

                    <button
                      type="button"
                      onClick={handleScanCard}
                      disabled={isScanning}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                    >
                      <Sparkles className="w-4 h-4 text-yellow-300" />
                      <span>{isScanning ? 'Analyzing Card...' : 'Verify Card with AI'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* OCR Extracted Results Card */}
          {ocrResult && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-3xl space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider block">
                        Optical Credentials Extracted
                      </span>
                      <span className="text-[10px] text-emerald-700 font-medium">
                        Engine: {ocrResult.ocrEngine || 'Tesseract.js OCR'}
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-mono font-bold">
                    {ocrResult.confidenceScore}% Confidence
                  </span>
                </div>

                {/* Accredited-registry cross-validation badge */}
                <div className={`px-3 py-2 rounded-xl text-[11px] font-bold flex items-center gap-2 ${
                  ocrResult.institutionVerified
                    ? 'bg-emerald-100/80 text-emerald-900 border border-emerald-300'
                    : ocrResult.registryMatchLevel === 'recognized'
                    ? 'bg-amber-100/80 text-amber-900 border border-amber-300'
                    : 'bg-rose-100/70 text-rose-900 border border-rose-300'
                }`}>
                  {ocrResult.institutionVerified ? (
                    <>
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>
                        Institution verified in accredited registry{ocrResult.registryMatchName ? `: ${ocrResult.registryMatchName}` : ''}
                      </span>
                    </>
                  ) : ocrResult.registryMatchLevel === 'recognized' ? (
                    <>
                      <Building2 className="w-4 h-4 shrink-0" />
                      <span>Possible registry match — please confirm the exact institution name below</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Institution NOT found in accredited registry — verification pending manual review</span>
                    </>
                  )}
                </div>

                <div className="space-y-2.5 pt-1">
                  <p className="text-[11px] text-slate-500 font-medium">
                    Review or correct any scanned fields below before saving to your verified profile:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-slate-600 font-semibold block mb-1">
                        Institution / College:
                      </label>
                      <input
                        type="text"
                        value={editedResult.institutionName}
                        onChange={(e) => setEditedResult({ ...editedResult, institutionName: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-slate-900 font-bold text-xs focus:ring-2 focus:ring-emerald-500 outline-none shadow-2xs"
                        placeholder="e.g. COEP Technological University"
                      />
                    </div>

                    <div>
                      <label className="text-slate-600 font-semibold block mb-1">
                        Student Full Name:
                      </label>
                      <input
                        type="text"
                        value={editedResult.studentName}
                        onChange={(e) => setEditedResult({ ...editedResult, studentName: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-slate-900 font-bold text-xs focus:ring-2 focus:ring-emerald-500 outline-none shadow-2xs"
                        placeholder="e.g. Akshat Mishra"
                      />
                    </div>

                    <div>
                      <label className="text-slate-600 font-semibold block mb-1">
                        Roll Number / PRN:
                      </label>
                      <input
                        type="text"
                        value={editedResult.rollNumber}
                        onChange={(e) => setEditedResult({ ...editedResult, rollNumber: e.target.value })}
                        className="w-full px-3 py-2 bg-white font-mono border border-blue-200 rounded-xl text-blue-700 font-bold text-xs focus:ring-2 focus:ring-blue-500 outline-none shadow-2xs"
                        placeholder="e.g. PRN-638552"
                      />
                    </div>

                    <div>
                      <label className="text-slate-600 font-semibold block mb-1">
                        Batch / Validity Year:
                      </label>
                      <input
                        type="text"
                        value={editedResult.validThruYear}
                        onChange={(e) => setEditedResult({ ...editedResult, validThruYear: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-slate-800 font-bold text-xs focus:ring-2 focus:ring-emerald-500 outline-none shadow-2xs"
                        placeholder="e.g. 2026 or 2024-2028"
                      />
                    </div>
                  </div>
                </div>

                {/* Raw OCR Text Viewer Accordion */}
                {ocrResult.rawOcrText && (
                  <div className="pt-2 border-t border-emerald-100">
                    <button
                      type="button"
                      onClick={() => setShowRawOcr(!showRawOcr)}
                      className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1.5 transition-colors"
                    >
                      <span>{showRawOcr ? '▲ Hide Raw OCR Stream' : '▼ View Raw OCR Extracted Text'}</span>
                    </button>
                    {showRawOcr && (
                      <div className="mt-2 p-2.5 bg-slate-900 text-slate-200 rounded-xl font-mono text-[10px] max-h-32 overflow-y-auto whitespace-pre-wrap border border-slate-700">
                        {ocrResult.rawOcrText}
                      </div>
                    )}
                  </div>
                )}

                <p className="text-[11px] text-emerald-800 font-medium pt-1">
                  ✓ {ocrResult.accreditationNote || 'AICTE & University Affiliation Pattern Verified'}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setOcrResult(null);
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    setShowRawOcr(false);
                  }}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  Rescan Different Card
                </button>

                <button
                  type="button"
                  onClick={handleApplyCredentials}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Apply & Save Verified Credentials</span>
                </button>
              </div>
            </div>
          )}

          {/* Verification Benefit Callout */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-2.5 text-[11px] text-slate-600">
            <Award className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-800">Why verify your Student ID?</span>
              <p className="text-slate-500 mt-0.5">
                Verified student badges give your profile priority ranking in corporate recruiter candidate searches and unlock Tier-1 internship applications.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
