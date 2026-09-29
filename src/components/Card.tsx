import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'flat' | 'glass' | 'success' | 'warning' | 'error';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    children: React.ReactNode;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({
        variant = 'default',
        padding = 'md',
        className = '',
        children,
        ...props
    }, ref) => {
        const baseStyles = 'rounded-lg overflow-hidden';

        const variants = {
            default: 'bg-white border border-slate-200',
            flat: 'bg-slate-50 border border-slate-200',
            glass: 'bg-white/80 backdrop-blur-md border border-slate-200',
            success: 'bg-emerald-50 border border-emerald-200',
            warning: 'bg-amber-50 border border-amber-200',
            error: 'bg-red-50 border border-red-200',
        };

        const paddings = {
            none: '',
            sm: 'p-4',
            md: 'p-8',
            lg: 'p-12',
        };

        return (
            <div
                ref={ref}
                className={`${baseStyles} ${variants[variant]} ${paddings[padding]} ${className}`}
                {...props}
            >
                {children}
            </div>
        );
    }
);

Card.displayName = 'Card';

export default Card;