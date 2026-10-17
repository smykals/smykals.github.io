---
layout: post
title: "From CPU Inference to Production"
date: 2026-10-17
category: Infrastructure Engineering
status: Field notes
description: "A practical account of moving a self-hosted AI workload toward GPU acceleration, repurposing hardware, and validating a containerized production release."
tags: [field-journal, infrastructure, linux, windows, gpu, docker, ai, troubleshooting]
---

Sometimes the most useful infrastructure improvement isn't adding hardware. It's reconsidering **where a workload belongs**.

I started with a local AI workload running on a Linux machine using CPU inference. It worked as a starting point, but the longer-term goal was a responsive, self-hosted assistant capable of supporting coding, troubleshooting, and development workflows. That made compute placement worth revisiting.

An existing workstation had an NVIDIA GPU with 12 GB of VRAM. Meanwhile, the original Linux machine could provide more value as a virtualization host. The engineering question became less about adding compute and more about **matching the workload to the hardware**.

## Rethinking workload placement

The initial architecture combined the AI service and CPU inference on a Linux host. The revised design placed the model runtime in containers on the GPU-equipped workstation and reserved the former host for virtualization.

<div class="field-diagram" role="img" aria-label="Architecture transition: Linux host with CPU inference becomes a virtualization host, while AI inference moves to a GPU-equipped workstation.">
  <div><strong>Before</strong><p>Linux host<br>↓<br>CPU-based inference</p></div>
  <span aria-hidden="true">→</span>
  <div><strong>After</strong><p>GPU workstation<br>↓<br>Containerized model runtime</p><p>Former Linux host<br>↓<br>Virtualization workloads</p></div>
</div>

*Conceptual architecture only. Private infrastructure identifiers and topology are omitted.*

That decision also created a troubleshooting challenge: moving a model into a GPU-capable environment does not guarantee that inference is accelerated.

## The GPU lesson: available isn't the same as utilized

During troubleshooting, an expected NVIDIA diagnostic command wasn't installed inside an application container. That was a useful reminder that **a missing tool is not the same as missing hardware access**.

I separated validation into four questions:

1. **Hardware:** Is the GPU visible to the host and container runtime?
2. **Container access:** Is GPU passthrough exposed to the model-serving container?
3. **Inference:** Is the model actually using GPU resources instead of falling back to the CPU?
4. **Telemetry:** Can utilization, memory, temperature, and power be observed while a workload runs?

GPU passthrough was verified during the work, but an inference log also indicated CPU execution at one point. I would not claim a completed performance gain without verifying actual GPU inference and comparing measurements.

This distinction applies far beyond AI: **hardware capability, service configuration, and observed workload behavior are separate layers of evidence**.

## Building the operational layer

As the infrastructure evolved, I built an application around the model runtime to make it easier to operate and diagnose. The control center brought together model access, GPU telemetry, coding workflows, persistent conversations, workspace data, historical infrastructure views, and an event journal.

<div class="field-diagram field-diagram-stack" role="img" aria-label="Operator connects to an AI control center, which integrates local model inference, GPU telemetry, persistent data, workspace, and event history.">
  <div><strong>Operator / browser</strong></div>
  <span aria-hidden="true">↓</span>
  <div><strong>AI operations control center</strong></div>
  <span aria-hidden="true">↓</span>
  <div><strong>Local inference</strong> · <strong>GPU telemetry</strong><br><strong>Persistent data</strong> · <strong>Workspace</strong><br><strong>Event journal and alerts</strong></div>
</div>

The goal wasn't to collect dashboards for their own sake. It was to answer operational questions: **What's running? What changed? What evidence can I use to investigate?**

## Getting from a working build to production

The second half of the work was a release-management exercise. Updated code existed in source control, but the production interface initially looked unchanged. Instead of assuming the build had failed, I inspected the running environment.

I identified which container served the production endpoint, which Compose project owned it, and which persistent volumes and bind mounts needed to survive replacement. I distinguished the test environment from production, preserved configuration, and backed up application data before cutover. That backup still requires a restoration test before it can be considered a proven recovery method.

The rebuild and container replacement succeeded, but the image name retained an older version label. Rather than trust the label, I inspected the **actual files inside the running container** and checked service responses. The updated application was present; browser caching explained the stale interface.

My release checklist now centers on this sequence:

**Inspect the live service → identify persistent state → back up → validate configuration → rebuild → verify running code and APIs → check the browser.**

The lesson: **a Git update is not a deployment; a successful build is not a running release; and a running release isn't necessarily what the browser displays.**

## Knowing where monitoring ends and security begins

Operational alerts for service health, GPU conditions, and pending tasks are valuable, but they are not automatically evidence of an intrusion.

An initial failed-authentication detector was added to the codebase as a foundation. Broader security monitoring—host events, network activity, behavioral baselines, correlation, and defensible threat findings—remains future work. I would rather define that boundary accurately than describe an operations dashboard as a finished intrusion-detection system.

## What I took away

This project brought together **workload placement, cross-platform troubleshooting, Docker and GPU integration, observability, release management, and operational ownership**.

I did not finish with a benchmark proving a specific acceleration factor, and I won't invent one. What I did establish was a more deliberate architecture and a production application validated at the container and service level.

**Engineering isn't just making a workload run. It's choosing the right place for it, proving what it's doing, and making the environment understandable and maintainable afterward.**

---

*Public field notes. Internal addresses, hostnames, credentials, private paths, exact deployment commands, and proprietary implementation details have been intentionally excluded.*
