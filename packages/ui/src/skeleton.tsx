import { cn } from "@earthquake/utils";
import * as React from "react";

const Skeleton = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn(
			"animate-pulse rounded-md bg-[hsl(var(--color-muted)/0.4)]",
			className,
		)}
		{...props}
	/>
));
Skeleton.displayName = "Skeleton";

export { Skeleton };
