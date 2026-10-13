import { APPS, modeOf } from "../../modes.js";

import styles from "./AppsPage.module.css";

export default function AppsPage({ onOpenApp }) {
  return (
    <div className="page">
      <div className="pageInner">
        <h1 className="pageTitle">Apps</h1>
        <p className="pageSubtitle">
          Ready-made assistants. Pick one to start a focused chat.
        </p>

        <div className={styles.grid}>
          {APPS.map((app) => {
            const { label, icon: Icon } = modeOf(app.mode);

            return (
              <button
                key={app.mode}
                type="button"
                className={styles.card}
                onClick={() => onOpenApp(app.mode)}
              >
                <div className={styles.icon}>
                  <Icon size={22} />
                </div>

                <div className={styles.text}>
                  <strong>{label}</strong>
                  <span>{app.description}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
