import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogPostLayout from "@/components/BlogPostLayout";
import { getAllPosts, getPostBySlug } from "@/lib/blog-posts";

const SITE = "https://text2sale.com";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Article Not Found | Text2Sale" };

  const url = `${SITE}/blog/${post.slug}`;
  return {
    title: post.metaTitle,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    keywords: post.tags,
    openGraph: {
      title: post.metaTitle,
      description: post.description,
      url,
      type: "article",
      publishedTime: post.datePublished,
      modifiedTime: post.dateModified,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();
  return <BlogPostLayout post={post} />;
}
