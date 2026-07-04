import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline";
  children: React.ReactNode;
}

const Button = ({
  variant = "primary",
  children,
  className = "",
  ...props
}: ButtonProps) => {
  const baseStyles =
    "inline-flex items-center justify-center px-8 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none font-['Outfit']";

  const variants = {
    // PRIMARY: Zmniejszamy blur z 20px do 8px i opacity z 0.3 do 0.2
    primary:
      "bg-primary text-bg-dark border-none hover:brightness-110 shadow-[0_2px_8px_oklch(0.76_0.1_271_/_0.2)]",

    // SECONDARY: Podobna redukcja blasku
    secondary:
      "bg-secondary text-bg-dark border-none hover:brightness-110 shadow-[0_2px_8px_oklch(0.76_0.1_91_/_0.2)]",

    outline:
      "bg-transparent border border-border text-text hover:bg-bg-light hover:border-primary",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
