---
layout: post
title: "Taking Git Hosting Into My Own Hands"
date: 2026-10-20 19:00:00 -0400
category: Infrastructure / DevOps / Self-Hosting
description: "Why I deployed Forgejo on TrueNAS SCALE in PROTO.LAB, how it fits into my infrastructure, and what still needs to be validated."
---

**Field Journal | PROTO.LAB | October 20, 2026**

**Category:** Infrastructure, DevOps, Self-Hosting  
**Technologies:** Forgejo, TrueNAS SCALE, Proxmox VE, PostgreSQL, Tailscale, Git, VS Code

## Why I Wanted My Own Git Server

I've been spending more time developing my own software, including MONITROPE and DO². That also means I've been leaning more heavily on GitHub.

GitHub is useful, and I'm not abandoning it. But as I build more projects, I want control over the repositories themselves. I already have a lab, a virtualization environment, and storage. Why not put them to work?

This wasn't about replacing Git. It was about owning more of the infrastructure around it.

## Choosing Where to Host It

I considered dedicating another Linux system to Git hosting. Instead, I went with what I already had: TrueNAS SCALE running as a virtual machine on Proxmox VE.

Forgejo was available through the TrueNAS Apps catalog, so I could deploy it without standing up and maintaining another entire operating system.

Forgejo provides a web interface for Git repositories, along with features such as issues, pull requests, and organization management. PostgreSQL supports the application metadata, while the repositories and app data live on persistent storage.

Here's the simplified layout:

```text
Development workstation (VS Code / Git)
                |
       Private network / Tailscale
                |
          Forgejo on TrueNAS
             /         \
      Git repositories  PostgreSQL
                |
         TrueNAS SCALE VM
                |
            Proxmox VE
```

The diagram is intentionally simplified and doesn't expose internal addressing or network details.

## Getting It Running

I deployed Forgejo through TrueNAS Apps and worked through the initial installation settings.

A few configuration choices mattered:

- **Persistent storage:** Repository and database data need to survive application restarts and updates.
- **Database:** Forgejo uses PostgreSQL in this deployment.
- **Registration:** I disabled open self-registration for a private lab service.
- **Access:** I kept remote access behind my existing private-network setup rather than exposing the NAS to the public internet.
- **Resources:** I gave the application a modest CPU and memory allocation rather than dedicating another machine to it.

The biggest networking detail is remembering the difference between an application's internal listening port, the port published by its container platform, and the URL Git clients use to reach it. Those aren't always the same value.

## Accessing Git From Somewhere Else

I already use Tailscale, which means I can reach the Forgejo web interface remotely through a private connection.

That gives me a path to clone, pull, and push repositories when I'm away from the lab, without forwarding the Forgejo web or SSH ports directly from the internet.

I still need to validate each Git transport I intend to use, especially SSH authentication and the clone URLs advertised by Forgejo. A working web login is a good start, but it isn't the same as proving the entire Git workflow.

## What This Doesn't Solve

Moving source hosting in-house gives me control over my repositories. It **doesn't** remove usage limits from GitHub Copilot, Codex, or other hosted AI services.

It also doesn't automatically provide a build pipeline. If I want local CI/CD, I'll need to configure runners, workflow permissions, secrets management, and build isolation separately.

And persistent storage is not a backup. A real recovery plan needs consistent backups of the repositories, Forgejo configuration, and PostgreSQL data—and a restore test.

## What's Next

The next phase is practical validation:

1. Migrate an existing GitHub repository and verify branches, tags, and commit history.
2. Clone it from my development workstation, make a test commit, and push it back.
3. Validate remote access and SSH authentication.
4. Set up backups and prove that a repository can be restored.
5. Explore self-hosted CI/CD while keeping selected projects visible on GitHub for my public portfolio.

I like the idea of Forgejo becoming my private development home, with GitHub remaining the public-facing place for selected projects and field journal entries. That's a direction I'm working toward, not a completed migration I'm claiming today.

## What I Took Away

The interesting part wasn't installing another app. It was thinking through the dependencies around it: virtualization, storage, databases, networking, access control, backups, and the day-to-day developer workflow.

A Git server is only useful if I can reliably reach it, use it, maintain it, and recover it.

This is another piece of PROTO.LAB becoming infrastructure I actually depend on.

**Build. Learn. Improve.**

*— @smykalsbuilds*
