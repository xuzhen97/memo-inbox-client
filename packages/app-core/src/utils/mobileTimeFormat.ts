export function getMobileTimeLabel(dateString: string | Date): string {
  const date = new Date(dateString);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  const minutesStr = minutes < 10 ? `0${minutes}` : minutes.toString();
  return `${hours12}:${minutesStr} ${ampm}`;
}

export function getRelativeDayLabel(dateString: string | Date): string {
  const date = new Date(dateString);
  const now = new Date();
  
  // reset hours for comparison
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffTime = today.getTime() - d.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return '今日';
  if (diffDays === 1) return '昨日';
  
  if (diffDays < 7) {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return days[date.getDay()];
  }
  
  // fallback to date
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}
