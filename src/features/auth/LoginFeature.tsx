import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../core/auth/AuthContext';
import { AppShell } from '../../components/layout/AppShell'; // Re-use shell for consistent look or make a custom one
import { MessageSquare, Zap, Shield } from 'lucide-react';

export const LoginFeature: React.FC = () => {
  const { user, signInWithGoogle, signInGuest, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      navigate('/nexus');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-nexus-950 text-nexus-100">
        <div className="animate-pulse text-xl font-mono">Initializing Nexus Core...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-nexus-950 via-black to-nexus-900 font-sans text-white p-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-nexus-800/50 bg-nexus-900/30 p-8 backdrop-blur-xl shadow-2xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-nexus-400 to-nexus-100 mb-2">
            Ekrixi AI
          </h1>
          <p className="text-nexus-400 text-sm font-mono uppercase tracking-widest">
            Knowledge Nexus
          </p>
        </div>

        <div className="space-y-4 pt-8">
          <button
            onClick={() => signInWithGoogle()}
            className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-lg bg-white px-4 py-3 text-black transition-all hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-nexus-400 focus:ring-offset-2 focus:ring-offset-black"
          >
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              className="h-5 w-5"
              alt="Google"
            />
            <span className="font-medium">Sign in with Google</span>
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-nexus-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-nexus-900/50 px-2 text-nexus-500">Or continue as guest</span>
            </div>
          </div>

          <button
            onClick={() => signInGuest()}
            className="group flex w-full items-center justify-center gap-3 rounded-lg border border-nexus-700 bg-nexus-900/50 px-4 py-3 text-nexus-300 transition-all hover:bg-nexus-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-nexus-700 focus:ring-offset-2 focus:ring-offset-black"
          >
            <Zap className="h-5 w-5" />
            <span className="font-medium">Anonymous Guest Access</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-8 text-center text-xs text-nexus-500">
          <div className="flex flex-col items-center gap-2">
            <Shield className="h-5 w-5 text-nexus-600" />
            <span>Secure</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Zap className="h-5 w-5 text-nexus-600" />
            <span>Fast</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <MessageSquare className="h-5 w-5 text-nexus-600" />
            <span>AI-Powered</span>
          </div>
        </div>
      </div>
    </div>
  );
};
