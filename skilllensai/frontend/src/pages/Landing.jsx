import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { Link } from "react-router-dom";
import { 
  ArrowRight, BrainCircuit, GraduationCap, 
  FileText, TrendingUp, Star, Sparkles, 
  Target, Rocket, ShieldCheck, Zap 
} from "lucide-react";

const Landing = () => {
  // Logic for Auto-Scrolling Testimonials
  const [activeReview, setActiveReview] = useState(0);
  const reviews = [
    { motive: "I GOT THE JOB", text: "SkillLens matched my Python skills with a Top-Tier startup. Within weeks, I was hired.", author: "Aman Verma", role: "SDE @ Google" },
    { motive: "CAREER PIVOT", text: "I was a tester but the AI identified my potential as a Developer. I changed my path entirely.", author: "Sanya Gupta", role: "Frontend Lead" },
    { motive: "SKILL GAP FIXED", text: "The quiz identified I was weak in System Design. I learned the gap and now I am more confident.", author: "Rahul Jha", role: "B.Tech Student" },
    { motive: "SKILL IDENTIFIED", text: "I didn't know my SQL skills were market-ready until the Coach module audited me.", author: "Ishita Roy", role: "Data Analyst" },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveReview((prev) => (prev + 1) % reviews.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [reviews.length]);

  return (
    <Layout isLanding={true}>
      
      {/* 1. HERO SECTION - High-End Branding & Watermark */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-white pt-10 pb-10">
        {/* Massive Background Watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center pointer-events-none select-none overflow-hidden -z-10 opacity-[0.03]">
          <h2 className="text-[12rem] md:text-[20rem] font-black leading-none uppercase tracking-tighter">
            INTELLIGENCE
          </h2>
        </div>

        {/* Ambient Glows */}
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px] -z-10" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[150px] -z-10" />

        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold uppercase tracking-widest mb-8 shadow-sm animate-fade-in">
            <Sparkles size={14} className="animate-pulse" />
            <span>AI Powered Career Intelligence</span>
          </div>

          <h1 className="text-6xl lg:text-[115px] font-black tracking-tighter leading-[0.85] text-slate-900 mb-8">
            Engineer Your <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Professional Future.
            </span>
          </h1>

          <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
            Decipher your skill profile with NLP. Validate knowledge with adaptive AI quizzes. 
            Get data-driven roadmaps and role predictions in one unified ecosystem.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Link to="/register">
              <button className="px-10 py-5 bg-blue-600 text-white rounded-2xl font-black text-xl hover:bg-blue-700 transition-all shadow-2xl shadow-blue-200 flex items-center gap-3 group">
                Start My Journey
                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <Link to="/login">
              <button className="px-10 py-5 bg-yellow-400 border-2 border-yellow-300 text-slate-900 rounded-2xl font-black text-xl hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-200">
                Sign In
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. AI CAREER ENGINE - Advanced Bento Grid Layout */}
      <section className="py-32 bg-slate-50/50 px-6">
        <div className="max-w-7xl mx-auto text-center mb-20">
          <h2 className="text-5xl font-black tracking-tight text-slate-900 mb-6">
            Complete AI Career Engine
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto font-medium">
            Advanced multi-layer intelligence modules working together to evaluate, 
            predict, and guide your professional evolution.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          <EngineCard 
            icon={<FileText size={32} />} 
            title="Resume Intelligence" 
            desc="NLP model extracts technical stack, frameworks, and tools to build your digital skill persona." 
            color="from-blue-500 to-indigo-500" 
          />
          <EngineCard 
            icon={<BrainCircuit size={32} />} 
            title="Adaptive AI Quiz" 
            desc="Gemini-based dynamic test validates real knowledge and updates your skill confidence score." 
            color="from-purple-500 to-pink-500" 
          />
          <EngineCard 
            icon={<TrendingUp size={32} />} 
            title="Career Recommendation" 
            desc="Combines resume skills, academics & quiz scores to suggest a precise Job or Skill Upgrade path." 
            color="from-emerald-500 to-teal-500" 
          />
          <EngineCard 
            icon={<GraduationCap size={32} />} 
            title="Skill Gap Analyzer" 
            desc="Detects missing skills instantly by comparing your profile with industry-standard roles." 
            color="from-orange-500 to-red-500" 
          />
          <EngineCard 
            icon={<ShieldCheck size={32} />} 
            title="Role & Salary Prediction" 
            desc="Predicts best matching job roles and expected salary ranges using predictive ML models." 
            color="from-indigo-500 to-blue-500" 
          />
          <EngineCard 
            icon={<Zap size={32} />} 
            title="Market Demand AI" 
            desc="Analyzes real-time job market trends to show high-demand skills and future-proof roles." 
            color="from-cyan-500 to-blue-500" 
          />
        </div>
      </section>

      {/* 3. WORKFLOW - 5-Step Visual Journey */}
      <section className="py-32 bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50 px-6">
        <div className="max-w-7xl mx-auto text-center mb-24">
          <h2 className="text-5xl font-black text-slate-900 tracking-tighter bg-gradient-to-r from-blue-500 via-pink-500 to-yellow-400 bg-clip-text text-transparent">Your 5-Step AI Journey</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 max-w-7xl mx-auto relative">
          {/* Connector Line (Desktop Only) */}
          <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-[4px] bg-gradient-to-r from-blue-400 via-pink-400 to-yellow-400 rounded-full blur-[1px] -z-0" />

          <Step num="01" title="Upload Resume" desc="Initial data intake" color="from-blue-400 to-blue-200" iconBg="bg-blue-100" />
          <Step num="02" title="Skill Extraction" desc="AI-driven NLP audit" color="from-pink-400 to-pink-200" iconBg="bg-pink-100" />
          <Step num="03" title="Take AI Quiz" desc="Knowledge validation" color="from-yellow-400 to-yellow-200" iconBg="bg-yellow-100" />
          <Step num="04" title="Model Prediction" desc="Data-based matching" color="from-green-400 to-green-200" iconBg="bg-green-100" />
          <Step num="05" title="Get Roadmap" desc="Career success plan" color="from-indigo-400 to-indigo-200" iconBg="bg-indigo-100" />
        </div>
      </section>

      {/* 4. REVIEWS - Premium Auto-Scroll Experience */}
      <section className="py-32 bg-slate-900 relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] -z-0" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center text-white">
          <h2 className="text-4xl lg:text-6xl font-black mb-20 tracking-tighter">
            Trusted by Real Professionals
          </h2>

          <div className="relative max-w-4xl mx-auto min-h-[400px]">
            {reviews.map((rev, idx) => (
              <div 
                key={idx}
                className={`transition-all duration-1000 absolute inset-0 ${idx === activeReview ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95 pointer-events-none'}`}
              >
                <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 p-12 rounded-[3.5rem] shadow-2xl">
                  <div className="inline-block px-4 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
                    {rev.motive}
                  </div>
                  
                  <p className="text-2xl md:text-4xl font-medium text-white italic mb-10 leading-relaxed">
                    "{rev.text}"
                  </p>
                  
                  <div className="flex flex-col items-center">
                    <div className="flex gap-1 text-yellow-500 mb-4">
                      {[...Array(5)].map((_, i) => <Star key={i} size={20} fill="currentColor" />)}
                    </div>
                    <h4 className="text-2xl font-black text-white">{rev.author}</h4>
                    <p className="text-slate-500 text-sm uppercase font-bold tracking-[0.2em]">
                      {rev.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Indicator Dots */}
          <div className="flex justify-center gap-4 mt-12">
            {reviews.map((_, i) => (
              <button 
                key={i}
                onClick={() => setActiveReview(i)}
                className={`h-2 transition-all duration-300 rounded-full ${i === activeReview ? 'w-12 bg-blue-600' : 'w-2 bg-slate-700 hover:bg-slate-500'}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 5. FINAL CTA - Converging Everything */}
      <section className="py-32 px-6 text-center bg-white overflow-hidden relative">
        <div className="max-w-4xl mx-auto relative z-10">
          <h2 className="text-5xl lg:text-8xl font-black mb-12 text-slate-900 tracking-tighter">
            Engineer Your <br/> Future Today.
          </h2>

          <Link to="/register">
            <button className="bg-blue-600 text-white px-14 py-7 rounded-[2.5rem] font-black text-2xl hover:scale-105 transition-all shadow-[0_20px_50px_rgba(59,130,246,0.3)] active:scale-95">
               Start Free Journey Now
            </button>
          </Link>

          <p className="mt-10 text-slate-400 font-bold uppercase tracking-widest text-sm">
            AI + Intelligence = Your Professional Growth
          </p>
        </div>
      </section>

    </Layout>
  );
};

// --- ELITE SUB-COMPONENTS ---

const EngineCard = ({ icon, title, desc, color }) => (
  <div className="group relative p-10 rounded-[3rem] bg-white border border-slate-100 hover:-translate-y-3 transition-all duration-500 shadow-sm hover:shadow-2xl overflow-hidden">
    {/* Dynamic Background Hover Effect */}
    <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-5 transition-all duration-500`} />
    
    <div className="relative z-10">
      <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-8 text-slate-900 group-hover:scale-110 group-hover:bg-white group-hover:shadow-lg transition-all duration-500">
        {icon}
      </div>
      <h3 className="text-2xl font-black mb-4 text-slate-900 tracking-tight leading-none">{title}</h3>
      <p className="text-slate-500 font-medium leading-relaxed">{desc}</p>
    </div>
  </div>
);

const Step = ({ num, title, desc, color = "from-blue-400 to-blue-200", iconBg = "bg-blue-100" }) => (
  <div className="group relative flex flex-col items-center">
    <div className={`w-24 h-24 rounded-full ${iconBg} border-4 border-white flex items-center justify-center text-3xl font-black text-white shadow-xl group-hover:scale-110 transition-all duration-500 relative z-10 mb-6 bg-gradient-to-br ${color}`}>
      <span className="drop-shadow-lg">{num}</span>
    </div>
    <h3 className="text-xl font-black text-slate-900 mb-2">{title}</h3>
    <p className="text-slate-500 text-sm font-medium">{desc}</p>
  </div>
);

export default Landing;