import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import NavbarClient from "./NavbarClient";

export default async function Navbar() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role ?? null;

  return <NavbarClient role={role} />;
}
