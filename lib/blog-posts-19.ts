import type { BlogPost } from "./blog-posts";

type NewArticle = Omit<BlogPost, "datePublished" | "dateModified" | "readMinutes">;

// Volume 19: getting set up. The EIN is the first thing carriers check when a
// business registers for texting, so this guide walks through applying for one.
const ARTICLES: NewArticle[] = [
  {
    slug: "how-to-apply-for-an-ein",
    metaTitle: "How to Apply for an EIN (Free, Step by Step) | Text2Sale",
    title: "How to apply for an EIN: a free, step-by-step guide",
    description:
      "An EIN is free and most businesses can get one online from the IRS in a single sitting. Here is who needs one, what to have ready, how to apply, and how to use it for business texting registration.",
    excerpt: "An EIN is free from the IRS and usually takes one sitting online. Here is exactly how to apply.",
    tags: ["Getting started", "Business setup", "10DLC"],
    intro: [
      "An Employer Identification Number (EIN) is a nine-digit number the IRS assigns to a business, written like 12-3456789. Think of it as a Social Security number for your business. Banks ask for it to open a business account, and phone carriers use it to verify your business before they approve you to send business text messages.",
      "The good news: applying is free, and most U.S. businesses can do it online and receive the number at the end of the same session. You do not need a lawyer, an accountant or a paid filing service. This guide walks through it step by step.",
    ],
    sections: [
      {
        heading: "Who needs an EIN",
        paragraphs: [
          "You need an EIN if your business has employees, is a corporation or partnership, or is an LLC with more than one member. Many single-member LLCs and sole proprietors get one too, even when it is not strictly required, because it lets them open a business bank account and keeps their Social Security number off forms they hand to clients and vendors.",
          "If you plan to text customers from a business number, an EIN also matters for carrier registration. Carriers verify the business behind every texting campaign, and the EIN is how they match your application to IRS records.",
        ],
      },
      {
        heading: "What to have ready before you start",
        bullets: [
          "The exact legal name of the business, spelled the way it appears on your formation documents",
          "The business type: sole proprietor, LLC, corporation, partnership, nonprofit and so on",
          "The business mailing address",
          "The name and Social Security number (or ITIN) of the responsible party, the person who owns or controls the business",
          "The date the business started and the main reason you are applying, such as starting a new business",
          "For an LLC: the number of members and the state where it was formed",
        ],
        paragraphs: [
          "If you are forming an LLC or corporation, register it with your state first. The IRS application asks for the legal name and formation details, and they should match your state filing.",
        ],
      },
      {
        heading: "Step by step: apply online",
        paragraphs: [
          "The online application is the fastest route. It is available to businesses located in the United States or its territories when the responsible party has a valid Social Security number or ITIN.",
        ],
        bullets: [
          "Go to IRS.gov and search for \"Apply for an EIN online\". Only use the official IRS.gov page.",
          "Start the application and choose your business type.",
          "Enter the responsible party's name and SSN or ITIN.",
          "Enter the business name, address and start date, then answer the questions about what the business does.",
          "Choose to receive your confirmation letter online so you can download it right away.",
          "Review everything, submit, and save the confirmation letter (CP 575) as a PDF.",
        ],
      },
      {
        heading: "Finish in one sitting",
        paragraphs: [
          "The online application cannot be saved and resumed later, and the session times out after a period of inactivity. Gather everything in the list above before you start so you can complete it in one go.",
          "The online tool runs during set hours, so check the IRS page for the current schedule before you sit down. The IRS also limits EINs to one per responsible party per day.",
        ],
      },
      {
        heading: "Other ways to apply",
        paragraphs: [
          "If you cannot apply online, complete Form SS-4 and send it to the IRS by fax or mail. The IRS says fax applications generally take about four business days and mailed applications about four weeks. Applicants outside the United States can apply by phone; the number is on the IRS EIN page.",
        ],
      },
      {
        heading: "It is free. Watch for look-alike sites",
        paragraphs: [
          "The IRS never charges for an EIN. Many websites are designed to look official and charge a fee to file the same form for you. Check that the address in your browser ends in irs.gov before you type in a Social Security number.",
        ],
      },
      {
        heading: "After you get your EIN",
        bullets: [
          "Download and keep the CP 575 confirmation letter. The IRS issues it once.",
          "Write down the business name and address exactly as they appear on the letter.",
          "Use the EIN to open a business bank account and for tax filings.",
          "If you lose the letter, call the IRS Business and Specialty Tax Line and ask for a 147C verification letter.",
        ],
        paragraphs: [
          "Keep the letter somewhere you can find it. You will be asked for it more often than you expect.",
        ],
      },
      {
        heading: "Using your EIN to register for business texting",
        paragraphs: [
          "To text customers from a local business number, carriers require your business to be registered (often called 10DLC registration). They compare the legal name, EIN and address on your application with IRS records, and a mismatch is the most common reason applications are rejected.",
          "So when you fill out messaging registration in Text2Sale, copy the business name and address from your CP 575 or 147C letter exactly, including punctuation and abbreviations like LLC or Inc. A brand-new EIN can also take a little time to appear in the databases carriers check, so if a registration is rejected right after you receive your number, wait a couple of weeks and resubmit with the same details.",
        ],
      },
    ],
    keyTakeaways: [
      "An EIN is free and comes directly from the IRS.",
      "Most U.S. businesses can apply online and get the number in the same session.",
      "Have the legal name, address and responsible party's SSN or ITIN ready, because the application cannot be saved.",
      "Save your CP 575 letter and use its exact name and address when you register for business texting.",
    ],
    faq: [
      {
        question: "How much does an EIN cost?",
        answer: "Nothing. The IRS issues EINs for free. Any site charging a fee is a third-party filing service, not the IRS.",
      },
      {
        question: "How long does it take to get an EIN?",
        answer:
          "Online, you receive the number as soon as the application is accepted. By fax it generally takes about four business days, and by mail about four weeks.",
      },
      {
        question: "Can a sole proprietor get an EIN?",
        answer:
          "Yes. A sole proprietor can apply for an EIN even without employees, and many do so they can keep their Social Security number private and open a business bank account.",
      },
      {
        question: "Do I need an LLC before I apply?",
        answer:
          "No. Sole proprietors can apply without forming a company. If you do plan to form an LLC or corporation, register it with your state first so the name on your EIN matches.",
      },
      {
        question: "I lost my EIN letter. How do I prove my EIN?",
        answer:
          "Call the IRS Business and Specialty Tax Line and ask for a 147C letter, which verifies your EIN along with the business name and address on file.",
      },
      {
        question: "Why does Text2Sale ask for my EIN?",
        answer:
          "Phone carriers require every business that sends text messages from a local number to be verified. The EIN lets them confirm your business with IRS records before approving your messaging.",
      },
    ],
    relatedPages: [{ href: "/pricing", label: "Text2Sale plans and pricing" }],
    sources: [
      { href: "https://www.irs.gov/businesses/small-businesses-self-employed/get-an-employer-identification-number", label: "IRS: Get an employer identification number" },
      { href: "https://www.irs.gov/forms-pubs/about-form-ss-4", label: "IRS: About Form SS-4" },
    ],
  },
];

export const BLOG_POSTS_19: BlogPost[] = ARTICLES.map((article) => {
  const text = [article.title, ...article.intro,
    ...article.sections.flatMap((section) => [section.heading, ...section.paragraphs, ...(section.bullets || [])]),
    ...article.keyTakeaways, ...article.faq.flatMap((item) => [item.question, item.answer])].join(" ");
  return { ...article, datePublished: "2026-11-16", dateModified: "2026-11-16",
    readMinutes: Math.max(1, Math.ceil(text.split(/\s+/).length / 200)) };
});
