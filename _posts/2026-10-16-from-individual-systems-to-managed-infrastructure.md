---
layout: post
title: "From Individual Systems to Managed Infrastructure"
date: 2026-10-16
category: Infrastructure Engineering
status: Architecture planning
description: "Exploring multi-hypervisor virtualization, centralized identity, automation, backup strategy, and IT/OT lab design."
---

A homelab has a way of growing beyond its original purpose. What starts as a few independent machines eventually becomes a connected environment that needs deliberate management.

My next phase focuses on **centralized identity, infrastructure automation, virtualization diversity, recovery, and IT/OT learning**. These are planned improvements, not completed deployments.

## Expanding beyond one hypervisor

Proxmox has been a useful foundation for virtual machines, networking, and storage. I'm now evaluating **VMware ESXi alongside Proxmox** to build familiarity with another virtualization ecosystem.

The learning goals include VM lifecycle management, virtual networking, storage, host administration, resource allocation, and recovery. Before deployment, I need to validate hardware compatibility and understand the free edition's management and backup limitations.

## One identity across Windows and Linux

Maintaining separate accounts across multiple operating systems becomes tedious as an environment grows. I plan to test **Active Directory** for centralized identities and groups, starting with Windows and a noncritical Linux system.

On Linux, this means exploring SSSD, Kerberos, and domain-backed SSH access. The objective is consistent, role-based authentication while preserving local recovery access. Existing secure remote-access controls will remain in place.

## Automating repeatable changes

I'm also planning an **Ansible** controller. Its job will be practical: apply repeatable configurations, coordinate software updates, reduce drift, and help orchestrate backups.

Changes should be version-controlled, tested on noncritical systems first, and reviewed before they affect important infrastructure. Automation is useful only when it makes operations more reliable.

## Treating recovery as a design requirement

Centralized storage can support scheduled VM, system, and configuration backups, but backup completion is not the same as recoverability.

This phase will focus on retention, failure reporting, documented recovery procedures, and periodic restore tests. Independent backup copies remain an important longer-term goal.

## Keeping monitoring independent

I'm continuing work on a separate monitoring application focused on discovery, availability, performance, behavioral baselines, anomaly detection, and alerting.

Keeping monitoring independent from identity and automation services helps retain visibility when another service fails.

## Building an OT learning environment

A separate operational technology lab will explore HMIs, simulated PLCs, SCADA concepts, MQTT, process data, and the differences between IT and industrial environments.

Repurposed devices will serve as operator interfaces and simulated process controllers. The goal is hands-on learning with controlled connectivity, not exposure of control systems to untrusted networks.

## What this phase is teaching me

- **Separate responsibilities.** Identity, monitoring, storage, and automation have different failure and recovery requirements.
- **Redundancy needs separate failure domains.** Multiple VMs on one physical host do not protect against loss of that host.
- **Automation should solve a specific problem.** A useful playbook is more valuable than an unused management platform.
- **Centralization needs a fallback.** Administrative access and recovery must still work when a central service is unavailable.
- **Document the decisions.** Architecture notes matter as much as the configuration itself.

## Next steps

- [ ] Validate VMware ESXi hardware compatibility and installation options.
- [ ] Migrate existing workloads before repurposing hardware.
- [ ] Build an Active Directory test domain.
- [ ] Test domain authentication on Windows and a noncritical Linux machine.
- [ ] Introduce Ansible for a small, repeatable configuration task.
- [ ] Develop a backup schedule and test a restoration.
- [ ] Continue monitoring and OT simulation projects.

The goal isn't to build the biggest lab. **It's to build one I can manage, secure, understand, and recover.**
