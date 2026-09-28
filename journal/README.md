# Publishing a Field Journal entry

The journal is at https://smykals.github.io/journal/. GitHub Pages builds its index automatically from dated Markdown files in `_posts`.

1. In GitHub, open this repository and choose **Add file → Create new file**.
2. Name it `_posts/YYYY-MM-DD-short-title.md` using the publication date.
3. Paste the template below and replace the sample text. Select **Commit changes**. GitHub Pages will publish the entry and add it to the journal list after its build completes.

```markdown
---
layout: post
title: "A Clear Project Title"
date: 2026-09-28 10:30:00 -0400
category: Networking
description: "A one-sentence summary for search results."
---

A short opening that explains the project and its outcome.

## Goal

What problem were you solving?

## Environment

Describe hardware, operating system, and service versions. Sanitize private details.

## Approach

What did you configure or test? Use fenced code blocks for safe example commands.

## Troubleshooting and evidence

What failed, what did the logs or tests show, and what changed?

## Outcome and next steps

What works now, how did you verify it, and what would you improve?
```

Use a date and timezone that match the entry. GitHub Pages may not publish future-dated posts until that date. Keep passwords, keys, real internal addresses, sensitive screenshots, and employer information out of public entries. To add an image, upload it under `journal/images/` and use `![Alt text]({{ '/journal/images/file.png' | relative_url }})` in the post.
