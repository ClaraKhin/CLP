import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Provider } from "@/components/ui/provider"
import { SuperTokensWrapper } from "supertokens-auth-react"
import { initSuperTokens } from "@/lib/supertokens"
import App from "./App"

initSuperTokens();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider>
      <SuperTokensWrapper>
        <App />
      </SuperTokensWrapper>
    </Provider>
  </StrictMode>,
)
