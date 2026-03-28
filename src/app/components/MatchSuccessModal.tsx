import { HandshakeIcon, MessageCircle, X } from "lucide-react";

type Props = {
  open: boolean;
  peerLabel: string;
  onClose: () => void;
  onGoToChat: () => void;
};

export function MatchSuccessModal({ open, peerLabel, onClose, onGoToChat }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/45">
      <div
        className="w-full max-w-sm rounded-2xl bg-white shadow-xl overflow-hidden border border-gray-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-success-title"
      >
        <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#FDF5E6" }}
            >
              <HandshakeIcon className="w-5 h-5" style={{ color: "#A71930" }} />
            </div>
            <div className="min-w-0">
              <h2 id="match-success-title" className="text-base font-bold text-gray-900">
                매칭 성공!
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                <span className="font-semibold text-[#A71930]">{peerLabel}</span>님과 연결됐어요
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 pb-5 space-y-4">
          <div className="text-sm text-gray-600 leading-relaxed space-y-2">
            <p>1:1 채팅방이 열렸어요. 지금 바로 대화를 시작할 수 있어요.</p>
            <p className="text-xs text-gray-500">
              하단 <span className="font-semibold text-gray-700">채팅</span> 탭에서도 1:1 대화를 확인할 수 있어요.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onGoToChat}
              className="w-full py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2"
              style={{ backgroundColor: "#A71930" }}
            >
              <MessageCircle className="w-4 h-4" />
              1:1 채팅방으로 이동
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              나중에 보기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
