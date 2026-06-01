function calculateStats(results) {
  let marks = results.map(r => r.marks);

  let avg = marks.reduce((a, b) => a + b, 0) / marks.length;

  let variance =
    marks.reduce((sum, m) => sum + Math.pow(m - avg, 2), 0) / marks.length;

  let stdDev = Math.sqrt(variance);

  return { avg, stdDev };
}

function calculateGrade(mark, avg, stdDev) {
  if (mark >= avg + stdDev) return "A";
  if (mark >= avg) return "B";
  if (mark >= avg - stdDev) return "C";
  return "D";
}

function predictScore(results) {
  let avg =
    results.reduce((sum, r) => sum + r.marks, 0) / results.length;

  let trend = 0;
  if (results.length >= 2) {
    trend =
      results[results.length - 1].marks -
      results[results.length - 2].marks;
  }

  return Math.round(avg + trend * 0.5);
}

function detectRisk(results) {
  let avg =
    results.reduce((sum, r) => sum + r.marks, 0) / results.length;

  let low = results.filter(r => r.marks < 40).length;

  if (avg < 40 || low >= 2) return "HIGH";
  if (avg < 60) return "MEDIUM";
  return "LOW";
}

module.exports = {
  calculateStats,
  calculateGrade,
  predictScore,
  detectRisk
};