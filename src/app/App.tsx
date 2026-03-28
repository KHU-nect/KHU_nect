import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AppProviders } from "./AppProviders";

export default function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
