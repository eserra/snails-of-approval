type Props = {
  size?: number;
  className?: string;
};

export default function SnailIcon({ size = 24, className = "" }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 80"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Shell - outer circle */}
      <circle cx="50" cy="32" r="28" stroke="currentColor" strokeWidth="5" fill="none" />
      {/* Shell - spiral */}
      <path
        d="M50 10 C30 10, 22 28, 28 40 C32 48, 42 52, 50 48 C58 44, 60 34, 54 28 C50 24, 44 26, 44 30 C44 34, 48 36, 50 34"
        stroke="currentColor"
        strokeWidth="4.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Body */}
      <path
        d="M28 55 Q22 55, 16 62 Q14 66, 18 68 L50 68 Q55 68, 55 62"
        fill="currentColor"
      />
      {/* Eye stalks */}
      <path
        d="M18 62 Q12 50, 8 44"
        stroke="currentColor"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M24 58 Q20 48, 18 42"
        stroke="currentColor"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
