---
layout: post
title: "AdGuard Home Over WireGuard: Following the DNS Packets"
date: 2026-10-02 12:10:00 -0400
category: Networking
description: "A field note on adding DNS-level filtering to a WireGuard VPN, diagnosing a DNS bypass with tcpdump, and verifying the fix."
---

Adding AdGuard Home to a VPN sounded straightforward: install the DNS filtering service, point the VPN clients at it, and let it filter requests. The interesting part was what happened when the VPN worked perfectly but AdGuard did not appear to be doing anything.

This field note documents the troubleshooting process and the lesson behind the fix. All addresses, hostnames, and topology details shown here are sanitized examples. The IP addresses use documentation-only ranges and do not represent my actual lab.

## Goal

I wanted remote devices connected through WireGuard to use AdGuard Home for DNS resolution and filtering.

At a high level, the intended path was:

```text
Remote client
     |
     | Encrypted WireGuard tunnel
     v
VPN server
     |
     +--> AdGuard Home --> Upstream DNS
     |
     +--> Internal resources / Internet
```

WireGuard and AdGuard Home have two different jobs:

- **WireGuard** creates the encrypted tunnel and provides network connectivity.
- **AdGuard Home** receives DNS requests, applies filtering rules, and forwards allowed queries to an upstream resolver.

That distinction became important during troubleshooting.

## Environment

The lab uses a Linux-based VPN server running WireGuard with AdGuard Home providing DNS filtering.

For the examples in this article, assume:

```text
VPN subnet:       192.0.2.0/24
VPN server/DNS:   192.0.2.1
Remote client:    192.0.2.20
```

These are example addresses from a range reserved for documentation.

The intended DNS flow was:

```text
192.0.2.20
    |
    | DNS query
    v
192.0.2.1
    |
    v
AdGuard Home
    |
    | allowed query
    v
Upstream DNS
```

## The symptom

The WireGuard tunnel was working.

The client could connect, traffic could cross the tunnel, and the VPN itself did not appear to have a routing problem.

But AdGuard Home's query log was not showing the DNS activity I expected from the VPN client.

That created an important troubleshooting question:

> Is AdGuard failing to process DNS, or is the DNS traffic never reaching AdGuard in the first place?

Instead of immediately changing firewall rules, routes, or the AdGuard configuration, I decided to look at the traffic.

## Following the packets

On the VPN server, I used `tcpdump` to watch DNS traffic entering the WireGuard interface.

A sanitized version of the command is:

```bash
sudo tcpdump -ni wg0 'host 192.0.2.20 and port 53'
```

Breaking that down:

- `tcpdump` captures packets.
- `-n` prevents name resolution in the output.
- `-i wg0` limits the capture to the WireGuard interface.
- `host 192.0.2.20` limits the capture to the test client.
- `port 53` limits the capture to traditional DNS traffic.

This immediately answered part of the question.

DNS packets **were** crossing the WireGuard interface.

That meant the client was connected and the tunnel was carrying DNS traffic.

But the destination of those packets exposed the real problem.

A simplified example looked like this:

```text
192.0.2.20.54000 > external-dns.example.53
```

The client was sending DNS through the VPN tunnel, but it was still targeting a different DNS resolver.

AdGuard was not failing to filter the queries.

**The queries were bypassing AdGuard entirely.**

## Diagnosis

At this point, the troubleshooting picture looked like this:

```text
WireGuard handshake       PASS
VPN connectivity          PASS
DNS traffic on wg0        PASS
DNS reaching AdGuard      FAIL
AdGuard filtering         Not yet relevant
```

This was the key lesson from the exercise:

> Routing a device through a VPN does not automatically mean the device is using the VPN server's DNS service.

The client can have a perfectly healthy WireGuard tunnel while still being configured to send DNS queries somewhere else.

That distinction is easy to miss because normal browsing may continue to work. From the user's perspective, the VPN looks healthy.

## The fix

The fix was much simpler than the investigation that led to it.

I changed the WireGuard client configuration so that the client used the AdGuard Home address as its DNS server.

Using the sanitized example:

```ini
[Interface]
DNS = 192.0.2.1
```

After reconnecting the tunnel, the path changed from:

```text
Client
   |
WireGuard
   |
   +------------------> Other DNS resolver
                          |
                       AdGuard bypassed
```

to:

```text
Client
   |
WireGuard
   |
   v
AdGuard Home
   |
   v
Upstream DNS
```

No complicated routing change was required. The problem was simply that the client had been told to use the wrong DNS destination.

## Verification

I verified the fix from multiple directions instead of relying on a single test.

### 1. Check the client's resolver

On a Windows client:

```powershell
nslookup example.com
```

The resolver shown by the client should correspond to the DNS service assigned through the VPN configuration.

### 2. Watch the tunnel again

I repeated the packet capture:

```bash
sudo tcpdump -ni wg0 'host 192.0.2.20 and port 53'
```

Now the DNS packets were targeting the expected VPN-side DNS address rather than the previous external resolver.

### 3. Check AdGuard Home

The AdGuard Home query log began showing requests from the VPN client.

That provided application-layer confirmation that the packets were not only entering the tunnel but actually reaching AdGuard.

### 4. Confirm filtering

Finally, I generated DNS requests while watching the AdGuard query log and confirmed that domains matching enabled filter rules were being blocked.

That gave me an end-to-end verification path:

```text
Client generates DNS query
          |
          v
WireGuard carries query
          |
          v
AdGuard receives query
          |
          v
Filtering policy applied
          |
          v
Allowed queries forwarded upstream
```

## Troubleshooting workflow I would use next time

This experience gave me a cleaner troubleshooting order for VPN DNS problems.

### Step 1: Verify the VPN itself

```bash
sudo wg
```

Confirm that the client has a recent handshake before troubleshooting DNS.

### Step 2: Verify basic reachability

Make sure the client can reach the expected VPN-side resources. If basic connectivity is broken, DNS filtering is not the first problem to solve.

### Step 3: Ask the client which DNS server it is using

On Windows:

```powershell
ipconfig /all
nslookup example.com
```

This can expose a bad DNS assignment before touching the server.

### Step 4: Capture DNS traffic

```bash
sudo tcpdump -ni wg0 'port 53'
```

If no DNS packets appear, investigate the client configuration or tunnel routing.

If packets do appear, inspect their destination.

### Step 5: Check the AdGuard query log

If the packets are targeting the correct DNS server but do not appear in AdGuard, then investigate whether AdGuard is listening on the expected interface/address and whether host firewall rules allow the traffic.

### Step 6: Test filtering last

Only after confirming that DNS actually reaches AdGuard does it make sense to troubleshoot blocklists or filtering rules.

This order avoids troubleshooting the application before proving that the network traffic reaches it.

## What I learned

The biggest lesson was not really about AdGuard.

It was about troubleshooting layered systems.

The initial symptom was:

> "AdGuard isn't blocking."

But that description assumed AdGuard was the component failing.

Packet capture changed the question from:

> "Why isn't AdGuard working?"

to:

> "Where are the DNS packets actually going?"

That is a much better troubleshooting question.

The VPN was doing exactly what it was supposed to do. AdGuard was available. The missing piece was the client's DNS configuration.

It reinforced a troubleshooting principle I want to keep using in the lab:

**Observe the traffic before changing the architecture.**

Tools such as `tcpdump`, application logs, resolver tests, and routing information provide evidence about where a failure actually exists. That evidence can turn what looks like a complicated network problem into a very small configuration change.

## Next steps

The current design provides filtered DNS to clients intentionally configured to use AdGuard through the VPN.

Future lab work could explore:

- Centralized DNS assignment for additional network segments.
- DNS-over-HTTPS or DNS-over-TLS upstream resolution.
- Monitoring and alerting around DNS service availability.
- Redundant DNS filtering so the resolver is not a single point of failure.
- Rules that prevent managed clients from bypassing the approved DNS resolver.

For now, the important result is simple: the VPN carries the traffic, AdGuard filters the DNS, and packet-level troubleshooting provides a repeatable way to prove how the two are interacting.
