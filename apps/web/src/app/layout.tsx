import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "./globals.css";

export const metadata: Metadata = {
	title: "Earthquake - Next.js with shadcn/ui",
	description:
		"A modern Next.js application with shadcn/ui components and Tailwind CSS",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className="antialiased">
				<NuqsAdapter>{children}</NuqsAdapter>
			</body>
		</html>
	);
}
