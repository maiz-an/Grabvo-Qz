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
        const baseStyles = 'rounded-[1.75rem] overflow-hidden';

        const variants = {
            default: 'bg-[#FBF8F2] shadow-[0_10px_28px_-10px_rgba(41,32,20,0.14)]',
            flat: 'bg-[#F3EEE2]',
            glass: 'bg-[#FBF8F2]/80 backdrop-blur-md',
            success: 'bg-emerald-50',
            warning: 'bg-amber-50',
            error: 'bg-red-50',
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