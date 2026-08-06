import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { updateProfile, upsertProfileTags, unlinkSteam, importSteamLogs, MIN_GENRES } from "@gameboxd/lib";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/auth";
import { useGamesStore } from "../store/games";
import { startSteamLink, syncSteam } from "../lib/steam";
import { presetAvatarUrl, isPresetAvatar } from "../components/Avatar";
import AvatarSelect from "../components/onboarding/AvatarSelect";
import GenreSelect from "../components/onboarding/GenreSelect";
import ArchetypeSelect from "../components/onboarding/ArchetypeSelect";

type Section = "profile" | "gaming" | "connections" | "security";

const STEAM_ERRORS: Record<string, string> = {
  expired: "That took too long — please try linking again.",
  unverified: "Steam couldn't verify the sign-in. Please try again.",
  already_linked: "That Steam account is already linked to another user.",
  save_failed: "Couldn't save the link. Please try again.",
  server: "Something went wrong. Please try again.",
};

export default function SettingsPage() {
  const { userId, profile, setProfile, profileTags, setProfileTags } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [section, setSection] = useState<Section>(searchParams.get("steam") ? "connections" : "profile");

  const [steamMsg, setSteamMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [steamBusy, setSteamBusy] = useState(false);
  const fetchLogs = useGamesStore((s) => s.fetchLogs);

  // Surface the result of a Steam link round-trip (?steam=linked|error).
  useEffect(() => {
    const steam = searchParams.get("steam");
    if (!steam) return;
    if (steam === "linked") setSteamMsg({ type: "ok", text: "Steam account linked!" });
    else setSteamMsg({ type: "err", text: STEAM_ERRORS[searchParams.get("reason") ?? ""] ?? "Couldn't link Steam." });
    // Clear the query params so a refresh doesn't re-show the message.
    searchParams.delete("steam");
    searchParams.delete("reason");
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleLinkSteam = async () => {
    setSteamMsg(null);
    setSteamBusy(true);
    try {
      await startSteamLink(); // redirects away
    } catch (e) {
      setSteamMsg({ type: "err", text: e instanceof Error ? e.message : "Couldn't start Steam linking." });
      setSteamBusy(false);
    }
  };

  const handleUnlinkSteam = async () => {
    if (!userId) return;
    setSteamBusy(true);
    setSteamMsg(null);
    try {
      const updated = await unlinkSteam(supabase, userId);
      setProfile(updated);
      setSteamMsg({ type: "ok", text: "Steam account unlinked." });
    } catch (e) {
      setSteamMsg({ type: "err", text: e instanceof Error ? e.message : "Couldn't unlink Steam." });
    } finally {
      setSteamBusy(false);
    }
  };

  // One click: refresh the Steam library, add played games to logs, and
  // refresh the in-app logs so they appear without a reload.
  const handleSyncSteam = async () => {
    setSteamBusy(true);
    setSteamMsg(null);
    try {
      const { owned } = await syncSteam();
      const { imported, updated } = await importSteamLogs(supabase);
      await fetchLogs();
      if (profile) setProfile({ ...profile, steam_synced_at: new Date().toISOString() });
      const extra = updated ? `, updated ${updated} with hours` : "";
      setSteamMsg({ type: "ok", text: `Synced ${owned} games · added ${imported} to your shelf${extra}.` });
    } catch (e) {
      setSteamMsg({ type: "err", text: e instanceof Error ? e.message : "Sync failed." });
    } finally {
      setSteamBusy(false);
    }
  };

  const [username, setUsername] = useState(profile?.username ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  // A preset avatar is managed in the Gaming tab; keep it out of the URL box.
  const [avatarUrl, setAvatarUrl] = useState(isPresetAvatar(profile?.avatar_url) ? "" : (profile?.avatar_url ?? ""));
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [avatarId, setAvatarId] = useState<string | null>(profileTags?.avatar_id ?? null);
  const [genres, setGenres] = useState<string[]>(profileTags?.genres ?? []);
  const [archetypes, setArchetypes] = useState<string[]>(profileTags?.archetypes ?? []);
  const [gamingSaving, setGamingSaving] = useState(false);
  const [gamingMsg, setGamingMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securitySaving, setSecuritySaving] = useState(false);
  const [securityMsg, setSecurityMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    const trimmed = username.trim();
    if (!trimmed) {
      setProfileMsg({ type: "err", text: "Username cannot be empty." });
      return;
    }
    setProfileSaving(true);
    setProfileMsg(null);
    // An empty URL box shouldn't wipe a preset chosen in the Gaming tab.
    const trimmedUrl = avatarUrl.trim();
    const nextAvatarUrl = trimmedUrl || (isPresetAvatar(profile?.avatar_url) ? profile!.avatar_url : null);
    try {
      const updated = await updateProfile(supabase, userId, {
        username: trimmed,
        bio: bio.trim() || null,
        avatar_url: nextAvatarUrl,
      });
      setProfile(updated);
      setProfileMsg({ type: "ok", text: "Profile updated!" });
    } catch (e) {
      setProfileMsg({ type: "err", text: e instanceof Error ? e.message : "Failed to update profile." });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSaveGaming = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (genres.length > 0 && genres.length < MIN_GENRES) {
      setGamingMsg({ type: "err", text: `Pick at least ${MIN_GENRES} genre.` });
      return;
    }
    setGamingSaving(true);
    setGamingMsg(null);
    try {
      const saved = await upsertProfileTags(supabase, userId, {
        avatar_id: avatarId,
        genres,
        archetypes,
      });
      setProfileTags(saved);
      // Mirror the chosen preset into avatar_url so it renders app-wide.
      if (avatarId) {
        const updated = await updateProfile(supabase, userId, { avatar_url: presetAvatarUrl(avatarId) });
        setProfile(updated);
      }
      setGamingMsg({ type: "ok", text: "Preferences saved!" });
    } catch (e) {
      setGamingMsg({ type: "err", text: e instanceof Error ? e.message : "Failed to save preferences." });
    } finally {
      setGamingSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setSecurityMsg({ type: "err", text: "Passwords do not match." });
      return;
    }
    if (newPassword.length < 6) {
      setSecurityMsg({ type: "err", text: "Password must be at least 6 characters." });
      return;
    }
    setSecuritySaving(true);
    setSecurityMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      setSecurityMsg({ type: "ok", text: "Password updated!" });
    } catch (e) {
      setSecurityMsg({ type: "err", text: e instanceof Error ? e.message : "Failed to update password." });
    } finally {
      setSecuritySaving(false);
    }
  };

  const tabStyle = (s: Section): React.CSSProperties => ({
    padding: "0.5rem 1.25rem",
    background: section === s ? "var(--accent-dim)" : "none",
    border: `1px solid ${section === s ? "var(--accent)" : "var(--border)"}`,
    color: section === s ? "var(--accent)" : "var(--text-muted)",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: section === s ? 600 : 400,
    transition: "all 0.12s",
  });

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.55rem 0.75rem",
    background: "var(--bg-base)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.9rem",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  };

  return (
    <div style={{ maxWidth: 540, margin: "0 auto", padding: "2.5rem clamp(16px, 3vw, 24px)" }}>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-2xl)",
          fontWeight: 600,
          letterSpacing: "-0.015em",
          marginBottom: "var(--space-6)",
          color: "var(--text-primary)",
        }}
      >
        Settings
      </h1>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "2rem" }}>
        <button style={tabStyle("profile")} onClick={() => setSection("profile")}>Profile</button>
        <button style={tabStyle("gaming")} onClick={() => setSection("gaming")}>Gaming</button>
        <button style={tabStyle("connections")} onClick={() => setSection("connections")}>Connections</button>
        <button style={tabStyle("security")} onClick={() => setSection("security")}>Security</button>
      </div>

      {section === "profile" && (
        <form
          onSubmit={handleSaveProfile}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.1rem",
          }}
        >
          <div>
            <label style={labelStyle}>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Tell people about yourself..."
              style={{ ...fieldStyle, resize: "vertical", fontFamily: "var(--font-body)" }}
            />
          </div>
          <div>
            <label style={labelStyle}>Avatar URL</label>
            <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." style={fieldStyle} />
          </div>

          {profileMsg && (
            <p style={{ color: profileMsg.type === "ok" ? "var(--success)" : "var(--danger)", fontSize: "0.85rem", margin: 0 }}>
              {profileMsg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={profileSaving}
            style={{
              padding: "0.65rem",
              background: "var(--grad-brand)",
              border: "none",
              boxShadow: "var(--glow-soft)",
              color: "var(--on-accent)",
              borderRadius: "var(--radius-sm)",
              cursor: profileSaving ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: "0.9rem",
              opacity: profileSaving ? 0.7 : 1,
              fontFamily: "var(--font-body)",
            }}
          >
            {profileSaving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      )}

      {section === "gaming" && (
        <form
          onSubmit={handleSaveGaming}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.75rem",
          }}
        >
          <div>
            <label style={labelStyle}>Avatar</label>
            <AvatarSelect value={avatarId} onChange={setAvatarId} />
          </div>
          <div>
            <label style={labelStyle}>Favourite genres</label>
            <GenreSelect value={genres} onChange={setGenres} />
          </div>
          <div>
            <label style={labelStyle}>Gamer archetype</label>
            <ArchetypeSelect value={archetypes} onChange={setArchetypes} />
          </div>

          {gamingMsg && (
            <p style={{ color: gamingMsg.type === "ok" ? "var(--success)" : "var(--danger)", fontSize: "0.85rem", margin: 0 }}>
              {gamingMsg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={gamingSaving}
            style={{
              padding: "0.65rem",
              background: "var(--grad-brand)",
              border: "none",
              boxShadow: "var(--glow-soft)",
              color: "var(--on-accent)",
              borderRadius: "var(--radius-sm)",
              cursor: gamingSaving ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: "0.9rem",
              opacity: gamingSaving ? 0.7 : 1,
              fontFamily: "var(--font-body)",
            }}
          >
            {gamingSaving ? "Saving..." : "Save Preferences"}
          </button>
        </form>
      )}

      {section === "connections" && (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <div>
            <label style={labelStyle}>Steam</label>
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", margin: "0 0 1rem", lineHeight: 1.55 }}>
              Link your Steam account to import your library and hours played. Your Steam profile's
              “Game details” must be set to Public.
            </p>

            {profile?.steam_id ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      padding: "0.45rem 0.85rem",
                      background: "var(--accent-dim)",
                      border: "1px solid var(--accent-ring)",
                      color: "var(--accent)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    ✓ Linked · {profile.steam_id}
                  </span>
                  <button
                    onClick={handleSyncSteam}
                    disabled={steamBusy}
                    className="btn-pop"
                    style={{
                      padding: "0.45rem 1rem",
                      background: "var(--accent)",
                      border: "none",
                      color: "var(--on-accent)",
                      borderRadius: "var(--radius-sm)",
                      cursor: steamBusy ? "not-allowed" : "pointer",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      fontFamily: "var(--font-body)",
                      opacity: steamBusy ? 0.7 : 1,
                    }}
                  >
                    {steamBusy ? "Syncing…" : "Sync now"}
                  </button>
                  <button
                    onClick={handleUnlinkSteam}
                    disabled={steamBusy}
                    style={{
                      padding: "0.45rem 1rem",
                      background: "transparent",
                      border: "1px solid var(--border)",
                      color: "var(--danger)",
                      borderRadius: "var(--radius-sm)",
                      cursor: steamBusy ? "not-allowed" : "pointer",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      fontFamily: "var(--font-body)",
                      opacity: steamBusy ? 0.6 : 1,
                    }}
                  >
                    Unlink
                  </button>
                </div>
                {profile.steam_synced_at && (
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>
                    Last synced {new Date(profile.steam_synced_at).toLocaleString()}
                  </p>
                )}

                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
                  Syncing refreshes your library and adds played games to your shelf as “Played”.
                  Games you've already logged keep their status &amp; rating.
                </p>
              </div>
            ) : (
              <button
                onClick={handleLinkSteam}
                disabled={steamBusy}
                className="btn-pop"
                style={{
                  padding: "0.6rem 1.25rem",
                  background: "#1b2838",
                  border: "1px solid #316282",
                  color: "#c7d5e0",
                  borderRadius: "var(--radius-sm)",
                  cursor: steamBusy ? "not-allowed" : "pointer",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  fontFamily: "var(--font-body)",
                  opacity: steamBusy ? 0.7 : 1,
                }}
              >
                {steamBusy ? "Redirecting…" : "Link Steam account"}
              </button>
            )}

            {steamMsg && (
              <p style={{ color: steamMsg.type === "ok" ? "var(--success)" : "var(--danger)", fontSize: "0.85rem", margin: "0.85rem 0 0" }}>
                {steamMsg.text}
              </p>
            )}
          </div>
        </div>
      )}

      {section === "security" && (
        <form
          onSubmit={handleChangePassword}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.1rem",
          }}
        >
          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", margin: 0 }}>
            Leave fields blank if you don't want to change your password.
          </p>
          <div>
            <label style={labelStyle}>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 6 characters"
              style={fieldStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={fieldStyle}
            />
          </div>

          {securityMsg && (
            <p style={{ color: securityMsg.type === "ok" ? "var(--success)" : "var(--danger)", fontSize: "0.85rem", margin: 0 }}>
              {securityMsg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={securitySaving || !newPassword}
            style={{
              padding: "0.65rem",
              background: "var(--grad-brand)",
              border: "none",
              boxShadow: "var(--glow-soft)",
              color: "var(--on-accent)",
              borderRadius: "var(--radius-sm)",
              cursor: securitySaving || !newPassword ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: "0.9rem",
              opacity: securitySaving || !newPassword ? 0.7 : 1,
              fontFamily: "var(--font-body)",
            }}
          >
            {securitySaving ? "Updating..." : "Update Password"}
          </button>
        </form>
      )}
    </div>
  );
}
