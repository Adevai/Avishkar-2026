import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { calculateJobMatch } from '../../utils/matchCalculator';
import { formatDisplayDate } from '../../utils/formatDate';
import { 
  Briefcase, 
  MapPin, 
  IndianRupee, 
  Calendar, 
  CheckCircle2, 
  Sparkles, 
  AlertCircle, 
  Filter, 
  Search, 
  Building, 
  ArrowRight, 
  ExternalLink, 
  Share2, 
  Globe, 
  Compass, 
  RefreshCw, 
  Radio, 
  Clock,
  Bookmark,
  BookmarkCheck,
  Star,
  CheckSquare,
  Square,
  TrendingUp,
  FileText,
  Copy,
  Check,
  Send,
  UploadCloud,
  Eye
} from 'lucide-react';
import { JobOpportunity } from '../../types';
import { api } from '../../services/api';
import { getDeadlineInfo } from '../../utils/deadlineUtils';
import { getSalaryBenchmark } from '../../utils/salaryBenchmark';

/** Human-readable "synced Xm ago" label for live-sourced listings. */
function freshnessLabel(fetchedAt?: string): { text: string; fresh: boolean } | null {
  if (!fetchedAt) return null;
  const mins = Math.floor((Date.now() - new Date(fetchedAt).getTime()) / 60000);
  if (isNaN(mins) || mins < 0) return null;
  if (mins < 60) return { text: mins <= 5 ? 'Synced just now' : `Synced ${mins}m ago`, fresh: mins <= 60 };
  const hours = Math.floor(mins / 60);
  if (hours < 24) return { text: `Synced ${hours}h ago`, fresh: hours <= 24 };
  const days = Math.floor(hours / 24);
  return { text: `Synced ${days}d ago`, fresh: days <= 7 };
}

export const JobMatches: React.FC = () => {
  const { jobs, student, applyForJob, withdrawApplication, applications, setActiveTab } = useApp();
  const [filterType, setFilterType] = useState<string>('All');
  const [sourceFilter, setSourceFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [minMatch, setMinMatch] = useState<number>(0);

  // Cover Note Modal State
  const [selectedJobForCoverNote, setSelectedJobForCoverNote] = useState<JobOpportunity | null>(null);
  const [copiedCoverNote, setCopiedCoverNote] = useState<boolean>(false);

  // Scorecard / Resume Attachment Modal State
  const [attachingJobId, setAttachingJobId] = useState<string | null>(null);
  const [customResumeUrl, setCustomResumeUrl] = useState<string>('https://spark-verify.ac.in/passport/' + (student?.id || 'stu-01'));
  const [attachScorecard, setAttachScorecard] = useState<boolean>(true);

  // Shortlist State with localStorage persistence
  const [shortlistedJobIds, setShortlistedJobIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('spark_shortlisted_jobs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleShortlist = (jobId: string) => {
    setShortlistedJobIds(prev => {
      const updated = prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId];
      try {
        localStorage.setItem('spark_shortlisted_jobs', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Live Scraped LinkedIn Jobs State
  const [liveLinkedInJobs, setLiveLinkedInJobs] = useState<JobOpportunity[]>([]);
  const [isScrapingLinkedIn, setIsScrapingLinkedIn] = useState<boolean>(false);
  const [liveKeyword, setLiveKeyword] = useState<string>(student?.targetRole || 'Cybersecurity Analyst');
  const [liveLocation, setLiveLocation] = useState<string>('India');
  const [activeTabMode, setActiveTabMode] = useState<'all' | 'live-linkedin' | 'shortlisted' | 'applied' | 'campus'>('all');
  const [lastScrapedAt, setLastScrapedAt] = useState<string | null>(null);

  // Derive custom LinkedIn live query based on candidate's target role & verified/declared skills
  const studentTopSkills = (
    student?.verifiedSkills?.length
      ? student.verifiedSkills.map(s => s.skill)
      : student?.declaredSkills || []
  ).slice(0, 3).join(' ');

  const linkedInRoleKeyword = encodeURIComponent(`${student?.targetRole || 'Software Engineer'} ${studentTopSkills}`.trim());
  const liveLinkedInDeepUrl = `https://www.linkedin.com/jobs/search/?keywords=${linkedInRoleKeyword}&location=India&f_TPR=r2592000`;

  // Fetch real-time live LinkedIn postings via our Express backend scraper
  const fetchLiveLinkedInJobs = async (customKw?: string, customLoc?: string) => {
    const kw = customKw || liveKeyword || student?.targetRole || 'Software Engineer';
    const loc = customLoc || liveLocation || 'India';
    setIsScrapingLinkedIn(true);

    try {
      const jobs = await api.getLiveJobs(kw, loc);
      if (jobs && jobs.length > 0) {
        setLiveLinkedInJobs(jobs);
        setLastScrapedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (err) {
      console.warn('Error fetching live LinkedIn jobs:', err);
    } finally {
      setIsScrapingLinkedIn(false);
    }
  };

  // Initial fetch of real-time LinkedIn listings on first mount / role change
  const initialKw = student?.targetRole || 'Cybersecurity Analyst';
  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const fetched = await api.getLiveJobs(initialKw, 'India');
        if (!cancelled && fetched && fetched.length > 0) {
          setLiveLinkedInJobs(fetched);
          setLastScrapedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      } catch (err) {
        // Silent — the live feed simply stays empty and curated jobs are shown
      }
    };
    run();
    return () => { cancelled = true; };
  }, [initialKw]);

  // Combine real-world curated jobs and live scraped LinkedIn postings
  const allAvailableJobs = React.useMemo(() => {
    // Only real-world verified jobs (LinkedIn live postings or genuine corporate campus partners)
    const realWorldCurated = jobs.filter(j => j.sourcePlatform === 'LinkedIn' || j.sourcePlatform === 'Campus Direct');

    if (activeTabMode === 'live-linkedin') {
      return liveLinkedInJobs.length > 0 ? liveLinkedInJobs : realWorldCurated.filter(j => j.sourcePlatform === 'LinkedIn');
    }
    if (activeTabMode === 'campus') {
      return realWorldCurated.filter(j => j.sourcePlatform === 'Campus Direct');
    }
    
    // Merge live scraped jobs at the top, then verified real-world opportunities
    const existingIds = new Set(liveLinkedInJobs.map(l => l.externalUrl || l.title));
    const uniqueCurated = realWorldCurated.filter(j => !existingIds.has(j.externalUrl || j.title));
    return [...liveLinkedInJobs, ...uniqueCurated];
  }, [jobs, liveLinkedInJobs, activeTabMode]);

  // Compute match results for each job
  const matchedJobs = allAvailableJobs.map(job => {
    const match = calculateJobMatch(student, job);
    const existingApp = applications.find(a => a.jobId === job.id && a.studentId === student.id);
    const isShortlisted = shortlistedJobIds.includes(job.id);
    return {
      ...job,
      matchResult: match,
      hasApplied: !!existingApp,
      applicationStatus: existingApp?.status,
      isShortlisted,
    };
  });

  const filteredJobs = matchedJobs.filter(j => {
    if (activeTabMode === 'shortlisted' && !j.isShortlisted) return false;
    if (activeTabMode === 'applied' && !j.hasApplied) return false;
    if (filterType !== 'All' && j.type !== filterType) return false;
    if (sourceFilter !== 'All') {
      if (sourceFilter === 'LinkedIn' && j.sourcePlatform !== 'LinkedIn') return false;
      if (sourceFilter === 'Campus' && j.sourcePlatform !== 'Campus Direct') return false;
    }
    if (j.matchResult.matchScore < minMatch) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q)
      );
    }
    return true;
  }).sort((a, b) => b.matchResult.matchScore - a.matchResult.matchScore);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Step Banner */}
      <div className="relative rounded-3xl p-6 sm:p-8 ink-mesh text-white shadow-xl border border-white/10 overflow-hidden">
        <div className="absolute -right-20 -top-24 w-80 h-80 bg-gold-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-48 -bottom-24 w-60 h-60 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-gold-500/15 text-gold-300 text-xs font-semibold border border-gold-500/30">
                Step 6 of Solution Workflow
              </span>
              <span className="text-xs text-slate-400">Real-World Opportunity Matching</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Production Opportunity Matching & LinkedIn Integration</h1>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl">
              Algorithmic matching across live LinkedIn corporate listings and campus MoUs. Review verified competency requirements, view active LinkedIn postings, and track applications with real-time feedback.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={liveLinkedInDeepUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 bg-gold-500 hover:bg-gold-400 text-ink-950 rounded-xl text-xs sm:text-sm font-bold shadow-glow-sm transition-all hover:scale-105 active:scale-95"
              title="Search live LinkedIn postings pre-filtered for your verified skills"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
              </svg>
              <span>Deep LinkedIn Search</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>

            <button
              onClick={() => setActiveTab('applications')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs sm:text-sm font-bold border border-white/20 transition-all hover:scale-105"
            >
              <span>View Placement Tracker</span>
              <ArrowRight className="w-4 h-4 text-gold-400" />
            </button>
          </div>
        </div>

        {/* Live LinkedIn Skill-Matched Query Recommendation & Scraper Controls */}
        <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs bg-white/5 rounded-xl px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Compass className="w-4 h-4 text-amber-300 shrink-0" />
              <span>
                <strong>Live LinkedIn Pipeline:</strong> Scraping real corporate openings for <span className="underline font-bold text-amber-200">{liveKeyword}</span> in <span className="font-semibold text-blue-200">{liveLocation}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {lastScrapedAt && (
                <span className="text-[11px] text-blue-200 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-400" />
                  <span>Synced {lastScrapedAt}</span>
                </span>
              )}
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold flex items-center gap-1">
                <Radio className="w-3 h-3 animate-pulse" />
                <span>{liveLinkedInJobs.length} Live Postings</span>
              </span>
            </div>
          </div>

          {/* Interactive Live Scraper Search Bar */}
          <div className="flex flex-col sm:flex-row gap-2 items-center bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/15">
            <div className="relative flex-1 w-full">
              <Search className="w-3.5 h-3.5 text-blue-200 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={liveKeyword}
                onChange={(e) => setLiveKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchLiveLinkedInJobs(liveKeyword, liveLocation)}
                placeholder="Search live role on LinkedIn (e.g. Cybersecurity Analyst, BCG, Adobe, React)..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-white/10 text-white placeholder-blue-200 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="w-full sm:w-44">
              <input
                type="text"
                value={liveLocation}
                onChange={(e) => setLiveLocation(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchLiveLinkedInJobs(liveKeyword, liveLocation)}
                placeholder="Location (e.g. India, Pune)"
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-white/10 text-white placeholder-blue-200 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <button
              onClick={() => fetchLiveLinkedInJobs(liveKeyword, liveLocation)}
              disabled={isScrapingLinkedIn}
              className="w-full sm:w-auto px-4 py-1.5 bg-gold-500 hover:bg-gold-400 text-ink-950 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScrapingLinkedIn ? 'animate-spin' : ''}`} />
              <span>{isScrapingLinkedIn ? 'Scraping LinkedIn...' : 'Fetch Live Postings'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="premium-card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search role, company or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Active Mode Tabs */}
          <div className="flex items-center gap-1 bg-slate-900 text-white p-1 rounded-xl text-xs font-semibold shadow-xs">
            <button
              onClick={() => { setActiveTabMode('all'); setSourceFilter('All'); }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTabMode === 'all'
                  ? 'bg-gold-500 text-ink-950 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              All Matches
            </button>
            <button
              onClick={() => { setActiveTabMode('live-linkedin'); setSourceFilter('All'); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTabMode === 'live-linkedin'
                  ? 'bg-[#0A66C2] text-white shadow-xs font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
              </svg>
              <span>Live LinkedIn Feed ({liveLinkedInJobs.length})</span>
            </button>
            <button
              onClick={() => { setActiveTabMode('shortlisted'); setSourceFilter('All'); }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                activeTabMode === 'shortlisted'
                  ? 'bg-gold-500 text-ink-950 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Bookmark className={`w-3 h-3 ${activeTabMode === 'shortlisted' ? 'fill-slate-950' : ''}`} />
              <span>Shortlisted ({shortlistedJobIds.length})</span>
            </button>
            <button
              onClick={() => { setActiveTabMode('applied'); setSourceFilter('All'); }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                activeTabMode === 'applied'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <CheckSquare className="w-3 h-3" />
              <span>Applied ({applications.filter(a => a.studentId === student.id).length})</span>
            </button>
            <button
              onClick={() => { setActiveTabMode('campus'); setSourceFilter('All'); }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTabMode === 'campus'
                  ? 'bg-purple-600 text-white font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Campus MoUs
            </button>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
            {['All', 'Internship', 'Full-Time'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterType === t
                    ? 'bg-white text-blue-700 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Min Match Dropdown */}
          <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <span>Min Match:</span>
            <select
              value={minMatch}
              onChange={(e) => setMinMatch(Number(e.target.value))}
              className="bg-transparent font-bold text-blue-700 focus:outline-none"
            >
              <option value={0}>All Matches</option>
              <option value={60}>&gt; 60%</option>
              <option value={75}>&gt; 75% (High Match)</option>
              <option value={85}>&gt; 85% (Top Tier)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredJobs.length === 0 && (
          <div className="col-span-full premium-card p-12 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gold-500/10 border border-gold-500/25 flex items-center justify-center">
              <Search className="w-6 h-6 text-gold-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">No opportunities match your filters</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              {activeTabMode === 'shortlisted'
                ? 'Your shortlist is empty — tap the bookmark on any opportunity to save it here.'
                : activeTabMode === 'applied'
                ? 'No applications yet. Mark a match as “Applied” to start tracking your placement pipeline.'
                : 'Try widening your search terms, lowering the minimum match score, or fetching fresh live postings.'}
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setMinMatch(0);
                setFilterType('All');
                setSourceFilter('All');
                if (activeTabMode === 'shortlisted' || activeTabMode === 'applied') setActiveTabMode('all');
              }}
              className="mt-5 px-4 py-2 bg-ink-900 hover:bg-ink-800 text-gold-400 rounded-xl text-xs font-bold transition-all"
            >
              Reset all filters
            </button>
          </div>
        )}
        {filteredJobs.map((job) => {
          const match = job.matchResult;
          const isHighMatch = match.matchScore >= 80;

          return (
            <div
              key={job.id}
              className="premium-card p-6 flex flex-col justify-between group"
            >
              <div>
                {/* Header: Company, Role & Match Score */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={job.companyLogo}
                      alt={job.company}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-100 shadow-xs group-hover:scale-105 transition-transform"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-slate-900 leading-snug">{job.title}</h2>
                      </div>
                      <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 mt-0.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <span>{job.company}</span>
                      </p>
                    </div>
                  </div>

                  {/* Shortlist Bookmark Button & AI Match Gauge */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleShortlist(job.id);
                      }}
                      className={`p-2 rounded-xl border transition-all ${
                        job.isShortlisted
                          ? 'bg-amber-50 border-amber-300 text-amber-500 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-amber-500 hover:bg-amber-50/50'
                      }`}
                      title={job.isShortlisted ? 'Remove from Shortlist' : 'Shortlist Opportunity'}
                    >
                      <Bookmark className={`w-4 h-4 ${job.isShortlisted ? 'fill-amber-500' : ''}`} />
                    </button>

                    <div className={`px-3 py-1.5 rounded-xl text-center border ${
                      isHighMatch
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : match.matchScore >= 65
                        ? 'bg-blue-50 border-blue-200 text-blue-800'
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}>
                      <div className="flex items-center gap-1 text-xs font-extrabold justify-center">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>{match.matchScore}%</span>
                      </div>
                      <p className="text-[9px] font-bold uppercase tracking-wider">
                        {isHighMatch ? 'High Match' : 'Skill Alignment'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Location, Salary, Source & Workplace Tags */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 mb-3">
                  {job.sourcePlatform === 'LinkedIn' ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0A66C2]/10 text-[#0A66C2] font-bold border border-[#0A66C2]/20">
                      <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                      </svg>
                      <span>LinkedIn</span>
                    </span>
                  ) : job.sourcePlatform === 'Adzuna' ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                      <Radio className="w-3 h-3" />
                      <span>Adzuna Live</span>
                    </span>
                  ) : job.sourcePlatform === 'Google Jobs' ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-200">
                      <Globe className="w-3 h-3" />
                      <span>Google Jobs</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold border border-purple-200">
                      <span>Campus Direct</span>
                    </span>
                  )}

                  {/* Freshness stamp for live-synced listings */}
                  {(() => {
                    const f = freshnessLabel(job.fetchedAt);
                    if (!f) return null;
                    return (
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold border ${
                        f.fresh
                          ? 'bg-emerald-50/70 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        <Clock className="w-3 h-3" />
                        <span>{f.text}</span>
                      </span>
                    );
                  })()}

                  {job.workplaceType && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 font-medium text-slate-700">
                      {job.workplaceType}
                    </span>
                  )}

                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 font-medium">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{job.location}</span>
                  </span>

                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/60">
                    <IndianRupee className="w-3 h-3 text-emerald-600" />
                    <span>{job.stipendOrSalary}</span>
                  </span>

                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold">
                    {job.type} {job.duration ? `(${job.duration})` : ''}
                  </span>

                  {(job.status === 'closed' || job.status === 'filled') && (
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-bold border ${
                      job.status === 'filled'
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>
                      {job.status === 'filled' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      <span>{job.status === 'filled' ? 'Position Filled' : 'Closed'}</span>
                    </span>
                  )}
                </div>

                {(job.status === 'closed' || job.status === 'filled') && (
                  <div className="mb-3 px-3 py-2.5 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-2 text-[11px] text-slate-600">
                    <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {job.status === 'filled'
                        ? 'This position has been filled — keep it in view for similar roles from this recruiter.'
                        : 'This posting is no longer accepting applications. Explore similar open roles below.'}
                    </span>
                  </div>
                )}

                {/* Salary Benchmark Insights — computed per-job for India city tiers */}
                {(() => {
                  const bench = getSalaryBenchmark(job.stipendOrSalary, job.company);
                  if (!bench) return null;
                  return (
                    <div className="mb-3 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <TrendingUp className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="font-semibold text-slate-700">Salary Benchmark:</span>
                        <span className="text-slate-500">
                          Median: {bench.percentile50} • 90th %ile: {bench.percentile90}
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100/80 text-emerald-800 font-bold">
                        {bench.positionText}
                      </span>
                    </div>
                  );
                })()}

                {/* Deadline countdown with urgency tiers */}
                {(() => {
                  const dl = getDeadlineInfo(job.deadline);
                  if (dl.urgency === 'rolling') return null;
                  return (
                    <div className="mb-3 flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] ${dl.badgeClass}`}>
                        <Clock className="w-3.5 h-3.5" />
                        <span>{dl.label}</span>
                      </span>
                      {(dl.urgency === 'critical' || dl.urgency === 'closed') && (
                        <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">
                          Act now — apply before {formatDisplayDate(job.deadline)}
                        </span>
                      )}
                    </div>
                  );
                })()}

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
                  {job.description}
                </p>

                {/* Skill Match Breakdown Tags */}
                <div className="space-y-2 mb-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Competency Breakdown
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {match.matchedSkills.map((s, idx) => (
                      <span
                        key={idx}
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1 ${
                          s.status === 'strong'
                            ? 'bg-emerald-100/70 text-emerald-800 border border-emerald-200'
                            : s.status === 'acceptable'
                            ? 'bg-amber-100/70 text-amber-800 border border-amber-200'
                            : 'bg-rose-100/70 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {s.status === 'strong' ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
                        <span>{s.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons: LinkedIn Search & Interactive Applied Checkbox */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-[10px] text-slate-400">
                  <span>Min CGPA: <strong>{job.minCgpa}</strong></span> • <span>Deadline: {formatDisplayDate(job.deadline)}</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Open with Prefilled Cover Note Button */}
                  <button
                    onClick={() => {
                      setSelectedJobForCoverNote(job);
                      setCopiedCoverNote(false);
                    }}
                    className="px-2.5 py-2 bg-slate-100 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 text-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 border border-slate-200"
                    title="Generate personalized pitch / cover note prefilled with verified skills"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    <span className="hidden sm:inline">Cover Note</span>
                  </button>

                  {job.externalUrl && (
                    <a
                      href={job.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-slate-100 hover:bg-[#0A66C2]/10 hover:text-[#0A66C2] text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-200/80"
                      title="View live search or listing on LinkedIn"
                    >
                      <svg className="w-3.5 h-3.5 fill-current text-[#0A66C2]" viewBox="0 0 24 24">
                        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                      </svg>
                      <span>LinkedIn</span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </a>
                  )}

                  {/* Interactive Checkbox with "Applied" text */}
                  <label
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all select-none shadow-xs ${
                      (job.status === 'closed' || job.status === 'filled') && !job.hasApplied
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : job.hasApplied
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-500/20 cursor-pointer'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50/70 hover:border-blue-300 cursor-pointer'
                    }`}
                    title={
                      job.status === 'closed' && !job.hasApplied
                        ? 'This posting is closed — applications are no longer accepted'
                        : job.status === 'filled' && !job.hasApplied
                        ? 'This position has been filled'
                        : job.hasApplied
                        ? 'Click to unmark application'
                        : 'Check to mark this job as applied'
                    }
                  >
                    <input
                      type="checkbox"
                      checked={job.hasApplied}
                      disabled={(job.status === 'closed' || job.status === 'filled') && !job.hasApplied}
                      onChange={(e) => {
                        if (e.target.checked) {
                          applyForJob(job.id, job);
                        } else {
                          withdrawApplication(job.id);
                        }
                      }}
                      className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer accent-emerald-600 disabled:cursor-not-allowed"
                    />
                    <span className="flex items-center gap-1">
                      {job.hasApplied ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                          <span>Applied</span>
                        </>
                      ) : (
                        <span>Mark as Applied</span>
                      )}
                    </span>
                  </label>

                  {/* Scorecard Attach Trigger if Applied */}
                  {job.hasApplied && (
                    <button
                      onClick={() => setAttachingJobId(job.id)}
                      className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl border border-blue-200 text-xs font-semibold transition-all"
                      title="Attach AI Verified Scorecard & Digital Resume to this job application"
                    >
                      <UploadCloud className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: LinkedIn Prefilled Cover Note Generator */}
      {selectedJobForCoverNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#0A66C2]/15 text-[#0A66C2] flex items-center justify-center font-bold">
                  in
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Prefilled LinkedIn Note & Pitch</h3>
                  <p className="text-[11px] text-slate-500">{selectedJobForCoverNote.title} • {selectedJobForCoverNote.company}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedJobForCoverNote(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Personalized pitch tailored with your verified competencies, assessment score, and portfolio links. Ready to paste directly into LinkedIn InMail, recruiter DM, or Easy Apply cover message:
            </p>

            {/* Note text box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono text-slate-800 leading-relaxed whitespace-pre-line select-all">
              {`Hi ${selectedJobForCoverNote.company} Talent Team,

I'm reaching out regarding the ${selectedJobForCoverNote.title} role in ${selectedJobForCoverNote.location}. 

As a candidate from ${student?.college || 'National Engineering Institution'} with a verified ${student?.readinessScore || 85}% S.P.A.R.K. industry readiness score, my core verified competencies directly align with your requirements:
• Core Focus: ${(student?.verifiedSkills || []).slice(0, 3).map(s => s.skill).join(', ') || 'Cloud & Full Stack Architecture'}
• AI Assessed Score: ${student?.readinessScore || 85}% Industry Benchmark
• GitHub Telemetry: ${student?.githubUrl || 'https://github.com/spark-candidate'}
• Verified Skill Passport: https://spark-verify.ac.in/passport/${student?.id || 'stu-01'}

I'd welcome the opportunity to connect and discuss how my hands-on experience can contribute to ${selectedJobForCoverNote.company}'s engineering team.

Best regards,
${student?.name || 'Candidate'}`}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400">
                Tip: Copy and paste into LinkedIn connection requests or Easy Apply.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const text = `Hi ${selectedJobForCoverNote.company} Talent Team,\n\nI'm reaching out regarding the ${selectedJobForCoverNote.title} role in ${selectedJobForCoverNote.location}.\n\nAs a candidate from ${student?.college || 'National Engineering Institution'} with a verified ${student?.readinessScore || 85}% S.P.A.R.K. industry readiness score, my core verified competencies directly align with your requirements:\n• Core Focus: ${(student?.verifiedSkills || []).slice(0, 3).map(s => s.skill).join(', ') || 'Cloud & Full Stack Architecture'}\n• AI Assessed Score: ${student?.readinessScore || 85}% Industry Benchmark\n• GitHub Telemetry: ${student?.githubUrl || 'https://github.com/spark-candidate'}\n• Verified Skill Passport: https://spark-verify.ac.in/passport/${student?.id || 'stu-01'}\n\nI'd welcome the opportunity to connect and discuss how my hands-on experience can contribute to ${selectedJobForCoverNote.company}'s engineering team.\n\nBest regards,\n${student?.name || 'Candidate'}`;
                    navigator.clipboard.writeText(text);
                    setCopiedCoverNote(true);
                    setTimeout(() => setCopiedCoverNote(false), 2500);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                >
                  {copiedCoverNote ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCoverNote ? 'Copied to Clipboard!' : 'Copy Cover Note'}</span>
                </button>
                {selectedJobForCoverNote.externalUrl && (
                  <a
                    href={selectedJobForCoverNote.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-[#0A66C2] hover:bg-[#004182] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <span>Open LinkedIn</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Attach Scorecard & Resume Link */}
      {attachingJobId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Attach Credentials to Application</h3>
              </div>
              <button
                onClick={() => setAttachingJobId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={attachScorecard}
                  onChange={(e) => setAttachScorecard(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span>Attach AI Verified Competency Scorecard ({student?.readinessScore}% Verified)</span>
              </label>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Verified Skill Passport / Digital Resume Link
                </label>
                <input
                  type="text"
                  value={customResumeUrl}
                  onChange={(e) => setCustomResumeUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setAttachingJobId(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const existingApp = applications.find(a => a.jobId === attachingJobId && a.studentId === student.id);
                  if (existingApp) {
                    try {
                      const api = (await import('../../services/api')).api;
                      await api.updateApplicationStatus(
                        existingApp.id,
                        existingApp.status,
                        'Attached verified digital credentials',
                        attachScorecard ? `https://spark-verify.ac.in/scorecard/${student.id}` : undefined,
                        customResumeUrl
                      );
                    } catch (e) {}
                  }
                  setAttachingJobId(null);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                Save & Attach
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
