import { AuthProvider } from '@/components/AuthContext';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
