export const getDueDateDisplay = (dueDate?: string | null) => {
  if (!dueDate) {
    return {
      isOverdue: false,
      label: "No due date",
    };
  }

  const parsedDate = new Date(dueDate);

  if (Number.isNaN(parsedDate.getTime())) {
    return {
      isOverdue: false,
      label: "No due date",
    };
  }

  const today = new Date();
  const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const normalizedDueDate = new Date(
    parsedDate.getFullYear(),
    parsedDate.getMonth(),
    parsedDate.getDate()
  );

  if (normalizedDueDate < normalizedToday) {
    return {
      isOverdue: true,
      label: "Deadline Crossed",
    };
  }

  return {
    isOverdue: false,
    label: parsedDate.toLocaleDateString(),
  };
};
