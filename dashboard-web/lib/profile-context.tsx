'use client';

import { createContext, useContext, useEffect, useState } from 'react';

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
    Promise.all([
      fetch('/api/profiles').then((r) => r.json()),
      fetch('/api/preferences').then((r) => r.json()).catch(() => ({ selectedProfile: '' })),
    ])
      .then(([data, prefs]: [string[], any]) => {
        setProfiles(data);
        const serverProfile = prefs.selectedProfile;
        const initial = (serverProfile && data.includes(serverProfile) ? serverProfile : data[0]) ?? '';
        setActiveProfileState(initial);
      })
      .catch(() => {});
  }, []);

  function setActiveProfile(p: string) {
    setActiveProfileState(p);
    fetch('/api/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedProfile: p }),
    }).catch((err) => console.error('Failed to persist profile selection:', err));
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
