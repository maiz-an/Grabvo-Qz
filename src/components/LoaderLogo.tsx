import { Logo } from './Logo';

interface LoaderLogoProps {
    message?: string;
    className?: string;
    logoClassName?: string;
    messageClassName?: string;
}

export function LoaderLogo({
    message,
    className = '',
    logoClassName = '',
    messageClassName = '',
}: LoaderLogoProps) {
    return (
        <div className={`flex flex-col items-center justify-center text-center ${className}`} aria-live="polite" aria-busy="true">
            <Logo className={logoClassName} />
            <div className="h-1 w-12 mx-auto mt-3 rounded-full bg-violet-600 opacity-20" />
            {message ? (
                <p className={`mt-4 text-sm font-medium text-slate-500 ${messageClassName}`}>
                    {message}
                </p>
            ) : null}
        </div>
    );
}