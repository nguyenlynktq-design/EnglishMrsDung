
import React, { useState, useRef, useEffect } from 'react';
import { PresentationScript, SpeechEvaluation } from '../types';
import { evaluateSpeech, playGeminiTTS } from '../services/geminiService';
import { toPng } from 'html-to-image';

interface PresentationScriptProps { script: PresentationScript; studentName?: string; }

export const PresentationScriptView: React.FC<PresentationScriptProps> = ({ script, studentName }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [evaluation, setEvaluation] = useState<SpeechEvaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const certRef = useRef<HTMLDivElement>(null);

  const fullEnglishText = `${script.introduction.english} ${script.body.map(b => b.script).join(' ')} ${script.conclusion.english}`;

  useEffect(() => {
    const now = new Date();
    const formatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setCurrentTime(formatted);
  }, [showCertificate]);

  const handlePlayModel = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    try {
      await playGeminiTTS(fullEnglishText);
    } catch (e) {
      console.error(e);
    } finally {
      setIsPlaying(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (ev) => { if (ev.data.size > 0) audioChunksRef.current.push(ev.data); };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        handleSpeechEvaluation(audioBlob);
      };
      mediaRecorder.start();
      setIsRecording(true); 
      setEvaluation(null);
    } catch (err) { alert("Bé hãy bật Micro nhé!"); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop(); 
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
  };

  const handleSpeechEvaluation = async (blob: Blob) => {
    setIsEvaluating(true);
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
      const base64Audio = (reader.result as string).split(',')[1];
      try {
        const result = await evaluateSpeech(base64Audio);
        setEvaluation(result);
      } catch (e) { alert("Lỗi chấm điểm!"); } finally { setIsEvaluating(false); }
    };
  };

  const downloadCert = async () => {
    if (!certRef.current) return;
    try {
      const dataUrl = await toPng(certRef.current, { pixelRatio: 3, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `Speaking-Cert-MrsDung-${studentName || 'Student'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      alert("Lỗi tải chứng nhận!");
    }
  };

  return (
    <div className="mt-12 space-y-12 animate-fade-in">
      <div className="bg-white rounded-[4rem] shadow-2xl border-[15px] border-emerald-50 p-10 md:p-16">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b-4 border-emerald-100 pb-6 gap-4">
          <h3 className="text-3xl font-black text-emerald-800 uppercase tracking-tighter">Bài Nói Mẫu ✨</h3>
          <button onClick={handlePlayModel} disabled={isPlaying} className="bg-emerald-500 text-white px-10 py-4 rounded-full font-black text-xl flex items-center gap-4 hover:bg-emerald-600 shadow-xl transition-all active:scale-95 disabled:opacity-50">
            <span className="text-2xl">{isPlaying ? '⏳' : '🔊'}</span> {isPlaying ? 'ĐANG ĐỌC...' : 'NGHE MẪU (AI KORE)'}
          </button>
        </div>
        <div className="bg-emerald-50/20 p-12 rounded-[3rem] border-2 border-emerald-100 shadow-inner">
           <p className="text-2xl md:text-3xl font-bold leading-relaxed text-slate-800 italic font-display text-justify">{fullEnglishText}</p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-[4rem] p-16 flex flex-col items-center gap-10 border-[15px] border-emerald-50 shadow-2xl relative overflow-hidden">
        <div className="text-center z-10 space-y-4">
          <h4 className="text-5xl font-black text-white uppercase tracking-tighter">🚀 THỬ THÁCH NÓI</h4>
          <p className="text-emerald-400 font-black text-2xl italic">"Bấm Micro để Mrs. Dung chấm điểm cho con nhé!"</p>
        </div>
        <button onClick={isRecording ? stopRecording : startRecording} className={`w-40 h-40 rounded-full flex items-center justify-center shadow-2xl transition-all transform active:scale-90 z-20 border-[8px] border-white/20 ${isRecording ? 'bg-red-600 text-white animate-pulse' : 'bg-emerald-500 text-white'}`}><span className="text-7xl">{isRecording ? '⏹' : '🎤'}</span></button>
        {isEvaluating && <div className="text-emerald-300 font-black text-2xl animate-pulse">Cô Mrs. Dung đang lắng nghe và chấm điểm...</div>}
        {evaluation && (
          <div className="w-full space-y-8 animate-fade-in pt-6 text-center">
            <div className="text-[12rem] font-black text-emerald-400 leading-none drop-shadow-2xl">{evaluation.overallScore.toFixed(1)}</div>
            <button onClick={() => setShowCertificate(true)} className="bg-emerald-400 text-slate-900 px-12 py-5 rounded-[2rem] font-black text-2xl shadow-2xl hover:bg-emerald-300 transform hover:scale-105 transition-all">📜 XEM CHỨNG NHẬN SPEAKING</button>
          </div>
        )}
      </div>

      {showCertificate && evaluation && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-6 overflow-y-auto">
           <button onClick={() => setShowCertificate(false)} className="absolute top-8 right-8 text-white bg-red-600 p-4 rounded-full font-black z-[110] shadow-xl">ĐÓNG</button>
           <div ref={certRef} className="w-[1100px] h-[820px] bg-white border-[40px] border-emerald-50 p-16 flex flex-col items-center relative shadow-2xl shrink-0">
              <div className="absolute inset-4 border-2 border-emerald-200 pointer-events-none opacity-40"></div>
              
              <div className="flex flex-col items-center mb-6">
                <div className="w-24 h-24 bg-emerald-600 rounded-3xl flex items-center justify-center text-white text-5xl mb-4 shadow-xl">
                  <svg viewBox="0 0 100 100" className="w-16 h-16" fill="currentColor"><path d="M50 20c-15 0-25 10-25 25 0 15 10 25 25 25s25-10 25-25c0-15-10-25-25-25zm0 40c-8.3 0-15-6.7-15-15s6.7-15 15-15 15 6.7 15 15-6.7 15-15 15zm25 20H25c-5.5 0-10 4.5-10 10v5h70v-5c0-5.5-4.5-10-10-10z"/></svg>
                </div>
                <h2 className="text-2xl font-black text-emerald-800 uppercase tracking-widest font-sans mb-1">TRUNG TÂM ENGLISH MRS. DUNG</h2>
                <h1 className="text-6xl font-black text-brand-600 uppercase font-display border-b-8 border-brand-100 pb-2">SUCCESS WITH MRS. DUNG</h1>
              </div>

              <p className="text-2xl font-bold text-slate-400 mb-6 uppercase tracking-widest">CERTIFICATE OF EXCELLENCE AWARDED TO</p>
              <h3 className="text-8xl font-black text-slate-800 border-b-4 border-emerald-500 px-12 pb-2 mb-10">{studentName || "Ngôi Sao Nhí"}</h3>
              
              <div className="grid grid-cols-2 gap-12 w-full max-w-4xl mb-12 bg-emerald-50/50 p-10 rounded-[3rem] border-4 border-white shadow-inner">
                 <div className="flex flex-col items-center border-r-4 border-white pr-6">
                    <p className="text-sm font-black text-slate-400 uppercase mb-4 tracking-widest">THANG ĐIỂM HỆ 10</p>
                    <p className="text-[10rem] font-black text-emerald-600 leading-none drop-shadow-xl">{evaluation.overallScore.toFixed(1)}</p>
                 </div>
                 <div className="flex flex-col justify-center pl-6 text-left space-y-4">
                    <p className="text-xl font-bold text-slate-600 italic">"Con đã hoàn thành bài thuyết trình một cách tuyệt vời! Phát âm chuẩn, ngữ điệu tự nhiên và phong thái rất tự tin. Mrs. Dung tự hào về con!"</p>
                    <div className="bg-white p-4 rounded-2xl border-2 border-emerald-100">
                      <p className="text-sm font-black text-emerald-500 uppercase">Ngày luyện tập:</p>
                      <p className="text-2xl font-black text-slate-700">{currentTime}</p>
                    </div>
                 </div>
              </div>

              <div className="w-full flex justify-between items-end mt-auto px-6">
                 <p className="text-[10px] font-black text-slate-300">CERTIFICATE NO: MS-DUNG-{Date.now()}</p>
                 <div className="text-right">
                    <div className="text-center">
                        <div className="w-24 h-1 px-4 bg-emerald-800 mb-2 ml-auto"></div>
                        <p className="text-2xl font-black text-emerald-800 italic">Mrs. Dung</p>
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Head Teacher</p>
                    </div>
                    <p className="text-[12px] font-black text-slate-400 mt-4 tracking-tighter">{currentTime}</p>
                 </div>
              </div>
           </div>
           <button onClick={downloadCert} className="mt-12 bg-emerald-500 text-white px-16 py-6 rounded-[2.5rem] font-black text-3xl shadow-2xl hover:scale-105 active:scale-95 transition-all uppercase tracking-tighter">💾 TẢI CHỨNG NHẬN NGAY</button>
        </div>
      )}
    </div>
  );
};
