import { buildDemoProject } from "@gph/core";
import { CheckCircle2, Clock3, GraduationCap, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button, InlineAlert } from "../components";
import { useProjectStore } from "../store/project-store";
import { startNewUserTutorial } from "./tutorial-state";

const TUTORIAL_FEATURES = [
  "Overview",
  "Board",
  "Backlog",
  "Table",
  "Roadmap",
  "Calendar",
  "Docs",
  "Bug triage",
  "My work",
  "Search",
  "Trash",
  "Settings"
];

export function NewUserTutorialView() {
  const navigate = useNavigate();
  const bundle = useProjectStore((state) => state.bundle);
  const isDirty = useProjectStore((state) => state.isDirty);
  const storageTrust = useProjectStore((state) => state.storageTrust);
  const setBundle = useProjectStore((state) => state.setBundle);
  const hasUnprotectedWork = Boolean(bundle) && (isDirty || storageTrust === "unsaved");

  const startTutorial = () => {
    if (hasUnprotectedWork) return;
    const tutorialBundle = buildDemoProject("Tutorial Project");
    setBundle(tutorialBundle, {
      storageKey: null,
      storagePath: null,
      storageTrust: "unsaved"
    });
    startNewUserTutorial(tutorialBundle.project.id);
    navigate("/overview");
  };

  return (
    <div className="tutorial-landing">
      <section className="tutorial-landing-card">
        <div className="tutorial-landing-icon" aria-hidden="true">
          <GraduationCap />
        </div>
        <div className="tutorial-landing-copy">
          <span className="tutorial-landing-kicker">New user tutorial</span>
          <h1>Learn Grillo by doing</h1>
          <p>
            Open a disposable sample project and follow a guided wizard through every core workspace surface.
            You can interact with the demo, move backward, skip ahead from the sidebar, or exit whenever you are ready.
          </p>
        </div>

        <div className="tutorial-landing-benefits" aria-label="Tutorial details">
          <div>
            <Clock3 aria-hidden="true" />
            <span><strong>About 5 minutes</strong><small>13 focused steps</small></span>
          </div>
          <div>
            <ShieldCheck aria-hidden="true" />
            <span><strong>Safe sample data</strong><small>Your projects are not changed</small></span>
          </div>
          <div>
            <CheckCircle2 aria-hidden="true" />
            <span><strong>Learn by clicking</strong><small>Explore the real product</small></span>
          </div>
        </div>

        {hasUnprotectedWork ? (
          <InlineAlert tone="warning">
            Save or close the current unsaved project before starting the tutorial. This keeps your in-progress work protected.
          </InlineAlert>
        ) : null}

        <div className="tutorial-landing-actions">
          <Button disabled={hasUnprotectedWork} onClick={startTutorial} size="lg" variant="primary">
            Start tutorial
          </Button>
          <Link className="btn btn-ghost" to="/projects">Back to projects</Link>
        </div>
        <p className="text-xs text-muted tutorial-landing-note">
          The tutorial project stays browser-local and is not saved unless you explicitly export it.
        </p>
      </section>

      <section className="tutorial-landing-features" aria-labelledby="tutorial-features-title">
        <div>
          <span className="tutorial-landing-kicker">What you will explore</span>
          <h2 id="tutorial-features-title">The complete project workflow</h2>
        </div>
        <div className="tutorial-feature-list">
          {TUTORIAL_FEATURES.map((feature) => <span key={feature}>{feature}</span>)}
        </div>
      </section>
    </div>
  );
}
