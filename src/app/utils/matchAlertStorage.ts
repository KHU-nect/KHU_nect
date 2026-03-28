export type MatchAlertPayload = {
  roomId: string;
  peerLabel: string;
  matchedAt: string;
};

const STORAGE_KEY = "khu-nect_dm_match_alerts";

type AlertsMap = Record<string, MatchAlertPayload>;

function load(): AlertsMap {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as AlertsMap;
  } catch {
    return {};
  }
}

function save(map: AlertsMap) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function getMatchAlertForUser(userId: string): MatchAlertPayload | null {
  return load()[userId] ?? null;
}

export function setMatchAlertsForBothUsers(
  posterUserId: string,
  accepterUserId: string,
  roomId: string,
  posterSeesLabel: string,
  accepterSeesLabel: string
) {
  const map = load();
  const matchedAt = new Date().toISOString();
  map[posterUserId] = { roomId, peerLabel: posterSeesLabel, matchedAt };
  map[accepterUserId] = { roomId, peerLabel: accepterSeesLabel, matchedAt };
  save(map);
}

export function dismissMatchAlert(userId: string) {
  const map = load();
  if (map[userId]) {
    delete map[userId];
    save(map);
  }
}
