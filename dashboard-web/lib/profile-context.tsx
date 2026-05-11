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
    Promise.all([
      fetch('/api/profiles').then((r) => r.json()),
      fetch('/api/preferences').then((r) => r.json()).catch(() => ({ selectedProfile: '' })),
    ])
      .then(([data, prefs]: [string[], any]) => {
        setProfiles(data);
        // Prefer server-persisted profile, fallback to localStorage, then default to first profile
        const stored = localStorage.getItem(STORAGE_KEY);
        const serverProfile = prefs.selectedProfile;
        const initial =
          (serverProfile && data.includes(serverProfile)
            ? serverProfile
            : stored && data.includes(stored)
            ? stored
            : data[0]) ?? '';
        setActiveProfileState(initial);
      })
      .catch(() => {});
  }, []);

  function setActiveProfile(p: string) {
    setActiveProfileState(p);
    localStorage.setItem(STORAGE_KEY, p);
    // Persist to server for cross-device sync
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
