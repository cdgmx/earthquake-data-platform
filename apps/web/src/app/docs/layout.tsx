import "./docs.css";
import type { ReactNode } from "react";

interface DocsLayoutProps {
	children: ReactNode;
}

export default function DocsLayout({ children }: DocsLayoutProps) {
	return <div className="min-h-screen bg-white">{children}</div>;
}
