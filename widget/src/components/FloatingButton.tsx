interface FloatingButtonProps {
  onClick: () => void;
}

export default function FloatingButton({ onClick }: FloatingButtonProps) {
  return (
    <button
      class="fixed bottom-6 right-6 z-2147483647 w-14 h-14 rounded-full bg-indigo-500 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer border-0"
      onClick={onClick}
      aria-label="Open chat"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  );
}
