export function daysBetween(date: string, now = new Date()) {
  const target = new Date(date);

  if (Number.isNaN(target.getTime())) return 0;

  const start = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const current = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return Math.max(
    0,
    Math.floor((current.getTime() - start.getTime()) / 86400000),
  );
}

export function daysUntil(date: string, now = new Date()) {
  const target = new Date(date);

  if (Number.isNaN(target.getTime())) return 0;

  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(target.getFullYear(), target.getMonth(), target.getDate());

  return Math.max(
    0,
    Math.ceil((end.getTime() - start.getTime()) / 86400000),
  );
}

export function greetingFor(date: Date) {
  const hour = date.getHours();

  if (hour < 6) return "凌晨好";
  if (hour < 11) return "早上好";
  if (hour < 14) return "中午好";
  if (hour < 18) return "下午好";

  return "晚上好";
}
