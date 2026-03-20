import { useState } from "react";
import { updateProfile } from "@gameboxd/lib";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/auth";

type Section = "profile" | "security";

export default function SettingsPage() {
  const { userId, profile, setProfile } = useAuthStore();
  const [section, setSection] = useState<Section>("profile");

  const [username, setUsername] = useState(profile?.username ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

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
    background: section === s ? "rgba(228,255,26,0.1)" : "none",
    border: `1px solid ${section === s ? "var(--accent)" : "var(--border)"}`,
    color: section === s ? "var(--accent)" : "var(--muted)",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: section === s ? 600 : 400,
    transition: "all 0.12s",
  });

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.55rem 0.75rem",
    background: "var(--bg)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    borderRadius: 8,
    fontSize: "0.9rem",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.75rem",
    color: "var(--muted)",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  };

  return (
    <div style={{ maxWidth: 540, margin: "0 auto", padding: "2.5rem 24px" }}>
      <h1
        style={{
          fontFamily: "Syne, sans-serif",
          fontSize: "1.5rem",
          fontWeight: 700,
          marginBottom: "1.5rem",
          color: "var(--text)",
        }}
      >
        Settings
      </h1>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}>
        <button style={tabStyle("profile")} onClick={() => setSection("profile")}>Profile</button>
        <button style={tabStyle("security")} onClick={() => setSection("security")}>Security</button>
      </div>

      {section === "profile" && (
        <form
          onSubmit={handleSaveProfile}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
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
              style={{ ...fieldStyle, resize: "vertical", fontFamily: "Inter, sans-serif" }}
            />
          </div>
          <div>
            <label style={labelStyle}>Avatar URL</label>
            <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." style={fieldStyle} />
          </div>

          {profileMsg && (
            <p style={{ color: profileMsg.type === "ok" ? "#4ade80" : "var(--danger)", fontSize: "0.85rem", margin: 0 }}>
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
              color: "#0e0e10",
              borderRadius: 8,
              cursor: profileSaving ? "not-allowed" : "pointer",
              fontWeight: 700,
              fontSize: "0.9rem",
              opacity: profileSaving ? 0.7 : 1,
              fontFamily: "Syne, sans-serif",
            }}
          >
            {profileSaving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      )}

      {section === "security" && (
        <form
          onSubmit={handleChangePassword}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.1rem",
          }}
        >
          <p style={{ fontSize: "0.875rem", color: "var(--muted)", margin: 0 }}>
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
            <p style={{ color: securityMsg.type === "ok" ? "#4ade80" : "var(--danger)", fontSize: "0.85rem", margin: 0 }}>
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
              color: "#0e0e10",
              borderRadius: 8,
              cursor: securitySaving || !newPassword ? "not-allowed" : "pointer",
              fontWeight: 700,
              fontSize: "0.9rem",
              opacity: securitySaving || !newPassword ? 0.7 : 1,
              fontFamily: "Syne, sans-serif",
            }}
          >
            {securitySaving ? "Updating..." : "Update Password"}
          </button>
        </form>
      )}
    </div>
  );
}
