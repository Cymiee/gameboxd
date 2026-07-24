import { useState } from "react";
import { updateProfile, upsertProfileTags, MIN_GENRES } from "@gameboxd/lib";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/auth";
import AvatarSelect from "../components/onboarding/AvatarSelect";
import GenreSelect from "../components/onboarding/GenreSelect";
import ArchetypeSelect from "../components/onboarding/ArchetypeSelect";

type Section = "profile" | "gaming" | "security";

export default function SettingsPage() {
  const { userId, profile, setProfile, profileTags, setProfileTags } = useAuthStore();
  const [section, setSection] = useState<Section>("profile");

  const [username, setUsername] = useState(profile?.username ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
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
    try {
      const updated = await updateProfile(supabase, userId, {
        username: trimmed,
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null,
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
              background: "var(--accent)",
              border: "none",
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
              background: "var(--accent)",
              border: "none",
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
              background: "var(--accent)",
              border: "none",
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
