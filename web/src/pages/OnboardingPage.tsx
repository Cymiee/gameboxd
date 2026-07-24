import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { upsertProfileTags, MIN_GENRES, type ProfileTagsUpdate } from "@gameboxd/lib";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/auth";
import { useIsMobile } from "../hooks/useIsMobile";
import AvatarSelect from "../components/onboarding/AvatarSelect";
import GenreSelect from "../components/onboarding/GenreSelect";
import ArchetypeSelect from "../components/onboarding/ArchetypeSelect";

const STEPS = ["avatar", "genres", "archetypes"] as const;
type Step = (typeof STEPS)[number];

const STEP_COPY: Record<Step, { title: string; subtitle: string }> = {
  avatar: { title: "Pick your avatar", subtitle: "Choose a look for your profile. You can change it anytime." },
  genres: { title: "What do you play?", subtitle: "Pick a few genres you love so we can tailor recommendations." },
  archetypes: { title: "What kind of gamer are you?", subtitle: "Choose up to three that fit your style." },
};

function isStep(value: string | undefined): value is Step {
  return STEPS.includes(value as Step);
}

export default function OnboardingPage() {
  const { step } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { userId, profileTags, setProfileTags } = useAuthStore();

  // Local working copy of the selections, seeded from any saved tags (resumable).
  const [avatarId, setAvatarId] = useState<string | null>(profileTags?.avatar_id ?? null);
  const [genres, setGenres] = useState<string[]>(profileTags?.genres ?? []);
  const [archetypes, setArchetypes] = useState<string[]>(profileTags?.archetypes ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If tags arrive after mount (async load), backfill anything still untouched.
  useEffect(() => {
    if (!profileTags) return;
    setAvatarId((cur) => cur ?? profileTags.avatar_id ?? null);
    setGenres((cur) => (cur.length ? cur : profileTags.genres ?? []));
    setArchetypes((cur) => (cur.length ? cur : profileTags.archetypes ?? []));
  }, [profileTags]);

  const stepIndex = useMemo(() => (isStep(step) ? STEPS.indexOf(step) : -1), [step]);

  if (!isStep(step)) return <Navigate to="/onboarding/avatar" replace />;

  const isLast = stepIndex === STEPS.length - 1;
  const copy = STEP_COPY[step];

  const canContinue =
    step === "avatar" ? avatarId !== null
    : step === "genres" ? genres.length >= MIN_GENRES
    : archetypes.length >= 1;

  async function persist(updates: ProfileTagsUpdate) {
    if (!userId) return;
    const saved = await upsertProfileTags(supabase, userId, updates);
    setProfileTags(saved);
  }

  function goNext() {
    navigate(`/onboarding/${STEPS[stepIndex + 1]}`);
  }

  function finish() {
    navigate("/");
  }

  // Save this step's field, then advance (or finish on the last step).
  async function handleContinue() {
    if (!userId || saving) return;
    setSaving(true);
    setError(null);
    try {
      if (step === "avatar" && avatarId) await persist({ avatar_id: avatarId });
      else if (step === "genres") await persist({ genres });
      else if (step === "archetypes") await persist({ archetypes, onboarding_completed: true });

      if (isLast) finish();
      else goNext();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // Advance without saving this step. Completing the last step still marks onboarding done.
  async function handleSkipStep() {
    if (saving) return;
    if (!isLast) {
      goNext();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await persist({ onboarding_completed: true });
      finish();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // Bail out of the whole wizard, keeping anything already selected.
  async function handleSkipAll() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await persist({
        ...(avatarId ? { avatar_id: avatarId } : {}),
        genres,
        archetypes,
        onboarding_completed: true,
      });
      finish();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const secondaryBtn: React.CSSProperties = {
    flex: 1,
    padding: "0.8rem",
    background: "var(--bg-inset)",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    cursor: saving ? "not-allowed" : "pointer",
    fontSize: "0.95rem",
    fontWeight: 600,
    fontFamily: "var(--font-body)",
  };

  const primaryBtn: React.CSSProperties = {
    flex: 1,
    padding: "0.8rem",
    background: "var(--accent)",
    color: "var(--on-accent)",
    border: "1px solid var(--accent)",
    borderRadius: "var(--radius-sm)",
    cursor: !canContinue || saving ? "not-allowed" : "pointer",
    opacity: !canContinue || saving ? 0.5 : 1,
    fontSize: "0.95rem",
    fontWeight: 600,
    fontFamily: "var(--font-body)",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: isMobile ? "1.5rem 1.25rem 2.5rem" : "2.5rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: 620, display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Header: progress + skip all */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>
            Step {stepIndex + 1} of {STEPS.length}
          </span>
          <button
            type="button"
            onClick={handleSkipAll}
            disabled={saving}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: "0.85rem",
              fontFamily: "var(--font-body)",
              textDecoration: "underline",
              padding: 0,
            }}
          >
            Skip all
          </button>
        </div>

        {/* Segmented progress bar */}
        <div style={{ display: "flex", gap: "0.4rem" }}>
          {STEPS.map((s, i) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 999,
                background: i <= stepIndex ? "var(--accent)" : "var(--border)",
                transition: "background 0.2s",
              }}
            />
          ))}
        </div>

        {/* Title */}
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-2xl)",
              fontWeight: 600,
              letterSpacing: "-0.015em",
              color: "var(--text-primary)",
              margin: "0 0 0.4rem",
            }}
          >
            {copy.title}
          </h1>
          <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
            {copy.subtitle}
          </p>
        </div>

        {/* Step body */}
        <div>
          {step === "avatar" && <AvatarSelect value={avatarId} onChange={setAvatarId} />}
          {step === "genres" && <GenreSelect value={genres} onChange={setGenres} />}
          {step === "archetypes" && <ArchetypeSelect value={archetypes} onChange={setArchetypes} />}
        </div>

        {error && <p style={{ color: "var(--danger)", fontSize: "0.875rem", margin: 0 }}>{error}</p>}

        {/* Footer: Skip + Continue given equal visual weight (no dark patterns). */}
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
          <button type="button" onClick={handleSkipStep} disabled={saving} style={secondaryBtn}>
            Skip
          </button>
          <button type="button" onClick={handleContinue} disabled={!canContinue || saving} style={primaryBtn}>
            {saving ? "Saving…" : isLast ? "Finish" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
