import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-shell">
      <p className="type-mono mb-8 text-label">404</p>
      <h1 className="type-page">Page not found.</h1>
      <Link href="/" className="btn-accent type-mono-12 mt-10">
        Back home
      </Link>
    </main>
  );
}
