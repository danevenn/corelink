import { redirect } from "next/navigation";

// /admin → redirige a la primera sección. El gate de admin vive en el layout.
export default function AdminIndexPage() {
  redirect("/admin/users");
}
