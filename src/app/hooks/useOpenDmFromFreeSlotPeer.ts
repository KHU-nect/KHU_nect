import { useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../context/ProfileContext";
import { useDmChat } from "../context/DmChatContext";
import { acceptMatchPost } from "../api/matchPostApi";
import { acceptMatching } from "../api/matchingApi";
import type { FreeSlotPeer } from "../mocks/freeSlotPeers";

function peerPosterUserId(peer: FreeSlotPeer): string {
  return peer.userId ?? `free-slot-peer-${peer.id}`;
}

function isNumericServerUserId(userId: string | undefined): userId is string {
  return !!userId && /^\d+$/.test(userId);
}

/**
 * 공강 매칭·홈 공강 목록 등에서 동일 플로우:
 * 서버 수락(매칭 글 / numeric userId) 또는 로컬 데모 방 생성 → Layout 매칭 성공 모달만 띄움(채팅 탭 자동 이동 없음).
 * @returns 열린 방 ID, 실패·미로그인 시 null
 */
export function useOpenDmFromFreeSlotPeer() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const {
    createRoomFromFreeSlotMatch,
    refreshServerRooms,
    prefetchDirectChatRoom,
    recordMatchSuccessAlert,
  } = useDmChat();

  const isDemoUser = user?.id?.startsWith("demo-user-") ?? false;
  const accepterLabel = useMemo(() => {
    const dept = profile?.department?.trim();
    return dept ? `${dept} 쿠옹이` : "쿠옹이";
  }, [profile?.department]);

  const openDmFromFreeSlotPeer = useCallback(
    async (peer: FreeSlotPeer): Promise<string | null> => {
      if (!user?.id) return null;

      const acceptWithLocal = (): string => {
        const posterUserId = peerPosterUserId(peer);
        return createRoomFromFreeSlotMatch({
          posterUserId,
          accepterUserId: user.id,
          posterLabel: peer.name,
          accepterLabel,
        });
      };

      try {
        if (peer.matchPostId != null) {
          const accepted = await acceptMatchPost(peer.matchPostId);
          await refreshServerRooms();
          const roomId = String(accepted.directChatRoomId);
          await prefetchDirectChatRoom(roomId);
          recordMatchSuccessAlert(user.id, roomId, peer.name);
          return roomId;
        }
        if (!isDemoUser && isNumericServerUserId(peer.userId)) {
          const { directChatRoomId } = await acceptMatching(Number(peer.userId));
          await refreshServerRooms();
          await prefetchDirectChatRoom(directChatRoomId);
          recordMatchSuccessAlert(user.id, directChatRoomId, peer.name);
          return directChatRoomId;
        }
        return acceptWithLocal();
      } catch {
        if (!isDemoUser && isNumericServerUserId(peer.userId)) {
          window.alert("채팅방을 열지 못했어요. 잠시 후 다시 시도해 주세요.");
          return null;
        }
        return acceptWithLocal();
      }
    },
    [
      user?.id,
      isDemoUser,
      refreshServerRooms,
      prefetchDirectChatRoom,
      recordMatchSuccessAlert,
      createRoomFromFreeSlotMatch,
      accepterLabel,
    ]
  );

  return { openDmFromFreeSlotPeer };
}
