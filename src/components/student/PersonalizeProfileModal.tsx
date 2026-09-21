import React, { useState, useRef } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Building2, 
  GraduationCap, 
  Target, 
  FileText, 
  Check, 
  Sparkles,
  Camera,
  UploadCloud
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { VERIFIED_INSTITUTIONS } from '../../data/institutions';
import { CollegeAutocomplete } from '../common/CollegeAutocomplete';
import { AcademicSelector } from '../common/AcademicSelector';

interface PersonalizeProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_AVATARS = [
  { id: '1', label: 'Tech Pro Male', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=256' },
  { id: '2', label: 'Tech Pro Female', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256' },
  { id: '3', label: 'Young Engineer', url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=256' },
  { id: '4', label: 'Data Specialist', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=256' },
];

export const PersonalizeProfileModal: React.FC<PersonalizeProfileModalProps> = ({ isOpen, onClose }) => {
  const { student, updateStudentProfile, setNotification } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(student.name);
  const [email, setEmail] = useState(student.email);
  const [college, setCollege] = useState(student.college);
  const [degree, setDegree] = useState(student.degree);
  const [branch, setBranch] = useState(student.branch);
  const [semester, setSemester] = useState(student.semester);
  const [graduationYear, setGraduationYear] = useState(student.graduationYear || 2026);
  const [cgpa, setCgpa] = useState(student.cgpa);
  const [targetRole, setTargetRole] = useState(student.targetRole);
  const [bio, setBio] = useState(student.bio);
  const [avatar, setAvatar] = useState(student.avatar);
  const [resumeName, setResumeName] = useState(student.resumeName || `${student.name.replace(/\s+/g, '_')}_Resume_2025.pdf`);

  const handleCustomPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setNotification('Please select a valid image file (JPG, PNG, WebP).');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setNotification('Image size exceeds 5MB. Please choose a smaller photo.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          setAvatar(dataUrl);
          setNotification('Custom personal photo chosen! Click "Save & Update Profile" to persist.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const formattedResume = resumeName.trim().endsWith('.pdf') 
      ? resumeName.trim() 
      : `${name.trim().replace(/\s+/g, '_')}_Resume.pdf`;

    updateStudentProfile({
      name: name.trim() || student.name,
      email: email.trim() || student.email,
      college: college.trim() || student.college,
      degree: degree.trim() || student.degree,
      branch: branch.trim() || student.branch,
      semester: Number(semester) || student.semester,
      graduationYear: Number(graduationYear) || student.graduationYear || 2026,
      cgpa: Number(cgpa) || student.cgpa,
      targetRole: targetRole.trim() || student.targetRole,
      bio: bio.trim(),
      avatar: avatar.trim() || student.avatar,
      resumeName: formattedResume,
    });

    setNotification('Profile successfully personalized!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Personalize Your Profile</h2>
              <p className="text-xs text-slate-500 font-medium">Update your identity, university & career preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          
          {/* Avatar Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Profile Photo / Avatar
              </label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleCustomPhotoUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 transition-all hover:bg-blue-100"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Upload Personal Photo</span>
              </button>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1">
              {/* Custom Photo Preview if avatar is custom */}
              {!PRESET_AVATARS.some((p) => p.url === avatar) && (
                <div className="relative shrink-0 rounded-2xl overflow-hidden border-2 border-blue-600 ring-2 ring-blue-500/20 scale-105 p-0.5 bg-blue-50">
                  <img src={avatar} alt="Personal Custom Photo" className="w-12 h-12 rounded-xl object-cover" />
                  <div className="absolute inset-0 bg-blue-600/30 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white drop-shadow" />
                  </div>
                  <span className="absolute bottom-0 left-0 right-0 text-[8px] bg-blue-600 text-white font-extrabold text-center py-0.2">
                    My Photo
                  </span>
                </div>
              )}

              {/* Upload trigger button card */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative shrink-0 w-13 h-13 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/60 flex flex-col items-center justify-center text-slate-500 hover:text-blue-600 transition-all group p-1"
                title="Upload photo from device"
              >
                <Camera className="w-4 h-4 group-hover:scale-110 transition-transform text-slate-500 group-hover:text-blue-600" />
                <span className="text-[8px] font-bold mt-0.5 text-slate-600 group-hover:text-blue-600">Device</span>
              </button>

              {PRESET_AVATARS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setAvatar(preset.url)}
                  className={`relative shrink-0 rounded-2xl overflow-hidden border-2 transition-all p-0.5 ${
                    avatar === preset.url 
                      ? 'border-blue-600 ring-2 ring-blue-500/20 scale-105' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  title={preset.label}
                >
                  <img src={preset.url} alt={preset.label} className="w-12 h-12 rounded-xl object-cover" />
                  {avatar === preset.url && (
                    <div className="absolute inset-0 bg-blue-600/30 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white drop-shadow" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setResumeName(`${e.target.value.trim().replace(/\s+/g, '_')}_Resume_Tech.pdf`);
                  }}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none"
                  placeholder="e.g. Akshat Sharma"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none"
                  placeholder="e.g. akshat@coep.ac.in"
                />
              </div>
            </div>
          </div>

          {/* College & Degree */}
          <div className="space-y-4">
            <CollegeAutocomplete
              value={college}
              onChange={(name) => setCollege(name)}
              label="College / Institution"
              placeholder="Search college, university, or institute..."
            />

            <AcademicSelector
              selectedDegree={degree}
              selectedBranch={branch}
              onDegreeChange={(d) => setDegree(d)}
              onBranchChange={(b) => setBranch(b)}
            />
          </div>

          {/* Semester, Graduation Year & CGPA */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Current Semester</label>
              <input
                type="number"
                min="1"
                max="8"
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Graduation Year</label>
              <select
                value={graduationYear}
                onChange={(e) => setGraduationYear(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none bg-white font-medium"
              >
                {[2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr} {yr === 2029 ? '(Class of 2029)' : yr > 2026 ? '(Future)' : yr === 2026 ? '(Current)' : '(Alumni)'}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">CGPA (out of 10.0)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={cgpa}
                onChange={(e) => setCgpa(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none"
              />
            </div>
          </div>

          {/* Target Role & Resume Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Target Career Track</label>
              <div className="relative">
                <Target className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none"
                  placeholder="e.g. Full Stack Cloud Engineer"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Portfolio / Resume File</label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={resumeName}
                  onChange={(e) => setResumeName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none font-mono text-xs"
                  placeholder="Filename.pdf"
                />
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Professional Bio</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none resize-none"
              placeholder="Tell industry recruiters about your passions, tech stacks, and career ambitions..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md shadow-slate-900/10 active:scale-95 transition-all"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Save & Apply Changes</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
