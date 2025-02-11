import Link from "next/link";

export const Navigation = () => {
  return (
    <div style={{ paddingBottom: "50px" }}>
      <h3>Navigation</h3>

      <div style={{ display: "flex", gap: "10px" }}>
        <Link href="/">Home</Link>
        <Link href="/spread">Spread</Link>
      </div>
    </div>
  );
};
