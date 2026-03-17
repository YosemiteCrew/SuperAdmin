"use client";

type Props = {
  onClick: () => void;
};

export default function ActionViewButton({ onClick }: Props) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label="View details"
      className="w-10 h-10 rounded-full border border-neutral-950 bg-neutral-0 flex items-center justify-center transition-all duration-200 hover:bg-neutral-950 hover:text-neutral-0 text-neutral-950 group"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 5C4.5 5 2 12 2 12C2 12 4.5 19 12 19C19.5 19 22 12 22 12C22 12 19.5 5 12 5Z"
          fill="currentColor"
        />
        <circle cx="12" cy="12" r="3" fill="white" />
        <circle
          cx="12"
          cy="12"
          r="1.8"
          className="fill-transparent group-hover:fill-neutral-950 transition-colors duration-200"
        />
      </svg>
    </button>
  );
}
