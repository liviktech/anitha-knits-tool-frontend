import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Lock, HelpCircle } from 'lucide-react';
import { useAuth, defaultRouteFor } from './auth-context';

export function LoginPage() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Already have a session (e.g. back-navigated to /login) — skip straight to that role's home.
  if (user) {
    return <Navigate to={defaultRouteFor(user)} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const loggedInUser = await login(mobile, password);
      navigate(defaultRouteFor(loggedInUser), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-gray-50 p-4 overflow-hidden font-['Hanken_Grotesk',sans-serif]">
      {/* Background Decorative Shapes */}
      <div className="absolute -top-40 -left-20 w-[600px] h-[600px] bg-[#004D40] rounded-full opacity-90 z-0" />
      <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-[#007055] rounded-full opacity-40 z-0" />
      
      <div className="absolute -bottom-40 -right-20 w-[500px] h-[500px] bg-[#004D40] rounded-full opacity-90 z-0" />
      <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-[#007055] rounded-full opacity-40 z-0" />

      {/* Main Card Container */}
      <div className="relative z-10 flex w-full max-w-[1000px] min-h-[600px] rounded-[24px] bg-white shadow-2xl overflow-hidden">
        
        {/* Left Form Side */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center items-center bg-white relative">
          <div className="w-full max-w-[320px]">
            <div className="text-center mb-8">
              <h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Welcome To</h2>
              <h1 className="text-[26px] font-serif font-extrabold text-[#004D40] tracking-widest uppercase flex items-center justify-center gap-2">
                <span className="text-[32px] text-[#00A87E] leading-none mb-1">∞</span> LIVIK KNITS
              </h1>
              <p className="text-gray-400 text-[13px] mt-4 font-medium leading-relaxed">
                Log in to get in the moment updates on the things that interest you.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00A87E]" />
                <Input
                  type="email"
                  placeholder="Username"
                  className="pl-11 h-[46px] rounded-full border-gray-200 text-sm focus-visible:ring-[#00A87E]"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00A87E]" />
                <Input
                  type="password"
                  placeholder="Password"
                  className="pl-11 pr-11 h-[46px] rounded-full border-gray-200 text-sm focus-visible:ring-[#00A87E]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <HelpCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" />
              </div>

              {error && (
                <p className="text-[12px] font-medium text-red-500 text-center">{error}</p>
              )}

              <Button type="submit" disabled={isSubmitting} className="w-full h-[46px] rounded-full bg-[#004D40] hover:bg-[#00362c] text-white font-bold tracking-wide mt-2 text-[13px] disabled:opacity-60">
                {isSubmitting ? 'SIGNING IN…' : 'SIGN IN'}
              </Button>
            </form>

            <div className="text-center mt-5">
              <p className="text-[13px] text-gray-500 font-medium">
                Don't have an account ? <a href="#" className="text-[#00A87E] font-bold hover:underline">Sign Up Now</a>
              </p>
            </div>

            <div className="flex items-center my-6">
              <div className="flex-1 border-t border-gray-200"></div>
              <span className="px-4 text-[12px] text-gray-400 font-medium">Or</span>
              <div className="flex-1 border-t border-gray-200"></div>
            </div>

            <div className="text-center">
              <p className="text-[12px] text-gray-400 mb-4 font-medium">Continue with social media</p>
              <div className="flex justify-center gap-4">
                <button type="button" className="w-10 h-10 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)] flex items-center justify-center text-[#1877F2] hover:scale-110 transition-transform">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04Z" />
                  </svg>
                </button>
                <button type="button" className="w-10 h-10 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)] flex items-center justify-center text-[#1DA1F2] hover:scale-110 transition-transform">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.46 6C21.69 6.35 20.86 6.58 20 6.69C20.88 6.16 21.56 5.32 21.88 4.31C21.05 4.81 20.13 5.16 19.16 5.36C18.37 4.5 17.26 4 16 4C13.65 4 11.73 5.92 11.73 8.29C11.73 8.63 11.77 8.96 11.84 9.27C8.28 9.09 5.11 7.38 3 4.79C2.63 5.42 2.42 6.16 2.42 6.94C2.42 8.43 3.17 9.75 4.33 10.5C3.62 10.5 2.96 10.3 2.38 10C2.38 10 2.38 10 2.38 10.03C2.38 12.11 3.86 13.85 5.82 14.24C5.46 14.34 5.08 14.39 4.69 14.39C4.42 14.39 4.15 14.36 3.89 14.31C4.43 16.01 6 17.26 7.89 17.29C6.43 18.45 4.58 19.13 2.56 19.13C2.22 19.13 1.88 19.11 1.54 19.07C3.44 20.29 5.7 21 8.12 21C16 21 20.33 14.46 20.33 8.79C20.33 8.6 20.33 8.42 20.32 8.23C21.16 7.63 21.88 6.87 22.46 6Z" />
                  </svg>
                </button>
                <button type="button" className="w-10 h-10 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)] flex items-center justify-center hover:scale-110 transition-transform">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                </button>
                <button type="button" className="w-10 h-10 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)] flex items-center justify-center text-[#0A66C2] hover:scale-110 transition-transform">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 0H5C2.24 0 0 2.24 0 5V19C0 21.76 2.24 24 5 24H19C21.76 24 24 21.76 24 19V5C24 2.24 21.76 0 19 0ZM8 19H5V8H8V19ZM6.5 6.73C5.53 6.73 4.75 5.95 4.75 4.98C4.75 4.01 5.53 3.23 6.5 3.23C7.47 3.23 8.25 4.01 8.25 4.98C8.25 5.95 7.47 6.73 6.5 6.73ZM20 19H17V13.39C17 12.05 16.97 10.33 15.14 10.33C13.27 10.33 12.98 11.78 12.98 13.28V19H10V8H12.87V9.5H12.91C13.31 8.74 14.29 7.94 15.75 7.94C18.79 7.94 19.34 9.94 19.34 12.54V19H20Z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Image Side */}
        <div className="hidden md:block w-1/2 relative bg-gray-200">
          <img src="/login-3.png" alt="Fabric Background" className="absolute inset-0 w-full h-full object-cover" />
        </div>

      </div>
    </div>
  );
}
