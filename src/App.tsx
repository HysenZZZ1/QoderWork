import { Navigate, Route, Routes } from 'react-router-dom';
import { ROUTES } from '@/lib/constants';
import { HomePage } from '@/pages/HomePage';
import { ReaderPage } from '@/pages/ReaderPage';
import { SettingsModal } from '@/features/settings/SettingsModal';
import { DemoInfoModal } from '@/modules/demo/DemoInfoModal';
import { PdfUploadFeedback } from '@/modules/pdf/PdfUpload';
import { Toaster } from '@/components/ui';

export default function App() {
  return (
    <>
      <Routes>
        <Route path={ROUTES.home} element={<HomePage />} />
        <Route path={ROUTES.reader} element={<ReaderPage />} />
        <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
      </Routes>
      <SettingsModal />
      <DemoInfoModal />
      <PdfUploadFeedback />
      <Toaster />
    </>
  );
}