'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'applyiq_selected_profile';

interface ProfileCtx {
  profiles: string[];
  activeProfile: string;
  setActiveProfile: (p: string) => void;
}

export const ProfileContext = createContext<ProfileCtx>({
  profiles: [],
  activeProfile: '',
  setActiveProfile: () => {},
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<string[]>([]);
  const [activeProfile, setActiveProfileState] = useState('');

  useEffect(() => {
    fetch('/api/profiles')
      .then((r) => r.json())
      .then((data: string[]) => {
        setProfiles(data);
        const stored = localStorage.getItem(STORAGE_KEY);
        const initial = stored && data.includes(stored) ? stored : (data[0] ?? '');
        setActiveProfileState(initial);
      })
      .catch(() => {});
  }, []);

  function setActiveProfile(p: string) {
    setActiveProfileState(p);
    localStorage.setItem(STORAGE_KEY, p);
  }

  return (
    <ProfileContext.Provider value={{ profiles, activeProfile, setActiveProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
