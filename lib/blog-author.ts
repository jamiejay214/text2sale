// The named person behind the blog. Search engines and readers both trust an
// article more when a real, identifiable person stands behind it.
//
// Leave this null until there is a real author to name: a made-up byline is
// worse than none. Once filled in, every post shows "By <name>, <role>" and
// its structured data lists that person as the author.
//
// Example:
//   export const BLOG_AUTHOR: BlogAuthor | null = {
//     name: "First Last",
//     role: "Founder",
//     url: "https://www.linkedin.com/in/your-profile", // optional
//   };

export type BlogAuthor = { name: string; role: string; url?: string };

export const BLOG_AUTHOR = null as BlogAuthor | null;
