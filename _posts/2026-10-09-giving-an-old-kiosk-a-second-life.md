---
layout: post
title: "Giving an Old Kiosk a Second Life: Building a Two-Node Monitoring System"
category: PROTO.MONITOR
description: "Repurposing a retired touchscreen kiosk and a spare Raspberry Pi into a two-node monitoring system, starting with the dedicated Ethernet link."
date: 2026-10-09
project: PROTO.MONITOR
status: Network foundation operational; application deployment pending
visibility: public
tags:
  - field-journal
  - raspberry-pi
  - homelab
  - network-engineering
  - monitoring
---

*PROTO.MONITOR | Field Journal | October 9, 2026*

I started with a retired health-screening kiosk, a spare Raspberry Pi, and a question: could I turn this hardware into a dedicated monitoring station for my lab instead of letting it collect dust?

The kiosk still had a working touchscreen and an internal Raspberry Pi 3 Model B. Rather than asking that older board to do everything, I paired it with an external Raspberry Pi 4 Model B. The idea is straightforward: **separate the interface from the monitoring workload**.

## The design

The Pi 3 stays inside the kiosk and serves as the physical touchscreen console. The Pi 4 will host the PROTO.MONITOR application services: discovery, health checks, API, historical metrics, and alerts. A dedicated Ethernet cable links the two devices; a separate network adapter on the Pi 4 provides access to the lab infrastructure it will eventually monitor.

<figure aria-label="Two-node monitoring architecture" style="margin: 2rem 0;">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 200" role="img" aria-labelledby="proto-diagram-title" style="width:100%;height:auto;">
<title id="proto-diagram-title">Repurposed kiosk with Pi 3 touchscreen connected by dedicated Ethernet to a Pi 4 monitoring backend, which connects to the lab network.</title>
<defs><marker id="proto-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#c33"/></marker></defs>
<g fill="none" stroke="#c33" stroke-width="2"><rect x="10" y="65" width="190" height="95" rx="12"/><rect x="300" y="65" width="190" height="95" rx="12"/><rect x="560" y="65" width="150" height="95" rx="12"/><path d="M 205 112 H 295" marker-start="url(#proto-arrow)" marker-end="url(#proto-arrow)"/><path d="M 495 112 H 555" marker-end="url(#proto-arrow)"/></g>
<g fill="currentColor" font-family="sans-serif" font-size="16" text-anchor="middle"><text x="105" y="103">Repurposed kiosk</text><text x="105" y="130">Pi 3 touchscreen</text><text x="395" y="103">Pi 4</text><text x="395" y="130">Monitoring backend</text><text x="635" y="103">Lab network</text><text x="635" y="130">Monitored devices</text><text x="250" y="35" font-size="14">Dedicated Ethernet</text></g>
</svg>
</figure>

This is a **two-node distributed design**, not a high-availability cluster. If the backend goes down, the touchscreen does not magically take over. The benefit at this stage is clearer separation of responsibilities and a useful second life for existing hardware.

## Bringing the link online

I began by identifying the physical interfaces and checking whether each Ethernet port actually had a link. Both ends eventually reported an active physical connection, but that alone did not mean the Pis could talk to each other.

The first connectivity tests failed. The fix was not exotic: finish assigning compatible addresses to both ends of the dedicated link, save the network configuration, activate the profiles, and test again. Once both nodes were configured, the Pi 4 successfully reached the kiosk Pi over Ethernet. I then moved the hardware into position and confirmed the connection was still working.

That may sound small, but it matters: the physical and network foundation is now in place before I start loading it with application services.

## What I learned

**Link up is not the same as network reachable.** A connected cable proves physical carrier; it does not prove IP configuration or end-to-end communication.

**Temporary fixes are not permanent configuration.** Manually assigning an address is useful for testing, but a saved connection profile is what makes a setup maintainable after a reboot.

**Splitting workloads is a design choice, not automatic redundancy.** Two devices can divide jobs without providing failover. Calling that out now prevents misleading expectations later.

**Document the final state, not every abandoned attempt.** During troubleshooting, configurations change. The useful record is the architecture that actually worked, plus enough context to explain why earlier tests failed.

## Where the project stands

The two Pis are connected and communicating over their dedicated Ethernet link. **PROTO.MONITOR v2.1 has not yet been deployed or performance-tested on this pair**, so I am not calling the monitoring platform operational yet.

Next up: validate remote management and the lab-facing uplink, deploy the existing monitoring application, and see how well the small hardware handles real polling and dashboard workloads.

The best part of this build is not the hardware. It's turning something obsolete into something useful—and understanding every layer along the way.

---

*Public edition: private addressing, hostnames, VLAN identifiers, and internal DNS/security details intentionally omitted.*
