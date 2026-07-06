import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

export default async function RootPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  } else {
    const user = session.user as any;
    
    if (user?.role === "CUSTOMER") {
      redirect("/company-dashboard");
    } else {
      redirect("/dashboard");
    }
  }
}