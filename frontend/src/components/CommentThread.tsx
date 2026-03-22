import React, { useMemo, useState } from "react";
import type { BoardMemberOption, Comment } from "../types/kanban";
import styles from "./CommentThread.module.css";

interface CommentThreadProps {
  comments: Comment[];
  currentUserId: string;
  members: BoardMemberOption[];
  isReadOnly: boolean;
  onCreate: (text: string) => Promise<void>;
  onUpdate: (commentId: string, text: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const renderMarkdown = (value: string) => {
  const safeValue = escapeHtml(value);

  return safeValue
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/__([^_]+)__/g, "<u>$1</u>")
    .replace(
      /(^|\s)@([a-zA-Z0-9._-]+)/g,
      '$1<span class="commentMention">@$2</span>'
    )
    .replace(/\n/g, "<br />");
};

const getMentionHints = (members: BoardMemberOption[]) =>
  members
    .slice(0, 4)
    .map((member) => `@${member.email.split("@")[0]}`)
    .join(", ");

const CommentThread: React.FC<CommentThreadProps> = ({
  comments,
  currentUserId,
  members,
  isReadOnly,
  onCreate,
  onUpdate,
  onDelete,
}) => {
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const mentionHints = useMemo(() => getMentionHints(members), [members]);

  const handleCreate = async () => {
    if (!newComment.trim()) {
      return;
    }

    try {
      setIsSubmitting(true);
      await onCreate(newComment);

      setNewComment("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingCommentId || !editingText.trim()) { return; }

    try {
      setIsSubmitting(true);
      await onUpdate(editingCommentId, editingText);
      setEditingCommentId(null);
      setEditingText("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      setDeletingCommentId(commentId);
      await onDelete(commentId);

    } finally {
      setDeletingCommentId(null);
    }
  };

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Comments</h2>
          <p className={styles.subtitle}> 
            Supports `**bold**`, `*italic*`, `__underline__`, `code`, line breaks, and mentions like{" "}
            {mentionHints || "@username"}.
          </p>
        </div>
      </div>

      {!isReadOnly && (
        <div className={styles.editor}>
          <textarea
            rows={5}
            value={newComment}
            placeholder="Write a comment..."
            disabled={isSubmitting}
            onChange={(event) => setNewComment(event.target.value)}
          />
          <div className={styles.editorFooter}>
            <span className={styles.helpText}>Use @username to mention project members.</span>
            <button
              className={styles.primaryButton}
              disabled={isSubmitting || !newComment.trim()}
              onClick={() => void handleCreate()}
            > {isSubmitting ? "Adding..." : "Add Comment"}
            </button>
          </div>
        </div>
      )}

      <div className={styles.commentList}>
        {comments.length === 0 ? (
          <div className={styles.emptyState}>No comments yet. Start the discussion here.</div>
        ) : (
          comments.map((comment) => {
            const isOwner = comment.authorId === currentUserId;
            const isEditing = editingCommentId === comment.id;

            return (
              <article key={comment.id} className={styles.commentCard}>
                <div className={styles.commentHeader}>
                  <div>
                    <strong className={styles.authorName}>
                      {comment.author?.name || comment.authorName}
                    </strong>
                    <span className={styles.timestamp}>
                      {new Date(comment.updatedAt).toLocaleString()}
                    </span>
                  </div>
                  {!isReadOnly && isOwner && (
                    <div className={styles.commentActions}>
                      <button
                        className={styles.secondaryButton}
                        disabled={isSubmitting || deletingCommentId === comment.id}
                        onClick={() => {
                          setEditingCommentId(comment.id);
                          setEditingText(comment.text);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className={styles.deleteButton}
                        disabled={isSubmitting || deletingCommentId === comment.id}
                        onClick={() => void handleDelete(comment.id)}
                      > {deletingCommentId === comment.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className={styles.editArea}>
                    <textarea
                      rows={4}
                      value={editingText}
                      disabled={isSubmitting}
                      onChange={(event) => setEditingText(event.target.value)}
                    />
                    <div className={styles.editorFooter}>
                      <button
                        className={styles.secondaryButton}
                        disabled={isSubmitting}
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditingText("");
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className={styles.primaryButton}
                        disabled={isSubmitting || !editingText.trim()}
                        onClick={() => void handleUpdate()}
                      >
                        {isSubmitting ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={styles.commentBody}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(comment.text) }}
                  />
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
};

export default CommentThread;
