import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerPwa } from "./lib/pwaRegister";

createRoot(document.getElementById("root")!).render(<App />);

registerPwa();
