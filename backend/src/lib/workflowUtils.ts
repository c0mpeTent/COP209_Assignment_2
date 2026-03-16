export type WorkflowColumnLike = {
  id: string;
  name: string;
  order: number;
  wipLimit: number | null;
};

export const parseDueDate = (value: unknown) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("Invalid due date format");
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("Invalid due date format");
  }

  return parsedDate;
};

export const getLifecycleDatesForStatus = (
  columns: WorkflowColumnLike[],
  statusId: string,
  currentResolvedAt: Date | null,
  currentClosedAt: Date | null,
  now = new Date()
) => {
  const orderedColumns = columns.sort((left, right) => left.order - right.order);
  const lastColumn = orderedColumns[orderedColumns.length - 1] ?? null;
  const resolvedColumn = orderedColumns.find((column) => column.name.trim().toLowerCase() === "done") ?? null;
  const currentColumn = orderedColumns.find((column) => column.id === statusId) ?? null;
  const hasReachedResolvedColumn =
    Boolean(currentColumn && resolvedColumn && currentColumn.order >= resolvedColumn.order);

  return {
    resolvedAt: hasReachedResolvedColumn ? currentResolvedAt ?? now : null,
    closedAt:
      lastColumn && statusId === lastColumn.id
        ? currentClosedAt ?? now
        : null,
  };
};

export const deriveStoryStatusId = (
  columns: WorkflowColumnLike[],
  childStatusIds: string[]
) => {
  const orderedColumns = columns.sort((left, right) => left.order - right.order);
  const firstColumn = orderedColumns[0] ?? null;

  if (!firstColumn) {
    return null;
  }

  if (childStatusIds.length === 0) {
    return firstColumn.id;
  }

  const columnById = new Map(orderedColumns.map((column) => [column.id, column]));
  const rankedStatuses = childStatusIds
    .map((statusId) => columnById.get(statusId))
    .filter((column): column is WorkflowColumnLike => Boolean(column));

  if (rankedStatuses.length === 0) {
    return firstColumn.id;
  }

  return rankedStatuses.reduce((leftmost, current) =>
    current.order < leftmost.order ? current : leftmost
  ).id;
};

export const getColumnOrderUpdates = (columnIds: string[]) =>
  columnIds.map((columnId, index) => ({
    id: columnId,
    order: index,
  }));