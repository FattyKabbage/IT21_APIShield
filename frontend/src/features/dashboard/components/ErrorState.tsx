interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = 'Something went wrong while loading this data.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      className="error-state"
      role="alert"
    >
      <div className="error-icon">
        !
      </div>

      <h3>Unable to load data</h3>

      <p>{message}</p>

      {onRetry && (
        <button
          type="button"
          className="button secondary"
          onClick={onRetry}
        >
          Try again
        </button>
      )}
    </div>
  );
}