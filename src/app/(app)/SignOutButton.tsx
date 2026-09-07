export function SignOutButton() {
  return (
    <form action="/auth/sign-out" method="post" className="mt-3">
      <button
        type="submit"
        className="text-xs font-medium text-teal-200 underline underline-offset-2 hover:text-white"
      >
        Sign out
      </button>
    </form>
  );
}
