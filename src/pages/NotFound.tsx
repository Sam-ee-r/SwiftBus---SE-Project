import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="bg-deep-space text-on-surface font-body-md antialiased min-h-screen relative overflow-x-hidden selection:bg-electric-violet selection:text-white flex items-center justify-center p-4">
      {/* Decorative Background Glows */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[50%] h-[50%] bg-electric-violet/10 rounded-full blur-[150px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[40%] h-[40%] bg-error/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-md text-center flex flex-col items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-surface-container border border-white/10 flex items-center justify-center shadow-[0_0_30px_hsla(255,65%,60%,0.2)]">
          <span className="material-symbols-outlined text-[48px] text-electric-violet">route</span>
        </div>
        
        <div>
          <h1 className="font-h1 text-6xl md:text-8xl font-bold bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent mb-2 tracking-tighter">
            404
          </h1>
          <h2 className="font-h3 text-2xl text-on-surface font-semibold mb-2">
            Lost in Transit
          </h2>
          <p className="font-body-md text-on-surface-variant max-w-[280px] mx-auto leading-relaxed">
            We couldn't find the page you're looking for. It might have been moved or doesn't exist.
          </p>
        </div>

        <button 
          onClick={() => navigate('/')}
          className="mt-4 bg-electric-violet hover:bg-primary-container text-white font-label-md px-8 py-3 rounded-lg transition-all shadow-[0_0_15px_hsla(255,65%,60%,0.3)] hover:shadow-[0_0_25px_hsla(255,65%,60%,0.5)] flex items-center justify-center gap-2 active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">home</span>
          Return to Hub
        </button>
      </div>
    </div>
  );
};

export default NotFound;
