
import React, { useState, useEffect } from 'react';
import { generateLessonPlan, fileToBase64 } from './services/geminiService';
import { LessonPlan, CEFRLevel } from './types';
import { VocabularySection } from './components/VocabularySection';
import { MegaChallenge } from './components/MegaChallenge';
import { UploadZone } from './components/UploadZone';
import { LessonCertificate } from './components/LessonCertificate';

const MrsDungLogo = ({ className = "w-16 h-16", color = "currentColor" }) => (
  <div className={`relative ${className} flex items-center justify-center`}>
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <g stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M35 80C25 75 20 62 20 50C20 38 25 25 35 20" />
        {[28, 38, 48, 58, 68].map(y => <path key={`l-${y}`} d={`M20 ${y} L14 ${y-4}`} />)}
        <path d="M65 80C75 75 80 62 80 50C80 38 75 25 65 20" />
        {[28, 38, 48, 58, 68].map(y => <path key={`r-${y}`} d={`M80 ${y} L86 ${y-4}`} />)}
      </g>
      <path d="M50 30C50 30 65 30 70 25C70 45 70 70 50 88C30 70 30 45 30 25C35 30 50 30 50 30Z" fill="white" stroke={color} strokeWidth="1.5" />
      <g fill="#0f172a">
        <circle cx="50" cy="46" r="3" />
        <circle cx="43" cy="48" r="3.5" />
        <circle cx="57" cy="48" r="3.5" />
        <path d="M43 52 C38 52 38 65 43 68 L46 68 V55 L50 55 L50 68 H54 V55 L57 55 V68 L60 68 C65 65 65 52 60 52 H43Z" />
        <path d="M50 40 C50 40 51 39 51 38 C51 37 50.5 36.5 50 36.5 C49.5 36.5 49 37 49 38 C49 39 50 40 50 40Z" fill="#ef4444" />
      </g>
    </svg>
  </div>
);

function App() {
  const [plannerMode, setPlannerMode] = useState<'topic' | 'text' | 'image'>('topic');
  const [topic, setTopic] = useState('');
  const [lessonText, setLessonText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [cefrLevel, setCefrLevel] = useState<CEFRLevel>('Starter (A1)');
  const [loading, setLoading] = useState(false);
  const [lesson, setLesson] = useState<LessonPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [studentName, setStudentName] = useState('');
  const [megaScores, setMegaScores] = useState({ mc: 0, scramble: 0, fill: 0, error: 0, listening: 0, match: 0 });
  const [showCertificate, setShowCertificate] = useState(false);
  
  // API Key State
  const [apiKey, setApiKey] = useState(localStorage.getItem('MRS_DUNG_GEMINI_KEY') || '');
  const [showKeyModal, setShowKeyModal] = useState(false);

  useEffect(() => {
    // Nếu chưa có key thì bắt buộc hiện modal
    if (!apiKey) {
      setShowKeyModal(true);
    }
  }, [apiKey]);

  const saveApiKey = (key: string) => {
    const cleanKey = key.trim();
    localStorage.setItem('MRS_DUNG_GEMINI_KEY', cleanKey);
    setApiKey(cleanKey);
    setShowKeyModal(false);
    window.location.reload(); // Reload để khởi tạo lại AI instance với key mới
  };

  const resetApp = () => {
    setLesson(null);
    setShowCertificate(false);
    setTopic('');
    setLessonText('');
    setSelectedFiles([]);
    setStudentName('');
    setMegaScores({ mc: 0, scramble: 0, fill: 0, error: 0, listening: 0, match: 0 });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalCorrectCount = (megaScores.mc || 0) + 
                         (megaScores.fill || 0) + 
                         (megaScores.error || 0) +
                         (megaScores.scramble || 0) +
                         (megaScores.listening || 0);

  const calculateTotalScore = () => {
      return Math.round((totalCorrectCount / 50) * 10 * 10) / 10;
  };

  const getEvaluation = (score: number) => {
      const s = score || 0;
      if (s >= 9) return { text: "XUẤT SẮC", emoji: "🏆", level: "EXCELLENT", praise: "Con là một ngôi sao sáng nhất lớp Mrs. Dung!" };
      if (s >= 7) return { text: "KHÁ GIỎI", emoji: "🌟", level: "GREAT JOB", praise: "Con làm bài rất tuyệt vời, tiếp tục phát huy nhé!" };
      if (s >= 5) return { text: "CỐ GẮNG", emoji: "👍", level: "GOOD EFFORT", praise: "Con đã nỗ lực rất nhiều, Mrs. Dung tự hào về con!" };
      return { text: "CẦN NỖ LỰC", emoji: "💪", level: "KEEP IT UP", praise: "Đừng nản lòng con nhé, bài sau mình làm tốt hơn nào!" };
  };

  const handleGenerate = async () => {
    if (!apiKey) { setShowKeyModal(true); return; }
    if (plannerMode === 'topic' && !topic.trim()) { setError("Hãy nhập chủ đề bài học con nhé!"); return; }
    if (plannerMode === 'text' && !lessonText.trim()) { setError("Hãy dán nội dung bài học vào đây!"); return; }
    if (plannerMode === 'image' && selectedFiles.length === 0) { setError("Hãy chọn ít nhất một tấm ảnh tài liệu!"); return; }
    setLoading(true); setError(null); setLesson(null); setShowCertificate(false);
    try {
      let base64Images: string[] = [];
      if (plannerMode === 'image' && selectedFiles.length > 0) {
          base64Images = await Promise.all(selectedFiles.map(file => fileToBase64(file)));
      }
      const data = await generateLessonPlan(
          plannerMode === 'topic' ? topic : undefined,
          plannerMode === 'text' ? lessonText : undefined,
          base64Images,
          cefrLevel
      );
      setLesson(data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) { 
        setError(err.message || "Lỗi khi soạn bài, con hãy thử lại nhé!"); 
    } finally { setLoading(false); }
  };

  const totalScore = calculateTotalScore();
  const evaluation = getEvaluation(totalScore);

  return (
    <div className="min-h-screen bg-brand-50 flex flex-col font-serif text-slate-900 overflow-x-hidden">
      {/* Header Bar */}
      <div className="bg-brand-900 text-white py-2 px-4 md:px-6 flex justify-between items-center text-[10px] md:text-sm font-black uppercase tracking-widest border-b-2 border-highlight-400 sticky top-0 z-[100] shadow-xl">
        <div className="flex gap-4 md:gap-10 overflow-x-auto scrollbar-hide shrink-0">
          <a href="https://ai.studio/apps/drive/16nC5BYZ93wiF2mRZdrfeIVuG_sR7VxM1?fullscreenApplet=true" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-highlight-300 transition-all hover:scale-105 group">
            <span className="text-lg md:text-xl group-hover:rotate-12 transition-transform">✨</span> Magic story
          </a>
          <a href="https://www.tienganhchotreem.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-highlight-300 transition-all hover:scale-105 group">
            <span className="text-lg md:text-xl group-hover:rotate-12 transition-transform">📚</span> Bộ truyện hay
          </a>
        </div>
        
        {/* API Key Settings Button - ALWAYS VISIBLE */}
        <div className="flex items-center gap-2 shrink-0">
           <span className="hidden md:inline text-red-500 font-bold text-[11px] animate-pulse">Lấy API key để sử dụng app ➜</span>
           <button 
             onClick={() => setShowKeyModal(true)} 
             className={`flex items-center gap-1 md:gap-2 px-3 md:px-5 py-1.5 rounded-full font-black text-[10px] md:text-xs transition-all border-2 shadow-lg ${apiKey ? 'bg-brand-700 border-brand-500 text-brand-100' : 'bg-red-600 border-white text-white animate-bounce'}`}
           >
             <span>⚙️</span> SETTINGS (API KEY)
           </button>
        </div>
      </div>

      <header className="bg-brand-700 border-b-4 md:border-b-8 border-brand-800 sticky top-[40px] md:top-[44px] z-50 shadow-2xl">
        <div className="max-w-[1800px] mx-auto px-4 md:px-6 h-20 md:h-28 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-6 cursor-pointer" onClick={resetApp}>
            <MrsDungLogo className="w-12 h-12 md:w-20 md:h-20 bg-white rounded-2xl md:rounded-3xl p-1 md:p-2 shadow-2xl" color="#16a34a" />
            <div className="flex flex-col">
              <h1 className="text-xl md:text-5xl font-black text-highlight-400 uppercase tracking-tighter font-display leading-none">ENGLISH MRS. DUNG</h1>
              <span className="text-[10px] md:text-sm font-black text-white uppercase tracking-[0.2em] md:tracking-[0.4em] opacity-90 mt-1 font-sans">English with Heart</span>
            </div>
          </div>
        </div>
      </header>

      {/* API Key Mandatory Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-[200] bg-brand-900/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-12 max-w-lg w-full shadow-2xl border-[10px] border-brand-100 ring-4 ring-white animate-bounce-in">
             <div className="text-center mb-8">
                <div className="w-20 h-20 bg-brand-50 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4 border-2 border-brand-200">🔑</div>
                <h3 className="text-2xl md:text-3xl font-black text-brand-800 uppercase tracking-tighter mb-2">Cài đặt Gemini API Key</h3>
                <p className="text-slate-500 font-bold leading-relaxed">Để Mrs. Dung có thể soạn bài, con hãy nhập mã API Key của mình vào đây nhé!</p>
             </div>
             
             <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-100">
                   <p className="text-blue-700 text-sm font-bold flex items-start gap-2">
                     <span>ℹ️</span>
                     <span>Con vào trang <b><a href="https://aistudio.google.com/api-keys" target="_blank" className="underline text-blue-800">Google AI Studio</a></b> để lấy mã Key miễn phí nhé!</span>
                   </p>
                </div>
                
                <div className="space-y-2">
                   <label className="text-xs font-black text-brand-700 uppercase tracking-widest pl-2">Mã API Key của con:</label>
                   <input 
                      type="password" 
                      defaultValue={apiKey}
                      placeholder="Dán mã API Key tại đây..." 
                      className="w-full p-4 rounded-2xl border-4 border-brand-50 bg-brand-50/50 font-mono text-sm focus:border-brand-500 outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveApiKey((e.target as HTMLInputElement).value);
                      }}
                      id="key-input"
                   />
                </div>
                
                <div className="flex gap-3 pt-4">
                   <button 
                     onClick={() => setShowKeyModal(false)}
                     className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-sm uppercase hover:bg-slate-200"
                   >
                     Đóng
                   </button>
                   <button 
                     onClick={() => {
                        const val = (document.getElementById('key-input') as HTMLInputElement).value;
                        saveApiKey(val);
                     }}
                     className="flex-[2] py-4 bg-brand-500 text-white rounded-2xl font-black text-xl shadow-xl hover:bg-brand-600 transition-all border-b-8 border-brand-700 active:border-b-0 uppercase"
                   >
                     🚀 Lưu & Bắt đầu
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      <main className="max-w-[1800px] mx-auto px-4 md:px-6 py-8 md:py-16 flex-grow w-full relative">
        <div className="space-y-12 md:space-y-24">
           {!lesson ? (
             <div className="bg-white rounded-[2.5rem] md:rounded-[4rem] shadow-2xl border-b-[10px] md:border-b-[20px] border-r-[10px] md:border-r-[20px] border-brand-100 p-6 md:p-24 max-w-5xl mx-auto animate-fade-in text-center relative overflow-hidden ring-4 md:ring-8 ring-white">
                <div className="absolute top-0 left-0 w-full h-2 md:h-4 bg-brand-500"></div>
                <MrsDungLogo className="w-32 h-32 md:w-56 md:h-56 mx-auto mb-6 md:mb-12 drop-shadow-2xl" color="#15803d" />
                <h2 className="text-2xl md:text-5xl font-black text-brand-800 mb-2 md:mb-4 uppercase tracking-tighter font-display">Chuyên gia soạn thảo giáo án Mrs. Dung</h2>
                
                <div className="space-y-8 md:space-y-12 text-left">
                   <div className="space-y-3 md:space-y-4">
                     <p className="text-brand-700 font-black uppercase tracking-widest text-[10px] md:text-sm px-2">1. Chọn trình độ tiêu chuẩn</p>
                     <div className="flex flex-col md:flex-row bg-slate-100 p-2 rounded-3xl md:rounded-[2rem] gap-2 shadow-inner">
                        {(['Starter (A1)', 'Elementary (A2)', 'Intermediate (B1)'] as CEFRLevel[]).map(lvl => (
                          <button key={lvl} onClick={() => setCefrLevel(lvl)} className={`flex-1 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-sm md:text-lg transition-all ${cefrLevel === lvl ? 'bg-brand-600 text-white shadow-xl scale-[1.02] md:scale-105' : 'text-slate-500 hover:bg-white'}`}>
                            {lvl}
                          </button>
                        ))}
                     </div>
                   </div>

                   <div className="space-y-3 md:space-y-4">
                    <p className="text-brand-700 font-black uppercase tracking-widest text-[10px] md:text-sm px-2">2. Chọn nguồn tài liệu</p>
                    <div className="flex bg-slate-100 p-2 md:p-3 rounded-3xl md:rounded-[2rem] gap-2 md:gap-3 shadow-inner">
                        {[{ id: 'topic', label: 'Chủ đề', icon: '💡' }, { id: 'text', label: 'Văn bản', icon: '📝' }, { id: 'image', label: 'Hình ảnh', icon: '📸' }].map(m => (
                          <button key={m.id} onClick={() => { setPlannerMode(m.id as any); setTopic(''); setLessonText(''); setSelectedFiles([]); setError(null); }} className={`flex-1 py-3 md:py-5 rounded-xl md:rounded-2xl font-black text-xs md:text-xl flex items-center justify-center gap-1 md:gap-3 transition-all ${plannerMode === m.id ? 'bg-brand-500 text-white shadow-2xl scale-[1.02] md:scale-105' : 'text-slate-500 hover:bg-white'}`}>{m.icon} {m.label}</button>
                        ))}
                    </div>
                   </div>

                   <div className="min-h-[150px] md:min-h-[250px]">
                      {plannerMode === 'topic' && <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Nhập chủ đề bài học..." className="w-full p-5 md:p-8 text-xl md:text-4xl rounded-2xl md:rounded-[2.5rem] border-4 md:border-8 border-brand-50 font-black bg-brand-50/50 outline-none text-brand-900" />}
                      {plannerMode === 'text' && <textarea value={lessonText} onChange={e => setLessonText(e.target.value)} placeholder="Dán văn bản bài học của con vào đây..." rows={6} className="w-full p-5 md:p-8 text-lg md:text-2xl rounded-2xl md:rounded-[2.5rem] border-4 md:border-8 border-brand-50 bg-brand-50/50 resize-none font-black text-slate-700 outline-none" />}
                      {plannerMode === 'image' && <UploadZone onFilesSelect={setSelectedFiles} isLoading={loading} fileCount={selectedFiles.length} />}
                   </div>
                   
                   <button onClick={handleGenerate} disabled={loading} className="w-full py-6 md:py-10 bg-brand-500 border-b-[8px] md:border-b-[15px] border-brand-700 text-white rounded-[2rem] md:rounded-[3rem] font-black text-xl md:text-4xl shadow-2xl transform active:translate-y-2 md:active:translate-y-6 active:border-b-0 uppercase tracking-tighter">
                      {loading ? 'ĐANG PHÂN TÍCH VÀ SOẠN BÀI...' : '🚀 BẮT ĐẦU SOẠN BÀI'}
                   </button>
                   {error && <div className="p-4 md:p-8 bg-red-50 border-2 md:border-4 border-red-200 rounded-2xl md:rounded-[2rem] text-red-600 font-black text-lg md:text-2xl text-center animate-bounce shadow-xl">⚠️ {error}</div>}
                </div>
             </div>
           ) : (
             <div className="space-y-12 md:space-y-24 animate-fade-in max-w-full">
                {/* Phần hiển thị bài học - đã có trong App.tsx hiện tại */}
                <div className="text-center relative py-8 md:py-12 bg-white rounded-3xl md:rounded-[5rem] shadow-2xl border-2 md:border-4 border-brand-50 ring-4 md:ring-8 ring-white overflow-hidden px-4">
                   <div className="md:absolute md:top-4 md:right-10 inline-block mb-4 md:mb-0 bg-brand-100 text-brand-700 px-4 py-1.5 rounded-full font-black text-[10px] md:text-sm uppercase tracking-widest border-2 border-brand-200">{cefrLevel}</div>
                   <h1 className="text-3xl md:text-8xl font-black text-brand-800 uppercase font-display mb-4 md:mb-8 leading-tight">{lesson.topic}</h1>
                   <div className="flex flex-col items-center gap-3 md:gap-6">
                      <label className="text-brand-600 font-black uppercase tracking-widest md:tracking-[0.3em] text-sm md:text-xl font-sans">Chào mừng con:</label>
                      <input type="text" placeholder="Nhập tên của con nhé..." value={studentName} onChange={e => setStudentName(e.target.value)} className="p-4 md:p-6 w-full max-w-2xl rounded-2xl md:rounded-[2.5rem] border-4 md:border-8 border-brand-50 font-black text-xl md:text-4xl text-center outline-none bg-brand-50/50" />
                   </div>
                </div>

                <div className="bg-white p-6 md:p-12 rounded-3xl md:rounded-[5rem] shadow-2xl border-4 md:border-8 border-brand-50">
                  <VocabularySection items={lesson.vocabulary} />
                </div>

                <div className="bg-highlight-400 p-6 md:p-14 rounded-3xl md:rounded-[4rem] shadow-2xl border-[6px] md:border-[10px] border-white ring-2 md:ring-4 ring-highlight-300 transform md:-rotate-1">
                   <h2 className="text-3xl md:text-5xl font-black text-brand-900 uppercase tracking-tighter mb-4 md:mb-8 flex items-center gap-2 md:gap-4">
                      <span className="bg-white/40 p-2 md:p-5 rounded-xl md:rounded-[2.5rem] shadow-inner text-2xl md:text-5xl">✨</span> NGỮ PHÁP QUAN TRỌNG
                   </h2>
                   <div className="bg-white/90 backdrop-blur-md p-8 md:p-16 rounded-2xl md:rounded-[4rem] shadow-2xl border md:border-4 border-white">
                      <h3 className="text-2xl md:text-4xl font-black text-brand-700 mb-4 md:mb-10 underline decoration-highlight-400 decoration-4 md:decoration-8 underline-offset-4 md:underline-offset-[14px] uppercase tracking-tight">{lesson.grammar?.topic}</h3>
                      <p className="text-xl md:text-3xl font-black text-slate-800 leading-relaxed italic mb-8 md:mb-12 border-l-[8px] md:border-l-[16px] border-brand-500 pl-6 md:pl-12">{lesson.grammar?.explanation}</p>
                      
                      {lesson.grammar?.examples && lesson.grammar.examples.length > 0 && (
                        <div className="mt-8 md:mt-12 pt-8 md:pt-12 border-t-4 md:border-t-8 border-slate-100 space-y-4 md:space-y-6">
                           {lesson.grammar.examples.map((ex, i) => (
                             <div key={i} className="flex items-center gap-4 md:gap-6 text-lg md:text-2xl font-bold text-slate-600 bg-slate-50 p-4 md:p-8 rounded-xl md:rounded-[2rem] shadow-sm">
                               <span className="text-brand-500 text-xl md:text-4xl">➜</span> {ex}
                             </div>
                           ))}
                        </div>
                      )}
                   </div>
                </div>
                
                {lesson.practice?.megaTest && <MegaChallenge megaData={lesson.practice.megaTest} onScoresUpdate={setMegaScores} />}

                <div className="text-center py-16 md:py-32 bg-white rounded-3xl md:rounded-[5rem] shadow-2xl border-4 md:border-8 border-brand-100 flex flex-col items-center gap-6 md:gap-12 relative overflow-hidden px-4">
                    <MrsDungLogo className="w-24 h-24 md:w-48 md:h-48 drop-shadow-2xl animate-bounce-slow" color="#15803d" />
                    <div className="flex flex-col items-center gap-3 md:gap-4">
                        <div className="flex items-baseline gap-2 md:gap-4">
                            <span className="text-[6rem] md:text-[15rem] font-black text-brand-600 leading-none drop-shadow-2xl">{totalScore}</span>
                            <span className="text-2xl md:text-7xl font-black text-slate-200">/10</span>
                        </div>
                        <div className="text-lg md:text-3xl font-black text-brand-500 bg-brand-50 px-4 md:px-8 py-2 rounded-full mb-2 md:mb-4 shadow-sm">Số câu đúng: <span className="text-brand-700 font-black">{totalCorrectCount}/50</span></div>
                        <div className={`px-6 md:px-12 py-3 md:py-5 rounded-full font-black text-xl md:text-4xl shadow-2xl border-b-[8px] md:border-b-[12px] transform md:rotate-[-2deg] ${totalScore >= 5 ? 'bg-brand-500 text-white border-brand-700' : 'bg-orange-500 text-white border-orange-700'}`}>{evaluation.emoji} {evaluation.text}</div>
                        
                        <button 
                          onClick={() => setShowCertificate(true)} 
                          className="mt-6 md:mt-8 px-8 md:px-16 py-4 md:py-6 bg-emerald-500 text-white rounded-2xl md:rounded-[2.5rem] font-black text-lg md:text-3xl shadow-2xl hover:bg-emerald-400 transform hover:scale-105 transition-all border-b-[8px] md:border-b-[12px] border-emerald-700 active:border-b-0 active:translate-y-2 uppercase tracking-tighter"
                        >
                          📜 CHỨNG NHẬN KẾT QUẢ
                        </button>
                    </div>
                </div>

                {showCertificate && (
                  <LessonCertificate 
                    studentName={studentName}
                    topic={lesson.topic}
                    score={totalScore}
                    totalCorrect={totalCorrectCount}
                    evaluation={evaluation}
                    onClose={() => setShowCertificate(false)}
                  />
                )}

                <div className="bg-brand-800 p-12 md:p-24 rounded-3xl md:rounded-[5rem] shadow-2xl text-center space-y-8 border-t-[10px] border-brand-900">
                    <h3 className="text-2xl md:text-5xl font-black text-highlight-300 uppercase italic">Con muốn soạn bài học mới không?</h3>
                    <button 
                      onClick={resetApp} 
                      className="bg-white text-brand-800 px-12 md:px-24 py-6 md:py-10 rounded-[2rem] md:rounded-[3rem] font-black text-xl md:text-4xl shadow-2xl hover:bg-brand-50 transform hover:-translate-y-2 transition-all border-b-[10px] md:border-b-[20px] border-brand-100 active:translate-y-0 active:border-b-0 uppercase"
                    >
                      🚀 SOẠN BÀI MỚI NGAY
                    </button>
                </div>
             </div>
           )}
        </div>
      </main>

      <footer className="bg-brand-900 text-white border-t-[10px] md:border-t-[20px] border-brand-800 pt-16 md:pt-32 pb-8 md:pb-16 px-4 md:px-6">
         <div className="max-w-[1800px] mx-auto text-center md:text-left">
            <div className="grid md:grid-cols-3 gap-12 md:gap-20 items-start">
               <div className="space-y-6 md:space-y-8 flex flex-col items-center md:items-start text-center md:text-left">
                  <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[3rem] w-fit shadow-2xl border-2 md:border-4 border-highlight-400 cursor-pointer hover:rotate-6 transition-transform" onClick={resetApp}><MrsDungLogo className="w-16 h-16 md:w-32 md:h-32" color="#166534" /></div>
                  <div><h3 className="font-black text-2xl md:text-4xl text-highlight-400 uppercase leading-none font-display">ENGLISH MRS. DUNG</h3><p className="text-brand-100 font-black text-base md:text-xl mt-3 md:mt-4 opacity-90 italic">“English with Heart. Success with Mrs.Dung”</p></div>
               </div>
               <div className="space-y-6 md:space-y-8 text-center md:text-left">
                  <h4 className="font-black text-highlight-400 text-lg md:text-2xl uppercase tracking-widest border-b-2 md:border-b-4 border-white/10 pb-3 md:pb-4 font-sans">Liên Hệ</h4>
                  <ul className="space-y-4 md:space-y-6 font-black text-brand-100 text-sm md:text-xl">
                     <li className="flex items-start gap-2 md:gap-4 justify-center md:justify-start">📍<span>Ngõ 717 Mạc Đăng Doanh, Hải Phòng.</span></li>
                     <li className="flex items-center gap-2 md:gap-4 justify-center md:justify-start">📞<a href="tel:0364409436" className="hover:text-highlight-400 transition-colors">Mrs.Dung: 0364409436</a></li>
                     <li className="flex items-center gap-2 md:gap-4 justify-center md:justify-start">🌐<a href="https://www.facebook.com/profile.php?id=100054264771359" target="_blank" className="hover:text-highlight-400 transition-colors underline decoration-2">Facebook Page</a></li>
                  </ul>
               </div>
               <div className="space-y-6 md:space-y-8 text-center md:text-left">
                  <h4 className="font-black text-highlight-400 text-lg md:text-2xl uppercase tracking-widest border-b-2 md:border-b-4 border-white/10 pb-3 md:pb-4 font-sans">Slogan</h4>
                  <div className="bg-white/5 p-6 md:p-10 rounded-2xl md:rounded-[3rem] border-2 md:border-4 border-white/10 shadow-2xl backdrop-blur-sm">
                    <p className="text-xl md:text-3xl font-black italic text-white mb-3 md:mb-4 leading-tight">“English with Heart. Success with Mrs.Dung”</p>
                    <p className="text-brand-300 font-black text-xs md:text-xl uppercase tracking-widest font-sans">Học Tiếng Anh bằng cả Trái Tim.</p>
                  </div>
               </div>
            </div>
         </div>
      </footer>
    </div>
  );
}
export default App;
