import { cn } from "@earthquake/utils";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const alertVariants = cva(
	"relative w-full rounded-lg border p-4 text-[hsl(var(--color-foreground))] [&>svg]:mr-3 [&>svg]:h-4 [&>svg]:w-4 [&:has(svg)]:pl-3",
	{
		variants: {
			variant: {
				default:
					"bg-[hsl(var(--color-card))] border-[hsl(var(--color-border))] [&>svg]:text-[hsl(var(--color-primary))]",
				destructive:
					"border-[hsl(var(--color-destructive))]/40 bg-[hsl(var(--color-destructive)/0.2)] text-[hsl(var(--color-destructive-foreground))] [&>svg]:text-[hsl(var(--color-destructive))]",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

export interface AlertProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof alertVariants> {}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
	({ className, variant, ...props }, ref) => (
		<div
			ref={ref}
			role="alert"
			className={cn(alertVariants({ variant }), className)}
			{...props}
		/>
	),
);
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
	HTMLHeadingElement,
	React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
	<h3
		ref={ref}
		className={cn("mb-1 text-sm font-semibold tracking-tight", className)}
		{...props}
	/>
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
	HTMLParagraphElement,
	React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn(
			"text-sm leading-6 text-[hsl(var(--color-muted-foreground))]",
			className,
		)}
		{...props}
	/>
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
