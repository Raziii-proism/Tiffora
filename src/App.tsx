import { useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { LandingPage } from '@/pages/LandingPage';
import { HostelSelectPage } from '@/pages/HostelSelectPage';
import { WardenAuthPage } from '@/pages/WardenAuthPage';
import { StudentAuthPage } from '@/pages/StudentAuthPage';
import { StudentDashboard } from '@/pages/StudentDashboard';
import { WardenDashboard } from '@/pages/WardenDashboard';
import { AdminPage } from '@/pages/AdminPage';
import { EntriesPage } from '@/pages/EntriesPage';
import { LoadingSpinner } from '@/components/Feedback';
import type { Hostel } from '@/lib/supabase';

type AuthScreen = 'landing' | 'hostel-select' | 'warden' | 'student' | 'admin' | 'entries';

function AppContent() {
  const { user, role, loading } = useAuth();
  const [authScreen, setAuthScreen] = useState<AuthScreen>('landing');
  const [pendingRole, setPendingRole] = useState<'warden' | 'student'>('warden');
  const [selectedHostel, setSelectedHostel] = useState<Hostel | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner message="Loading..." />
      </div>
    );
  }

  // If user is logged in, show the appropriate dashboard
  if (user && role === 'warden') {
    return <WardenDashboard />;
  }
  if (user && role === 'student') {
    return <StudentDashboard />;
  }

  function startHostelSelect(roleChoice: 'warden' | 'student') {
    setPendingRole(roleChoice);
    setSelectedHostel(null);
    setAuthScreen('hostel-select');
  }

  switch (authScreen) {
    case 'hostel-select':
      return (
        <HostelSelectPage
          role={pendingRole}
          onBack={() => setAuthScreen('landing')}
          onSelectHostel={(hostel) => {
            setSelectedHostel(hostel);
            setAuthScreen(pendingRole);
          }}
        />
      );
    case 'warden':
      return (
        <WardenAuthPage
          hostel={selectedHostel}
          onBack={() => setAuthScreen('hostel-select')}
          onSuccess={() => {}}
        />
      );
    case 'student':
      return (
        <StudentAuthPage
          hostel={selectedHostel}
          onBack={() => setAuthScreen('hostel-select')}
          onSuccess={() => {}}
        />
      );
    case 'admin':
      return <AdminPage onBack={() => setAuthScreen('landing')} />;
    case 'entries':
      return <EntriesPage onBack={() => setAuthScreen('landing')} />;
    default:
      return (
        <LandingPage
          onSelectWarden={() => startHostelSelect('warden')}
          onSelectStudent={() => startHostelSelect('student')}
          onSelectAdmin={() => setAuthScreen('admin')}
          onSelectEntries={() => setAuthScreen('entries')}
        />
      );
  }
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
