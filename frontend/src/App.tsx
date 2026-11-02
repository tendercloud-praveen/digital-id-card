import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import RequireAuth from '@/components/auth/RequireAuth';
import MyCardProvider from '@/components/card/MyCardProvider';
import WizardProvider from '@/components/card/WizardProvider';
import ActivateCardPage from '@/pages/ActivateCardPage';
import ActivatePage from '@/pages/ActivatePage';
import ActivationSuccessPage from '@/pages/ActivationSuccessPage';
import AuthPage from '@/pages/AuthPage';
import CardDetailsPage from '@/pages/CardDetailsPage';
import DashboardPage from '@/pages/DashboardPage';
import DesignPage from '@/pages/DesignPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import LandingPage from '@/pages/LandingPage';
import MyCardsPage from '@/pages/MyCardsPage';
import PhysicalCardPage from '@/pages/PhysicalCardPage';
import PreviewPage from '@/pages/PreviewPage';
import ProfessionPage from '@/pages/ProfessionPage';
import ProfilePage from '@/pages/ProfilePage';
import PublicCardPage from '@/pages/PublicCardPage';
import VerifyEmailPage from '@/pages/VerifyEmailPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/register" element={<AuthPage key="register" mode="register" />} />
      <Route path="/login" element={<AuthPage key="login" mode="login" />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      {/* Activation explains itself to visitors and asks them to log in before activating. */}
      <Route path="/activate" element={<ActivatePage />} />
      <Route path="/activate/*" element={<Navigate to="/activate" replace />} />
      <Route path="/card/:slug" element={<PublicCardPage />} />
      <Route path="/c/:publicId" element={<PhysicalCardPage />} />

      {/* Everything below requires a verified, logged-in user. */}
      <Route
        element={
          <RequireAuth>
            <MyCardProvider>
              <Outlet />
            </MyCardProvider>
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/cards" element={<MyCardsPage />} />
        <Route path="/cards/:cardId" element={<CardDetailsPage />} />
        {/* The creation wizard: its state is shared across these steps and saved only at the end. */}
        <Route
          element={
            <WizardProvider>
              <Outlet />
            </WizardProvider>
          }
        >
          <Route path="/setup/profession" element={<ProfessionPage />} />
          <Route path="/setup/profile" element={<ProfilePage />} />
          <Route path="/setup/design" element={<DesignPage />} />
          <Route path="/setup/preview" element={<PreviewPage />} />
        </Route>

        {/* NFC activation: identify the physical card, then the same wizard steps, then activate. */}
        <Route path="/activate-card" element={<ActivateCardPage />} />
        <Route path="/activate-card/success/:publicId" element={<ActivationSuccessPage />} />
        <Route
          element={
            <WizardProvider flow="activate">
              <Outlet />
            </WizardProvider>
          }
        >
          <Route path="/activate-card/profession" element={<ProfessionPage />} />
          <Route path="/activate-card/details" element={<ProfilePage />} />
          <Route path="/activate-card/design" element={<DesignPage />} />
          <Route path="/activate-card/preview" element={<PreviewPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
