import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { LionAvatar } from "./LionAvatar";
import { Mail, Calendar, Heart, MessageCircle, ThumbsUp, Star, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";
import { Textarea } from "./ui/textarea";
import { hobbyMatchPercent } from "../utils/hobbyOverlap";

/** 프로필 모달 포인트 컬러 */
const PROFILE_BRAND = "#A11D33";
const PROFILE_GOLD = "#E6A620";
const PROFILE_SURFACE = "#F5F5F5";
/** 오늘의 질문 박스 — 시안과 동일하게 버건디 그라데이션 */
const TODAY_QUESTION_BG = "linear-gradient(135deg, #A71930 0%, #8B1526 100%)";

interface UserProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user?: {
    department?: string;
    name?: string;
    year?: string;
    todayQuestion?: string;
    activity?: string;
    hobbies?: string[];
    bio?: string;
    /** viewerHobbies 미전달 시에만 사용 (수업 매칭 등) */
    matchingRate?: number;
  };
  /** 내 취미 목록. 넘기면 매칭률 = 겹치는 수 / 내 취미 수 */
  viewerHobbies?: string[];
  showReviewButton?: boolean;
  onSendMessage?: () => void;
  onRequestMatch?: () => void;
}

function profileTitle(user: NonNullable<UserProfileDialogProps["user"]>): string {
  const n = user.name?.trim();
  if (n) return n;
  const d = user.department?.trim();
  if (d) return `${d} 쿠옹이`;
  return "쿠옹이";
}

function profileSubtitleLine(user: NonNullable<UserProfileDialogProps["user"]>): string | undefined {
  const d = user.department?.trim();
  return d || undefined;
}

export function UserProfileDialog({
  isOpen,
  onClose,
  user,
  viewerHobbies,
  showReviewButton = false,
  onSendMessage,
  onRequestMatch,
}: UserProfileDialogProps) {
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(5);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitReview = () => {
    console.log("Review submitted:", { user: user?.name, rating, reviewText });
    setSubmitted(true);
    setTimeout(() => {
      setIsReviewDialogOpen(false);
      setSubmitted(false);
      setReviewText("");
      setRating(5);
    }, 1500);
  };

  if (!user) {
    return null;
  }

  const deptLine = profileSubtitleLine(user);
  const todayQuestion = user.todayQuestion?.trim() || user.activity?.trim() || "";

  let displayMatchingRate: number | undefined;
  if (viewerHobbies !== undefined) {
    displayMatchingRate = hobbyMatchPercent(viewerHobbies, user.hobbies ?? []);
  } else {
    displayMatchingRate = user.matchingRate;
  }
  const showMatchingBlock = displayMatchingRate !== undefined;

  return (
    <>
      <Dialog open={isOpen && !!user} onOpenChange={onClose}>
        <DialogContent className="max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-xl sm:max-w-md gap-0 sm:p-7">
          <DialogHeader className="space-y-1 text-center sm:text-center">
            <DialogTitle className="text-lg font-bold tracking-tight text-gray-900">프로필</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              {profileTitle(user)}의 프로필입니다.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-5">
            <div className="flex flex-col items-center space-y-3 text-center">
              <LionAvatar department={user.department ?? ""} size="lg" />
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{profileTitle(user)}</h3>
                {deptLine && <p className="mt-1 text-sm text-gray-500">{deptLine}</p>}
                {user.year?.trim() && <p className="mt-0.5 text-xs text-gray-400">{user.year}</p>}
              </div>
            </div>

            <div
              className="rounded-2xl p-5 text-white shadow-sm"
              style={{ background: TODAY_QUESTION_BG }}
            >
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-5 w-5 shrink-0 text-white" strokeWidth={2} />
                <span className="text-sm font-semibold text-white">오늘의 질문</span>
              </div>
              {todayQuestion ? (
                <p className="text-base font-bold leading-snug text-white">{todayQuestion}</p>
              ) : (
                <p className="text-sm font-medium leading-snug text-white/90">
                  아직 등록된 질문이 없어요.
                </p>
              )}
            </div>

            {user.bio?.trim() && (
              <div className="rounded-2xl p-5" style={{ backgroundColor: PROFILE_SURFACE }}>
                <div className="mb-3 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 shrink-0" style={{ color: PROFILE_BRAND }} />
                  <span className="text-sm font-semibold text-gray-800">소개</span>
                </div>
                <p className="text-sm leading-relaxed text-gray-800">{user.bio.trim()}</p>
              </div>
            )}

            {user.hobbies && user.hobbies.length > 0 && (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Heart
                    className="h-5 w-5 shrink-0"
                    style={{ color: PROFILE_GOLD }}
                    strokeWidth={2}
                    fill="none"
                  />
                  <span className="text-sm font-semibold text-gray-800">취미 & 관심사</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {user.hobbies.map((hobby, index) => (
                    <span
                      key={`${hobby}-${index}`}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium"
                      style={{ backgroundColor: "#FDF5E6", color: PROFILE_BRAND }}
                    >
                      {hobby}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {showMatchingBlock && (
              <div className="rounded-2xl p-5" style={{ backgroundColor: PROFILE_SURFACE }}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-600">나와의 매칭률</span>
                  <span className="text-2xl font-bold tabular-nums" style={{ color: PROFILE_BRAND }}>
                    {displayMatchingRate}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.max(0, displayMatchingRate!))}%`,
                      backgroundColor: PROFILE_GOLD,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                className="h-12 flex-1 rounded-xl border-0 font-semibold text-white shadow-sm hover:opacity-95"
                style={{ backgroundColor: PROFILE_BRAND }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSendMessage?.();
                }}
              >
                <Mail className="mr-2 h-4 w-4" />
                메시지 보내기
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 flex-1 rounded-xl border-2 border-gray-200 bg-white font-semibold text-gray-900 hover:bg-gray-50"
                onClick={() => {
                  onRequestMatch?.();
                }}
              >
                <Calendar className="mr-2 h-4 w-4" />
                매칭 신청
              </Button>
            </div>

            {showReviewButton && (
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl border-gray-200"
                onClick={() => setIsReviewDialogOpen(true)}
              >
                <ThumbsUp className="mr-2 h-4 w-4" />
                도움을 받았어요
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="text-lg font-bold">칭찬 남기기</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              {profileTitle(user)}에게 칭찬을 남겨주세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <LionAvatar department={user.department ?? ""} size="lg" />
              <div>
                <h3 className="text-2xl font-bold text-gray-800">{profileTitle(user)}</h3>
                {deptLine && <p className="mt-1 text-sm text-gray-500">{deptLine}</p>}
                {user.year?.trim() && <p className="mt-0.5 text-xs text-gray-400">{user.year}</p>}
              </div>
            </div>

            <div>
              <p className="mb-3 text-center text-sm text-gray-600">이 쿠옹이가 얼마나 도움이 되었나요?</p>
              <div className="flex items-center justify-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-8 w-8 cursor-pointer transition-colors ${
                      star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                    }`}
                    onClick={() => setRating(star)}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">감사 메시지 (선택)</label>
              <Textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="예: 덕분에 과제 해결했어요! 정말 감사합니다 😊"
                className="h-24 w-full"
              />
            </div>

            <div className="flex justify-end">
              <Button
                className="flex-1 rounded-xl"
                style={{ backgroundColor: PROFILE_BRAND }}
                onClick={handleSubmitReview}
                disabled={submitted}
              >
                {submitted ? (
                  <span className="flex items-center">
                    <Star className="mr-2 h-4 w-4" />
                    칭찬이 제출되었습니다!
                  </span>
                ) : (
                  <span className="flex items-center">
                    <ThumbsUp className="mr-2 h-4 w-4" />
                    칭찬 제출
                  </span>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
