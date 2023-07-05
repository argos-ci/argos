import "@/styles/highlight-js-github-dark.min.css";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { AppNavbar } from "@/containers/AppNavbar";
import { AppFooter } from "@/containers/AppFooter";
import { Inter } from "next/font/google";
import { TooltipProvider } from "@/components/Tooltip";

// If loading a variable font, you don't need to specify the font weight
const inter = Inter({ subsets: ["latin"] });

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <TooltipProvider>
      <div id="content" className={inter.className}>
        <AppNavbar />
        <main>
          <Component {...pageProps} />
        </main>
        <AppFooter />
      </div>
    </TooltipProvider>
  );
};

export default App;
