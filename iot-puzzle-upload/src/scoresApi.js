// Google Sheets backend via a Google Apps Script web app (see google-apps-script/Code.gs).
const SHEETS_URL = import.meta.env.VITE_SHEETS_URL;

const ensureUrl = () => {
  if (!SHEETS_URL) throw new Error('VITE_SHEETS_URL is not set');
};

export async function fetchScores(unitId) {
  ensureUrl();
  const res = await fetch(`${SHEETS_URL}?unit=${encodeURIComponent(unitId)}`);
  if (!res.ok) throw new Error(`Leaderboard request failed: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.scores || [];
}

export async function saveScore(unitId, entry) {
  ensureUrl();
  // text/plain avoids a CORS preflight, which Apps Script web apps don't support.
  const res = await fetch(SHEETS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ unit: unitId, ...entry }),
  });
  if (!res.ok) throw new Error(`Save request failed: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}
