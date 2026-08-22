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
              <h1 className="text-[26px] font-serif font-extrabold text-[#004D40] tracking-widest flex items-center justify-center gap-2">
                <span className="text-[32px] text-[#00A87E] leading-none mb-1">∞</span> LK KnitOps
              </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00A87E]" />
                <Input
                  type="tel"
                  placeholder="Phone number"
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
