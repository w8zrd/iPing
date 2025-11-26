const LoadingSpinner = ({ text = "Loading..." }: { text?: string }) => {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center animate-fade-in">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
        <p className="mt-4 text-muted-foreground">{text}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
