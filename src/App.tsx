import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { KueberrLayout } from "@/components/layout/KueberrLayout";
import { OnboardingModal } from "@/components/common/OnboardingModal";
import Markets from "./pages/Markets";
import Trading from "./pages/Trading";
import News from "./pages/News";
import StockDetails from "./pages/StockDetails";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import Portfolio from "./pages/Portfolio";
import Watchlist from "./pages/Watchlist";
import Predictions from "./pages/Predictions";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import EconomicCalendar from "./pages/EconomicCalendar";
import TermsOfService from "./pages/TermsOfService";
import Sentiment from "./pages/Sentiment";
import Learning from "./pages/Learning";

const pageVariants = {
  initial: { opacity: 0, y: 16, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -10, filter: "blur(5px)" },
};

const AnimatedAppRoutes = (): JSX.Element => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
        className="min-h-full"
      >
        <Routes location={location}>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/markets" element={<Markets />} />
          <Route path="/trading" element={<Trading />} />
          <Route path="/news" element={<News />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/predictions" element={<Predictions />} />
          <Route path="/sentiment" element={<Sentiment />} />
          <Route path="/learning" element={<Learning />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/economic-calendar" element={<EconomicCalendar />} />
          <Route path="/stock/:symbol" element={<StockDetails />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

export default function App(): JSX.Element {
  return (
    <Router>
      <KueberrLayout>
        <OnboardingModal />
        <AnimatedAppRoutes />
      </KueberrLayout>
    </Router>
  );
}
