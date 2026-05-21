import { useState, useRef, useEffect } from 'react';

const curriculumData = {
  "Semester VII - ECOMP":  ["Cloud Computing", "Artificial Intelligence", "Big Data"],
  "Semester VIII - ECOMP": ["Machine Learning", "Internet of Things", "Cyber Security"],
  "Semester VI - ECOMP":   ["Microprocessors", "Signal Processing", "Control Systems"],
};

function StatusBadge({ status }) {
  const map = {
    idle:      { label: 'Ready',      cls: 'bg-orange-50 text-orange-600 border-orange-200' },
    recording: { label: '● Live',     cls: 'bg-red-50 text-red-500 border-red-200 font-semibold' },
    paused:    { label: '⏸ Paused',  cls: 'bg-amber-50 text-amber-600 border-amber-200 font-semibold' },
    stopped:   { label: '✓ Saved',   cls: 'bg-green-50 text-green-600 border-green-200 font-semibold' },
  };
  const { label, cls } = map[status] || map.idle;
  return <span className={`px-3 py-1 rounded-full text-xs tracking-wide border ${cls} transition-all duration-300`}>{label}</span>;
}

function CustomSelect({ id, value, onChange, options, disabled, placeholder }) {
  return (
    <div className="relative">
      <select id={id} value={value} onChange={onChange} disabled={disabled}
        className={`w-full appearance-none rounded-xl border px-4 py-3.5 pr-10 text-sm font-medium outline-none transition-all duration-200
          ${disabled ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed' : 'border-slate-200 bg-white text-slate-800 cursor-pointer hover:border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100'}`}>
        <option value="">{placeholder}</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <div className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${disabled ? 'text-slate-300' : 'text-slate-500'}`}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
    </div>
  );
}

function WaveformBars({ paused }) {
  return (
    <span className="flex items-center gap-[3px] h-5">
      {[1,2,3,4,5].map(i => <span key={i} className="wave-bar" style={{ height: '20px', background: paused ? '#f59e0b' : '#ef4444', animationPlayState: paused ? 'paused' : 'running' }} />)}
    </span>
  );
}

function useTimer(active) {
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (active) { ref.current = setInterval(() => setElapsed(s => s + 1), 1000); }
    else { clearInterval(ref.current); }
    return () => clearInterval(ref.current);
  }, [active]);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  return { timer: `${mm}:${ss}`, reset: () => setElapsed(0) };
}

export default function Dashboard({ onLogout }) {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [status, setStatus] = useState('idle');
  const [audioBlob, setAudioBlob] = useState(null);
  const [error, setError] = useState('');
  const [blobSize, setBlobSize] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [recentLectures, setRecentLectures] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  const isRecording = status === 'recording';
  const isPaused = status === 'paused';
  const hasStopped = status === 'stopped';
  const isLive = isRecording || isPaused;
  const { timer, reset: resetTimer } = useTimer(isRecording);
  const subjects = selectedClass ? curriculumData[selectedClass] : [];
  const canRecord = Boolean(selectedClass && selectedSubject);

  function handleClassChange(e) { setSelectedClass(e.target.value); setSelectedSubject(''); setStatus('idle'); setAudioBlob(null); setError(''); }
  function handleSubjectChange(e) { setSelectedSubject(e.target.value); setStatus('idle'); setAudioBlob(null); setError(''); }

  async function handleStartRecording() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream; chunksRef.current = []; resetTimer();
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob); setBlobSize(blob.size); setStatus('stopped');
        stream.getTracks().forEach(t => t.stop());
        setRecentLectures(prev => [{ subject: selectedSubject, className: selectedClass, time: new Date(), size: blob.size }, ...prev]);
        console.log('[Edu Connect] Recording complete.', selectedClass, selectedSubject, blob.size, 'bytes');
      };
      recorder.start(250); setStatus('recording');
    } catch (err) { setError('Microphone access denied. Allow permissions and try again.'); console.error(err); }
  }

  function handlePause() { if (mediaRecorderRef.current?.state === 'recording') { mediaRecorderRef.current.pause(); setStatus('paused'); } }
  function handleResume() { if (mediaRecorderRef.current?.state === 'paused') { mediaRecorderRef.current.resume(); setStatus('recording'); } }
  function handleStop() { if (mediaRecorderRef.current && isLive) { mediaRecorderRef.current.stop(); } }
  function handleNewRecording() { setStatus('idle'); setAudioBlob(null); setBlobSize(0); setError(''); setUploadSuccess(''); setUploading(false); }

  async function handleUpload() {
    if (!audioBlob || !selectedClass || !selectedSubject) return;
    setUploading(true);
    setError('');
    setUploadSuccess('');
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'lecture.webm');
      formData.append('className', selectedClass);
      formData.append('subjectName', selectedSubject);

      const res = await fetch('http://localhost:5000/api/upload-lecture', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      
      setUploadSuccess(`Upload successful! Available in Cloudinary.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* HEADER — orange gradient */}
      <header className="w-full bg-gradient-to-r from-orange-500 to-amber-500 sticky top-0 z-50 shadow-md">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight tracking-tight">Edu Connect</h1>
              <p className="text-xs text-white/70 leading-none">Teacher Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={status} />
            <div className="relative">
              <button onClick={() => setShowMenu(s => !s)} className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white text-xs font-bold hover:bg-white/30 transition cursor-pointer" title="Profile">T</button>
              {showMenu && (
                <>
                  {/* Invisible overlay to close on outside click */}
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  {/* Popup */}
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl shadow-slate-200/60 border border-slate-100 z-50 py-1.5 fade-in-up">
                    {/* Profile info */}
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-800">Teacher</p>
                      <p className="text-xs text-slate-400 truncate">teacher@educonnect.com</p>
                    </div>

                    {/* Recent Lectures */}
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Today's Lectures</p>
                      {recentLectures.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-1">No lectures recorded yet today.</p>
                      ) : (
                        <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                          {recentLectures.map((lec, i) => (
                            <div key={i} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-100">
                              <div className="w-7 h-7 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-700 truncate">{lec.subject}</p>
                                <p className="text-[10px] text-slate-400 truncate">{lec.className}</p>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                {lec.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Logout */}
                    <button
                      onClick={() => { setShowMenu(false); onLogout(); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg flex flex-col gap-5">

          {/* Hero */}
          <div className="text-center mb-2">
            <span className="inline-block px-4 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-600 text-xs font-semibold tracking-wider uppercase mb-3">AI Lecture Studio</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-snug">
              Record your lecture.<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">Let AI handle the rest.</span>
            </h2>
            <p className="mt-2 text-sm text-slate-500">Select your class and subject, then hit record.</p>
          </div>

          {/* SESSION SETUP CARD */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4 flex items-center gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
              <span className="text-white font-semibold text-sm">Session Setup</span>
            </div>
            <div className="px-6 pt-6 pb-5 flex flex-col gap-5">
              {/* Step 1 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold shrink-0">1</span>
                  <span className="text-xs font-semibold text-orange-600 uppercase tracking-wider">Select Class</span>
                </div>
                <CustomSelect id="class-select" value={selectedClass} onChange={handleClassChange} options={Object.keys(curriculumData)} disabled={isLive} placeholder="— Choose a semester —" />
              </div>
              <div className="border-t border-dashed border-slate-100" />
              {/* Step 2 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold shrink-0 transition-colors duration-200 ${selectedClass ? 'bg-orange-500' : 'bg-slate-300'}`}>2</span>
                  <span className={`text-xs font-semibold uppercase tracking-wider transition-colors duration-200 ${selectedClass ? 'text-orange-600' : 'text-slate-400'}`}>Select Subject</span>
                </div>
                <CustomSelect id="subject-select" value={selectedSubject} onChange={handleSubjectChange} options={subjects} disabled={!selectedClass || isLive} placeholder={selectedClass ? '— Choose a subject —' : '— Select class first —'} />
              </div>
              {/* Selection pills */}
              {(selectedClass || selectedSubject) && (
                <div className="flex flex-wrap gap-2 fade-in-up">
                  {selectedClass && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-medium">📚 {selectedClass}</span>}
                  {selectedSubject && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">⭐ {selectedSubject}</span>}
                </div>
              )}
            </div>
          </div>

          {/* RECORDING CARD */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 overflow-hidden">
            <div className={`px-6 py-4 flex items-center gap-3 transition-all duration-500
              ${isRecording ? 'bg-gradient-to-r from-red-500 to-rose-600' : isPaused ? 'bg-gradient-to-r from-amber-500 to-orange-600' : hasStopped ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-slate-700'}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
              </svg>
              <span className="text-white font-semibold text-sm">Recording Controls</span>
              {isLive && (
                <span className="ml-auto flex items-center gap-2 bg-white/20 rounded-full px-3 py-1">
                  <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-white blink-dot' : 'bg-amber-200'}`} />
                  <span className="text-white text-xs font-mono font-bold">{timer}</span>
                  {isPaused && <span className="text-white/70 text-xs">paused</span>}
                </span>
              )}
            </div>
            <div className="px-6 py-6 flex flex-col gap-4">
              {error && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm fade-in-up">
                  <svg className="shrink-0 mt-0.5" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {error}
                </div>
              )}

              {/* IDLE */}
              {status === 'idle' && (
                <>
                  <button id="btn-start-recording" onClick={handleStartRecording} disabled={!canRecord}
                    className={`group w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-base font-bold tracking-wide transition-all duration-200
                      ${canRecord ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-200 hover:shadow-xl hover:shadow-orange-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
                    </svg>
                    Start Lecture Recording
                  </button>
                  {!canRecord && <p className="text-center text-xs text-slate-400">Select both a class and subject to enable recording</p>}
                </>
              )}

              {/* LIVE */}
              {isLive && (
                <div className="flex flex-col gap-3 fade-in-up">
                  <div className="flex items-center justify-center gap-3 py-2">
                    <WaveformBars paused={isPaused} />
                    <span className={`text-sm font-semibold ${isRecording ? 'text-red-500' : 'text-amber-600'}`}>{isRecording ? 'Recording…' : 'Paused'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {isRecording ? (
                      <button id="btn-pause-recording" onClick={handlePause}
                        className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-semibold text-sm bg-amber-50 border border-amber-200 text-amber-600 hover:bg-amber-100 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 cursor-pointer">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                        Pause
                      </button>
                    ) : (
                      <button id="btn-resume-recording" onClick={handleResume}
                        className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-semibold text-sm bg-green-50 border border-green-200 text-green-600 hover:bg-green-100 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 cursor-pointer">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        Resume
                      </button>
                    )}
                    <button id="btn-stop-recording" onClick={handleStop}
                      className="pulse-record flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md shadow-red-200 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 cursor-pointer">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                      Stop
                    </button>
                  </div>
                </div>
              )}

              {/* SUCCESS */}
              {hasStopped && (
                <div className="flex flex-col gap-4 fade-in-up">
                  <div className="flex flex-col items-center text-center gap-4 py-6 px-4">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                      <div className="absolute inset-0 rounded-full border-2 border-green-300/40 scale-110 animate-ping-slow" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Successfully Recorded!</h3>
                      <p className="text-slate-500 text-sm mt-1.5 leading-relaxed">
                        Your lecture on <span className="text-orange-600 font-semibold">{selectedSubject}</span> has been captured.
                      </p>
                    </div>
                    {!uploadSuccess ? (
                      <button onClick={handleUpload} disabled={uploading} className="w-full bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed">
                        <div className="w-8 h-8 rounded-lg bg-blue-200 flex items-center justify-center shrink-0 text-blue-700">
                          {uploading ? (
                            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                          )}
                        </div>
                        <div className="text-left flex-1">
                          <p className="text-blue-800 font-semibold text-sm leading-snug">
                            {uploading ? 'Uploading to Cloud...' : 'Upload to Cloud'}
                          </p>
                          <p className="text-blue-600 text-xs mt-0.5">{(blobSize / 1024).toFixed(1)} KB · audio/webm</p>
                        </div>
                      </button>
                    ) : (
                      <div className="w-full bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-200 flex items-center justify-center shrink-0 text-green-700">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        <div className="text-left flex-1">
                          <p className="text-green-800 font-semibold text-sm leading-snug">Uploaded successfully!</p>
                          <p className="text-green-600 text-xs mt-0.5">Saved to Cloud storage</p>
                        </div>
                      </div>
                    )}
                    <div className="w-full grid grid-cols-2 gap-2">
                      <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-left">
                        <p className="text-slate-400 text-xs mb-0.5">Class</p>
                        <p className="text-orange-700 text-xs font-semibold truncate">{selectedClass}</p>
                      </div>
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-left">
                        <p className="text-slate-400 text-xs mb-0.5">Subject</p>
                        <p className="text-amber-700 text-xs font-semibold truncate">{selectedSubject}</p>
                      </div>
                    </div>
                  </div>
                  <button id="btn-new-recording" onClick={handleNewRecording}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm bg-slate-50 border border-slate-200 text-slate-600 hover:border-orange-300 hover:text-orange-600 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>
                    Record Another Lecture
                  </button>
                </div>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 pb-4">Edu Connect © 2025 · AI-Powered LMS · Final Year Engineering Project</p>
        </div>
      </main>
    </div>
  );
}
