export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="mb-4 rounded-md border border-danger/30 bg-danger/8 px-3 py-2 text-danger">
      {message}
    </div>
  );
}
