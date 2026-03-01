import React, { forwardRef, useCallback } from 'react';
import styles from './Card.module.scss';

function mergeClassNames(...classes) {
	return classes.filter(Boolean).join(' ');
}

/**
 * Universal Card container
 * - Accessible by default when clickable (keyboard + role="button")
 * - Supports semantic element via `as="div|section|button|article|li|..."`
 * - Optional base styling (set `unstyled` to true to opt-out and bring your own styles)
 * - Optional interactive hover styles via `isInteractive`
 * - Optional background image via `backgroundImage`
 */
const Card = forwardRef(function Card(
	{
		as: Component = 'div',
		children,
		className,
		unstyled = false,
		isInteractive = false,
		isComplete = false,
		accentColor,
		backgroundImage,
		onClick,
		// Accessibility passthrough
		role,
		tabIndex,
		...rest
	},
	ref
) {
	const isButtonLike = Boolean(onClick) && Component !== 'button';

	const handleKeyDown = useCallback(
		(event) => {
			if (!isButtonLike) return;
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				if (onClick) onClick(event);
			}
		},
		[isButtonLike, onClick]
	);

	const composedClassName = mergeClassNames(
		!unstyled && styles.card,
		!unstyled && isInteractive && styles.interactive,
		!unstyled && isComplete && styles.complete,
		className
	);

	const styleVars = {
		...(accentColor ? { ['--card-accent']: accentColor } : {}),
		...(backgroundImage ? { ['--card-bg-image']: `url(${backgroundImage})` } : {}),
		...rest.style,
	};

	return (
		<Component
			ref={ref}
			className={composedClassName}
			onClick={onClick}
			onKeyDown={(rest.onKeyDown || isButtonLike) ? (rest.onKeyDown || handleKeyDown) : undefined}
			role={role || (isButtonLike ? 'button' : undefined)}
			tabIndex={tabIndex ?? (isButtonLike ? 0 : undefined)}
			style={styleVars}
			{...rest}
		>
			{children}
		</Component>
	);
});

export default Card;

export function CardHeader({ className, children, ...rest }) {
	return (
		<div className={mergeClassNames(styles.header, className)} {...rest}>
			{children}
		</div>
	);
}

export function CardTitle({ as: Title = 'h3', className, children, ...rest }) {
	return (
		<Title className={mergeClassNames(styles.title, className)} {...rest}>
			{children}
		</Title>
	);
}

export function CardContent({ className, children, ...rest }) {
	return (
		<div className={mergeClassNames(styles.content, className)} {...rest}>
			{children}
		</div>
	);
}

export function CardFooter({ className, children, ...rest }) {
	return (
		<div className={mergeClassNames(styles.footer, className)} {...rest}>
			{children}
		</div>
	);
}


