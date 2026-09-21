import re

with open('src/components/student/CompetencyPassportModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

original_banner = """{/* Certificate Header Banner */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white relative overflow-hidden border border-white/10 shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-[10px] font-bold border border-blue-400/30 uppercase tracking-wider">
                    S.P.A.R.K. Official Credential
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Cryptographically Signed</span>
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                  Student Competency Passport
                </h1>
                <p className="text-xs text-slate-300 font-mono">
                  ID: {passportId}
                </p>
              </div>

              {/* QR Code / Seal */}
              <div className="p-3 bg-white rounded-2xl shadow-inner flex flex-col items-center justify-center shrink-0">
                <QrCode className="w-14 h-14 text-slate-900" />
                <span className="text-[9px] font-mono font-bold text-slate-600 mt-1">SCAN TO VERIFY</span>
              </div>
            </div>
          </div>"""

content = re.sub(r'\{\/\*\ 3D\ Holographic\ Passport\ Card\ \*\/\}\s*<HolographicCard\ student=\{student\}\ \/>', original_banner, content)
content = content.replace("import { HolographicCard } from '../three/HolographicCard';\n", "")

with open('src/components/student/CompetencyPassportModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
