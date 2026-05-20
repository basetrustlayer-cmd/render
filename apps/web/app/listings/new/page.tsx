import { redirect } from "next/navigation";

export default function NewListingRedirectPage() {
  redirect("/dashboard/create-listing");
}
