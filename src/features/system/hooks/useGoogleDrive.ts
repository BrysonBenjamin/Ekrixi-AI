import { useState } from 'react';
import { useGoogleLogin, googleLogout, TokenResponse } from '@react-oauth/google';
import { NexusObject } from '../../../types';
import { useSessionStore } from '../../../store/useSessionStore';

// Scopes needed for App Data Folder access
const SCOPES = 'https://www.googleapis.com/auth/drive.file email profile openid';

export const useGoogleDrive = () => {
  const { currentUser, authToken: token, setUser } = useSessionStore();
  const [isSyncing, setIsSyncing] = useState(false);

  const login = useGoogleLogin({
    onSuccess: (tokenResponse: TokenResponse) => {
      const accessToken = tokenResponse.access_token;

      // Fetch basic profile
      fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((res) => res.json())
        .then((profile) => {
          setUser(
            {
              id: profile.sub,
              email: profile.email,
              name: profile.name,
              picture: profile.picture,
            },
            accessToken,
          );
        })
        .catch((err) => console.error('Profile fetch failed', err));
    },
    onError: (error) => console.error('Login Failed:', error),
    scope: SCOPES,
  });

  const logout = () => {
    googleLogout();
    setUser(null, null);
  };

  /**
   * Uploads the Registry to Google Drive as a JSON file.
   * Logic:
   * 1. Search for existing file with `name = 'nexus_universe_{universeId}.json'`.
   * 2. If exists -> PATCH (Update)
   * 3. If new -> POST (Create)
   */
  const syncToDrive = async (
    universeId: string,
    universeName: string,
    registry: Record<string, NexusObject>,
  ) => {
    if (!token) return { success: false, error: 'Not authenticated' };
    setIsSyncing(true);

    const fileName = `nexus_universe_${universeId}.json`;
    const fileContent = JSON.stringify({
      meta: { universeId, universeName, syncedAt: new Date().toISOString() },
      registry,
    });

    try {
      // 1. Search for existing file
      const searchParams = new URLSearchParams({
        q: `name = '${fileName}' and trashed = false`,
        fields: 'files(id, name)',
      });

      const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?${searchParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const listData = await listRes.json();
      const existingFile = listData.files?.[0];

      const blob = new Blob([fileContent], { type: 'application/json' });

      if (existingFile) {
        // UPDATE
        await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`,
          {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
            body: blob,
          },
        );
      } else {
        // CREATE
        // Multipart upload to set metadata (name) + content
        const metadata = {
          name: fileName,
          mimeType: 'application/json',
          // parents: ['appDataFolder'] // Optional: Use 'appDataFolder' to hide from main Drive, or root for visibility
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', blob);

        await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
      }

      setIsSyncing(false);
      return { success: true };
    } catch (error) {
      console.error('Drive Sync Error', error);
      setIsSyncing(false);
      return { success: false, error };
    }
  };

  /**
   * Downloads a registry from Drive.
   */
  const loadFromDrive = async (universeId: string) => {
    if (!token) return null;
    setIsSyncing(true);

    try {
      const fileName = `nexus_universe_${universeId}.json`;
      const searchParams = new URLSearchParams({
        q: `name = '${fileName}' and trashed = false`,
        fields: 'files(id)',
      });
      const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?${searchParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const listData = await listRes.json();
      const file = listData.files?.[0];

      if (!file) {
        setIsSyncing(false);
        return null;
      }

      const contentRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await contentRes.json();

      setIsSyncing(false);
      return data.registry;
    } catch (error) {
      console.error('Drive Load Error', error);
      setIsSyncing(false);
      return null;
    }
  };

  return {
    login,
    logout,
    user: currentUser,
    token,
    isSyncing,
    syncToDrive,
    loadFromDrive,
  };
};
