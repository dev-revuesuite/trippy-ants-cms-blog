import { redirect } from "next/navigation";
import { createPost } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  const newId = await createPost();
  redirect(`/cms/posts/${newId}/edit`);
}
