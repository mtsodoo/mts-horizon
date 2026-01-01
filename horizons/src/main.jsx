
import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from "@sentry/react";
import App from './App'
import './index.css'

// تهيئة Sentry
Sentry.init({
  dsn: "https://80ce078f9438290076a0d94937bb5627@o4510592275972096.ingest.de.sentry.io/4510592281411664",
  sendDefaultPii: true,
  environment: import.meta.env.MODE,
  enableLogs: true,
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
  tracesSampleRate: 0.5,
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <>
    <Sentry.ErrorBoundary 
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="bg-white p-8 rounded-lg shadow-lg text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">حدث خطأ غير متوقع</h1>
            <p className="text-gray-600 mb-4">نعتذر عن هذا الخطأ. تم إبلاغ الفريق التقني.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              تحديث الصفحة
            </button>
          </div>
        </div>
      }
      onError={(error) => {
        console.error('Sentry caught error:', error);
      }}
    >
      <App />
    </Sentry.ErrorBoundary>
  </>
);
