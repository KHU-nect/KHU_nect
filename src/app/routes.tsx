import { createBrowserRouter } from "react-router";
import { LoginPage } from "./pages/LoginPage";
import { OnboardingProfilePage } from "./pages/OnboardingProfilePage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { OnboardingCompletePage } from "./pages/OnboardingCompletePage";
import { HomePage } from "./pages/HomePage";
import { ClassPage } from "./pages/ClassPage";
import { ClassListPage } from "./pages/ClassListPage";
import { MatchingPage } from "./pages/MatchingPage";
import { HobbyMatchingPage } from "./pages/HobbyMatchingPage";
import { ClassMatchingPage } from "./pages/ClassMatchingPage";
import { MyPage } from "./pages/MyPage";
import { TimetablePage } from "./pages/TimetablePage";
import { MyTimetablePage } from "./pages/MyTimetablePage";
import { ChatPage } from "./pages/ChatPage";
import { Layout } from "./components/Layout";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LoginPage,
  },
  {
    path: "/onboarding-profile",
    Component: OnboardingProfilePage,
  },
  {
    path: "/onboarding",
    Component: OnboardingPage,
  },
  {
    path: "/onboarding-complete",
    Component: OnboardingCompletePage,
  },
  {
    path: "/home",
    Component: Layout,
    children: [
      { index: true, Component: HomePage },
      { path: "/home/timetable", Component: TimetablePage },
      { path: "/home/my-timetable", Component: MyTimetablePage },
      { path: "/home/classes", Component: ClassListPage },
      { path: "/home/class/:id", Component: ClassPage },
      { path: "/home/chat", Component: ChatPage },
      { path: "/home/matching", Component: MatchingPage },
      { path: "/home/hobby-matching", Component: HobbyMatchingPage },
      { path: "/home/class-matching", Component: ClassMatchingPage },
      { path: "/home/mypage", Component: MyPage },
    ],
  },
]);