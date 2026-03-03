import { ReactNode } from "react";
import DashboardNav from "./DashboardNav";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex">
      <DashboardNav />
      <main className="flex-1 container mx-auto px-4 py-8 lg:px-8 lg:pt-8 flex flex-col min-h-screen">
        <div className="flex-1">
          {children}
        </div>
        <footer className="mt-8 py-6 border-t border-border">
          <p className="text-sm text-center text-muted-foreground">
            Disclaimer: Kueberr is a stock market analysis tool. All predictions and data are for informational purposes only. 
            Trading stocks involves substantial risk. Past performance is not indicative of future results.
          </p>
        </footer>
      </main>
    </div>
  );
};

export default DashboardLayout;
