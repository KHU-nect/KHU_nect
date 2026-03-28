import type { DmRoom } from "../types/dmChat";

const STORAGE_KEY = "khu-nect_dm_read_state";

/** userId -> roomId -> 마지막으로 읽은 시점(해당 시각 이전 메시지는 읽음 처리) */
type ReadState = Record<string, Record<string, string>>;

function load(): ReadState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ReadState;
  } catch {
    return {};
  }
}

function save(state: ReadState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getLastReadIso(userId: string, roomId: string): string | null {
  return load()[userId]?.[roomId] ?? null;
}

/** 상대가 보낸 메시지 중 아직 읽지 않은 개수 */
export function countUnreadDm(room: DmRoom, userId: string): number {
  const lastRead = getLastReadIso(userId, room.id);
  const peerMsgs = room.messages.filter((m) => m.senderUserId !== userId);
  if (!lastRead) {
    return peerMsgs.length;
  }
  const t = new Date(lastRead).getTime();
  return peerMsgs.filter((m) => new Date(m.createdAt).getTime() > t).length;
}

export function markDmRoomRead(userId: string, room: DmRoom) {
  const state = load();
  if (!state[userId]) state[userId] = {};
  const lastMsg = room.messages[room.messages.length - 1];
  const iso = lastMsg ? lastMsg.createdAt : new Date().toISOString();
  state[userId][room.id] = iso;
  save(state);
}

export function totalUnreadForUser(
  userId: string,
  rooms: DmRoom[],
  countFn: (room: DmRoom, uid: string) => number = countUnreadDm
): number {
  return rooms.reduce((sum, r) => sum + countFn(r, userId), 0);
}
