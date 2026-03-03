
import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const OnboardingModal = () => {
    const [open, setOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const hiddenOnRoutes = new Set(["/", "/auth", "/login", "/terms"]);
        if (hiddenOnRoutes.has(location.pathname)) {
            setOpen(false);
            return;
        }

        const hasOnboarded = localStorage.getItem('kueberr_onboarded');
        if (!hasOnboarded) {
            setOpen(true);
        }
    }, [location.pathname]);

    const handleAccept = () => {
        localStorage.setItem('kueberr_onboarded', 'true');
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-md glass-panel border-warning/20">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-warning mb-2">
                        <ShieldAlert className="h-6 w-6" />
                        <DialogTitle className="text-xl font-bold tracking-tight text-white">Market Risk Warning</DialogTitle>
                    </div>
                    <DialogDescription className="text-muted-foreground pt-2">
                        <div className="space-y-4">
                            <p>
                                Welcome to <span className="text-primary font-semibold">Kueberr</span>. Before you proceed, please understand:
                            </p>
                            <ul className="list-disc pl-4 space-y-2 text-sm text-white/80">
                                <li>
                                    This platform is for <strong className="text-white">educational and analytical purposes only</strong>.
                                </li>
                                <li>
                                    <strong className="text-white">No Financial Advice:</strong> AI predictions are probabilistic and may be inaccurate.
                                </li>
                                <li>
                                    <strong className="text-white">Risk of Loss:</strong> Trading financial markets involves significant risk.
                                </li>
                                <li>
                                    We do <strong className="text-white">NOT</strong> facilitate any live trading or money management.
                                </li>
                            </ul>
                        </div>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-6 sm:justify-between items-center gap-4">
                    <p className="text-xs text-muted-foreground text-center sm:text-left">
                        By continuing, you acknowledge you have read and understood these risks.
                    </p>
                    <Button
                        onClick={handleAccept}
                        className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                    >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        I Understand
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
