import { ArrowUpRight, Github, Linkedin, Mail, TrendingUp, Twitter } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer id="about" className="border-t border-white/10 bg-card/55 backdrop-blur-xl">
      <div className="container mx-auto px-4 py-14">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
                <TrendingUp className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-lg font-semibold gradient-text">Kueberr</p>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">AI Trading Workspace</p>
              </div>
            </Link>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
              We build execution-grade tooling for traders who want structure, speed, and explainable AI guidance.
            </p>
            <div className="mt-5 flex items-center gap-2">
              {[Twitter, Linkedin, Github, Mail].map((Icon, index) => (
                <a
                  key={index}
                  href="#"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-background/50 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-3 md:col-span-7">
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-foreground">Platform</h4>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#features" className="hover:text-foreground">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#preview" className="hover:text-foreground">
                    Product Preview
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-foreground">
                    Pricing
                  </a>
                </li>
                <li>
                  <Link to="/dashboard" className="hover:text-foreground">
                    Launch App
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-foreground">Resources</h4>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link to="/learning" className="hover:text-foreground">
                    Learning Hub
                  </Link>
                </li>
                <li>
                  <Link to="/news" className="hover:text-foreground">
                    Market News
                  </Link>
                </li>
                <li>
                  <Link to="/economic-calendar" className="hover:text-foreground">
                    Economic Calendar
                  </Link>
                </li>
                <li>
                  <Link to="/predictions" className="hover:text-foreground">
                    Predictions
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-foreground">Legal</h4>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link to="/terms" className="hover:text-foreground">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="hover:text-foreground">
                    Risk Disclosure
                  </Link>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="inline-flex items-center gap-1 hover:text-foreground">
                    Contact Team
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright {new Date().getFullYear()} Kueberr. All rights reserved.</p>
          <p>Disclaimer: Market analysis is for educational purposes only and not investment advice.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
