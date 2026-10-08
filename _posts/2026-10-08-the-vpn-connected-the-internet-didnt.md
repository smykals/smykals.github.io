---
layout: post
title: The VPN Connected. The Internet Didn't.
date: 2026-10-08 00:00:00 -0400
category: Networking / Infrastructure / Remote Access
description: Troubleshooting WireGuard full-tunnel internet access, source NAT, and competing VPN paths in PROTO.LAB, with persistence and DNS validation still planned.
---

**Field Journal | PROTO.LAB | October 8, 2026**

**Category:** Networking, Infrastructure, Remote Access  
**Technologies:** WireGuard, Tailscale, Linux, FortiGate, AdGuard Home, iptables, nftables

## A Working Connection Isn't Always a Working Network

One of the things I enjoy about building my homelab is that something can be working perfectly one minute and send me down a troubleshooting rabbit hole the next.

This time, it was WireGuard.

I already had WireGuard and Tailscale configured for remote access to my lab. Both connected successfully, and I could reach my Linux VPN server's management interface.

But there was a problem.

The moment I enabled WireGuard's full tunnel, I lost internet access.

The VPN was connected. The handshake worked. I could reach the server.

I just couldn't browse the internet.

So naturally, I started digging.

## Understanding the Traffic Flow

My goal was straightforward: when I'm away from home, I want my internet traffic routed securely through my home network, with AdGuard Home providing DNS filtering.

For illustration, here's a fictionalized version of the network:

| Component | Example Configuration |
|---|---|
| Management VLAN | VLAN 110 : 192.0.2.0/24 |
| Server VLAN | VLAN 120 : 198.51.100.0/24 |
| OT Lab VLAN | VLAN 140 : 203.0.113.0/24 |
| WireGuard VPN | 10.77.50.0/24 |
| VPN server LAN address | 198.51.100.25 |
| VPN tunnel gateway | 10.77.50.1 |
| Firewall gateway | 198.51.100.1 |

*These addresses and VLAN IDs are illustrative, not actual infrastructure details. The WireGuard subnet is a routed VPN network, not a VLAN.*

The intended traffic path was:

Remote device → WireGuard tunnel → Linux VPN server → FortiGate → Internet

Simple enough on paper.

But getting packets into a VPN tunnel and successfully forwarding them out to the internet are two different things.

## Troubleshooting the Full Tunnel

I started by verifying that Linux was configured to forward IPv4 traffic.

It was.

Next, I checked the VPN server's routing table. The server had a valid default route through the firewall, so it knew where to send internet-bound traffic.

Then I examined the NAT rules.

That's where things became interesting.

The server already had masquerading configured for Tailscale, but I couldn't find an equivalent rule for the WireGuard subnet.

Without the appropriate source NAT, traffic from VPN clients may leave the server with private tunnel addresses that the upstream network doesn't know how to route back to.

I added a narrowly scoped masquerade rule for the WireGuard subnet on the server's outbound network interface.

I also inspected the Linux FORWARD chain and Tailscale's firewall rules to make sure forwarded traffic wasn't being blocked.

After testing, internet browsing through WireGuard was working.

**Lesson one: A successful VPN connection doesn't guarantee successful routing, forwarding, or NAT.**

Each layer needs to be verified independently.

## Then AdGuard Stopped Cooperating

With internet access restored, I moved on to AdGuard Home.

I wanted to access its dashboard while connected through WireGuard.

No luck.

The dashboard worked locally on the VPN server, and the service was listening on the expected LAN address.

I checked the server's firewall rules, verified the listening port, and captured traffic on the WireGuard interface.

Nothing appeared when I tried connecting to the dashboard from my remote Windows machine.

That was the clue.

If the connection attempt wasn't arriving through WireGuard, maybe the problem wasn't AdGuard at all.

Then I remembered something.

**I had both WireGuard and Tailscale connected on my Windows PC.**

I disconnected Tailscale, leaving WireGuard active.

The AdGuard dashboard immediately became accessible.

The evidence pointed toward competing routes or interface preferences between the two VPN clients. I didn't capture the exact Windows route selection, but the behavior was repeatable enough to narrow down the likely cause.

**Lesson two: Two functioning VPNs can still interfere with each other when they're active on the same device.**

Sometimes the problem isn't the server you're troubleshooting. It's the path your traffic takes to reach it.

## Making the Fix Survive

Once WireGuard was working, there was one more thing to address.

The NAT rule I added was temporary.

A reboot could wipe it out.

I updated the WireGuard configuration with startup and shutdown hooks so the necessary NAT rule could be applied automatically when the interface starts.

I deliberately avoided rebooting or restarting the VPN remotely just to test it. The configuration was saved, but a controlled restart test remains on my checklist.

That's an important distinction: configuring persistence and proving persistence are not the same thing.

## What I Took Away

This troubleshooting session reinforced a few things I've been learning while expanding PROTO.LAB:

- Connectivity is not the same as functionality.
- Routing, forwarding, NAT, and DNS are separate pieces of the puzzle.
- A packet capture showing no traffic can be just as useful as one showing a failure.
- Running multiple remote-access solutions adds flexibility, but also introduces routing complexity.
- Temporary fixes should be documented and made persistent intentionally.
- Working on remote infrastructure requires thinking about how you'll recover if a change goes wrong.

The biggest takeaway wasn't the NAT command or the VPN configuration.

It was the troubleshooting process.

Instead of changing multiple settings and hoping something worked, I was able to isolate different parts of the traffic flow, test them, and narrow down the failure.

## What's Next for PROTO.LAB?

The full-tunnel connection is working, and I can access the AdGuard dashboard through WireGuard.

Next, I want to verify that remote DNS queries are actually passing through AdGuard, confirm filtering behavior, and test the NAT configuration during a planned maintenance window.

I'm also continuing to build out the OT side of PROTO.LAB, where network segmentation, secure remote access, and visibility become even more important.

**Because building a lab isn't just about getting everything online. It's about understanding what happens when something doesn't work, and knowing how to bring it back.**

---

*PROTO.LAB Field Journal : Documenting real troubleshooting, infrastructure experiments, and lessons learned. Network identifiers have been changed for security.*