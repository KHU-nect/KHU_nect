import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { PageContainer } from "../components/PageContainer";
import { useAuth } from "../context/AuthContext";
import { exchangeGoogleCode, saveAuthTokens } from "../utils/backendAuth";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const code = params.get("code");
  const oauthError = params.get("error");

  const helperText = useMemo(() => {
    if (loading) return "구글 로그인 정보를 확인하고 있어요...";
    if (error) return error;
    return "로그인에 성공했어요. 이동 중입니다...";
  }, [loading, error]);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (oauthError) {
        if (mounted) {
          setError(`구글 로그인 실패: ${oauthError}`);
          setLoading(false);
        }
        return;
      }
      if (!code) {
        if (mounted) {
          setError("로그인 코드가 없어 인증을 완료할 수 없어요.");
          setLoading(false);
        }
        return;
      }

      try {
        const result = await exchangeGoogleCode(code);
        if (!mounted) return;
        saveAuthTokens(result.accessToken, result.refreshToken);
        login(result.user);
        navigate(result.signupCompleted ? "/home" : "/onboarding-profile", { replace: true });
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "로그인 처리 중 오류가 발생했어요.");
        setLoading(false);
      }
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [code, oauthError, login, navigate]);

  return (
    <PageContainer className="items-center justify-center px-6 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 p-6 text-center space-y-4">
        <div className="text-5xl">🦁</div>
        <h1 className="text-xl font-bold text-gray-900">구글 로그인</h1>
        <p className={`text-sm ${error ? "text-red-600" : "text-gray-600"}`}>{helperText}</p>
        {!loading && (
          <button
            type="button"
            onClick={() => navigate("/", { replace: true })}
            className="w-full h-11 rounded-xl font-semibold text-white"
            style={{ backgroundColor: "#A71930" }}
          >
            로그인 화면으로
          </button>
        )}
      </div>
    </PageContainer>
  );
}
