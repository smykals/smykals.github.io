---
layout: post
title: "Building a Local AI Sales Agent: From Lead Tracker to Prospect Intelligence"
date: 2026-10-05 22:30:00 -0400
category: Local AI
description: "How a simple lead tracker evolved into a locally hosted prospect intelligence system using Python, FastAPI, SQLite, Ollama, public-source research, deterministic scoring, and human review."
---

What started as an idea for a simple lead tracker turned into something much larger: a locally hosted AI sales agent capable of discovering organizations, researching them, finding potential contact routes, identifying technology lifecycle signals, and helping determine which opportunities deserve attention.

The goal was not to build another CRM.

I wanted to see how much of the repetitive work involved in prospecting could be automated while keeping the final decision with a human.

## The Problem

Finding a potential customer is easy.

Finding a useful potential customer requires considerably more work.

A normal prospecting workflow might involve searching for organizations, visiting their websites, determining what they do, estimating their size, finding the right person, looking for technology-related signals, recording the evidence, and deciding whether the organization is worth pursuing.

Doing that once is not difficult. Doing it consistently across dozens of organizations is.

That became the problem I wanted to solve.

Instead of building something that simply stored leads, I started building a system that could create **prospect intelligence**.

## Keeping the AI Local

One of the first architectural decisions was that I wanted the AI portion running on my own infrastructure.

The application currently uses:

- **FastAPI** for the application and API layer
- **SQLite** for prospect and activity data
- **Ollama** for local LLM inference
- **Python** for discovery, enrichment, scoring, validation, and application logic
- **Nginx** as the web access layer
- **Debian Linux** as the server platform

The LLM runs locally through Ollama rather than sending prospect information to a cloud AI API.

The public-safe architecture looks roughly like this:

```text
Public Sources
     |
Discovery Engine
     |
Deduplication
     |
Enrichment + Evidence Collection
     |
Deterministic Python Scoring
     |
Local Ollama Interpretation
     |
Prospect Intelligence View
     |
Human Review / Approval
```

Internal addresses, hostnames, credentials, and other private infrastructure details are intentionally omitted from this journal.

Running locally also introduced hardware limitations, so choosing a model became part of the project. Larger models produced stronger results but were slower on the available hardware. I eventually selected a smaller model that gave me a better balance between response quality and performance.

That reinforced an early lesson: **the biggest model is not necessarily the best model for the system being built.**

## When the AI Gave Me a 1/100

One of the most useful failures happened early.

I gave the local model information about a test company and asked it to evaluate the prospect.

The result was essentially:

**Fit score: 1/100**

There was only one problem: the explanation underneath the score described why the organization was actually a strong prospect.

The model had produced a numerical conclusion that contradicted its own reasoning.

My first instinct was to improve the prompt. Then I realized the larger problem was not the prompt.

I was asking the AI to do something normal code could do more reliably.

That changed the architecture.

## Separating Scoring From Interpretation

I rebuilt qualification around a hybrid model.

Python evaluates known evidence and produces the score. The local LLM interprets that evidence and explains what it might mean. I make the final decision.

```text
Evidence
   ↓
Python scores it
   ↓
Local AI interprets it
   ↓
Human reviews it
```

That separation immediately made the system more predictable.

It also gave me one of the biggest lessons from the project:

> **Code determines what the evidence says. AI helps interpret what the evidence means.**

Not every problem needs AI. Knowing where not to use it became just as important as figuring out where to use it.

## Building the Discovery Engine

Once qualification was working, another problem became obvious: I still had to manually give the application companies to research.

That was not much of a sales agent.

So I built a discovery engine.

The system can search within a defined geographic territory, collect candidate organizations from public sources, normalize the results, detect duplicates, rank the candidates, and select a subset for deeper research.

One test run produced:

- **80 candidates discovered**
- **20 prospects selected**
- **20 prospects automatically researched and enriched**

Instead of manually entering twenty organizations, I could start a discovery run and review the resulting intelligence.

That was the point where the project stopped feeling like a lead tracker.

## Enrichment: Turning a Company Name Into Evidence

Discovery tells me an organization exists.

Enrichment tries to answer a more useful question: **why should I care?**

Depending on what is publicly available, the enrichment process can examine company websites, contact pages, public professional information, job postings, organizational information, technology-related signals, and other legitimate public sources.

The system records both what it finds and where the information came from.

That second part became increasingly important. I did not want an AI-generated paragraph that simply sounded convincing. I wanted to be able to inspect the evidence behind it.

## AI Hallucinations Are Not the Only Bad Data

One interesting bug had nothing to do with the LLM.

During enrichment, the system found this address:

`email@example.com`

Technically, it had found an email address. Practically, it had found garbage.

The address was placeholder content from a website.

That resulted in another improvement: contact information needed validation before being treated as useful evidence. Later research of the same prospect found a real contact route.

That small bug reinforced another lesson:

> **Automation can collect incorrect information perfectly.**

Validation has to be part of the pipeline.

## Confidence Instead of Rejection

I also changed how I thought about scoring.

Originally, a low score felt like **bad prospect**.

But a lack of public evidence does not mean an organization is not a potential customer. It may simply mean the system does not know enough yet.

The score therefore became more about priority and confidence than an absolute verdict.

Prospects can be organized into categories such as **High Fit**, **Potential**, **Manual Review**, and **Partner Opportunity**. An organization with limited evidence is not automatically discarded; it can be sent to manual review instead.

That distinction matters when automation is operating on incomplete public information.

## Building the Prospect Intelligence View

As the amount of information grew, the interface had to change too.

A single prospect card was no longer enough. Each organization now has an intelligence view containing areas for overview, evidence, contacts, AI analysis, outreach, and activity history.

From there I can review the evidence, rerun enrichment, run AI qualification, draft an introduction, flag incorrect contact information, archive the prospect, or mark it as do-not-contact.

This led to another useful design distinction:

> **The dashboard is the command center.**  
> **The pipeline is the work queue.**  
> **The company page is the intelligence file.**

Once I started thinking about those as three different jobs, the interface became much easier to design.

## Human Approval Is Intentional

The goal is not to create an AI that indiscriminately sends messages across the internet.

The system can handle much of the repetitive workflow:

```text
Discover → Research → Enrich → Identify → Score → Interpret → Draft
```

But it stops before contacting anyone.

Outbound communication still requires human approval. That boundary is deliberate. I want automation handling repetitive research while judgment and external communication remain under human control.

## Where It Is Now

The project has evolved considerably from the first version.

It can now independently discover potential organizations, remove duplicates, research public sources, enrich prospect records, identify possible contact routes, detect useful business or technology signals, score evidence, classify prospects, run local AI analysis, and maintain research history.

The application, database, discovery engine, prospect intelligence workflow, and AI inference all run on infrastructure in my homelab.

There is still plenty to build. Outreach workflows, better research sources, improved scoring calibration, scheduling, response classification, and deeper lifecycle intelligence are all possible next steps.

But an important milestone has already happened:

**I can give the system a territory instead of a company name.**

It can take it from there and bring organizations back for me to review.

## What I Learned

This project started as an experiment with local AI, but it has become an exercise in application architecture, API development, Linux services, database design, public-source research, data validation, background jobs, evidence tracking, deterministic scoring, prompt design, model selection, UI design, and human-in-the-loop automation.

Several of the most important improvements came from something breaking or producing a ridiculous result.

That is probably my favorite part of building things this way.

I do not just want to know **that** something works. I want to understand **why** it works, where it fails, and how the pieces interact.

**Understand the why. Explore the perspective. Build the solution.**
