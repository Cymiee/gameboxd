import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabase";
import { useAuthStore } from "./store/auth";
import { useNotificationsStore } from "./store/notifications";
import { ensureProfile, getProfileTags } from "@gameboxd/lib";
import Spinner from "./components/Spinner";

import Layout from "./components/Layout";
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import HomePage from "./pages/HomePage";
import SearchPage from "./pages/SearchPage";
import ProfilePage from "./pages/ProfilePage";
import ShelfPage from "./pages/ShelfPage";
import FriendsPage from "./pages/FriendsPage";
import GamePage from "./pages/GamePage";
import ExplorePage from "./pages/ExplorePage";
import ListPage from "./pages/ListPage";
import SettingsPage from "./pages/SettingsPage";
import WantToPlayPage from "./pages/WantToPlayPage";

/** /games → /explore, preserving any ?q= search term from old links. */
function LegacyGamesRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/explore${search}`} replace />;
}

/**
 * Shows the profile-setup wizard once after a user's first login, when they
 * haven't completed (or explicitly skipped) it. Fully non-blocking: it only
 * redirects a single time per session, so the user can navigate away freely and
 * finish later from Settings.
 */
function OnboardingGate() {
  const { userId, profileTags, profileTagsLoaded } = useAuthStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!userId || !profileTagsLoaded) return;
    if (profileTags?.onboarding_completed) return;
    // Don't hijack these flows.
    if (pathname.startsWith("/onboarding") || pathname === "/auth") return;
    // Only auto-prompt once per browser session.
    if (sessionStorage.getItem("onboardingPrompted")) return;
    sessionStorage.setItem("onboardingPrompted", "1");
    navigate("/onboarding", { replace: false });
  }, [userId, profileTags, profileTagsLoaded, pathname, navigate]);

  return null;
}

export default function App() {
  const { userId, initialized, setUserId, setProfile, setProfileTags, setInitialized } = useAuthStore();
  const refreshNotifications = useNotificationsStore((s) => s.refresh);
  const clearNotifications = useNotificationsStore((s) => s.clear);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user ?? null;
      setUserId(user?.id ?? null);
      if (user) {
        const username = (user.user_metadata?.username as string | undefined)
          ?? user.email?.split("@")[0]
          ?? "user";
        ensureProfile(supabase, user.id, username)
          .then(setProfile)
          .catch(() => setProfile(null))
          .finally(setInitialized);
        getProfileTags(supabase, user.id).then(setProfileTags).catch(() => setProfileTags(null));
        void refreshNotifications(user.id);
      } else {
        setInitialized();
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const user = session?.user ?? null;
        setUserId(user?.id ?? null);
        if (user) {
          try {
            const username = (user.user_metadata?.username as string | undefined)
              ?? user.email?.split("@")[0]
              ?? "user";
            const profile = await ensureProfile(supabase, user.id, username);
            setProfile(profile);
          } catch {
            setProfile(null);
          }
          getProfileTags(supabase, user.id).then(setProfileTags).catch(() => setProfileTags(null));
          void refreshNotifications(user.id);
        } else {
          setProfile(null);
          setProfileTags(null);
          clearNotifications();
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, [setUserId, setProfile, setProfileTags, setInitialized, refreshNotifications, clearNotifications]);

  if (!initialized) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <Spinner size={44} />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <OnboardingGate />
      <Routes>
        <Route path="/auth" element={<AuthPage />} />

        {/* Full-screen onboarding wizard (protected, no navbar). Each step is its
            own route; bare /onboarding lands on the first step. */}
        <Route
          path="/onboarding"
          element={userId ? <Navigate to="/onboarding/avatar" replace /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/onboarding/:step"
          element={userId ? <OnboardingPage /> : <Navigate to="/auth" replace />}
        />

        {/* Public — rendered with Navbar for everyone */}
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/game/:id" element={<GamePage />} />
          <Route path="/list/:id" element={<ListPage />} />
          <Route path="/profile/:userId" element={<ProfilePage />} />
          <Route path="/search" element={<SearchPage />} />
        </Route>

        {/* Protected — redirect to /auth if not logged in */}
        <Route element={userId ? <Layout /> : <Navigate to="/auth" replace />}>
          <Route path="/shelf" element={<ShelfPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/want-to-play" element={<WantToPlayPage />} />
        </Route>

        {/* Legacy redirects — keep old links and bookmarks alive */}
        <Route path="/feed" element={<Navigate to="/" replace />} />
        <Route path="/games" element={<LegacyGamesRedirect />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
