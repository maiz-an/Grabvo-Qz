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
        const baseStyles = 'rounded-[2rem] transition-all duration-500 overflow-hidden';

        const variants = {
            default: 'bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]',
            flat: 'bg-slate-50 border border-slate-100',
            glass: 'bg-white/70 backdrop-blur-xl border border-white shadow-sm',
            success: 'bg-emerald-50 border border-emerald-100',
            warning: 'bg-amber-50 border border-amber-100',
            error: 'bg-red-50 border border-red-100',
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