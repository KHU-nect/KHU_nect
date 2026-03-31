import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { LionAvatar } from "./LionAvatar";
import { Mail, Calendar, Heart, MessageCircle, ThumbsUp, Star, X, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";
import { Textarea } from "./ui/textarea";

interface UserProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user?: {
    department: string;
    name?: string;
    year?: string;
    todayQuestion?: string;
    activity?: string;
    hobbies?: string[];
    bio?: string;
    matchingRate?: number;
  };
  showReviewButton?: boolean;
}

export function UserProfileDialog({ isOpen, onClose, user, showReviewButton = false }: UserProfileDialogProps) {
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(5);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitReview = () => {
    // Here you would send the review to your backend
    console.log("Review submitted:", { user: user?.name, rating, reviewText });
    setSubmitted(true);
    setTimeout(() => {
      setIsReviewDialogOpen(false);
      setSubmitted(false);
      setReviewText("");
      setRating(5);
    }, 1500);
  };

  // Don't render if no user data
  if (!user) {
    return null;
  }
  const todayQuestion = user.todayQuestion ?? user.activity;

  return (
    <>
      <Dialog open={isOpen && !!user} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">프로필</DialogTitle>
            <DialogDescription className="text-center text-sm text-gray-500">
              {user.name || `${user.department} 쿠옹이`}의 프로필입니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Avatar & Basic Info */}
            <div className="flex flex-col items-center text-center space-y-4">
              <LionAvatar department={user.department} size="lg" />
              <div>
                <h3 className="text-2xl font-bold text-gray-800">{user.name || `${user.department} 쿠옹이`}</h3>
                <p className="text-sm text-gray-500 mt-1">{user.department}</p>
                {user.year && <p className="text-xs text-gray-400">{user.year}</p>}
              </div>
            </div>

            {todayQuestion ? (
              <div
                className="rounded-2xl p-5 text-white"
                style={{ background: "linear-gradient(135deg, #A71930 0%, #8B1526 100%)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5" />
                  <span className="text-sm font-semibold">오늘의 질문</span>
                </div>
                <p className="text-base font-bold leading-snug">{todayQuestion}</p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5" style={{ color: "#A71930" }} />
                  <span className="text-sm font-semibold text-gray-700">오늘의 질문</span>
                </div>
                <p className="text-sm text-gray-600">오늘은 질문이 없어요.</p>
              </div>
            )}

            {/* Bio */}
            {user.bio && (
              <div className="bg-gray-50 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="w-4 h-4" style={{ color: "#A71930" }} />
                  <span className="text-sm font-semibold text-gray-700">소개</span>
                </div>
                <p className="text-sm text-gray-600">{user.bio}</p>
              </div>
            )}

            {/* Hobbies & Interests */}
            {user.hobbies && user.hobbies.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Heart className="w-4 h-4" style={{ color: "#E6A620" }} />
                  <span className="text-sm font-semibold text-gray-700">취미 & 관심사</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {user.hobbies.map((hobby, index) => (
                    <div
                      key={index}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium"
                      style={{ backgroundColor: "#FDF5E6", color: "#A71930" }}
                    >
                      {hobby}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Matching Rate */}
            {user.matchingRate !== undefined && (
              <div className="bg-gray-50 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">나와의 매칭률</span>
                  <span className="text-2xl font-bold" style={{ color: "#A71930" }}>
                    {user.matchingRate}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${user.matchingRate}%`,
                      backgroundColor: "#E6A620",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                className="flex-1"
                style={{ backgroundColor: "#A71930" }}
              >
                <Mail className="w-4 h-4 mr-2" />
                메시지 보내기
              </Button>
              <Button
                variant="outline"
                className="flex-1"
              >
                <Calendar className="w-4 h-4 mr-2" />
                매칭 신청
              </Button>
            </div>

            {showReviewButton && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsReviewDialogOpen(true)}
              >
                <ThumbsUp className="w-4 h-4 mr-2" />
                도움을 받았어요
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">칭찬 남기기</DialogTitle>
            <DialogDescription className="text-center text-sm text-gray-500">
              {user.name || `${user.department} 쿠옹이`}에게 칭찬을 남겨주세요.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Avatar & Basic Info */}
            <div className="flex flex-col items-center text-center space-y-4">
              <LionAvatar department={user.department} size="lg" />
              <div>
                <h3 className="text-2xl font-bold text-gray-800">{user.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{user.department}</p>
                <p className="text-xs text-gray-400">{user.year}</p>
              </div>
            </div>

            {/* Rating */}
            <div>
              <p className="text-center text-sm text-gray-600 mb-3">
                이 쿠옹이가 얼마나 도움이 되었나요?
              </p>
              <div className="flex items-center justify-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-8 h-8 cursor-pointer transition-colors ${
                      star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                    }`}
                    onClick={() => setRating(star)}
                  />
                ))}
              </div>
            </div>

            {/* Review Textarea */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                감사 메시지 (선택)
              </label>
              <Textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="예: 덕분에 과제 해결했어요! 정말 감사합니다 😊"
                className="w-full h-24"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                className="flex-1"
                style={{ backgroundColor: "#A71930" }}
                onClick={handleSubmitReview}
                disabled={submitted}
              >
                {submitted ? (
                  <div className="flex items-center">
                    <Star className="w-4 h-4 mr-2" />
                    칭찬이 제출되었습니다!
                  </div>
                ) : (
                  <div className="flex items-center">
                    <ThumbsUp className="w-4 h-4 mr-2" />
                    칭찬 제출
                  </div>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}