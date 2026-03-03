import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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

export default function App(): JSX.Element {
	return (
		<Router>
			<KueberrLayout>
				<OnboardingModal />
				<Routes>
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
			</KueberrLayout>
		</Router>
	);
}
