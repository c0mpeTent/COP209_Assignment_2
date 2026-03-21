import React from "react";
import type { TaskHistoryEntry } from "../types/kanban";
import styles from "./ActivityTimeline.module.css";

interface ActivityTimelineProps {
  entries: TaskHistoryEntry[];
}

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ entries }) => {
  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>Activity Timeline</h2>
        <p className={styles.subtitle}>
          Status changes, direct edits, assignee updates, and comment activity are tracked here.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className={styles.emptyState}>No activity has been logged for this task yet.</div>
      ) : (
        <div className={styles.timeline}>
          {entries.map((entry) => (
            <article key={`${entry.event}-${entry.createdAt}-${entry.commentId ?? "event"}`} className={styles.eventCard}>
              <div className={styles.eventMarker} />
              <div className={styles.eventBody}>
                <div className={styles.eventHeader}>
                  <strong className={styles.eventActor}>{entry.actorName}</strong>
                  <span className={styles.eventTime}>
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className={styles.eventMessage}>{entry.message}</p>
                {(entry.oldValue || entry.newValue) && (
                  <div className={styles.changeRow}>
                    {entry.oldValue && <span className={styles.oldValue}>{entry.oldValue}</span>}
                    {entry.oldValue && entry.newValue && <span className={styles.arrow}>→</span>}
                    {entry.newValue && <span className={styles.newValue}>{entry.newValue}</span>}
                  </div>
                )}
                {entry.mentions && entry.mentions.length > 0 && (
                  <div className={styles.mentions}>
                    {entry.mentions.map((mention) => (
                      <span key={mention.id} className={styles.mentionChip}>
                        @{mention.email.split("@")[0]}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default ActivityTimeline;
