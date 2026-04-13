function padDateTimePart(value: number) {
  return value.toString().padStart(2, "0");
}

export function formatDateTime(value: string | number | Date) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = padDateTimePart(date.getMonth() + 1);
  const day = padDateTimePart(date.getDate());
  const hours = padDateTimePart(date.getHours());
  const minutes = padDateTimePart(date.getMinutes());

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
