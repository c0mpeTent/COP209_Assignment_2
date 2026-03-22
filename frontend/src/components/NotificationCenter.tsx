import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./NotificationCenter.module.css";

interface NotificationItem {
  id: string;
  type:
    | "TASK_ASSIGNED"
    | "TASK_STATUS_CHANGED"
    | "TASK_COMMENTED"
    | "TASK_MENTIONED"
    | "TASK_DELETED"
    | "TASK_CREATED"
    | "TASK_LINKED_TO_STORY";
  message: string;
  isRead: boolean;
  projectId?: string | null;
  workflowId?: string | null;
  taskId?: string | null;
  targetPath?: string | null;
  createdAt: string;
}

const typeLabels: Record<NotificationItem["type"], string> = {
  TASK_ASSIGNED: "Assigned",
  TASK_STATUS_CHANGED: "Status",
  TASK_COMMENTED: "Comment",
  TASK_MENTIONED: "Mention",
  TASK_DELETED: "Deleted",
  TASK_CREATED: "Created",
  TASK_LINKED_TO_STORY: "Assigned To Story",
};

const NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [pendingNotificationId, setPendingNotificationId] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await fetch( `${import.meta.env.VITE_BACKEND_ORIGIN}/api/notification`,
        {
          credentials: "include",
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Could not load notifications");
      }

      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch (error) {
      console.error("Notification fetch failed:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();

    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [loadNotifications]);

  const groupedNotifications = useMemo(
    () => ({ unread: notifications.filter((notification) => !notification.isRead),
      history: notifications,
    }),
    [notifications]
  );

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    const response = await fetch(
      `${import.meta.env.VITE_BACKEND_ORIGIN}/api/notification/${notificationId}/read`,
      {
        method: "PATCH",
        credentials: "include",
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Could not mark notification as read");
    }

    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification
      )
    );
    setUnreadCount((currentCount) => Math.max(0, currentCount - 1));
  }, []);

  const handleOpenNotification = async (notification: NotificationItem) => {
    try {
      setPendingNotificationId(notification.id);
      if (!notification.isRead) {
        await markNotificationAsRead(notification.id);
      }

      if (notification.targetPath) {
        navigate(notification.targetPath);
      }
    } catch (error) {
      console.error("Could not open notification:", error);
      alert(error instanceof Error ? error.message : "Could not open notification");

    } finally {
      setPendingNotificationId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setIsMarkingAll(true);
      const response = await fetch( `${import.meta.env.VITE_BACKEND_ORIGIN}/api/notification/read-all`,
        {
          method: "PATCH",
          credentials: "include",
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Could not mark notifications as read");
      }

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) => ({
          ...notification,
          isRead: true,
        }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Could not mark all notifications as read:", error);
      alert(error instanceof Error ? error.message : "Could not mark all notifications as read");
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleClearHistory = async () => {
    const confirmed = window.confirm("Clear all notification history?");
    if (!confirmed) {
      return;
    }

    try {
      setIsClearingHistory(true);
      const response = await fetch( `${import.meta.env.VITE_BACKEND_ORIGIN}/api/notification/clear-history`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Could not clear notification history");
      }

      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error("Could not clear notification history:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Could not clear notification history"
      );
    } finally {
      setIsClearingHistory(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading notifications...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Notifications</h1>
          <p className={styles.subtitle}>
            In-app notification center for assignments, status updates, comments, mentions and much more. Stay informed about all your project activities in one place.
          </p>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.unreadBadge}>{unreadCount} unread</span>
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderLeft}>
            <h2 className={styles.sectionTitle}>Unread</h2>
            <button
              className={styles.markAllBtn}
              onClick={() => void handleMarkAllAsRead()}
              disabled={isMarkingAll || unreadCount === 0}
            > {isMarkingAll ? "Marking..." : "Mark All As Read"}
            </button>
          </div>
          <span className={styles.sectionCount}>{groupedNotifications.unread.length}</span>
        </div>
        {groupedNotifications.unread.length === 0 ? (
          <div className={styles.emptyState}>You are all caught up.</div>
        ) : (
          <div className={styles.list}>
            {groupedNotifications.unread.map((notification) => (
              <button
                key={notification.id}
                className={`${styles.card} ${styles.unreadCard}`}
                onClick={() => void handleOpenNotification(notification)}
                disabled={pendingNotificationId === notification.id}
              >
                <div className={styles.cardTop}>
                  <span className={styles.typeBadge}>{typeLabels[notification.type]}</span>
                  <span className={styles.timestamp}>
                    {new Date(notification.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className={styles.message}>{notification.message}</p>
                <span className={styles.openText}>
                  {pendingNotificationId === notification.id ? "Opening..." : "Open"}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderLeft}>
            <h2 className={styles.sectionTitle}>History</h2>
            <button
              className={styles.clearHistoryBtn}
              onClick={() => void handleClearHistory()}
              disabled={isClearingHistory || groupedNotifications.history.length === 0}
            > {isClearingHistory ? "Clearing..." : "Clear History"}
            </button>
          </div>
          <span className={styles.sectionCount}>{groupedNotifications.history.length}</span>
        </div>
        {groupedNotifications.history.length === 0 ? (
          <div className={styles.emptyState}>No notifications have been created yet.</div>
        ) : (
          <div className={styles.list}>
            {groupedNotifications.history.map((notification) => (
              <div
                key={notification.id}
                className={`${styles.card} ${notification.isRead ? styles.readCard : styles.unreadCard}`}
              >
                <button
                  className={styles.cardContent}
                  onClick={() => void handleOpenNotification(notification)}
                  disabled={pendingNotificationId === notification.id}
                >
                  <div className={styles.cardTop}>
                    <span className={styles.typeBadge}>{typeLabels[notification.type]}</span>
                    <span className={styles.timestamp}>
                      {new Date(notification.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className={styles.message}>{notification.message}</p>
                </button>
                <div className={styles.cardFooter}>
                  <div className={styles.cardFooterLeft}>
                    {!notification.isRead ? (
                      <button
                        className={styles.secondaryBtn}
                        disabled={pendingNotificationId === notification.id}
                        onClick={() => void markNotificationAsRead(notification.id)}
                      >
                        Mark As Read
                      </button>
                    ) : (
                      <span className={styles.readLabel}>Read</span>
                    )}
                  </div>
                  <button
                    className={styles.openBtn}
                    disabled={pendingNotificationId === notification.id}
                    onClick={() => void handleOpenNotification(notification)}
                  >
                    {pendingNotificationId ===  notification.id ? "Opening..." : "Open"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default NotificationCenter;
