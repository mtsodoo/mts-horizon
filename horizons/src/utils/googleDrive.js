const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly';

let gapiInited = false;
let gisInited = false;
let tokenClient;

export const initGoogleDrive = () => {
  return new Promise((resolve, reject) => {
    let gapiLoaded = false;
    let gisLoaded = false;

    const checkBothLoaded = () => {
      if (gapiLoaded && gisLoaded) {
        resolve(true);
      }
    };

    // تحميل GAPI
    if (!window.gapi) {
      const script1 = document.createElement('script');
      script1.src = 'https://apis.google.com/js/api.js';
      script1.async = true;
      script1.defer = true;
      script1.onload = () => {
        window.gapi.load('client', async () => {
          try {
            await window.gapi.client.init({
              apiKey: API_KEY,
              discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
            });
            gapiInited = true;
            gapiLoaded = true;
            checkBothLoaded();
          } catch (error) {
            console.error('GAPI init error:', error);
            reject(error);
          }
        });
      };
      script1.onerror = () => reject(new Error('Failed to load GAPI'));
      document.body.appendChild(script1);
    } else {
      gapiLoaded = true;
      gapiInited = true;
      checkBothLoaded();
    }

    // تحميل GIS
    if (!window.google?.accounts) {
      const script2 = document.createElement('script');
      script2.src = 'https://accounts.google.com/gsi/client';
      script2.async = true;
      script2.defer = true;
      script2.onload = () => {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: '',
        });
        gisInited = true;
        gisLoaded = true;
        checkBothLoaded();
      };
      script2.onerror = () => reject(new Error('Failed to load GIS'));
      document.body.appendChild(script2);
    } else {
      gisLoaded = true;
      gisInited = true;
      checkBothLoaded();
    }

    // Timeout بعد 10 ثواني
    setTimeout(() => {
      if (!gapiLoaded || !gisLoaded) {
        reject(new Error('Timeout loading Google APIs'));
      }
    }, 10000);
  });
};

export const signIn = () => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('Token client not initialized'));
      return;
    }

    tokenClient.callback = async (resp) => {
      if (resp.error !== undefined) {
        reject(resp);
      } else {
        resolve(resp);
      }
    };

    if (window.gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  });
};

export const signOut = () => {
  const token = window.gapi.client.getToken();
  if (token !== null) {
    window.google.accounts.oauth2.revoke(token.access_token);
    window.gapi.client.setToken('');
  }
};

export const listFiles = async (folderId) => {
  try {
    const response = await window.gapi.client.drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, modifiedTime, size, iconLink, webViewLink)',
      orderBy: 'name',
    });
    return response.result.files;
  } catch (error) {
    console.error('Error listing files:', error);
    throw error;
  }
};

export const uploadFile = async (file, folderId) => {
  const metadata = {
    name: file.name,
    parents: [folderId],
  };

  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  formData.append('file', file);

  try {
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: new Headers({ Authorization: 'Bearer ' + window.gapi.client.getToken().access_token }),
      body: formData,
    });
    return await response.json();
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

export const deleteFile = async (fileId) => {
  try {
    await window.gapi.client.drive.files.delete({
      fileId: fileId,
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

export const downloadFile = async (fileId, fileName) => {
  try {
    const response = await window.gapi.client.drive.files.get({
      fileId: fileId,
      alt: 'media',
    });
    
    const blob = new Blob([response.body]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
};