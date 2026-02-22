// Category color map
const CATEGORY_COLORS = {
  career: "#8B5CF6",
  health: "#10B981",
  finance: "#F59E0B",
  hobbies: "#EC4899",
  growth: "#6366F1",
  social: "#14B8A6",
};

export async function exportDreamCard({ title, category, progress, goalCount, completedGoals, daysLeft, status }) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d");

  const catColor = CATEGORY_COLORS[category] || "#8B5CF6";

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, 1080, 1080);
  bg.addColorStop(0, "#0F0A1E");
  bg.addColorStop(0.5, "#1A1040");
  bg.addColorStop(1, "#0F0A1E");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1080, 1080);

  // Decorative circles
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = catColor;
  ctx.beginPath();
  ctx.arc(900, 200, 300, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(180, 880, 200, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Card background
  const cardX = 80, cardY = 200, cardW = 920, cardH = 600, cardR = 32;
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, cardR);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Progress ring
  const ringX = 540, ringY = 420, ringR = 100;
  ctx.lineWidth = 12;
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.arc(ringX, ringY, ringR, 0, Math.PI * 2);
  ctx.stroke();

  const progressAngle = (progress / 100) * Math.PI * 2 - Math.PI / 2;
  ctx.strokeStyle = catColor;
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(ringX, ringY, ringR, -Math.PI / 2, progressAngle);
  ctx.stroke();

  // Progress text
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 48px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${progress}%`, ringX, ringY);

  // Dream title
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 36px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title.length > 30 ? title.slice(0, 30) + "..." : title, 540, 580);

  // Category badge
  ctx.fillStyle = catColor;
  const catText = category.charAt(0).toUpperCase() + category.slice(1);
  ctx.font = "600 18px Inter, sans-serif";
  const catWidth = ctx.measureText(catText).width + 24;
  ctx.beginPath();
  ctx.roundRect(540 - catWidth / 2, 620, catWidth, 32, 10);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(catText, 540, 636);

  // Stats row
  ctx.font = "500 20px Inter, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.textAlign = "center";
  ctx.fillText(`${completedGoals}/${goalCount} Goals  •  ${daysLeft} days left`, 540, 700);

  // Status badge
  ctx.fillStyle = status === "active" ? "#10B981" : status === "completed" ? "#8B5CF6" : "#F59E0B";
  ctx.font = "bold 16px Inter, sans-serif";
  const statusText = status.charAt(0).toUpperCase() + status.slice(1);
  const statusW = ctx.measureText(statusText).width + 20;
  ctx.beginPath();
  ctx.roundRect(540 - statusW / 2, 740, statusW, 28, 8);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(statusText, 540, 754);

  // Watermark
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "500 16px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("DreamPlanner", 540, 980);

  // Subtitle
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.font = "400 13px Inter, sans-serif";
  ctx.fillText("dreamplanner.app", 540, 1005);

  // Convert to blob
  return new Promise(resolve => canvas.toBlob(resolve, "image/png"));
}
