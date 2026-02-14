'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';

export default function ManageLoginPage() {
    const router = useRouter();
    const { signIn, signUp } = useAuth();
    const [isSignUp, setIsSignUp] = useState(false);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        if (isSignUp) {
            if (password !== confirmPassword) {
                setError('Passwords do not match');
                setLoading(false);
                return;
            }
            if (password.length < 6) {
                setError('Password must be at least 6 characters');
                setLoading(false);
                return;
            }
            if (!fullName.trim()) {
                setError('Please enter your name');
                setLoading(false);
                return;
            }
            const { error } = await signUp(email, password, fullName.trim());
            if (error) {
                setError(error);
            } else {
                setSuccess('Account created! You can now log in.');
                setIsSignUp(false);
                setPassword('');
                setConfirmPassword('');
                setFullName('');
            }
        } else {
            const { error } = await signIn(email, password);
            if (error) {
                setError(error);
            } else {
                router.push('/manage/dashboard');
            }
        }

        setLoading(false);
    };

    return (
        <main className="min-h-screen bg-background-light flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-md flex flex-col items-center">
                {/* Logo / Brand */}
                <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-sm border border-gray-100 mb-8">
                    <span
                        className="material-symbols-outlined text-primary"
                        style={{ fontSize: '40px', fontVariationSettings: "'FILL' 1" }}
                    >
                        storefront
                    </span>
                </div>

                {/* Header */}
                <h1 className="text-[#111418] text-3xl md:text-4xl font-black leading-tight tracking-tight mb-2 text-center">
                    {isSignUp ? 'Create your account' : 'Welcome back'}
                </h1>
                <p className="text-gray-500 text-base font-normal leading-relaxed text-center mb-8">
                    {isSignUp
                        ? 'Sign up to start building your website with voice'
                        : 'Login to manage your shop & website'
                    }
                </p>

                {/* Card */}
                <div className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                    {/* Tabs */}
                    <div className="flex mb-8 bg-[#f0f2f4] rounded-xl p-1">
                        <button
                            type="button"
                            onClick={() => { setIsSignUp(false); setError(null); setSuccess(null); }}
                            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${!isSignUp
                                ? 'bg-white text-[#111418] shadow-sm'
                                : 'text-gray-500 hover:text-[#111418]'
                                }`}
                        >
                            Login
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIsSignUp(true); setError(null); setSuccess(null); }}
                            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${isSignUp
                                ? 'bg-white text-[#111418] shadow-sm'
                                : 'text-gray-500 hover:text-[#111418]'
                                }`}
                        >
                            Sign Up
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {isSignUp && (
                            <div>
                                <label className="block text-sm font-medium text-[#111418] mb-2">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400" style={{ fontSize: '20px' }}>
                                        person
                                    </span>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Your full name"
                                        className="w-full pl-10 pr-4 py-3 bg-[#f0f2f4] border border-gray-100 rounded-xl text-[#111418] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
                                        required
                                    />
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-[#111418] mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400" style={{ fontSize: '20px' }}>
                                    mail
                                </span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full pl-10 pr-4 py-3 bg-[#f0f2f4] border border-gray-100 rounded-xl text-[#111418] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#111418] mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400" style={{ fontSize: '20px' }}>
                                    lock
                                </span>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-4 py-3 bg-[#f0f2f4] border border-gray-100 rounded-xl text-[#111418] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>

                        {isSignUp && (
                            <div>
                                <label className="block text-sm font-medium text-[#111418] mb-2">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400" style={{ fontSize: '20px' }}>
                                        lock
                                    </span>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full pl-10 pr-4 py-3 bg-[#f0f2f4] border border-gray-100 rounded-xl text-[#111418] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-primary hover:bg-blue-600 rounded-xl font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm hover:shadow-md active:scale-[0.98]"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
                                    {isSignUp ? 'Creating account...' : 'Logging in...'}
                                </span>
                            ) : (
                                isSignUp ? 'Create Account' : 'Login'
                            )}
                        </button>
                    </form>

                    {/* Success */}
                    {success && (
                        <div className="mt-5 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2">
                            <span className="material-symbols-outlined text-green-600" style={{ fontSize: '20px' }}>check_circle</span>
                            <p className="text-sm text-green-700">{success}</p>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="mt-5 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                            <span className="material-symbols-outlined text-red-500" style={{ fontSize: '20px' }}>error</span>
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <p className="text-gray-400 text-xs mt-6 text-center">
                    Powered by VoiceSite — Build your website with your voice
                </p>
            </div>
        </main>
    );
}
