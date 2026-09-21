import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Loader2, 
  Search, 
  PlusCircle, 
  X,
  ChevronDown
} from 'lucide-react';
import { VerifiedInstitution, searchInstitutionsApi, verifyInstitution } from '../../data/institutions';

interface CollegeAutocompleteProps {
  value: string;
  onChange: (collegeName: string) => void;
  required?: boolean;
  placeholder?: string;
  label?: string;
  className?: string;
}

export const CollegeAutocomplete: React.FC<CollegeAutocompleteProps> = ({
  value,
  onChange,
  required = true,
  placeholder = 'Type college or university name (e.g. AIIMS, Patil, COEP, BITS)...',
  label = 'Institution / University Name',
  className = ''
}) => {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<VerifiedInstitution[]>([]);
  const [isManualMode, setIsManualMode] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync internal state when incoming prop changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Debounced Live API Search
  useEffect(() => {
    if (isManualMode) return;

    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        const data = await searchInstitutionsApi(query);
        setResults(data);
      } catch (err) {
        console.error('Error fetching institutions:', err);
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => clearTimeout(timeoutId);
  }, [query, isManualMode]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const verification = verifyInstitution(query);

  const handleSelect = (inst: VerifiedInstitution) => {
    setQuery(inst.name);
    onChange(inst.name);
    setIsOpen(false);
    setIsManualMode(false);
  };

  const handleManualAdd = () => {
    setIsManualMode(true);
    setIsOpen(false);
    onChange(query);
  };

  return (
    <div ref={wrapperRef} className={`relative space-y-1.5 ${className}`}>
      {/* Label & Status Badge */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-blue-600" />
          <span>{label}</span>
        </label>

        {query.trim().length > 0 && (
          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 transition-all ${
            verification.verified
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
              : isManualMode
              ? 'bg-blue-50 text-blue-700 border border-blue-300'
              : 'bg-amber-50 text-amber-700 border border-amber-300'
          }`}>
            {verification.verified ? (
              <>
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Verified Entity</span>
              </>
            ) : isManualMode ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-blue-600" />
                <span>Manual Entry (Pending Review)</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 text-amber-600" />
                <span>Unverified Name</span>
              </>
            )}
          </span>
        )}
      </div>

      {/* Input Field with Live Feedback */}
      <div className="relative">
        <input
          type="text"
          required={required}
          value={query}
          onFocus={() => {
            if (query.trim().length >= 2 && results.length > 0) {
              setIsOpen(true);
            }
          }}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            onChange(next);
            setIsManualMode(false);
            if (next.trim().length >= 2) {
              setIsOpen(true);
            } else {
              setIsOpen(false);
            }
          }}
          placeholder={placeholder}
          className={`w-full pl-3.5 pr-10 py-2.5 text-xs sm:text-sm border rounded-xl outline-none transition-all bg-white font-medium ${
            query.trim().length > 0 && !verification.verified && !isManualMode
              ? 'border-amber-300 focus:ring-2 focus:ring-amber-400/20'
              : 'border-slate-200 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600'
          }`}
        />

        <div className="absolute right-3 top-2.5 flex items-center gap-1.5 text-slate-400 pointer-events-none">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          ) : query.trim().length > 0 ? (
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
          ) : (
            <Search className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Live Suggestion Dropdown */}
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-72 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Header info */}
          <div className="px-3.5 py-2 bg-slate-50 flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>Live Registry Matches ({results.length})</span>
            {isLoading && <span className="text-blue-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Querying national APIs...</span>}
          </div>

          {/* Results List */}
          {results.length > 0 ? (
            results.map((inst, idx) => (
              <button
                key={`${inst.name}-${idx}`}
                type="button"
                onClick={() => handleSelect(inst)}
                className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50/80 transition-colors flex items-start justify-between gap-3 group"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-blue-700 leading-snug">
                    {inst.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                    <span className="px-1.5 py-0.2 rounded bg-slate-100 font-semibold text-slate-700">
                      {inst.type}
                    </span>
                    <span>�</span>
                    <span>{inst.state}</span>
                    {inst.accreditation && (
                      <>
                        <span>�</span>
                        <span className="text-emerald-700 font-medium">{inst.accreditation}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="shrink-0 mt-1">
                  <ShieldCheck className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors" />
                </div>
              </button>
            ))
          ) : !isLoading ? (
            <div className="p-4 text-center space-y-1 text-slate-500 text-xs">
              <p className="font-semibold text-slate-700">No exact college matched for "{query}"</p>
              <p className="text-[11px]">You can still register your institution manually below.</p>
            </div>
          ) : null}

          {/* Fallback Action: "Can't find your college? Add manually" */}
          <div className="p-2.5 bg-slate-50/90 border-t border-slate-100">
            <button
              type="button"
              onClick={handleManualAdd}
              className="w-full py-2 px-3 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 text-blue-600 hover:text-blue-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Can't find your college? Use "{query}" manually</span>
            </button>
          </div>
        </div>
      )}

      {/* Inline Feedback Explanatory Note */}
      {query.trim().length > 0 && !isOpen && (
        <p className={`text-[11px] flex items-center gap-1.5 ${
          verification.verified ? 'text-emerald-700 font-medium' : isManualMode ? 'text-blue-700 font-medium' : 'text-amber-700'
        }`}>
          {verification.verified ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : isManualMode ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          )}
          <span>
            {isManualMode 
              ? `Custom entry accepted: "${query}". This institution will be added to the pending review registry.` 
              : verification.note}
          </span>
        </p>
      )}
    </div>
  );
};
